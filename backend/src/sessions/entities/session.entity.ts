import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Transcript } from '../../transcripts/entities/transcript.entity';
import { Patient } from '../../patients/entities/patient.entity';

export enum SessionStatus {
  ACTIVE = 'ACTIVE',
  ENDED = 'ENDED',
  CANCELLED = 'CANCELLED',
}

@Entity('sessions')
export class Session {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'patient_id', nullable: true })
  patientId: string;

  @Column({ name: 'patient_name', nullable: true })
  patientName: string;

  @Column({ name: 'patient_entity_id', nullable: true })
  patientEntityId: number;

  @ManyToOne(() => Patient, { nullable: true })
  @JoinColumn({ name: 'patient_entity_id' })
  patient: Patient;

  @Column({
    type: 'enum',
    enum: SessionStatus,
    default: SessionStatus.ACTIVE,
  })
  status: SessionStatus;

  @Column({ name: 'started_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  startedAt: Date;

  @Column({ name: 'ended_at', type: 'timestamptz', nullable: true })
  endedAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @OneToMany(() => Transcript, (transcript) => transcript.session)
  transcripts: Transcript[];
}

