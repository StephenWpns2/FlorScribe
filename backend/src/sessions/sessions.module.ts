import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SessionsService } from './sessions.service';
import { SessionsController } from './sessions.controller';
import { Session } from './entities/session.entity';
import { PatientsModule } from '../patients/patients.module';
import { TranscriptsModule } from '../transcripts/transcripts.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Session]),
    PatientsModule,
    TranscriptsModule,
  ],
  controllers: [SessionsController],
  providers: [SessionsService],
  exports: [SessionsService],
})
export class SessionsModule {}

