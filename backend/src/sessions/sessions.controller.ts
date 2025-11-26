import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Body,
  UseGuards,
  BadRequestException,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SessionsService } from './sessions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  /**
   * Webhook endpoint for AssemblyAI to POST transcription results
   * This endpoint is public (no auth) but validates webhook secret if configured
   */
  @Post('webhook/assemblyai')
  @HttpCode(HttpStatus.OK)
  async handleAssemblyAIWebhook(
    @Body() payload: any,
    @Body('session_id') sessionIdParam?: string,
  ) {
    // Extract session_id from query params if not in body
    // AssemblyAI includes webhook_url in payload which contains session_id
    return this.sessionsService.handleAssemblyAIWebhook(payload);
  }

  @Post('upload-audio')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('audio'))
  async uploadAudio(
    @UploadedFile() file: Express.Multer.File,
    @Body('session_id') sessionId: string,
  ) {
    if (!file) {
      throw new BadRequestException('Audio file is required');
    }

    if (!sessionId) {
      throw new BadRequestException('Session ID is required');
    }

    const sessionIdNum = parseInt(sessionId, 10);
    if (isNaN(sessionIdNum)) {
      throw new BadRequestException('Invalid session ID');
    }

    // Process audio asynchronously (don't wait for completion)
    this.sessionsService.processAudioWithSpeakerDiarization(
      sessionIdNum,
      file.buffer,
      file.mimetype,
    ).catch((error) => {
      console.error(`Error processing audio for session ${sessionIdNum}:`, error);
    });

    return {
      message: 'Audio uploaded successfully. Post-processing with speaker diarization started.',
      sessionId: sessionIdNum,
    };
  }

  @Post(':id/reprocess-speakers')
  @UseGuards(JwtAuthGuard)
  async reprocessSpeakers(@Param('id', ParseIntPipe) sessionId: number) {
    return this.sessionsService.reprocessSessionWithSpeakerDiarization(sessionId);
  }
}

