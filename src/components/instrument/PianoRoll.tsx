import { useMemo } from 'react';
import { midiToNoteName } from '../../lib/noteUtils';
import type { InstrumentEvent } from '../../lib/types';

interface PianoRollProps {
  events: InstrumentEvent[];
}

const ROW_HEIGHT = 14;
const BEAT_WIDTH = 48;

export default function PianoRoll({ events }: PianoRollProps) {
  const { pitchRange, totalBeats, noteBlocks } = useMemo(() => {
    // Collect all MIDI notes and calculate time positions
    let minPitch = 127;
    let maxPitch = 0;
    let beatPos = 0;
    const blocks: Array<{
      midi: number;
      x: number;
      width: number;
      velocity: number;
    }> = [];

    for (const event of events) {
      const beatDuration = 4 / event.duration; // quarter=1, eighth=0.5, whole=4
      for (const midi of event.midi_notes) {
        minPitch = Math.min(minPitch, midi);
        maxPitch = Math.max(maxPitch, midi);
        blocks.push({
          midi,
          x: beatPos,
          width: beatDuration,
          velocity: event.velocity,
        });
      }
      beatPos += beatDuration;
    }

    // Pad range by 2 semitones
    minPitch = Math.max(0, minPitch - 2);
    maxPitch = Math.min(127, maxPitch + 2);

    return {
      pitchRange: { min: minPitch, max: maxPitch },
      totalBeats: beatPos,
      noteBlocks: blocks,
    };
  }, [events]);

  const pitchSpan = pitchRange.max - pitchRange.min + 1;
  const containerHeight = pitchSpan * ROW_HEIGHT;
  const containerWidth = Math.max(totalBeats * BEAT_WIDTH, 300);

  // Generate pitch labels (only show naturals + octave boundaries)
  const pitchLabels = useMemo(() => {
    const labels: Array<{ midi: number; label: string; y: number }> = [];
    for (let midi = pitchRange.max; midi >= pitchRange.min; midi--) {
      const name = midiToNoteName(midi);
      // Show C notes (octave boundaries) and every 3rd semitone
      if (name.startsWith('C') || (midi - pitchRange.min) % 3 === 0) {
        labels.push({
          midi,
          label: name,
          y: (pitchRange.max - midi) * ROW_HEIGHT,
        });
      }
    }
    return labels;
  }, [pitchRange]);

  // Generate beat grid lines
  const beatLines = useMemo(() => {
    const lines: number[] = [];
    for (let b = 0; b <= totalBeats; b++) {
      lines.push(b);
    }
    return lines;
  }, [totalBeats]);

  if (events.length === 0) return null;

  return (
    <div className="piano-roll-container">
      <div className="piano-roll-labels">
        {pitchLabels.map(({ midi, label, y }) => (
          <div
            key={midi}
            className="piano-roll-label"
            style={{ top: y }}
          >
            {label}
          </div>
        ))}
      </div>
      <div className="piano-roll" style={{ height: containerHeight }}>
        <div className="piano-roll-inner" style={{ width: containerWidth, height: containerHeight }}>
          {/* Horizontal pitch grid lines */}
          {Array.from({ length: pitchSpan }, (_, i) => {
            const midi = pitchRange.max - i;
            const isC = midiToNoteName(midi).startsWith('C');
            return (
              <div
                key={`grid-${midi}`}
                className={`piano-roll-grid-line ${isC ? 'octave' : ''}`}
                style={{ top: i * ROW_HEIGHT }}
              />
            );
          })}

          {/* Vertical beat lines */}
          {beatLines.map((b) => (
            <div
              key={`beat-${b}`}
              className={`piano-roll-beat-line ${b % 4 === 0 ? 'bar' : ''}`}
              style={{ left: b * BEAT_WIDTH }}
            />
          ))}

          {/* Note blocks */}
          {noteBlocks.map((block, i) => (
            <div
              key={i}
              className="piano-roll-note"
              style={{
                left: block.x * BEAT_WIDTH,
                top: (pitchRange.max - block.midi) * ROW_HEIGHT + 1,
                width: Math.max(block.width * BEAT_WIDTH - 2, 4),
                height: ROW_HEIGHT - 2,
                opacity: 0.5 + (block.velocity / 127) * 0.5,
              }}
              title={midiToNoteName(block.midi)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
