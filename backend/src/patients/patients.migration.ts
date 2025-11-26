import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Patient } from './entities/patient.entity';
import { Session } from '../sessions/entities/session.entity';
import { User } from '../users/entities/user.entity';

/**
 * Migration service to populate user_id for existing patients
 * This runs once on application startup to migrate existing data
 */
@Injectable()
export class PatientsMigrationService implements OnModuleInit {
  private readonly logger = new Logger(PatientsMigrationService.name);

  constructor(
    @InjectRepository(Patient)
    private patientsRepository: Repository<Patient>,
    @InjectRepository(Session)
    private sessionsRepository: Repository<Session>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async onModuleInit() {
    await this.migratePatientsUserId();
  }

  async migratePatientsUserId() {
    try {
      // Find all patients without a user_id using query builder
      const patientsWithoutUserId = await this.patientsRepository
        .createQueryBuilder('patient')
        .where('patient.userId IS NULL')
        .getMany();

      if (patientsWithoutUserId.length === 0) {
        this.logger.log('No patients need migration - all patients already have user_id');
        return;
      }

      this.logger.log(`Found ${patientsWithoutUserId.length} patients without user_id. Starting migration...`);

      // Get the first active user (or create a default one if needed)
      let defaultUser = await this.usersRepository.findOne({
        where: { isActive: true },
        order: { id: 'ASC' },
      });

      if (!defaultUser) {
        this.logger.warn('No active users found. Cannot migrate patients.');
        return;
      }

      let migratedCount = 0;
      let assignedFromSessions = 0;

      for (const patient of patientsWithoutUserId) {
        // Try to find user_id from sessions associated with this patient
        const session = await this.sessionsRepository.findOne({
          where: { patientEntityId: patient.id },
          order: { createdAt: 'DESC' },
        });

        if (session && session.userId) {
          // Assign patient to the user from the most recent session
          patient.userId = session.userId;
          assignedFromSessions++;
        } else {
          // Assign to default user
          patient.userId = defaultUser.id;
        }

        await this.patientsRepository.save(patient);
        migratedCount++;
      }

      this.logger.log(
        `Migration complete: ${migratedCount} patients migrated. ` +
        `${assignedFromSessions} assigned from sessions, ${migratedCount - assignedFromSessions} assigned to default user (${defaultUser.email})`,
      );

      // After migration, we can make the column NOT NULL
      // But we'll leave it nullable for now to avoid breaking existing code
      // You can manually run: ALTER TABLE patients ALTER COLUMN user_id SET NOT NULL;
    } catch (error) {
      this.logger.error(`Error during patients migration: ${error.message}`, error.stack);
    }
  }
}

