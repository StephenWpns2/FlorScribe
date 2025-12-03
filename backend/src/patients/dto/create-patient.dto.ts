import {
  IsString,
  IsEmail,
  IsOptional,
  IsNotEmpty,
  IsDateString,
  IsObject,
  ValidateIf,
} from 'class-validator';

export class CreatePatientDto {
  @IsOptional()
  @IsString()
  patientId?: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsOptional()
  @ValidateIf((o) => o.email !== undefined && o.email !== null && o.email !== '')
  @IsEmail()
  email?: string;

  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

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

