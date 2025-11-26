import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WebSocket } from 'ws';
import { TranscriptsService } from '../transcripts/transcripts.service';
import { AssemblyAI } from 'assemblyai';

@Injectable()
export class RealtimeService {
  private readonly logger = new Logger(RealtimeService.name);
  private activeSessions: Map<number, any> = new Map(); // sessionId -> AssemblyAI session

  constructor(
    private configService: ConfigService,
    private transcriptsService: TranscriptsService,
  ) {}

  async initializeSession(
    client: WebSocket,
    sessionId: number,
  ): Promise<string> {
    const clientId = (client as any).clientId || 'unknown';
    this.logger.log(`[RealtimeService] Initializing session ${sessionId} for client ${clientId}`);

    const apiKey = this.configService.get<string>('ASSEMBLYAI_API_KEY');
    if (!apiKey) {
      this.logger.warn(`[RealtimeService] AssemblyAI API key not configured - connection will stay open but transcription disabled`);
      // Don't throw error - allow connection to stay open
      // Return a placeholder session ID
      const placeholderSessionId = `placeholder_${sessionId}_${Date.now()}`;
      this.activeSessions.set(sessionId, {
        client,
        sessionId: placeholderSessionId,
        audioBytesReceived: 0,
        audioChunksReceived: 0,
        startedAt: new Date(),
        assemblyaiEnabled: false,
      });
      return placeholderSessionId;
    }

    // Initialize AssemblyAI RealtimeTranscriber
    let assemblyaiSessionId: string;
    try {
      const assemblyaiClient = new AssemblyAI({ apiKey });
      const transcriber = assemblyaiClient.streaming.transcriber({
        sampleRate: 16000, // Match frontend audio sample rate
        // Note: AssemblyAI streaming API doesn't support speakerLabels configuration
        // We'll implement speaker detection based on turn patterns and audio characteristics
      });

      // Set up event handlers for transcripts
      let assemblyaiSessionIdFromOpen: string | null = null;
      
      transcriber.on('open', (event) => {
        assemblyaiSessionIdFromOpen = event.id;
        this.logger.log(`[RealtimeService] AssemblyAI session opened: ${event.id}, expires at: ${event.expires_at}`);
      });

      transcriber.on('turn', (event) => {
        // Check if transcript has text
        if (event.transcript && event.transcript.trim()) {
          // end_of_turn indicates if this is a final transcript
          // If end_of_turn is false, it's an interim/partial transcript
          const isFinal = event.end_of_turn === true;
          
          // Extract speaker information from the event (if available)
          // Note: AssemblyAI streaming API doesn't natively support speaker diarization
          // We'll use our own detection algorithm based on turn patterns
          const eventAny = event as any;
          // Check for speaker info in various possible fields (in case it's added in future)
          const speaker = eventAny.speaker 
            || eventAny.speaker_label 
            || eventAny.speaker_id
            || (eventAny.words && eventAny.words[0]?.speaker) // Sometimes speaker is in words array
            || undefined;
          
          // Log if AssemblyAI provides speaker info (should be rare with streaming API)
          if (speaker) {
            this.logger.debug(`[RealtimeService] AssemblyAI provided speaker: ${speaker} (final: ${isFinal})`);
          }
          
          this.handleTranscript(
            sessionId,
            event.transcript,
            isFinal,
            speaker,
          ).catch((error) => {
            this.logger.error(`[RealtimeService] Error handling transcript: ${error.message}`);
          });
        }
      });

      transcriber.on('error', (error) => {
        this.logger.error(`[RealtimeService] AssemblyAI error for session ${sessionId}: ${error.message}`, error.stack);
        // Send error to WebSocket client
        try {
          const wsClient = this.activeSessions.get(sessionId)?.client;
          if (wsClient) {
            (wsClient as WebSocket).send(JSON.stringify({
              type: 'error',
              message: `Transcription error: ${error.message}`,
            }));
          }
        } catch (sendError) {
          this.logger.error(`[RealtimeService] Failed to send error to client: ${sendError.message}`);
        }
      });

      transcriber.on('close', (code, reason) => {
        this.logger.log(`[RealtimeService] AssemblyAI connection closed for session ${sessionId}: ${code} - ${reason}`);
      });

      // Connect to AssemblyAI
      const beginEvent = await transcriber.connect();
      assemblyaiSessionId = beginEvent.id || `session_${sessionId}_${Date.now()}`;
      this.activeSessions.set(sessionId, {
        client,
        transcriber,
        sessionId: assemblyaiSessionId,
        audioBytesReceived: 0,
        audioChunksReceived: 0,
        startedAt: new Date(),
        assemblyaiEnabled: true,
        // Speaker detection state
        speakerDetection: {
          lastTurnTime: null,
          lastSpeaker: null,
          turnHistory: [], // Track recent turns for pattern detection
          speakerPatterns: new Map<string, { count: number; avgTurnLength: number; lastSeen: number }>(), // Track speaker characteristics
        },
      });

      this.logger.log(`[RealtimeService] Session ${sessionId} initialized with AssemblyAI session ${assemblyaiSessionId}`);
    } catch (error) {
      this.logger.error(`[RealtimeService] Failed to initialize AssemblyAI for session ${sessionId}: ${error.message}`, error.stack);
      // Fall back to disabled mode
      assemblyaiSessionId = `placeholder_${sessionId}_${Date.now()}`;
      this.activeSessions.set(sessionId, {
        client,
        sessionId: assemblyaiSessionId,
        audioBytesReceived: 0,
        audioChunksReceived: 0,
        startedAt: new Date(),
        assemblyaiEnabled: false,
      });
    }

    // Set up message handler for client (handles binary audio data)
    client.on('message', async (data: Buffer | string) => {
      // Only process binary data (audio)
      if (Buffer.isBuffer(data)) {
        await this.processAudio(client, data);
      } else {
        this.logger.debug(`[RealtimeService] Received non-binary message from client ${clientId}: ${data.toString().substring(0, 100)}`);
      }
    });

    return assemblyaiSessionId;
  }

