import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PatientsService } from './patients.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { AuditLog } from '../common/decorators/audit-log.decorator';
import { AuditAction, AuditResourceType } from '../audit/entities/audit-log.entity';

@Controller('patients')
@UseGuards(JwtAuthGuard)
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Post()
  @AuditLog({
    action: AuditAction.CREATE,
    resourceType: AuditResourceType.PATIENT,
  })
  async create(
    @Body() createPatientDto: CreatePatientDto,
    @CurrentUser() user: User,
  ) {
    return this.patientsService.create(createPatientDto, user.id);
  }

  @Get()
  @AuditLog({
    action: AuditAction.VIEW,
    resourceType: AuditResourceType.PATIENT,
  })
  async findAll(
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number,
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit: number,
    @CurrentUser() user: User,
    @Query('search') search?: string,
  ) {
    const [patients, total] = await this.patientsService.findAll(skip, limit, search, user.id);
    return {
      patients,
      total,
      skip,
      limit,
    };
  }

  @Get('search')
  async search(
    @Query('q') query: string,
    @CurrentUser() user: User,
  ) {
    if (!query) {
      throw new BadRequestException('Search query is required');
    }
    return this.patientsService.search(query, user.id);
  }

  @Get(':id')
  @AuditLog({
    action: AuditAction.VIEW,
    resourceType: AuditResourceType.PATIENT,
    resourceIdParam: 'id',
    patientIdParam: 'id',
  })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    return this.patientsService.findOne(id, user.id);
  }

  @Get(':id/sessions')
  async getPatientSessions(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    const patient = await this.patientsService.getPatientSessions(id, user.id);
    return {
      patient,
      sessions: patient.sessions || [],
    };
  }

  @Put(':id')
  @AuditLog({
    action: AuditAction.UPDATE,
    resourceType: AuditResourceType.PATIENT,
    resourceIdParam: 'id',
    patientIdParam: 'id',
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePatientDto: UpdatePatientDto,
    @CurrentUser() user: User,
  ) {
    return this.patientsService.update(id, updatePatientDto, user.id);
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  async import(
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const fileExtension = file.originalname.split('.').pop()?.toLowerCase();

    if (fileExtension === 'csv') {
      return this.patientsService.importFromCSV(file);
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      return this.patientsService.importFromExcel(file);
    } else {
      throw new BadRequestException('Unsupported file type. Please upload CSV or Excel file.');
    }
  }
}

