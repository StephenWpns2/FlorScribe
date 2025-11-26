import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { ClinicalExtraction } from '../../clinical/entities/clinical-extraction.entity';
import { ExportLog } from '../../export/entities/export-log.entity';

@Entity('soap_notes')
export class SOAPNote {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'extraction_id', nullable: true })
  extractionId: number | null;

  @ManyToOne(() => ClinicalExtraction, (extraction) => extraction.soapNotes, { nullable: true })
  @JoinColumn({ name: 'extraction_id' })
  extraction: ClinicalExtraction | null;

  @Column({ name: 'html_content', type: 'text' })
  htmlContent: string;

  @Column({ name: 'billing_codes', type: 'jsonb', nullable: true })
  billingCodes: {
    icd10?: string[];
    cpt?: string[];
  };

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @OneToMany(() => ExportLog, (exportLog) => exportLog.soapNote)
  exportLogs: ExportLog[];
}

