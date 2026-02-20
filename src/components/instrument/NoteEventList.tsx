import { midiToNoteName, durationToName } from '../../lib/noteUtils';
import type { InstrumentEvent } from '../../lib/types';

interface NoteEventListProps {
  events: InstrumentEvent[];
}

export default function NoteEventList({ events }: NoteEventListProps) {
  if (events.length === 0) return null;

  return (
    <div className="tab-display-enhanced">
      <div className="tab-header">
        <span className="tab-title">Note Events</span>
        <span className="tab-tuning">{events.length} events</span>
      </div>
      <pre>
        {events.map((event, i) => {
          const notes = event.midi_notes.map(m => midiToNoteName(m)).join(' ');
          const dur = durationToName(event.duration);
          const vel = Math.round((event.velocity / 127) * 100);
          const pad = String(i + 1).padStart(3, ' ');
          return `${pad}. ${notes.padEnd(16)} ${dur.padEnd(8)} vel:${vel}%  ${event.articulation}\n`;
        })}
      </pre>
    </div>
  );
}
