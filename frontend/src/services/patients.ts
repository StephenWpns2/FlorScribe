/* eslint-disable @typescript-eslint/no-explicit-any */
import api from './api';
import type { Patient, CreatePatientDto, UpdatePatientDto } from '../types/patient';

export interface PatientsResponse {
  patients: Patient[];
  total: number;
  skip: number;
  limit: number;
}

export interface PatientSessionsResponse {
  patient: Patient;
  sessions: any[];
}

export interface ImportResponse {
  created: number;
  updated: number;
  errors: string[];
}

export const patientsService = {
  async createPatient(data: CreatePatientDto): Promise<Patient> {
    const response = await api.post('/api/patients', data);
    return response.data;
  },

  async getPatients(
    skip: number = 0,
    limit: number = 100,
    search?: string,
  ): Promise<PatientsResponse> {
    const params: any = { skip, limit };
    if (search) {
      params.search = search;
    }
    const response = await api.get('/api/patients', { params });
    return response.data;
  },

  async getPatient(id: number): Promise<Patient> {
    const response = await api.get(`/api/patients/${id}`);
    return response.data;
  },

  async getPatientSessions(id: number): Promise<PatientSessionsResponse> {
    const response = await api.get(`/api/patients/${id}/sessions`);
    return response.data;
  },

  async updatePatient(id: number, data: UpdatePatientDto): Promise<Patient> {
    const response = await api.put(`/api/patients/${id}`, data);
    return response.data;
  },

  async searchPatients(query: string): Promise<Patient[]> {
    const response = await api.get('/api/patients/search', {
      params: { q: query },
    });
    return response.data;
  },

  async importPatients(file: File): Promise<ImportResponse> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/api/patients/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

export default patientsService;

