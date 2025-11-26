import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ClinicalExtraction } from "./entities/clinical-extraction.entity";
import { TranscriptsService } from "../transcripts/transcripts.service";
import OpenAI from "openai";

@Injectable()
export class ClinicalService {
  private openai: OpenAI;

  constructor(
    @InjectRepository(ClinicalExtraction)
    private clinicalExtractionRepository: Repository<ClinicalExtraction>,
    private transcriptsService: TranscriptsService,
    private configService: ConfigService
  ) {
    const openaiApiKey = this.configService.get<string>("OPENAI_API_KEY") || "";
    if (!openaiApiKey) {
      throw new BadRequestException("OpenAI API key not configured");
    }
    this.openai = new OpenAI({
      apiKey: openaiApiKey,
    });
  }

  async extract(transcriptText: string, sessionId?: number): Promise<any> {
    console.log("sessionId", sessionId);

    const systemPrompt = `You are a medical transcription AI that extracts structured clinical information from doctor-patient conversations.

Extract the following information:
1. Problems/Diagnoses: Chief complaints, diagnoses mentioned
2. Medications: All medications mentioned with dosage, frequency, route
3. Orders: Lab tests, imaging studies, procedures ordered
4. Vital Signs: Blood pressure, temperature, heart rate, etc.
5. ICD-10 codes: Map diagnoses to ICD-10 codes
6. CPT codes: Map procedures/orders to CPT codes

Return a JSON object with this exact structure:
{
  "problems": [{"description": "...", "icd10_code": "...", "confidence": 0.0-1.0}],
  "medications": [{"name": "...", "dosage": "...", "frequency": "...", "route": "...", "normalized_name": "..."}],
  "orders": [{"type": "lab|imaging|procedure", "description": "...", "cpt_code": "...", "confidence": 0.0-1.0}],
  "vitals": [{"type": "...", "value": "...", "unit": "...", "normalized_value": 0.0}],
  "icd10_codes": [{"code": "...", "description": "...", "confidence": 0.0-1.0}],
  "cpt_codes": [{"code": "...", "description": "...", "confidence": 0.0-1.0}]
}

Be thorough and extract all clinical information. Use null for missing fields.`;

    const userPrompt = `Extract clinical information from this medical transcript:\n\n${transcriptText}`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
      });

      console.log("response", completion);

      const extractionData = completion.choices[0].message.content;
      if (!extractionData) {
        throw new BadRequestException("No content returned from OpenAI");
      }
      const jsonData = JSON.parse(extractionData);

      // Save to database if session_id provided
      if (sessionId) {
        const transcripts =
          await this.transcriptsService.findBySessionId(sessionId);
        if (transcripts.length === 0) {
          throw new NotFoundException("Transcript not found");
        }
        const transcript = transcripts[transcripts.length - 1]; // Use latest transcript

        const clinicalExtraction = this.clinicalExtractionRepository.create({
          transcriptId: transcript.id,
          jsonData,
        });
        await this.clinicalExtractionRepository.save(clinicalExtraction);
      }

      return {
        ...jsonData,
        created_at: new Date().toISOString(),
      };
    } catch (error) {
      console.log("error", error);
      if (error instanceof NotFoundException) {
        throw error;
      }

      // Better error handling for OpenAI API errors
      if (error instanceof Error) {
        const errorMessage = error.message;
        throw new BadRequestException(
          `Failed to extract clinical data: ${errorMessage}`
        );
      }

      throw new BadRequestException(
        `Failed to extract clinical data: ${String(error)}`
      );
    }
  }
}
