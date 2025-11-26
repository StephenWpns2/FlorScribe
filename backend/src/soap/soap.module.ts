import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SoapController } from './soap.controller';
import { SoapService } from './soap.service';
import { SOAPNote } from './entities/soap-note.entity';
import { ClinicalExtraction } from '../clinical/entities/clinical-extraction.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SOAPNote, ClinicalExtraction])],
  controllers: [SoapController],
  providers: [SoapService],
  exports: [SoapService],
})
export class SoapModule {}

