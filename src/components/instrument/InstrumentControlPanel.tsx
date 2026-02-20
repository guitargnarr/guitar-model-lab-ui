import { useState, useEffect, useRef } from 'react';
import { Music, Music2, AudioWaveform, AudioLines, Piano } from 'lucide-react';
import type { InstrumentDefinition, InstrumentGenerateParams, InstrumentKey } from '../../lib/types';

interface InstrumentControlPanelProps {
  instruments: Record<string, InstrumentDefinition>;
  scales: string[];
  onGenerate: (params: InstrumentGenerateParams) => void;
  isLoading: boolean;
}

const INSTRUMENT_ICONS: Record<string, typeof Music> = {
  acoustic_piano: Piano,
  electric_piano: Piano,
  violin: Music,
  cello: Music2,
  string_ensemble: AudioWaveform,
  synth_pad: AudioWaveform,
  synth_lead: AudioLines,
};

const roots = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export default function InstrumentControlPanel({
  instruments,
  scales,
  onGenerate,
  isLoading,
}: InstrumentControlPanelProps) {
  const [selectedInstrument, setSelectedInstrument] = useState<InstrumentKey>('acoustic_piano');
  const [root, setRoot] = useState('C');
  const [scale, setScale] = useState('major');
  const [pattern, setPattern] = useState('chord_progression');
  const [bars, setBars] = useState(4);
  const [tempo, setTempo] = useState(120);
  const [voicing, setVoicing] = useState('closed');

  const instrument = instruments[selectedInstrument];
  const availablePatterns = instrument?.patterns || [];
  const showVoicing = instrument?.polyphonic && (pattern === 'chord_progression' || pattern === 'pad');

  // Reset pattern when instrument changes if current pattern isn't available
  useEffect(() => {
    if (availablePatterns.length > 0 && !availablePatterns.includes(pattern)) {
      setPattern(availablePatterns[0]);
    }
  }, [selectedInstrument, availablePatterns, pattern]);

  // Debounced auto-generation
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!instrument || availablePatterns.length === 0) return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      const params: InstrumentGenerateParams = {
        instrument: selectedInstrument,
        root,
        scale,
        pattern,
        bars,
        tempo,
      };
      if (showVoicing) {
        params.voicing = voicing;
      }
      onGenerate(params);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [selectedInstrument, root, scale, pattern, bars, tempo, voicing, showVoicing, instrument, availablePatterns.length, onGenerate]);

  const instrumentKeys = Object.keys(instruments) as InstrumentKey[];

  return (
    <div className="card-glass p-6 space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Music className="w-5 h-5 text-[--color-accent]" />
        <h2 className="font-display text-xl text-[--color-text-primary]">Instrument Generator</h2>
      </div>

      {/* Instrument Picker Grid */}
      <div>
        <label className="form-label">Instrument</label>
        <div className="instrument-grid">
          {instrumentKeys.map((key) => {
            const inst = instruments[key];
            const Icon = INSTRUMENT_ICONS[key] || Music;
            return (
              <button
                key={key}
                className={`instrument-card ${selectedInstrument === key ? 'active' : ''}`}
                onClick={() => setSelectedInstrument(key)}
              >
                <Icon className="w-4 h-4" />
                <span className="text-xs">{inst.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Root Note */}
        <div>
          <label className="form-label">Root Note</label>
          <select
            className="select-control"
            value={root}
            onChange={(e) => setRoot(e.target.value)}
          >
            {roots.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        {/* Scale */}
        <div>
          <label className="form-label">Scale</label>
          <select
            className="select-control"
            value={scale}
            onChange={(e) => setScale(e.target.value)}
          >
            {scales.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>

        {/* Pattern */}
        <div>
          <label className="form-label">Pattern</label>
          <select
            className="select-control"
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
          >
            {availablePatterns.map((p) => (
              <option key={p} value={p}>
                {p.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>

        {/* Voicing (conditional) */}
        {showVoicing && (
          <div>
            <label className="form-label">Voicing</label>
            <select
              className="select-control"
              value={voicing}
              onChange={(e) => setVoicing(e.target.value)}
            >
              <option value="closed">Closed</option>
              <option value="open">Open</option>
              <option value="power">Power</option>
            </select>
          </div>
        )}

        {/* Bars */}
        <div>
          <label className="form-label">Bars</label>
          <input
            type="number"
            min={1}
            max={16}
            value={bars}
            onChange={(e) => setBars(parseInt(e.target.value, 10))}
          />
        </div>
      </div>

      {/* Tempo Slider */}
      <div>
        <label className="form-label">
          Tempo: <span className="text-[--color-accent]">{tempo} BPM</span>
        </label>
        <input
          type="range"
          min={60}
          max={220}
          value={tempo}
          onChange={(e) => setTempo(parseInt(e.target.value, 10))}
        />
      </div>

      {/* Generate Button */}
      <button
        className="btn-primary w-full"
        onClick={() => {
          const params: InstrumentGenerateParams = {
            instrument: selectedInstrument,
            root, scale, pattern, bars, tempo,
          };
          if (showVoicing) params.voicing = voicing;
          onGenerate(params);
        }}
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <div className="spinner" style={{ width: 16, height: 16 }} />
            Generating...
          </>
        ) : (
          <>
            <Music className="w-4 h-4" />
            Generate
          </>
        )}
      </button>
    </div>
  );
}
