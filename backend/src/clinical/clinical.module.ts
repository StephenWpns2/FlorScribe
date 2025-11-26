import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClinicalController } from './clinical.controller';
import { ClinicalService } from './clinical.service';
import { ClinicalExtraction } from './entities/clinical-extraction.entity';
import { TranscriptsModule } from '../transcripts/transcripts.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ClinicalExtraction]),
    TranscriptsModule,
  ],
  controllers: [ClinicalController],
  providers: [ClinicalService],
  exports: [ClinicalService],
})
export class ClinicalModule {}

