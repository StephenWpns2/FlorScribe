import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Session } from '../../sessions/entities/session.entity';
import { User } from '../../users/entities/user.entity';
import { createEncryptTransformer } from '../../common/typeorm-encrypt.transformer';

@Entity('patients')
export class Patient {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id', nullable: true })
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'patient_id', nullable: true })
  patientId: string;

  @Column({ name: 'first_name', nullable: false })
  firstName: string;

  @Column({ name: 'last_name', nullable: false })
  lastName: string;

  @Column({ 
    nullable: true,
    transformer: createEncryptTransformer(),
  })
  email: string;

  @Column({ 
    name: 'phone_number', 
    nullable: false,
    transformer: createEncryptTransformer(),
  })
  phoneNumber: string;

  @Column({ name: 'date_of_birth', type: 'date', nullable: true })
  dateOfBirth: Date;

  @Column({ nullable: true })
  gender: string;

  @Column({ 
    type: 'text', 
    nullable: true,
    transformer: createEncryptTransformer(),
  })
  address: string;

  @Column({ name: 'next_of_kin', type: 'jsonb', nullable: true })
  nextOfKin: Record<string, any>;

  @Column({ name: 'insurance_details', type: 'jsonb', nullable: true })
  insuranceDetails: Record<string, any>;

  @Column({ 
    name: 'national_id', 
    nullable: true,
    transformer: createEncryptTransformer(),
  })
  nationalId: string;

  @Column({ nullable: true })
  ethnicity: string;

  @Column({ name: 'past_medical_history', type: 'text', nullable: true })
  pastMedicalHistory: string;

  @Column({ name: 'family_medical_history', type: 'text', nullable: true })
  familyMedicalHistory: string;

  @Column({ name: 'lifestyle_factors', type: 'jsonb', nullable: true })
  lifestyleFactors: Record<string, any>;

  @Column({ name: 'current_medications', type: 'text', nullable: true })
  currentMedications: string;

  @Column({ type: 'text', nullable: true })
  allergies: string;

  @Column({ name: 'past_surgeries', type: 'text', nullable: true })
  pastSurgeries: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: true })
  updatedAt: Date;

  @OneToMany(() => Session, (session) => session.patient)
  sessions: Session[];
}

