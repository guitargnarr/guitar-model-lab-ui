export interface InstrumentDefinition {
  name: string;
  midi_program: number;
  range_low: number;
  range_high: number;
  polyphonic: boolean;
  articulations: string[];
  patterns: string[];
}

export interface InstrumentsResponse {
  instruments: Record<string, InstrumentDefinition>;
}

export interface InstrumentEvent {
  midi_notes: number[];
  duration: number;
  velocity: number;
  articulation: string;
}

export interface GeneratedInstrumentResult {
  events: InstrumentEvent[];
  instrument: string;
  root: string;
  scale: string;
  pattern: string;
  bars: number;
  tempo: number;
}

export interface InstrumentGenerateParams {
  instrument: string;
  root: string;
  scale: string;
  pattern: string;
  bars: number;
  tempo: number;
  voicing?: string;
  octave?: number;
  progression?: string;
}

export type AppMode = 'guitar' | 'instrument';

export type InstrumentKey =
  | 'acoustic_piano'
  | 'electric_piano'
  | 'violin'
  | 'cello'
  | 'string_ensemble'
  | 'synth_pad'
  | 'synth_lead';
