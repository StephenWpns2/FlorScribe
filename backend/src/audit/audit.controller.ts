import {
  Controller,
  Get,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  ParseEnumPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditResourceType } from './entities/audit-log.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('audit')
@UseGuards(JwtAuthGuard)
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Get('phi-access')
  async getPHIAccess(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit', new DefaultValuePipe(1000), ParseIntPipe) limit: number,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.auditService.findAccessToPHI(start, end, limit);
  }

  @Get('patient/:patientId')
  async getPatientLogs(
    @Param('patientId', ParseIntPipe) patientId: number,
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit: number,
  ) {
    return this.auditService.findByPatientId(patientId, limit);
  }

  @Get('user/:userId')
  async getUserLogs(
    @Param('userId', ParseIntPipe) userId: number,
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit: number,
  ) {
    return this.auditService.findByUserId(userId, limit);
  }

  @Get('session/:sessionId')
  async getSessionLogs(
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit: number,
  ) {
    return this.auditService.findBySessionId(sessionId, limit);
  }

  @Get('resource/:resourceType/:resourceId')
  async getResourceLogs(
    @Param('resourceType', new ParseEnumPipe(AuditResourceType))
    resourceType: AuditResourceType,
    @Param('resourceId', ParseIntPipe) resourceId: number,
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit: number,
  ) {
    return this.auditService.findByResource(resourceType, resourceId, limit);
  }

  @Get('recent')
  async getRecentLogs(
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit: number,
  ) {
    return this.auditService.findRecent(limit);
  }
}

