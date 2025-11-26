import { IsString, IsOptional } from 'class-validator';

export class SearchPatientDto {
  @IsOptional()
  @IsString()
  search?: string;
}

