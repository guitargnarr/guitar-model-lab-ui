import { useState } from 'react';
import { Download, Music } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PianoRoll from './PianoRoll';
import NoteEventList from './NoteEventList';
import InstrumentPlaybackControls from './InstrumentPlaybackControls';
import type { GeneratedInstrumentResult, InstrumentKey, InstrumentGenerateParams } from '../../lib/types';

const API_URL = 'https://guitar-model-lab.onrender.com';

interface InstrumentDisplayProps {
  result: GeneratedInstrumentResult | null;
  isLoading: boolean;
  currentParams: InstrumentGenerateParams | null;
}

export default function InstrumentDisplay({ result, isLoading, currentParams }: InstrumentDisplayProps) {
  const [playbackTempo, setPlaybackTempo] = useState(120);
  const [isDownloading, setIsDownloading] = useState(false);

  // Sync tempo from result
  if (result && playbackTempo !== result.tempo) {
    setPlaybackTempo(result.tempo);
  }

  const handleDownloadGP5 = async () => {
    if (!currentParams) return;
    setIsDownloading(true);
    try {
      const response = await fetch(`${API_URL}/generate-instrument-gp5`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentParams),
      });
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${result?.instrument || 'instrument'}-${result?.root || 'C'}-${result?.scale || 'major'}.gp5`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('GP5 download failed:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="card-glass p-12 flex flex-col items-center justify-center gap-4">
        <div className="spinner" />
        <p className="text-sm text-[--color-text-muted]">Generating...</p>
      </div>
    );
  }

  // Empty state
  if (!result) {
    return (
      <div className="card-glass p-12 flex flex-col items-center justify-center gap-4">
        <Music className="w-10 h-10 text-[--color-text-muted]" />
        <p className="text-sm text-[--color-text-muted]">
          Select an instrument and adjust controls to generate
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Metadata badges */}
      <div className="flex flex-wrap gap-2">
        {[
          result.instrument.replace(/_/g, ' '),
          result.root,
          result.scale.replace(/_/g, ' '),
          result.pattern.replace(/_/g, ' '),
          `${result.tempo} BPM`,
          `${result.bars} bars`,
        ].map((label) => (
          <span
            key={label}
            className="px-3 py-1.5 rounded-full bg-[--color-surface] border border-[--color-border] text-xs text-[--color-accent] capitalize"
          >
            {label}
          </span>
        ))}
      </div>

      {/* Piano Roll */}
      <PianoRoll events={result.events} />

      {/* Playback Controls */}
      <InstrumentPlaybackControls
        events={result.events}
        instrumentKey={result.instrument as InstrumentKey}
        tempo={playbackTempo}
        onTempoChange={setPlaybackTempo}
      />

      {/* Download GP5 */}
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <button
            className="btn-secondary flex items-center gap-2"
            onClick={handleDownloadGP5}
            disabled={isDownloading}
          >
            <Download className="w-4 h-4" />
            {isDownloading ? 'Downloading...' : 'Download GP5'}
          </button>
        </motion.div>
      </AnimatePresence>

      {/* Note Event List */}
      <NoteEventList events={result.events} />
    </div>
  );
}
