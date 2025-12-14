import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SOAPNote } from './entities/soap-note.entity';
import { ClinicalExtraction } from '../clinical/entities/clinical-extraction.entity';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import OpenAI from 'openai';

@Injectable()
export class SoapService {
  private openai: OpenAI;

  constructor(
    @InjectRepository(SOAPNote)
    private soapNoteRepository: Repository<SOAPNote>,
    @InjectRepository(ClinicalExtraction)
    private clinicalExtractionRepository: Repository<ClinicalExtraction>,
    private configService: ConfigService,
    private subscriptionsService: SubscriptionsService,
  ) {
    const openaiApiKey = this.configService.get<string>('OPENAI_API_KEY') || '';
    if (!openaiApiKey) {
      throw new BadRequestException('OpenAI API key not configured');
    }
    this.openai = new OpenAI({
      apiKey: openaiApiKey,
    });
  }

  async compose(
    extractionId: number | undefined,
    clinicalExtraction: any | undefined,
    transcriptText: string | undefined,
    userId: number,
  ): Promise<{ soap_note_id: number; html_content: string; billing_codes: any; created_at: string }> {
    console.log('[SOAP Service] compose() called with:', {
      extractionId,
      hasClinicalExtraction: !!clinicalExtraction,
      transcriptTextLength: transcriptText?.length || 0,
      userId,
    });

    // Check notes limit before creating SOAP note
    const limitCheck = await this.subscriptionsService.checkNotesLimit(userId, 1);
    if (!limitCheck.allowed) {
      throw new ForbiddenException(
        `Notes limit exceeded. You have used ${limitCheck.currentUsage} of ${limitCheck.limit} notes. Please upgrade your plan.`,
      );
    }

    if (!extractionId && !clinicalExtraction) {
      console.error('[SOAP Service] Error: Neither extraction_id nor clinical_extraction provided');
      throw new BadRequestException(
        'Neither extraction_id nor clinical_extraction provided',
      );
    }

    let extractionData: any;
    let extraction: ClinicalExtraction | null = null;

    if (extractionId) {
      console.log('[SOAP Service] Loading extraction from database, ID:', extractionId);
      extraction = await this.clinicalExtractionRepository.findOne({
        where: { id: extractionId },
      });
      if (!extraction) {
        console.error('[SOAP Service] Error: Clinical extraction not found, ID:', extractionId);
        throw new NotFoundException('Clinical extraction not found');
      }
      extractionData = extraction.jsonData;
      console.log('[SOAP Service] Loaded extraction data from database:', {
        hasProblems: !!extractionData?.problems,
        problemsCount: extractionData?.problems?.length || 0,
        hasMedications: !!extractionData?.medications,
        medicationsCount: extractionData?.medications?.length || 0,
      });
    } else {
      console.log('[SOAP Service] Using provided clinical extraction:', {
        hasProblems: !!clinicalExtraction?.problems,
        problemsCount: clinicalExtraction?.problems?.length || 0,
        hasMedications: !!clinicalExtraction?.medications,
        medicationsCount: clinicalExtraction?.medications?.length || 0,
        hasOrders: !!clinicalExtraction?.orders,
        ordersCount: clinicalExtraction?.orders?.length || 0,
        hasVitals: !!clinicalExtraction?.vitals,
        vitalsCount: clinicalExtraction?.vitals?.length || 0,
      });
      extractionData = clinicalExtraction;
    }

    console.log('[SOAP Service] Building context from extraction data...');
    const context = this.buildContext(extractionData);
    console.log('[SOAP Service] Context built, length:', context.length);
    const systemPrompt = `You are a medical documentation AI that creates professional SOAP notes.

Generate a well-formatted SOAP note with the following sections:
1. Subjective: Patient's chief complaint, history of present illness, review of systems
2. Objective: Physical examination findings, vital signs, lab results
3. Assessment: Clinical assessment, diagnoses with ICD-10 codes
4. Plan: Treatment plan, medications, orders, follow-up

Format the output as clean HTML with inline styles. Use proper medical terminology.
Structure it with clear sections and readable formatting.`;

    const userPrompt = `Create a SOAP note based on this clinical extraction:

${context}

${transcriptText ? `Original transcript context:\n${transcriptText.substring(0, 2000)}` : ''}

Generate a complete, professional SOAP note in HTML format with inline styles.`;

    console.log('[SOAP Service] Prepared prompts:', {
      systemPromptLength: systemPrompt.length,
      userPromptLength: userPrompt.length,
      hasTranscriptText: !!transcriptText,
      transcriptTextPreview: transcriptText?.substring(0, 100) || 'none',
    });

    try {
      console.log('[SOAP Service] Calling OpenAI API with model: gpt-4o');
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2,
      });

