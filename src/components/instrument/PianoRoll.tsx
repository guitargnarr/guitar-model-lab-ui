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
      const beatDuration = 4 / event.duration;
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

  // Only compute pitch labels for the sidebar
  const pitchLabels = useMemo(() => {
    const labels: Array<{ midi: number; label: string; y: number }> = [];
    for (let midi = pitchRange.max; midi >= pitchRange.min; midi--) {
      const name = midiToNoteName(midi);
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

  if (events.length === 0) return null;

  // Use CSS background-image for grid lines instead of DOM nodes
  const gridBg = `repeating-linear-gradient(
    0deg,
    rgba(255,255,255,0.03) 0px,
    rgba(255,255,255,0.03) 1px,
    transparent 1px,
    transparent ${ROW_HEIGHT}px
  ), repeating-linear-gradient(
    90deg,
    rgba(255,255,255,0.04) 0px,
    rgba(255,255,255,0.04) 1px,
    transparent 1px,
    transparent ${BEAT_WIDTH}px
  )`;

  return (
    <div className="piano-roll-container">
      <div className="piano-roll-labels" style={{ height: containerHeight }}>
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
      <div className="piano-roll" style={{ height: Math.min(containerHeight, 300) }}>
        <div
          className="piano-roll-inner"
          style={{
            width: containerWidth,
            height: containerHeight,
            backgroundImage: gridBg,
          }}
        >
          {/* Note blocks only -- grid is CSS background */}
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
