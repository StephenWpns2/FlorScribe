import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog, AuditAction, AuditResourceType } from './entities/audit-log.entity';

export interface AuditLogData {
  userId?: number;
  userEmail?: string;
  sessionId?: number;
  patientId?: number;
  action: AuditAction;
  resourceType: AuditResourceType;
  resourceId?: number;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  requestPath?: string;
  requestMethod?: string;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
  ) {}

  async log(data: AuditLogData): Promise<AuditLog> {
    const auditLog = this.auditLogRepository.create(data);
    return this.auditLogRepository.save(auditLog);
  }

  async findByUserId(userId: number, limit = 100): Promise<AuditLog[]> {
    return this.auditLogRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async findByPatientId(patientId: number, limit = 100): Promise<AuditLog[]> {
    return this.auditLogRepository.find({
      where: { patientId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async findBySessionId(sessionId: number, limit = 100): Promise<AuditLog[]> {
    return this.auditLogRepository.find({
      where: { sessionId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async findByResource(
    resourceType: AuditResourceType,
    resourceId: number,
    limit = 100,
  ): Promise<AuditLog[]> {
    return this.auditLogRepository.find({
      where: { resourceType, resourceId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async findRecent(limit = 100): Promise<AuditLog[]> {
    return this.auditLogRepository.find({
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async findAccessToPHI(
    startDate?: Date,
    endDate?: Date,
    limit = 1000,
  ): Promise<AuditLog[]> {
    const query = this.auditLogRepository
      .createQueryBuilder('audit')
      .where('audit.resourceType IN (:...phiTypes)', {
        phiTypes: [
          AuditResourceType.PATIENT,
          AuditResourceType.TRANSCRIPT,
          AuditResourceType.SOAP_NOTE,
          AuditResourceType.CLINICAL_EXTRACTION,
        ],
      })
      .orderBy('audit.createdAt', 'DESC')
      .take(limit);

    if (startDate) {
      query.andWhere('audit.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      query.andWhere('audit.createdAt <= :endDate', { endDate });
    }

    return query.getMany();
  }
}