  async processAudio(client: WebSocket, audioData: Buffer): Promise<void> {
    const sessionId = (client as any).sessionId;
    const clientId = (client as any).clientId || 'unknown';

    if (!sessionId) {
      this.logger.warn(`[RealtimeService] Received audio data but no session ID for client ${clientId}`);
      return;
    }

    const session = this.activeSessions.get(sessionId);
    if (!session) {
      this.logger.warn(`[RealtimeService] Received audio data for unknown session ${sessionId}`);
      return;
    }

    // If AssemblyAI is not enabled, just track stats but don't process
    if (!session.assemblyaiEnabled) {
      session.audioBytesReceived += audioData.length;
      session.audioChunksReceived += 1;
      // Log occasionally to show connection is working
      if (session.audioChunksReceived % 100 === 0) {
        this.logger.debug(`[RealtimeService] Session ${sessionId} - Receiving audio (AssemblyAI disabled): ${session.audioChunksReceived} chunks`);
      }
      return;
    }

    // Track audio statistics
    session.audioBytesReceived += audioData.length;
    session.audioChunksReceived += 1;

    // Log periodically (every 100 chunks or every 10 seconds)
    if (
      session.audioChunksReceived % 100 === 0 ||
      (Date.now() - session.startedAt.getTime()) % 10000 < 100
    ) {
      const duration = Math.round((Date.now() - session.startedAt.getTime()) / 1000);
      this.logger.debug(
        `[RealtimeService] Session ${sessionId} - Audio stats: ${session.audioChunksReceived} chunks, ${(session.audioBytesReceived / 1024).toFixed(2)} KB, ${duration}s`,
      );
    }

    // Send audio to AssemblyAI
    if (session.transcriber) {
      try {
        // Convert Buffer to Uint8Array for AssemblyAI
        const audioArray = new Uint8Array(audioData);
        session.transcriber.sendAudio(audioArray);
      } catch (error) {
        this.logger.error(`[RealtimeService] Error sending audio to AssemblyAI for session ${sessionId}: ${error.message}`);
      }
    }
  }

  async cleanupSession(client: WebSocket): Promise<void> {
    const sessionId = (client as any).sessionId;
    const clientId = (client as any).clientId || 'unknown';

    if (sessionId) {
      const session = this.activeSessions.get(sessionId);
      if (session) {
        const duration = Math.round((Date.now() - session.startedAt.getTime()) / 1000);
        this.logger.log(
          `[RealtimeService] Cleaning up session ${sessionId} - Total audio: ${session.audioChunksReceived} chunks, ${(session.audioBytesReceived / 1024).toFixed(2)} KB, Duration: ${duration}s`,
        );

        // Close AssemblyAI connection
        if (session.transcriber) {
          try {
            await session.transcriber.close();
            this.logger.debug(`[RealtimeService] Closed AssemblyAI connection for session ${sessionId}`);
          } catch (error) {
            this.logger.error(`[RealtimeService] Error closing AssemblyAI connection: ${error.message}`);
          }
        }
        this.activeSessions.delete(sessionId);
        this.logger.debug(`[RealtimeService] Session ${sessionId} removed from active sessions`);
      } else {
        this.logger.warn(`[RealtimeService] Attempted to cleanup non-existent session ${sessionId}`);
      }
    } else {
      this.logger.warn(`[RealtimeService] Attempted to cleanup session but no session ID for client ${clientId}`);
    }
  }

