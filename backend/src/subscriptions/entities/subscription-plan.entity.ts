import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum PlanType {
  LITE = 'LITE',
  PRO = 'PRO',
  ENTERPRISE = 'ENTERPRISE',
}

@Entity('subscription_plans')
export class SubscriptionPlan {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: PlanType, unique: true })
  planType: PlanType;

  @Column()
  name: string;

  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @Column({ name: 'audio_hours_limit', nullable: true })
  audioHoursLimit: number | null; // null means unlimited

  @Column({ name: 'notes_limit', nullable: true })
  notesLimit: number | null; // null means unlimited

  @Column('jsonb', { nullable: true })
  features: {
    multiUser?: boolean;
    ehrIntegration?: boolean;
    [key: string]: any;
  } | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: true })
  updatedAt: Date;
}

