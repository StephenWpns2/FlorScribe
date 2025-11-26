import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Session } from '../sessions/entities/session.entity';
import { SOAPNote } from '../soap/entities/soap-note.entity';
import { ExportLog, ExportStatus } from '../export/entities/export-log.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Session)
    private sessionsRepository: Repository<Session>,
    @InjectRepository(SOAPNote)
    private soapNotesRepository: Repository<SOAPNote>,
    @InjectRepository(ExportLog)
    private exportLogsRepository: Repository<ExportLog>,
  ) {}

  async getSessions(
    skip: number = 0,
    limit: number = 100,
    userId?: number,
  ): Promise<{ sessions: any[]; total: number }> {
    const where: any = {};
    if (userId) {
      where.userId = userId;
    }

    const [sessions, total] = await this.sessionsRepository.findAndCount({
      where,
      relations: ['user'],
      skip,
      take: Math.min(limit, 1000), // Max 1000
      order: { createdAt: 'DESC' },
    });

    return {
      sessions: sessions.map((session) => ({
        id: session.id,
        user_id: session.userId,
        user_email: session.user?.email,
        patient_id: session.patientId,
        patient_name: session.patientName,
        patient_entity_id: session.patientEntityId || null,
        status: session.status,
        started_at: session.startedAt?.toISOString(),
        ended_at: session.endedAt?.toISOString() || null,
        created_at: session.createdAt.toISOString(),
      })),
      total,
    };
  }

  async getNotes(
    skip: number = 0,
    limit: number = 100,
  ): Promise<{ notes: any[]; total: number }> {
    const [notes, total] = await this.soapNotesRepository.findAndCount({
      relations: ['extraction'],
      skip,
      take: Math.min(limit, 1000), // Max 1000
      order: { createdAt: 'DESC' },
    });

    return {
      notes: notes.map((note) => ({
        id: note.id,
        extraction_id: note.extractionId,
        created_at: note.createdAt.toISOString(),
      })),
      total,
    };
  }

  async getExportLogs(
    skip: number = 0,
    limit: number = 100,
    status?: ExportStatus,
  ): Promise<{ logs: any[]; total: number }> {
    const where: any = {};
    if (status) {
      where.status = status;
    }

    const [logs, total] = await this.exportLogsRepository.findAndCount({
      where,
      relations: ['soapNote'],
      skip,
      take: Math.min(limit, 1000), // Max 1000
      order: { createdAt: 'DESC' },
    });

    return {
      logs: logs.map((log) => ({
        id: log.id,
        soap_note_id: log.soapNoteId,
        ehr_provider: log.ehrProvider,
        status: log.status,
        error_message: log.errorMessage,
        created_at: log.createdAt.toISOString(),
        updated_at: log.updatedAt?.toISOString() || null,
      })),
      total,
    };
  }

  async getStats(): Promise<{
    total_sessions: number;
    total_notes: number;
    total_exports: number;
    successful_exports: number;
    export_success_rate: number;
  }> {
    const [, totalSessions] = await this.sessionsRepository.findAndCount();
    const [, totalNotes] = await this.soapNotesRepository.findAndCount();
    const [, totalExports] = await this.exportLogsRepository.findAndCount();
    const [, successfulExports] = await this.exportLogsRepository.findAndCount({
      where: { status: ExportStatus.SUCCESS },
    });

    const exportSuccessRate =
      totalExports > 0 ? (successfulExports / totalExports) * 100 : 0;

    return {
      total_sessions: totalSessions,
      total_notes: totalNotes,
      total_exports: totalExports,
      successful_exports: successfulExports,
      export_success_rate: parseFloat(exportSuccessRate.toFixed(2)),
    };
  }
}

