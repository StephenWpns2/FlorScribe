import { Controller, Post, Body, UseGuards, HttpCode } from '@nestjs/common';
import { ExportService } from './export.service';
import { ExportDto } from './dto/export.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuditLog } from '../common/decorators/audit-log.decorator';
import { AuditAction, AuditResourceType } from '../audit/entities/audit-log.entity';

@Controller('export')
export class ExportController {
  constructor(private exportService: ExportService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  @AuditLog({
    action: AuditAction.EXPORT,
    resourceType: AuditResourceType.SOAP_NOTE,
    resourceIdParam: 'soap_note_id',
    patientIdParam: 'patient_id',
  })
  async export(@Body() dto: ExportDto) {
    return this.exportService.export(
      dto.soap_note_id,
      dto.ehr_provider,
      dto.patient_id,
      dto.practitioner_id,
      dto.client_id,
      dto.client_secret,
    );
  }
}

