import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PatientsService } from './patients.service';
import { PatientsController } from './patients.controller';
import { PatientsMigrationService } from './patients.migration';
import { Patient } from './entities/patient.entity';
import { Session } from '../sessions/entities/session.entity';
import { User } from '../users/entities/user.entity';
import { CommonModule } from '../common/common.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Patient, Session, User]),
    CommonModule,
    AuditModule,
  ],
  controllers: [PatientsController],
  providers: [PatientsService, PatientsMigrationService],
  exports: [PatientsService],
})
export class PatientsModule {}

