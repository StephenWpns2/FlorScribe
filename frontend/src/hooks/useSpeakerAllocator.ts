import { useCallback, useRef } from 'react';
import type { SpeakerLabel } from '../types/transcript';

interface SpeakerAllocator {
  assignSpeaker: (rawSpeaker?: string | null, isFinal?: boolean) => SpeakerLabel;
  resetSpeakers: () => void;
}

const nextLabel = (assigned: Record<string, SpeakerLabel>): SpeakerLabel => {
  const values = Object.values(assigned);
  // Assign speakers in order: A, B (2 speakers)
  if (!values.includes('voiceA')) {
    return 'voiceA';
  }
  if (!values.includes('voiceB')) {
    return 'voiceB';
  }
  // If both speakers are assigned, alternate
  return values[values.length - 1] === 'voiceA' ? 'voiceB' : 'voiceA';
};

export const useSpeakerAllocator = (): SpeakerAllocator => {
  const mapRef = useRef<Record<string, SpeakerLabel>>({});
  const lastSpeakerRef = useRef<SpeakerLabel>('voiceA');
  const lastFinalSpeakerRef = useRef<SpeakerLabel>('voiceA');

  const assignSpeaker = useCallback((rawSpeaker?: string | null, isFinal?: boolean): SpeakerLabel => {
    const key = rawSpeaker?.toString().trim() || '';
    
    // If we have a speaker ID from the backend, use it
    // Map backend speakers (A, B, C, D) to UI speakers (voiceA, voiceB)
    if (key) {
      if (!mapRef.current[key]) {
        mapRef.current[key] = nextLabel(mapRef.current);
      }
      const assignedSpeaker = mapRef.current[key];
      lastSpeakerRef.current = assignedSpeaker;
      if (isFinal) {
        lastFinalSpeakerRef.current = assignedSpeaker;
      }
      return assignedSpeaker;
    }
    
    // If no speaker info from backend, use alternating logic as fallback
    // Alternate speakers on final transcripts (end_of_turn), which indicates a speaker change
    if (isFinal) {
      // Alternate between A and B
      lastFinalSpeakerRef.current = lastFinalSpeakerRef.current === 'voiceA' ? 'voiceB' : 'voiceA';
      lastSpeakerRef.current = lastFinalSpeakerRef.current;
      return lastFinalSpeakerRef.current;
    }
    
    // For interim transcripts, use the same speaker as the last final transcript
    return lastFinalSpeakerRef.current;
  }, []);

  const resetSpeakers = useCallback(() => {
    mapRef.current = {};
    lastSpeakerRef.current = 'voiceA';
    lastFinalSpeakerRef.current = 'voiceA';
  }, []);

  return { assignSpeaker, resetSpeakers };
};

