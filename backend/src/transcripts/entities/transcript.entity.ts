import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Session } from '../../sessions/entities/session.entity';
import { ClinicalExtraction } from '../../clinical/entities/clinical-extraction.entity';
import { createEncryptTransformer } from '../../common/typeorm-encrypt.transformer';

@Entity('transcripts')
export class Transcript {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'session_id' })
  sessionId: number;

  @ManyToOne(() => Session, (session) => session.transcripts)
  @JoinColumn({ name: 'session_id' })
  session: Session;

  @Column({ 
    type: 'text',
    transformer: createEncryptTransformer(),
  })
  text: string;

  @Column({ name: 'is_interim', default: false })
  isInterim: boolean;

  @Column({ nullable: true })
  speaker: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @OneToMany(() => ClinicalExtraction, (extraction) => extraction.transcript)
  clinicalExtractions: ClinicalExtraction[];
}

