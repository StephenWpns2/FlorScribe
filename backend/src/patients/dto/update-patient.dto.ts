import {
  IsString,
  IsEmail,
  IsOptional,
  IsDateString,
  IsObject,
} from 'class-validator';

export class UpdatePatientDto {
  @IsOptional()
  @IsString()
  patientId?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsObject()
  nextOfKin?: Record<string, any>;

  @IsOptional()
  @IsObject()
  insuranceDetails?: Record<string, any>;

  @IsOptional()
  @IsString()
  nationalId?: string;

  @IsOptional()
  @IsString()
  ethnicity?: string;

  @IsOptional()
  @IsString()
  pastMedicalHistory?: string;

  @IsOptional()
  @IsString()
  familyMedicalHistory?: string;

  @IsOptional()
  @IsObject()
  lifestyleFactors?: Record<string, any>;

  @IsOptional()
  @IsString()
  currentMedications?: string;

  @IsOptional()
  @IsString()
  allergies?: string;

  @IsOptional()
  @IsString()
  pastSurgeries?: string;
}

