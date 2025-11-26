import { IsNumber, IsString, IsOptional, IsIn } from 'class-validator';

export class ExportDto {
  @IsNumber()
  soap_note_id: number;

  @IsString()
  @IsIn(['epic', 'cerner', 'office_ally'])
  ehr_provider: string;

  @IsString()
  patient_id: string;

  @IsString()
  practitioner_id: string;

  @IsOptional()
  @IsString()
  client_id?: string;

  @IsOptional()
  @IsString()
  client_secret?: string;
}

