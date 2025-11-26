import { Controller, Post, Body, UseGuards, HttpCode } from '@nestjs/common';
import { SoapService } from './soap.service';
import { ComposeDto } from './dto/compose.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuditLog } from '../common/decorators/audit-log.decorator';
import { AuditAction, AuditResourceType } from '../audit/entities/audit-log.entity';

@Controller('compose')
export class SoapController {
  constructor(private soapService: SoapService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  @AuditLog({
    action: AuditAction.CREATE,
    resourceType: AuditResourceType.SOAP_NOTE,
  })
  async compose(@Body() dto: ComposeDto) {
    return this.soapService.compose(
      dto.extraction_id,
      dto.clinical_extraction,
      dto.transcript_text,
    );
  }
}

