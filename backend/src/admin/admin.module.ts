import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { Session } from '../sessions/entities/session.entity';
import { SOAPNote } from '../soap/entities/soap-note.entity';
import { ExportLog } from '../export/entities/export-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Session, SOAPNote, ExportLog])],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}

