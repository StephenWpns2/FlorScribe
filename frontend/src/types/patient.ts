export interface Patient {
  id: number;
  patientId?: string;
  firstName: string;
  lastName: string;
  email?: string;
  phoneNumber: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  nextOfKin?: Record<string, any>;
  insuranceDetails?: Record<string, any>;
  nationalId?: string;
  ethnicity?: string;
  pastMedicalHistory?: string;
  familyMedicalHistory?: string;
  lifestyleFactors?: Record<string, any>;
  currentMedications?: string;
  allergies?: string;
  pastSurgeries?: string;
  createdAt?: string;
  updatedAt?: string;
  sessions?: Session[];
}

export interface Session {
  id: number;
  userId: number;
  patientId?: string;
  patientName?: string;
  patientEntityId?: number;
  status: string;
  startedAt?: string;
  endedAt?: string;
  createdAt?: string;
}

export interface CreatePatientDto {
  patientId?: string;
  firstName: string;
  lastName: string;
  email?: string;
  phoneNumber: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  nextOfKin?: Record<string, any>;
  insuranceDetails?: Record<string, any>;
  nationalId?: string;
  ethnicity?: string;
  pastMedicalHistory?: string;
  familyMedicalHistory?: string;
  lifestyleFactors?: Record<string, any>;
  currentMedications?: string;
  allergies?: string;
  pastSurgeries?: string;
}

export interface UpdatePatientDto {
  patientId?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  nextOfKin?: Record<string, any>;
  insuranceDetails?: Record<string, any>;
  nationalId?: string;
  ethnicity?: string;
  pastMedicalHistory?: string;
  familyMedicalHistory?: string;
  lifestyleFactors?: Record<string, any>;
  currentMedications?: string;
  allergies?: string;
  pastSurgeries?: string;
}

