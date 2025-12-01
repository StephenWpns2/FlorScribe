import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AssemblyAI } from 'assemblyai';
import { Session, SessionStatus } from './entities/session.entity';
import { PatientsService } from '../patients/patients.service';
import { TranscriptsService } from '../transcripts/transcripts.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);

  constructor(
    @InjectRepository(Session)
    private sessionsRepository: Repository<Session>,
    private patientsService: PatientsService,
    private transcriptsService: TranscriptsService,
    private configService: ConfigService,
    private subscriptionsService: SubscriptionsService,
  ) {}

  async create(sessionData: Partial<Session>): Promise<Session> {
    // Handle Patient relationship if patientEntityId is provided
    // Otherwise, keep backward compatibility with string patientId
    const session = this.sessionsRepository.create(sessionData);
    
    // If patientEntityId is provided, ensure the patient exists and belongs to the user
    if (sessionData.patientEntityId && sessionData.userId) {
      try {
        await this.patientsService.findOne(sessionData.patientEntityId, sessionData.userId);
      } catch (error) {
        throw new Error(`Patient with ID ${sessionData.patientEntityId} not found or does not belong to user`);
      }
    }
    
    return this.sessionsRepository.save(session);
  }

  async findById(id: number): Promise<Session | null> {
    return this.sessionsRepository.findOne({
      where: { id },
      relations: ['user', 'patient'],
    });
  }

  async findByUserId(
    userId: number,
    skip: number = 0,
    limit: number = 100,
  ): Promise<[Session[], number]> {
    return this.sessionsRepository.findAndCount({
      where: { userId },
      relations: ['user', 'patient'],
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });
  }

  async findAll(
    skip: number = 0,
    limit: number = 100,
    userId?: number,
  ): Promise<[Session[], number]> {
    const where = userId ? { userId } : {};
    return this.sessionsRepository.findAndCount({
      where,
      relations: ['user', 'patient'],
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });
  }

  async updateStatus(
    id: number,
    status: SessionStatus,
    endedAt?: Date,
  ): Promise<Session> {
    await this.sessionsRepository.update(id, { status, endedAt });
    const session = await this.findById(id);
    
    // If session is ending, we could track usage here
    // But audio usage is tracked when audio is processed via webhook
    // So we don't need to do anything here
    
    return session;
  }

  /**
   * Process audio file with AssemblyAI pre-recorded API to get accurate speaker diarization
   * Uses webhook for async processing
   */
  async processAudioWithSpeakerDiarization(
    sessionId: number,
    audioBuffer: Buffer,
    mimeType: string,
  ): Promise<void> {
    this.logger.log(`Starting speaker diarization processing for session ${sessionId}`);

    const apiKey = this.configService.get<string>('ASSEMBLYAI_API_KEY');
    if (!apiKey) {
      this.logger.error('AssemblyAI API key not configured');
      throw new Error('AssemblyAI API key not configured');
    }

    // Verify session exists
    const session = await this.findById(sessionId);
    if (!session) {
      this.logger.error(`Session ${sessionId} not found`);
      throw new Error(`Session ${sessionId} not found`);
    }

    try {
      const assemblyaiClient = new AssemblyAI({ apiKey });

      // Get webhook URL from environment
      const baseUrl = this.configService.get<string>('WEBHOOK_BASE_URL') || 
                     this.configService.get<string>('BACKEND_URL') || 
                     'http://localhost:8000';
      const webhookUrl = `${baseUrl}/api/sessions/webhook/assemblyai?session_id=${sessionId}`;

      this.logger.log(`Submitting transcription with webhook: ${webhookUrl}`);

      // Calculate audio duration for usage tracking
      const audioHours = await this.subscriptionsService.calculateAudioDurationFromBuffer(
        audioBuffer,
        mimeType,
      );

      // Check audio limit before processing
      try {
        const limitCheck = await this.subscriptionsService.checkAudioLimit(session.userId, audioHours);
        if (!limitCheck.allowed) {
          this.logger.warn(
            `Audio limit exceeded for user ${session.userId}. Current: ${limitCheck.currentUsage}, Limit: ${limitCheck.limit}`,
          );
          throw new Error(
            `Audio limit exceeded. You have used ${limitCheck.currentUsage.toFixed(2)} of ${limitCheck.limit} hours. Please upgrade your plan.`,
          );
        }
      } catch (error) {
        // If it's a ForbiddenException, rethrow it
        if (error.message.includes('limit exceeded')) {
          throw error;
        }
        // Otherwise, log and continue (user might not have subscription yet)
        this.logger.warn(`Could not check audio limit: ${error.message}`);
      }

      // Submit transcription job with webhook (don't wait for completion)
      const transcript = await assemblyaiClient.transcripts.submit({
        audio: audioBuffer,
        speaker_labels: true,
        speakers_expected: 4, // Support up to 4 speakers
        language_code: 'en', // Adjust if needed
        webhook_url: webhookUrl,
      });

      this.logger.log(
        `Transcription submitted for session ${sessionId}. Transcript ID: ${transcript.id}, Status: ${transcript.status}`,
      );
    } catch (error) {
      this.logger.error(`Error submitting audio for session ${sessionId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Handle webhook callback from AssemblyAI when transcription completes
   */
  async handleAssemblyAIWebhook(payload: any): Promise<{ status: string; message: string }> {
    this.logger.log(`Received AssemblyAI webhook: ${JSON.stringify(payload).substring(0, 200)}`);

    try {
      // Extract session ID from webhook URL query params or payload
      // AssemblyAI includes the webhook_url in the payload, so we can extract session_id from it
      const webhookUrl = payload.webhook_url || '';
      const urlMatch = webhookUrl.match(/session_id=(\d+)/);
      const sessionId = urlMatch ? parseInt(urlMatch[1], 10) : null;

      if (!sessionId) {
        this.logger.error('Could not extract session_id from webhook payload');
        return { status: 'error', message: 'Session ID not found in webhook' };
      }

      // Verify session exists
      const session = await this.findById(sessionId);
      if (!session) {
        this.logger.error(`Session ${sessionId} from webhook not found`);
        return { status: 'error', message: `Session ${sessionId} not found` };
      }

      // Check transcription status
      if (payload.status === 'error') {
        this.logger.error(`Transcription failed for session ${sessionId}: ${payload.error}`);
        return { status: 'error', message: `Transcription failed: ${payload.error}` };
      }

      if (payload.status !== 'completed') {
        this.logger.log(`Transcription still processing for session ${sessionId}: ${payload.status}`);
        return { status: 'processing', message: `Transcription status: ${payload.status}` };
      }

      // Fetch the complete transcript with utterances
      const apiKey = this.configService.get<string>('ASSEMBLYAI_API_KEY');
      if (!apiKey) {
        this.logger.error('AssemblyAI API key not configured');
        return { status: 'error', message: 'API key not configured' };
      }

      const assemblyaiClient = new AssemblyAI({ apiKey });
      const transcript = await assemblyaiClient.transcripts.get(payload.transcript_id);

      if (!transcript || transcript.status !== 'completed') {
        this.logger.error(`Failed to fetch completed transcript ${payload.transcript_id}`);
        return { status: 'error', message: 'Failed to fetch transcript' };
      }

      // Track audio usage - use actual duration from AssemblyAI if available
      if (transcript.audio_duration !== undefined && transcript.audio_duration !== null) {
        const audioHours = transcript.audio_duration / 3600; // Convert seconds to hours
        try {
          await this.subscriptionsService.incrementAudioUsage(session.userId, audioHours);
          this.logger.log(`Tracked ${audioHours.toFixed(2)} hours of audio usage for user ${session.userId}`);
        } catch (error) {
          this.logger.warn(`Failed to track audio usage: ${error.message}`);
        }
      }

      // Update transcripts with accurate speaker labels
      await this.updateTranscriptsWithSpeakerLabels(sessionId, transcript);

      this.logger.log(`Successfully processed speaker diarization webhook for session ${sessionId}`);
      return { status: 'success', message: 'Speaker labels updated successfully' };
    } catch (error) {
      this.logger.error(`Error handling webhook: ${error.message}`, error.stack);
      return { status: 'error', message: error.message };
    }
  }

  /**
   * Reprocess an existing session's audio file (if available)
   */
  async reprocessSessionWithSpeakerDiarization(sessionId: number): Promise<{ message: string }> {
    // This would require storing audio files, which we're not doing yet
    // For now, return a message indicating this feature needs audio storage
    return {
      message: 'Audio reprocessing requires audio file storage. Please upload audio file directly.',
    };
  }

  /**
   * Match utterances from pre-recorded API to existing transcripts and update speaker labels
   */
  private async updateTranscriptsWithSpeakerLabels(
    sessionId: number,
    transcriptResult: any,
  ): Promise<void> {
    if (!transcriptResult.utterances || transcriptResult.utterances.length === 0) {
      this.logger.warn(`No utterances found in transcript result for session ${sessionId}`);
      return;
    }

    // Get existing transcripts for this session
    const existingTranscripts = await this.transcriptsService.findBySessionId(sessionId);
    const finalTranscripts = existingTranscripts.filter((t) => !t.isInterim);

    if (finalTranscripts.length === 0) {
      this.logger.warn(`No existing transcripts found for session ${sessionId}`);
      return;
    }

    // Create a mapping of utterance text to speaker
    // We'll match utterances to transcripts by text similarity and timing
    const utteranceMap = new Map<string, string>();
    
    for (const utterance of transcriptResult.utterances) {
      const text = utterance.text?.trim().toLowerCase();
      if (text) {
        // Store speaker for this utterance text
        utteranceMap.set(text, utterance.speaker || 'A');
      }
    }

    // Update transcripts by matching text
    let updatedCount = 0;
    let errorCount = 0;
    
    // Store original count for safety check
    const originalCount = finalTranscripts.length;
    
    for (const transcript of finalTranscripts) {
      try {
        const transcriptText = transcript.text?.trim().toLowerCase();
        if (!transcriptText) continue;

        // Try to find matching utterance
        // Simple approach: find utterance with highest text similarity
        let bestMatch: { speaker: string; similarity: number } | null = null;

        for (const [utteranceText, speaker] of utteranceMap.entries()) {
          const similarity = this.calculateTextSimilarity(transcriptText, utteranceText);
          if (!bestMatch || similarity > bestMatch.similarity) {
            bestMatch = { speaker, similarity };
          }
        }

        // Update if we found a reasonable match (similarity > 0.3, lowered threshold)
        if (bestMatch && bestMatch.similarity > 0.3) {
          // Map AssemblyAI speaker labels (A, B, C, D) to our format
          // They're already in the same format, so we can use directly
          if (transcript.speaker !== bestMatch.speaker) {
            await this.transcriptsService.update(transcript.id, {
              speaker: bestMatch.speaker,
            });
            updatedCount++;
          }
        } else {
          this.logger.debug(
            `No good match found for transcript ${transcript.id} (best similarity: ${bestMatch?.similarity || 0})`,
          );
        }
      } catch (error) {
        errorCount++;
        this.logger.error(
          `Failed to update transcript ${transcript.id} for session ${sessionId}: ${error.message}`,
        );
        // Continue with other transcripts instead of failing completely
      }
    }

    // Safety check: Verify transcripts weren't deleted
    const transcriptsAfter = await this.transcriptsService.findBySessionId(sessionId);
    const finalAfter = transcriptsAfter.filter((t) => !t.isInterim);
    
    if (finalAfter.length < originalCount) {
      this.logger.error(
        `WARNING: Transcript count decreased from ${originalCount} to ${finalAfter.length} for session ${sessionId}`,
      );
    }

    this.logger.log(
      `Updated ${updatedCount} out of ${originalCount} transcripts with speaker labels for session ${sessionId} (${errorCount} errors)`,
    );
  }

  /**
   * Calculate text similarity using simple word overlap
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.split(/\s+/).filter((w) => w.length > 0));
    const words2 = new Set(text2.split(/\s+/).filter((w) => w.length > 0));

    if (words1.size === 0 && words2.size === 0) return 1.0;
    if (words1.size === 0 || words2.size === 0) return 0.0;

    const intersection = new Set([...words1].filter((x) => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size; // Jaccard similarity
  }
}

