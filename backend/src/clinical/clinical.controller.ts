import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ClinicalService } from './clinical.service';
import { ClinicalizeDto } from './dto/clinicalize.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TranscriptsService } from '../transcripts/transcripts.service';

@Controller('clinicalize')
export class ClinicalController {
  constructor(
    private clinicalService: ClinicalService,
    private transcriptsService: TranscriptsService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async clinicalize(@Body() dto: ClinicalizeDto) {
    
    let transcriptText: string;

    // Prioritize transcript_text if provided (even if session_id is also provided )
    // This handles the case where transcripts haven't been saved to DB yet
    if (dto.transcript_text ) {
      console.log("transcript_text is provided");
      transcriptText = dto.transcript_text;
    } else if (dto.session_id) {
      console.log("session_id is provided");
      transcriptText = await this.transcriptsService.getFullTranscript(
        dto.session_id,
      );
      if (transcriptText.length < 1) {
        console.log("transcript_text is not found");
        throw new NotFoundException('Transcript not found');
      }
    } else {
      throw new BadRequestException(
        'Either transcript_text or session_id must be provided',
      );
    }

    return this.clinicalService.extract(transcriptText, dto.session_id);
  }
}

