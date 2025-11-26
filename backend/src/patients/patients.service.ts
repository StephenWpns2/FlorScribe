import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Patient } from './entities/patient.entity';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class PatientsService {
  constructor(
    @InjectRepository(Patient)
    private patientsRepository: Repository<Patient>,
  ) {}

  async create(createPatientDto: CreatePatientDto, userId: number): Promise<Patient> {
    try {
      // Generate patientId if not provided
      if (!createPatientDto.patientId) {
        createPatientDto.patientId = uuidv4();
      }

      // Check if patientId already exists for this user
      const existingPatient = await this.patientsRepository.findOne({
        where: { patientId: createPatientDto.patientId, userId },
      });
      if (existingPatient) {
        throw new BadRequestException('Patient ID already exists');
      }

      // Convert dateOfBirth string to Date if provided
      const patientData: any = { ...createPatientDto, userId };
      if (createPatientDto.dateOfBirth) {
        patientData.dateOfBirth = new Date(createPatientDto.dateOfBirth);
      }

      // Convert empty strings to null for optional fields
      const optionalStringFields = [
        'email', 'gender', 'address', 'nationalId', 'ethnicity',
        'pastMedicalHistory', 'familyMedicalHistory', 'currentMedications',
        'allergies', 'pastSurgeries'
      ];
      for (const field of optionalStringFields) {
        if (patientData[field] === '') {
          patientData[field] = null;
        }
      }

      // Ensure JSONB fields are properly formatted
      if (patientData.nextOfKin && typeof patientData.nextOfKin === 'string') {
        try {
          patientData.nextOfKin = JSON.parse(patientData.nextOfKin);
        } catch (e) {
          // If parsing fails, set to null
          patientData.nextOfKin = null;
        }
      }
      if (patientData.insuranceDetails && typeof patientData.insuranceDetails === 'string') {
        try {
          patientData.insuranceDetails = JSON.parse(patientData.insuranceDetails);
        } catch (e) {
          patientData.insuranceDetails = null;
        }
      }
      if (patientData.lifestyleFactors && typeof patientData.lifestyleFactors === 'string') {
        try {
          patientData.lifestyleFactors = JSON.parse(patientData.lifestyleFactors);
        } catch (e) {
          patientData.lifestyleFactors = null;
        }
      }

      const patient = this.patientsRepository.create(patientData);
      const savedPatient = await this.patientsRepository.save(patient);
      // TypeORM save() can return single entity or array, but we're saving a single entity
      return (Array.isArray(savedPatient) ? savedPatient[0] : savedPatient) as Patient;
    } catch (error) {
      console.error('[PatientsService] Error creating patient:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      // Check for database constraint violations
      if (error instanceof Error && error.message.includes('duplicate key')) {
        throw new BadRequestException('A patient with this information already exists');
      }
      // Re-throw with more context
      throw new BadRequestException(
        `Failed to create patient: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async findAll(
    skip: number = 0,
    limit: number = 100,
    search?: string,
    userId?: number,
  ): Promise<[Patient[], number]> {
    const queryBuilder = this.patientsRepository.createQueryBuilder('patient');

    // Always filter by userId if provided
    if (userId) {
      queryBuilder.where('patient.userId = :userId', { userId });
    }

    if (search) {
      const searchCondition = userId
        ? '(patient.userId = :userId AND (LOWER(patient.firstName) LIKE LOWER(:search) OR LOWER(patient.lastName) LIKE LOWER(:search) OR LOWER(CONCAT(patient.firstName, \' \', patient.lastName)) LIKE LOWER(:search)))'
        : '(LOWER(patient.firstName) LIKE LOWER(:search) OR LOWER(patient.lastName) LIKE LOWER(:search) OR LOWER(CONCAT(patient.firstName, \' \', patient.lastName)) LIKE LOWER(:search))';
      
      queryBuilder.where(searchCondition, { 
        search: `%${search}%`,
        ...(userId && { userId })
      });
    }

    queryBuilder.skip(skip).take(limit).orderBy('patient.createdAt', 'DESC');

    return queryBuilder.getManyAndCount();
  }

  async findOne(id: number, userId?: number): Promise<Patient> {
    const where: any = { id };
    if (userId) {
      where.userId = userId;
    }

    const patient = await this.patientsRepository.findOne({
      where,
      relations: ['sessions'],
    });

    if (!patient) {
      throw new NotFoundException(`Patient with ID ${id} not found`);
    }

    return patient;
  }

  async findByPatientId(patientId: string, userId?: number): Promise<Patient | null> {
    const where: any = { patientId };
    if (userId) {
      where.userId = userId;
    }
    return this.patientsRepository.findOne({
      where,
    });
  }

  async search(searchQuery: string, userId?: number): Promise<Patient[]> {
    const where: any[] = [
      { firstName: ILike(`%${searchQuery}%`) },
      { lastName: ILike(`%${searchQuery}%`) },
    ];
    
    if (userId) {
      where.forEach(condition => {
        condition.userId = userId;
      });
    }
    
    return this.patientsRepository.find({
      where,
      take: 50,
      order: { createdAt: 'DESC' },
    });
  }

  async update(id: number, updatePatientDto: UpdatePatientDto, userId?: number): Promise<Patient> {
    const patient = await this.findOne(id, userId);

    // Check if patientId is being updated and if it conflicts (within same user)
    if (updatePatientDto.patientId && updatePatientDto.patientId !== patient.patientId) {
      const where: any = { patientId: updatePatientDto.patientId };
      if (userId) {
        where.userId = userId;
      }
      const existingPatient = await this.patientsRepository.findOne({
        where,
      });
      if (existingPatient) {
        throw new BadRequestException('Patient ID already exists');
      }
    }

    // Convert dateOfBirth string to Date if provided
    const updateData: any = { ...updatePatientDto };
    if (updatePatientDto.dateOfBirth) {
      updateData.dateOfBirth = new Date(updatePatientDto.dateOfBirth);
    }

    Object.assign(patient, updateData);
    return this.patientsRepository.save(patient);
  }

  async getPatientSessions(id: number, userId?: number): Promise<Patient> {
    const where: any = { id };
    if (userId) {
      where.userId = userId;
    }

    const patient = await this.patientsRepository.findOne({
      where,
      relations: ['sessions', 'sessions.transcripts'],
    });

    if (!patient) {
      throw new NotFoundException(`Patient with ID ${id} not found`);
    }

    return patient;
  }

  async importFromCSV(file: Express.Multer.File): Promise<{ created: number; updated: number; errors: string[] }> {
    // This will be implemented after installing csv-parse
    // For now, throw an error indicating it needs to be implemented
    throw new BadRequestException('CSV import not yet implemented. Please install csv-parse package.');
  }

  async importFromExcel(file: Express.Multer.File): Promise<{ created: number; updated: number; errors: string[] }> {
    // This will be implemented after installing xlsx or exceljs
    // For now, throw an error indicating it needs to be implemented
    throw new BadRequestException('Excel import not yet implemented. Please install xlsx or exceljs package.');
  }
}

