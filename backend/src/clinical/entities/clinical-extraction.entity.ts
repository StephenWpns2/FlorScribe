import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Transcript } from '../../transcripts/entities/transcript.entity';
import { SOAPNote } from '../../soap/entities/soap-note.entity';

@Entity('clinical_extractions')
export class ClinicalExtraction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'transcript_id' })
  transcriptId: number;

  @ManyToOne(() => Transcript, (transcript) => transcript.clinicalExtractions)
  @JoinColumn({ name: 'transcript_id' })
  transcript: Transcript;

  @Column({ name: 'json_data', type: 'jsonb', nullable: true })
  jsonData: {
    problems?: Array<{
      description: string;
      icd10_code?: string;
      confidence?: number;
    }>;
    medications?: Array<{
      name: string;
      dosage?: string;
      frequency?: string;
      route?: string;
      normalized_name?: string;
    }>;
    orders?: Array<{
      type: string;
      description: string;
      cpt_code?: string;
      confidence?: number;
    }>;
    vitals?: Array<{
      type: string;
      value: string;
      unit?: string;
      normalized_value?: number;
    }>;
    icd10_codes?: Array<{
      code: string;
      description: string;
      confidence?: number;
    }>;
    cpt_codes?: Array<{
      code: string;
      description: string;
      confidence?: number;
    }>;
  };

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @OneToMany(() => SOAPNote, (soapNote) => soapNote.extraction)
  soapNotes: SOAPNote[];
}

