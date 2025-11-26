import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { SOAPNote } from '../../soap/entities/soap-note.entity';

export enum ExportStatus {
  PENDING = 'pending',
  RETRYING = 'retrying',
  SUCCESS = 'success',
  FAILED = 'failed',
}

@Entity('export_logs')
export class ExportLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'soap_note_id' })
  soapNoteId: number;

  @ManyToOne(() => SOAPNote, (soapNote) => soapNote.exportLogs)
  @JoinColumn({ name: 'soap_note_id' })
  soapNote: SOAPNote;

  @Column({ name: 'ehr_provider' })
  ehrProvider: string; // epic, cerner, office_ally

  @Column({
    type: 'enum',
    enum: ExportStatus,
    default: ExportStatus.PENDING,
  })
  status: ExportStatus;

  @Column({ name: 'fhir_bundle', type: 'jsonb', nullable: true })
  fhirBundle: any;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: true })
  updatedAt: Date;
}

