import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum AuditAction {
  VIEW = 'VIEW',
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  EXPORT = 'EXPORT',
  REDACT = 'REDACT',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
}

export enum AuditResourceType {
  PATIENT = 'PATIENT',
  TRANSCRIPT = 'TRANSCRIPT',
  SOAP_NOTE = 'SOAP_NOTE',
  CLINICAL_EXTRACTION = 'CLINICAL_EXTRACTION',
  SESSION = 'SESSION',
  USER = 'USER',
  AUTH = 'AUTH',
}

@Entity('audit_logs')
@Index(['userId', 'createdAt'])
@Index(['patientId', 'createdAt'])
@Index(['sessionId', 'createdAt'])
@Index(['resourceType', 'resourceId'])
@Index(['action', 'createdAt'])
export class AuditLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id', nullable: true })
  @Index()
  userId: number;

  @Column({ name: 'user_email', nullable: true })
  userEmail: string;

  @Column({ name: 'session_id', nullable: true })
  @Index()
  sessionId: number;

  @Column({ name: 'patient_id', nullable: true })
  @Index()
  patientId: number;

  @Column({
    type: 'enum',
    enum: AuditAction,
  })
  @Index()
  action: AuditAction;

  @Column({
    type: 'enum',
    enum: AuditResourceType,
  })
  @Index()
  resourceType: AuditResourceType;

  @Column({ name: 'resource_id', nullable: true })
  @Index()
  resourceId: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>; // Additional context (IP address, user agent, redacted items, etc.)

  @Column({ name: 'ip_address', nullable: true })
  ipAddress: string;

  @Column({ name: 'user_agent', nullable: true, type: 'text' })
  userAgent: string;

  @Column({ name: 'request_path', nullable: true })
  requestPath: string;

  @Column({ name: 'request_method', nullable: true })
  requestMethod: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  @Index()
  createdAt: Date;
}