      console.log('[SOAP Service] OpenAI API response received:', {
        hasChoices: !!completion.choices,
        choicesCount: completion.choices?.length || 0,
        hasContent: !!completion.choices[0]?.message?.content,
        contentLength: completion.choices[0]?.message?.content?.length || 0,
        finishReason: completion.choices[0]?.finish_reason,
      });

      const content = completion.choices[0].message.content;
      if (!content) {
        console.error('[SOAP Service] Error: No content returned from OpenAI');
        throw new BadRequestException('No content returned from OpenAI');
      }
      console.log('[SOAP Service] Content preview (first 200 chars):', content.substring(0, 200));
      
      let htmlContent = content;
      console.log('[SOAP Service] Formatting HTML...');
      htmlContent = this.formatHtml(htmlContent);
      console.log('[SOAP Service] HTML formatted, length:', htmlContent.length);

      console.log('[SOAP Service] Building billing codes...');
      const billingCodes = this.buildBillingCodes(extractionData);
      console.log('[SOAP Service] Billing codes built:', {
        icd10Count: billingCodes.icd10?.length || 0,
        cptCount: billingCodes.cpt?.length || 0,
        icd10Codes: billingCodes.icd10?.map((c: any) => c.code) || [],
        cptCodes: billingCodes.cpt?.map((c: any) => c.code) || [],
      });

      // Transform billing codes to match entity type (string arrays)
      const billingCodesForEntity = {
        icd10: billingCodes.icd10?.map((c: any) => c.code) || [],
        cpt: billingCodes.cpt?.map((c: any) => c.code) || [],
      };
      console.log('[SOAP Service] Billing codes transformed for entity:', billingCodesForEntity);

      // Save to database
      console.log('[SOAP Service] Creating SOAP note entity...');
      const soapNote = this.soapNoteRepository.create({
        extractionId: extraction?.id || null, // Use null instead of 0 when no extraction
        htmlContent,
        billingCodes: billingCodesForEntity,
      });

      // If we have an extraction, link it
      if (extraction) {
        console.log('[SOAP Service] Linking extraction to SOAP note, extractionId:', extraction.id);
        soapNote.extraction = extraction;
      }

      console.log('[SOAP Service] Saving SOAP note to database...');
      const savedNote = await this.soapNoteRepository.save(soapNote);
      
      // Track usage after successful creation
      await this.subscriptionsService.incrementNotesUsage(userId, 1);
      
      console.log('[SOAP Service] SOAP note saved successfully:', {
        soapNoteId: savedNote.id,
        htmlContentLength: savedNote.htmlContent?.length || 0,
        billingCodes: savedNote.billingCodes,
        createdAt: savedNote.createdAt,
      });