  /**
   * Detect speaker based on turn patterns and timing
   * Since AssemblyAI streaming API doesn't provide speaker labels,
   * we use heuristics to identify different speakers
   */
  private detectSpeaker(session: any, text: string, isFinal: boolean): string {
    if (!session.speakerDetection) {
      session.speakerDetection = {
        lastTurnTime: null,
        lastSpeaker: null,
        turnHistory: [],
        speakerPatterns: new Map(),
      };
    }

    const detection = session.speakerDetection;
    const now = Date.now();
    const turnLength = text.length;
    
    // Only detect speakers on final transcripts (end of turn)
    if (!isFinal) {
      // For interim transcripts, return the last detected speaker
      return detection.lastSpeaker || 'A';
    }

    // Calculate time since last turn
    const timeSinceLastTurn = detection.lastTurnTime 
      ? now - detection.lastTurnTime 
      : Infinity;

    // Analyze turn patterns to identify speaker
    let detectedSpeaker: string;

    // If this is the first turn, assign speaker A
    if (!detection.lastSpeaker) {
      detectedSpeaker = 'A';
    } else {
      // Use heuristics to detect speaker changes:
      // 1. Longer pauses (>2 seconds) often indicate speaker change
      // 2. Significant differences in turn length patterns
      // 3. Turn order patterns (alternating vs same speaker continuing)
      
      const longPause = timeSinceLastTurn > 2000; // 2 seconds
      const veryLongPause = timeSinceLastTurn > 4000; // 4 seconds
      
      // Get recent turn history (last 5 turns)
      const recentTurns = detection.turnHistory.slice(-5);
      const lastSpeakerPattern = detection.speakerPatterns.get(detection.lastSpeaker);
      
      // Calculate average turn length for current speaker
      const currentSpeakerTurns = recentTurns.filter(t => t.speaker === detection.lastSpeaker);
      const avgTurnLength = currentSpeakerTurns.length > 0
        ? currentSpeakerTurns.reduce((sum, t) => sum + t.length, 0) / currentSpeakerTurns.length
        : turnLength;
      
      // Heuristic: Very long pause likely indicates new speaker
      if (veryLongPause) {
        // Find next available speaker (A, B, C, D)
        const usedSpeakers = Array.from(detection.speakerPatterns.keys()).sort();
        const speakerOrder = ['A', 'B', 'C', 'D'];
        const nextSpeaker = speakerOrder.find(s => !usedSpeakers.includes(s)) || 
                           (usedSpeakers.length < 4 ? speakerOrder[usedSpeakers.length] : 'A');
        detectedSpeaker = nextSpeaker;
      }
      // Heuristic: Long pause + different turn length pattern suggests new speaker
      else if (longPause && lastSpeakerPattern) {
        const turnLengthDiff = Math.abs(turnLength - lastSpeakerPattern.avgTurnLength);
        const significantDiff = turnLengthDiff > lastSpeakerPattern.avgTurnLength * 0.5; // 50% difference
        
        if (significantDiff) {
          // Likely different speaker
          const usedSpeakers = Array.from(detection.speakerPatterns.keys()).sort();
          const speakerOrder = ['A', 'B', 'C', 'D'];
          const nextSpeaker = speakerOrder.find(s => !usedSpeakers.includes(s)) || 
                             (usedSpeakers.length < 4 ? speakerOrder[usedSpeakers.length] : detection.lastSpeaker);
          detectedSpeaker = nextSpeaker;
        } else {
          // Similar pattern, likely same speaker
          detectedSpeaker = detection.lastSpeaker;
        }
      }
      // Heuristic: Short pause + similar turn length = same speaker continuing
      else if (!longPause && lastSpeakerPattern) {
        const turnLengthDiff = Math.abs(turnLength - lastSpeakerPattern.avgTurnLength);
        const similarLength = turnLengthDiff < lastSpeakerPattern.avgTurnLength * 0.3; // Within 30%
        
        if (similarLength) {
          detectedSpeaker = detection.lastSpeaker;
        } else {
          // Different length, might be different speaker
          // Check if we've seen this pattern before
          const matchingPattern = Array.from(detection.speakerPatterns.entries())
            .find(([_, pattern]) => Math.abs(turnLength - pattern.avgTurnLength) < pattern.avgTurnLength * 0.3);
          
          if (matchingPattern) {
            detectedSpeaker = matchingPattern[0];
          } else {
            // New pattern, assign next speaker
            const usedSpeakers = Array.from(detection.speakerPatterns.keys()).sort();
            const speakerOrder = ['A', 'B', 'C', 'D'];
            const nextSpeaker = speakerOrder.find(s => !usedSpeakers.includes(s)) || 
                               (usedSpeakers.length < 4 ? speakerOrder[usedSpeakers.length] : detection.lastSpeaker);
            detectedSpeaker = nextSpeaker;
          }
        }
      }
      // Default: alternate if we have a pause, otherwise continue with same speaker
      else {
        if (longPause) {
          // Alternate between speakers
          const speakerOrder = ['A', 'B', 'C', 'D'];
          const currentIndex = speakerOrder.indexOf(detection.lastSpeaker);
          const nextIndex = (currentIndex + 1) % Math.min(4, detection.speakerPatterns.size + 1);
          detectedSpeaker = speakerOrder[nextIndex] || 'A';
        } else {
          detectedSpeaker = detection.lastSpeaker;
        }
      }
    }

    // Update speaker patterns
    if (!detection.speakerPatterns.has(detectedSpeaker)) {
      detection.speakerPatterns.set(detectedSpeaker, {
        count: 1,
        avgTurnLength: turnLength,
        lastSeen: now,
      });
    } else {
      const pattern = detection.speakerPatterns.get(detectedSpeaker);
      pattern.count += 1;
      // Update average turn length (exponential moving average)
      pattern.avgTurnLength = (pattern.avgTurnLength * 0.7) + (turnLength * 0.3);
      pattern.lastSeen = now;
    }

    // Update turn history (keep last 10 turns)
    detection.turnHistory.push({
      speaker: detectedSpeaker,
      length: turnLength,
      time: now,
    });
    if (detection.turnHistory.length > 10) {
      detection.turnHistory.shift();
    }

    // Update state
    detection.lastSpeaker = detectedSpeaker;
    detection.lastTurnTime = now;

    return detectedSpeaker;
  }

