import { IsNumber, IsObject, IsOptional, IsString, ValidateIf } from 'class-validator';

export class ComposeDto {
  @ValidateIf((o) => !o.clinical_extraction)
  @IsNumber()
  extraction_id?: number;

  @ValidateIf((o) => !o.extraction_id)
  @IsObject()
  clinical_extraction?: {
    problems?: Array<any>;
    medications?: Array<any>;
    orders?: Array<any>;
    vitals?: Array<any>;
  };

  @IsOptional()
  @IsString()
  transcript_text?: string;
}