      const result = {
        soap_note_id: savedNote.id,
        html_content: savedNote.htmlContent,
        billing_codes: {
          icd10: billingCodesForEntity.icd10,
          cpt: billingCodesForEntity.cpt,
        },
        created_at: savedNote.createdAt.toISOString(),
      };
      console.log('[SOAP Service] Returning result:', {
        soapNoteId: result.soap_note_id,
        htmlContentLength: result.html_content?.length || 0,
        billingCodes: result.billing_codes,
      });
      return result;
    } catch (error) {
      console.error('[SOAP Service] Error in compose():', {
        errorType: error?.constructor?.name,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
      });
      
      if (error instanceof BadRequestException) {
        console.error('[SOAP Service] Re-throwing BadRequestException');
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[SOAP Service] Throwing new BadRequestException with message:', errorMessage);
      throw new BadRequestException(
        `Failed to compose SOAP note: ${errorMessage}`,
      );
    }
  }

  private buildContext(extraction: any): string {
    console.log('[SOAP Service] buildContext() called with extraction:', {
      hasProblems: !!extraction?.problems,
      problemsCount: extraction?.problems?.length || 0,
      hasMedications: !!extraction?.medications,
      medicationsCount: extraction?.medications?.length || 0,
      hasOrders: !!extraction?.orders,
      ordersCount: extraction?.orders?.length || 0,
      hasVitals: !!extraction?.vitals,
      vitalsCount: extraction?.vitals?.length || 0,
    });

    const contextParts: string[] = [];

    if (extraction.problems) {
      contextParts.push('Problems/Diagnoses:');
      for (const p of extraction.problems) {
        contextParts.push(`  - ${p.description}`);
        if (p.icd10_code) {
          contextParts.push(`    ICD-10: ${p.icd10_code}`);
        }
      }
      console.log('[SOAP Service] Added problems to context, count:', extraction.problems.length);
    }

    if (extraction.medications) {
      contextParts.push('\nMedications:');
      for (const m of extraction.medications) {
        let medStr = m.name;
        if (m.dosage) medStr += ` ${m.dosage}`;
        if (m.frequency) medStr += ` ${m.frequency}`;
        contextParts.push(`  - ${medStr}`);
      }
      console.log('[SOAP Service] Added medications to context, count:', extraction.medications.length);
    }

    if (extraction.orders) {
      contextParts.push('\nOrders:');
      for (const o of extraction.orders) {
        let orderStr = `${o.type}: ${o.description}`;
        if (o.cpt_code) orderStr += ` (CPT: ${o.cpt_code})`;
        contextParts.push(`  - ${orderStr}`);
      }
      console.log('[SOAP Service] Added orders to context, count:', extraction.orders.length);
    }

    if (extraction.vitals) {
      contextParts.push('\nVital Signs:');
      for (const v of extraction.vitals) {
        let vitalStr = `${v.type}: ${v.value}`;
        if (v.unit) vitalStr += ` ${v.unit}`;
        contextParts.push(`  - ${vitalStr}`);
      }
      console.log('[SOAP Service] Added vitals to context, count:', extraction.vitals.length);
    }

    const context = contextParts.join('\n');
    console.log('[SOAP Service] buildContext() completed, context length:', context.length);
    return context;
  }

  private formatHtml(html: string): string {
    // Strip Markdown code fences that may wrap the HTML (e.g., ```html ... ```).
    const fencePattern = /```(?:html)?/gi;
    if (fencePattern.test(html)) {
      html = html.replace(fencePattern, '').trim();
    }

    // If full HTML document provided, keep body content only for embedding.
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch && bodyMatch[1]) {
      html = bodyMatch[1].trim();
    }

    if (!html.trim().startsWith('<')) {
      html = `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">${html}</div>`;
    }

    if (!html.includes('style=')) {
      html = html.replace(
        /<h1>/g,
        '<h1 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">',
      );
      html = html.replace(
        /<h2>/g,
        '<h2 style="color: #34495e; margin-top: 20px;">',
      );
      html = html.replace(/<p>/g, '<p style="margin: 10px 0;">');
    }

    return html;
  }

  private buildBillingCodes(extraction: any): {
    icd10: Array<{ code: string; description: string; confidence: number }>;
    cpt: Array<{ code: string; description: string; confidence: number }>;
  } {
    const icdMap: Record<string, any> = {};

    if (extraction.icd10_codes) {
      for (const code of extraction.icd10_codes) {
        if (code.code) {
          icdMap[code.code] = {
            code: code.code,
            description: code.description,
            confidence: code.confidence ?? 0.7,
          };
        }
      }
    }

    if (extraction.problems) {
      for (const problem of extraction.problems) {
        if (problem.icd10_code && !icdMap[problem.icd10_code]) {
          icdMap[problem.icd10_code] = {
            code: problem.icd10_code,
            description: problem.description,
            confidence: problem.confidence ?? 0.7,
          };
        }
      }
    }

    const cptMap: Record<string, any> = {};

    if (extraction.cpt_codes) {
      for (const code of extraction.cpt_codes) {
        if (code.code) {
          cptMap[code.code] = {
            code: code.code,
            description: code.description,
            confidence: code.confidence ?? 0.7,
          };
        }
      }
    }

    if (extraction.orders) {
      for (const order of extraction.orders) {
        if (order.cpt_code && !cptMap[order.cpt_code]) {
          cptMap[order.cpt_code] = {
            code: order.cpt_code,
            description: order.description,
            confidence: order.confidence ?? 0.7,
          };
        }
      }
    }

    return {
      icd10: Object.values(icdMap),
      cpt: Object.values(cptMap),
    };
  }
}

