import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SoapController } from './soap.controller';
import { SoapService } from './soap.service';
import { SOAPNote } from './entities/soap-note.entity';
import { ClinicalExtraction } from '../clinical/entities/clinical-extraction.entity';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SOAPNote, ClinicalExtraction]),
    SubscriptionsModule,
  ],
  controllers: [SoapController],
  providers: [SoapService],
  exports: [SoapService],
})
export class SoapModule {}

