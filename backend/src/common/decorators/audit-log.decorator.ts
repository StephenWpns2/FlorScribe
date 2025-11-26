import { SetMetadata } from '@nestjs/common';
import { AuditAction, AuditResourceType } from '../../audit/entities/audit-log.entity';

export const AUDIT_LOG_KEY = 'audit_log';

export interface AuditLogMetadata {
  action: AuditAction;
  resourceType: AuditResourceType;
  resourceIdParam?: string; // Parameter name that contains resource ID
  patientIdParam?: string; // Parameter name that contains patient ID
  sessionIdParam?: string; // Parameter name that contains session ID
}

export const AuditLog = (metadata: AuditLogMetadata) =>
  SetMetadata(AUDIT_LOG_KEY, metadata);

