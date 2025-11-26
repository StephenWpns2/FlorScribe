import type { TranscriptSegment } from '../types/transcript';

interface TranscriptFeedProps {
  segments: TranscriptSegment[];
  interimSegment?: TranscriptSegment | null;
  className?: string;
}

const speakerMeta = {
  voiceA: {
    label: 'Speaker A',
    alignment: 'justify-start',
    bubbleClass: 'bg-slate-100 text-slate-900',
  },
  voiceB: {
    label: 'Speaker B',
    alignment: 'justify-end',
    bubbleClass: 'bg-indigo-100 text-indigo-900',
  },
};

const InterimBubble = ({ segment }: { segment: TranscriptSegment }) => {
  const meta = speakerMeta[segment.speaker] ?? speakerMeta.voiceA;
  return (
    <div className={`flex ${meta.alignment}`}>
      <div
        className={`max-w-3xl rounded-2xl px-4 py-2 border border-dashed border-slate-300 text-slate-600 italic`}
      >
        <div className="text-xs uppercase font-semibold mb-1 text-slate-400">
          {meta.label} (listening…)
        </div>
        <p className="whitespace-pre-line">{segment.text}</p>
      </div>
    </div>
  );
};

export default function TranscriptFeed({
  segments,
  interimSegment,
  className = '',
}: TranscriptFeedProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {segments.length === 0 && !interimSegment && (
        <div className="text-gray-400 text-center py-10">
          Transcription will appear here...
        </div>
      )}
      {segments.map((segment) => {
        const meta = speakerMeta[segment.speaker] ?? speakerMeta.voiceA;
        return (
          <div key={segment.id} className={`flex ${meta.alignment}`}>
            <div className={`max-w-3xl rounded-2xl px-4 py-2 ${meta.bubbleClass}`}>
              <div className="text-xs uppercase font-semibold mb-1 text-slate-500">
                {meta.label}
              </div>
              <p className="whitespace-pre-line">{segment.text}</p>
            </div>
          </div>
        );
      })}
      {interimSegment && <InterimBubble segment={interimSegment} />}
    </div>
  );
}

