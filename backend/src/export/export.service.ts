import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExportLog, ExportStatus } from './entities/export-log.entity';
import { SOAPNote } from '../soap/entities/soap-note.entity';
import { ClinicalExtraction } from '../clinical/entities/clinical-extraction.entity';
import { FhirMapperService } from './fhir-mapper.service';
import axios from 'axios';

@Injectable()
export class ExportService {
  private baseUrls: Record<string, string> = {
    epic: 'https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4',
    cerner: 'https://fhir.cerner.com/millennium/r4',
    office_ally: 'https://api.officeally.com/fhir/r4',
  };

  constructor(
    @InjectRepository(ExportLog)
    private exportLogRepository: Repository<ExportLog>,
    @InjectRepository(SOAPNote)
    private soapNoteRepository: Repository<SOAPNote>,
    @InjectRepository(ClinicalExtraction)
    private clinicalExtractionRepository: Repository<ClinicalExtraction>,
    private fhirMapper: FhirMapperService,
  ) {}

  async export(
    soapNoteId: number,
    ehrProvider: string,
    patientId: string,
    practitionerId: string,
    clientId?: string,
    clientSecret?: string,
  ): Promise<{
    export_log_id: number;
    status: string;
    fhir_bundle: any;
    error_message: string | null;
    created_at: string;
  }> {
    // Get SOAP note
    const soapNote = await this.soapNoteRepository.findOne({
      where: { id: soapNoteId },
    });

    if (!soapNote) {
      throw new NotFoundException('SOAP note not found');
    }

    // Get clinical extraction
    const extraction = await this.clinicalExtractionRepository.findOne({
      where: { id: soapNote.extractionId },
    });

    if (!extraction) {
      throw new NotFoundException('Clinical extraction not found');
    }

    // Create FHIR bundle
    const fhirBundle = this.fhirMapper.mapToFhirBundle(
      extraction.jsonData,
      patientId,
      practitionerId,
    );

    // Create export log
    const exportLog = this.exportLogRepository.create({
      soapNoteId,
      ehrProvider,
      status: ExportStatus.PENDING,
      fhirBundle,
    });
    await this.exportLogRepository.save(exportLog);

    // Attempt export with retry logic
    const maxRetries = 3;
    let retryDelay = 1000;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Validate bundle
        if (!this.validateBundle(fhirBundle)) {
          throw new Error('Invalid FHIR bundle structure');
        }

        // If credentials provided, attempt to send
        if (clientId && clientSecret) {
          // In a real implementation, you would get an access token here
          // For now, we'll just mark as pending if credentials are provided
          // but don't have a full SMART auth implementation
          exportLog.status = ExportStatus.PENDING;
        } else {
          // No credentials, mark as pending
          exportLog.status = ExportStatus.PENDING;
        }

        await this.exportLogRepository.save(exportLog);

        return {
          export_log_id: exportLog.id,
          status: exportLog.status,
          fhir_bundle: exportLog.fhirBundle,
          error_message: exportLog.errorMessage,
          created_at: exportLog.createdAt.toISOString(),
        };
      } catch (error) {
        if (attempt < maxRetries - 1) {
          exportLog.status = ExportStatus.RETRYING;
          await this.exportLogRepository.save(exportLog);
          await this.sleep(retryDelay * Math.pow(2, attempt)); // Exponential backoff
        } else {
          exportLog.status = ExportStatus.FAILED;
          exportLog.errorMessage = error.message;
          await this.exportLogRepository.save(exportLog);

          throw new InternalServerErrorException(
            `Export failed after ${maxRetries} attempts: ${error.message}`,
          );
        }
      }
    }

    throw new InternalServerErrorException('Export failed');
  }

  private validateBundle(bundle: any): boolean {
    const requiredFields = ['resourceType', 'type', 'entry'];
    return requiredFields.every((field) => field in bundle);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