  // This method would be called by AssemblyAI event handlers
  async handleTranscript(
    sessionId: number,
    text: string,
    isFinal: boolean,
    speaker?: string,
  ): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session || !session.client) {
      this.logger.warn(`[RealtimeService] Received transcript for non-existent session ${sessionId}`);
      return;
    }

    const client = session.client as WebSocket;
    const clientId = (client as any).clientId || 'unknown';
    const transcriptType = isFinal ? 'final' : 'interim';

    // If no speaker provided by AssemblyAI, use our detection algorithm
    if (!speaker && isFinal) {
      speaker = this.detectSpeaker(session, text, isFinal);
      this.logger.debug(`[RealtimeService] Detected speaker: ${speaker} for session ${sessionId}`);
    } else if (!speaker) {
      // For interim transcripts, use last detected speaker
      speaker = session.speakerDetection?.lastSpeaker || 'A';
    }

    this.logger.debug(
      `[RealtimeService] Session ${sessionId} - ${transcriptType} transcript (${text.length} chars, speaker: ${speaker || 'N/A'}): "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`,
    );

    if (isFinal) {
      try {
        // Store final transcript
        await this.transcriptsService.create({
          sessionId,
          text,
          isInterim: false,
          speaker,
        });
        this.logger.debug(`[RealtimeService] Stored final transcript for session ${sessionId}`);

        // Send to client
        const message = {
          type: 'final_transcript',
          text,
          speaker,
        };
        client.send(JSON.stringify(message));
        this.logger.debug(`[RealtimeService] Sent final_transcript to client ${clientId}`);
      } catch (error) {
        this.logger.error(`[RealtimeService] Error storing final transcript: ${error.message}`, error.stack);
      }
    } else {
      // Send interim transcript
      const message = {
        type: 'interim_transcript',
        text,
        speaker,
      };
      client.send(JSON.stringify(message));
      // Don't log every interim transcript to avoid spam, but log occasionally
      if (Math.random() < 0.1) {
        // Log ~10% of interim transcripts
        this.logger.debug(`[RealtimeService] Sent interim_transcript to client ${clientId}`);
      }
    }
  }
}

