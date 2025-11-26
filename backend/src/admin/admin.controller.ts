import {
  Controller,
  Get,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ExportStatus } from '../export/entities/export-log.entity';

@Controller('admin')
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('sessions')
  async getSessions(
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number,
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit: number,
    @Query('user_id') userId?: string,
  ) {
    const userIdNum = userId ? parseInt(userId, 10) : undefined;
    return this.adminService.getSessions(skip, limit, userIdNum);
  }

  @Get('notes')
  async getNotes(
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number,
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit: number,
  ) {
    return this.adminService.getNotes(skip, limit);
  }

  @Get('export-logs')
  async getExportLogs(
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number,
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit: number,
    @Query('status') status?: ExportStatus,
  ) {
    return this.adminService.getExportLogs(skip, limit, status);
  }

  @Get('stats')
  async getStats() {
    return this.adminService.getStats();
  }
}

