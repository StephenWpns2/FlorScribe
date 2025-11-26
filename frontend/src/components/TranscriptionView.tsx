import { useEffect, useState } from 'react';
import TranscriptFeed from './TranscriptFeed';
import type { TranscriptSegment } from '../types/transcript';

interface TranscriptionViewProps {
  segments: TranscriptSegment[];
  interimSegment: TranscriptSegment | null;
  editableText: string;
  onTranscriptEdit: (text: string) => void;
  onClinicalize: () => void;
  isExtractingClinical?: boolean;
}

export default function TranscriptionView({
  segments,
  interimSegment,
  editableText,
  onTranscriptEdit,
  onClinicalize,
  isExtractingClinical = false,
}: TranscriptionViewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTranscript, setEditedTranscript] = useState(editableText);

  useEffect(() => {
    if (!isEditing) {
      setEditedTranscript(editableText);
    }
  }, [editableText, isEditing]);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Transcription</h3>
        <div className="space-x-2">
          <button
            onClick={() => setIsEditing((prev) => !prev)}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            {isEditing ? 'Cancel' : 'Edit'}
          </button>
          {isEditing && (
            <button
              onClick={() => {
                onTranscriptEdit(editedTranscript);
                setIsEditing(false);
              }}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Save
            </button>
          )}
          <button
            onClick={onClinicalize}
            disabled={!segments.length || isExtractingClinical}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
          >
            {isExtractingClinical && (
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {isExtractingClinical ? 'Extracting...' : 'Extract Clinical Data'}
          </button>
        </div>
      </div>
      <div className="border border-gray-300 rounded-md p-4 min-h-[400px] bg-gray-50">
        {isEditing ? (
          <textarea
            value={editedTranscript}
            onChange={(e) => setEditedTranscript(e.target.value)}
            className="w-full h-full min-h-[400px] p-2 border-none bg-transparent focus:outline-none"
          />
        ) : (
          <TranscriptFeed segments={segments} interimSegment={interimSegment} />
        )}
      </div>
    </div>
  );
}

