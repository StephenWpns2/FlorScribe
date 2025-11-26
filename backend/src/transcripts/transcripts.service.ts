import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transcript } from './entities/transcript.entity';

@Injectable()
export class TranscriptsService {
  constructor(
    @InjectRepository(Transcript)
    private transcriptsRepository: Repository<Transcript>,
  ) {}

  async create(transcriptData: Partial<Transcript>): Promise<Transcript> {
    const transcript = this.transcriptsRepository.create(transcriptData);
    return this.transcriptsRepository.save(transcript);
  }

  async findBySessionId(sessionId: number): Promise<Transcript[]> {
    return this.transcriptsRepository.find({
      where: { sessionId },
      order: { createdAt: 'ASC' },
    });
  }

  async getFullTranscript(sessionId: number): Promise<string> {
    const transcripts = await this.findBySessionId(sessionId);
    // Combine all final transcripts (non-interim)
    return transcripts
      .filter((t) => !t.isInterim)
      .map((t) => t.text)
      .join(' ');
  }

  async findById(id: number): Promise<Transcript | null> {
    return this.transcriptsRepository.findOne({ where: { id } });
  }

  async update(id: number, updateData: Partial<Transcript>): Promise<Transcript> {
    // Safety: Only allow updating specific fields to prevent accidental data loss
    const allowedFields = ['speaker']; // Only allow updating speaker field
    const filteredData: Partial<Transcript> = {};
    
    for (const field of allowedFields) {
      if (updateData[field] !== undefined && updateData[field] !== null) {
        filteredData[field] = updateData[field];
      }
    }
    
    if (Object.keys(filteredData).length === 0) {
      throw new Error('No valid fields to update');
    }
    
    await this.transcriptsRepository.update(id, filteredData);
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error(`Transcript with id ${id} not found`);
    }
    return updated;
  }
}

