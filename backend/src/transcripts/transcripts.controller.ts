import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
  Query,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { TranscriptsService } from './transcripts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuditAction, AuditResourceType } from '../audit/entities/audit-log.entity';
import { AuditService } from '../audit/audit.service';
import { AuditLog } from '../common/decorators/audit-log.decorator';
import { RedactionService } from '../common/redaction.service';
import { SessionsService } from '../sessions/sessions.service';
import { PatientsService } from '../patients/patients.service';

@Controller('transcripts')
@UseGuards(JwtAuthGuard)
export class TranscriptsController {
  constructor(
    private transcriptsService: TranscriptsService,
    private auditService: AuditService,
    private redactionService: RedactionService,
    private sessionsService: SessionsService,
    private patientsService: PatientsService,
  ) {}

  @Get('session/:sessionId')
  @AuditLog({
    action: AuditAction.VIEW,
    resourceType: AuditResourceType.TRANSCRIPT,
    sessionIdParam: 'sessionId',
  })
  async getBySessionId(@Param('sessionId', ParseIntPipe) sessionId: number) {
    const transcripts = await this.transcriptsService.findBySessionId(sessionId);
    return { transcripts };
  }

  @Get(':id')
  @AuditLog({
    action: AuditAction.VIEW,
    resourceType: AuditResourceType.TRANSCRIPT,
    resourceIdParam: 'id',
  })
  async getById(@Param('id', ParseIntPipe) id: number) {
    const transcript = await this.transcriptsService.findById(id);
    if (!transcript) {
      throw new Error('Transcript not found');
    }
    return { transcript };
  }

  @Get(':id/redacted')
  async getRedactedTranscript(
    @Param('id', ParseIntPipe) id: number,
    @Query('redactNames') redactNames?: string,
    @Query('redactPhone') redactPhone?: string,
    @Query('redactEmail') redactEmail?: string,
    @Query('redactSSN') redactSSN?: string,
    @Req() request?: Request,
  ) {
    const transcript = await this.transcriptsService.findById(id);
    if (!transcript) {
      throw new Error('Transcript not found');
    }

    // Get session and patient info for comprehensive redaction
    const session = await this.sessionsService.findById(transcript.sessionId);
    const user = (request as any)?.user;
    const patient = session?.patientEntityId
      ? await this.patientsService.findOne(session.patientEntityId, user?.id || user?.userId)
      : null;

    // Parse query parameters (default to true for PHI)
    const redactionOptions = {
      redactNames: redactNames !== 'false',
      redactPhone: redactPhone !== 'false',
      redactEmail: redactEmail !== 'false',
      redactSSN: redactSSN !== 'false',
      redactDates: false, // Don't redact dates by default (medical dates are important)
    };

    let redactedText = transcript.text;
    let redactedItems: any[] = [];

    // Redact patient names if patient data is available
    if (patient && redactionOptions.redactNames) {
      const nameResult = this.redactionService.redactPatientNames(
        redactedText,
        patient,
      );
      redactedText = nameResult.redactedText;
      redactedItems = [...nameResult.redactedItems];
    }

    // Apply pattern-based redaction
    const patternResult = this.redactionService.redactText(
      redactedText,
      redactionOptions,
    );
    redactedText = patternResult.redactedText;
    redactedItems = [...redactedItems, ...patternResult.redactedItems];

    // Log the redaction action
    const user = (request as any)?.user;
    await this.auditService.log({
      userId: user?.id || user?.userId,
      userEmail: user?.email,
      sessionId: session?.id,
      patientId: patient?.id,
      action: AuditAction.REDACT,
      resourceType: AuditResourceType.TRANSCRIPT,
      resourceId: transcript.id,
      metadata: {
        redactedItems: redactedItems.map((item) => ({
          type: item.type,
          // Don't log the actual values for security
        })),
        redactionOptions,
      },
      ipAddress:
        request?.ip ||
        request?.headers['x-forwarded-for']?.toString().split(',')[0] ||
        request?.socket.remoteAddress,
      userAgent: request?.headers['user-agent'],
      requestPath: request?.path,
      requestMethod: request?.method,
    });

    return {
      redactedText,
      redactedItemsCount: redactedItems.length,
      originalLength: transcript.text.length,
      redactedLength: redactedText.length,
    };
  }
}

