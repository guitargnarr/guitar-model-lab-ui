import { useState, useCallback, useRef } from 'react';
import { Play, Square, Repeat, Volume2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { getInstrumentSynthesizer } from '../../lib/InstrumentSynthesizer';
import type { InstrumentEvent, InstrumentKey } from '../../lib/types';

interface InstrumentPlaybackControlsProps {
  events: InstrumentEvent[];
  instrumentKey: InstrumentKey;
  tempo: number;
  onTempoChange: (tempo: number) => void;
}

export default function InstrumentPlaybackControls({
  events,
  instrumentKey,
  tempo,
  onTempoChange,
}: InstrumentPlaybackControlsProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [progress, setProgress] = useState(0);
  const [totalNotes, setTotalNotes] = useState(0);
  const stopFlagRef = useRef(false);

  const handlePlay = useCallback(async () => {
    const synth = getInstrumentSynthesizer();

    // Load instrument soundfont if needed
    if (!synth.isReady() || synth.getCurrentInstrument() !== instrumentKey) {
      setIsInitializing(true);
      const success = await synth.loadInstrument(instrumentKey);
      setIsInitializing(false);
      if (!success) {
        console.error('Failed to load instrument');
        return;
      }
    }

    stopFlagRef.current = false;
    setIsPlaying(true);
    setProgress(0);

    try {
      await synth.playEvents(
        events,
        { tempo, loop: isLooping },
        (position, total) => {
          setProgress(position);
          setTotalNotes(total);
        },
        () => stopFlagRef.current
      );
    } finally {
      if (!stopFlagRef.current) {
        setIsPlaying(false);
        setProgress(0);
      }
    }
  }, [events, instrumentKey, tempo, isLooping]);

  const handleStop = useCallback(() => {
    stopFlagRef.current = true;
    const synth = getInstrumentSynthesizer();
    synth.stop();
    setIsPlaying(false);
    setProgress(0);
  }, []);

  const progressPercent = totalNotes > 0 ? (progress / totalNotes) * 100 : 0;

  return (
    <div className="playback-controls">
      <div className="flex items-center gap-4">
        <div className="flex gap-2">
          {isPlaying ? (
            <button className="btn-playback btn-stop" onClick={handleStop} title="Stop">
              <Square className="w-5 h-5" />
            </button>
          ) : (
            <button
              className="btn-playback btn-play"
              onClick={handlePlay}
              disabled={isInitializing || events.length === 0}
              title="Play"
            >
              {isInitializing ? (
                <div className="spinner" style={{ width: 20, height: 20 }} />
              ) : (
                <Play className="w-5 h-5" />
              )}
            </button>
          )}
        </div>

        <button
          className={`btn-playback-small ${isLooping ? 'active' : ''}`}
          onClick={() => setIsLooping(!isLooping)}
          title="Loop"
        >
          <Repeat className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 text-[--color-text-muted]">
          <Volume2 className="w-4 h-4" />
          <span className="text-xs">
            {isPlaying ? `${progress}/${totalNotes}` : isInitializing ? 'Loading...' : 'Ready'}
          </span>
        </div>

        <div className="flex items-center gap-3 ml-auto">
          <label className="text-xs text-[--color-text-muted] uppercase tracking-wider">
            Tempo
          </label>
          <input
            type="range"
            min={40}
            max={200}
            value={tempo}
            onChange={(e) => onTempoChange(parseInt(e.target.value, 10))}
          />
          <span className="text-sm text-[--color-accent] font-mono w-16">
            {tempo} BPM
          </span>
        </div>
      </div>

      {isPlaying && (
        <div className="mt-3">
          <div className="progress-bar">
            <motion.div
              className="progress-fill"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.1 }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
