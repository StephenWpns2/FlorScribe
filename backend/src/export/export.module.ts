import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExportController } from './export.controller';
import { ExportService } from './export.service';
import { FhirMapperService } from './fhir-mapper.service';
import { ExportLog } from './entities/export-log.entity';
import { SOAPNote } from '../soap/entities/soap-note.entity';
import { ClinicalExtraction } from '../clinical/entities/clinical-extraction.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ExportLog, SOAPNote, ClinicalExtraction]),
  ],
  controllers: [ExportController],
  providers: [ExportService, FhirMapperService],
  exports: [ExportService],
})
export class ExportModule {}

