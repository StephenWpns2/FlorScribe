import { IsString, IsOptional, IsNumber, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';

export class ClinicalizeDto {
  @ValidateIf((o) => !o.session_id)
  @IsString()
  transcript_text?: string;

  @ValidateIf((o) => !o.transcript_text)
  @Type(() => Number)
  @IsNumber()
  session_id?: number;
}

