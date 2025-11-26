import type { SpeakerLabel, TranscriptSegment } from '../types/transcript';

const generateId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

export const createSegment = (text: string, speaker: SpeakerLabel): TranscriptSegment => ({
  id: generateId(),
  text,
  speaker,
  timestamp: Date.now(),
});

export const rebuildSegmentsFromText = (
  text: string,
  template: TranscriptSegment[] = []
): TranscriptSegment[] => {
  const chunks = text
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  if (chunks.length === 0) {
    return [];
  }

  return chunks.map((chunk, index) => ({
    id: template[index]?.id ?? generateId(),
    speaker: template[index]?.speaker ?? (index % 2 === 0 ? 'voiceA' : 'voiceB'),
    text: chunk,
    timestamp: Date.now() + index,
  }));
};

// Convert database transcript to segment format
export const transcriptToSegment = (
  transcript: { id: number; text: string; speaker: string | null; createdAt: string },
  assignSpeaker: (speaker?: string | null, isFinal?: boolean) => SpeakerLabel
): TranscriptSegment => {
  const speakerLabel = assignSpeaker(transcript.speaker, true);
  return {
    id: `transcript-${transcript.id}`,
    text: transcript.text,
    speaker: speakerLabel,
    timestamp: new Date(transcript.createdAt).getTime(),
  };
};

