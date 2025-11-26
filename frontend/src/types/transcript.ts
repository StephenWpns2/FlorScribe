export type SpeakerLabel = 'voiceA' | 'voiceB';

export interface TranscriptSegment {
  id: string;
  text: string;
  speaker: SpeakerLabel;
  timestamp: number;
}

export interface TranscriptUpdatePayload {
  text: string;
  isInterim: boolean;
  speaker?: string;
}

