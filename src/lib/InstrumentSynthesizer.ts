/**
 * InstrumentSynthesizer - Multi-instrument audio playback using SoundFont
 * Modeled on GuitarSynthesizer.ts pattern
 */

import Soundfont from 'soundfont-player';
import type { InstrumentEvent, InstrumentKey } from './types';

interface SoundfontInstrument {
  play: (note: number | string, when?: number, options?: {
    duration?: number;
    gain?: number;
    attack?: number;
    decay?: number;
    sustain?: number;
    release?: number;
  }) => { stop: () => void };
  stop: () => void;
}

export interface InstrumentPlaybackOptions {
  tempo: number;
  loop: boolean;
}

// Map backend instrument keys to soundfont-player instrument names
const SOUNDFONT_MAP: Record<InstrumentKey, string> = {
  acoustic_piano: 'acoustic_grand_piano',
  electric_piano: 'electric_piano_1',
  violin: 'violin',
  cello: 'cello',
  string_ensemble: 'string_ensemble_1',
  synth_pad: 'pad_2_warm',
  synth_lead: 'lead_1_square',
};

// Per-instrument ADSR and gain settings
const INSTRUMENT_CONFIG: Record<InstrumentKey, {
  gain: number;
  attack: number;
  decay: number;
  sustain: number;
  release: number;
}> = {
  acoustic_piano: { gain: 1.8, attack: 0.01, decay: 0.4, sustain: 0.5, release: 0.6 },
  electric_piano: { gain: 1.6, attack: 0.01, decay: 0.3, sustain: 0.6, release: 0.4 },
  violin: { gain: 2.0, attack: 0.08, decay: 0.2, sustain: 0.8, release: 0.5 },
  cello: { gain: 2.0, attack: 0.1, decay: 0.2, sustain: 0.8, release: 0.6 },
  string_ensemble: { gain: 1.8, attack: 0.15, decay: 0.3, sustain: 0.7, release: 0.8 },
  synth_pad: { gain: 1.5, attack: 0.3, decay: 0.4, sustain: 0.7, release: 1.0 },
  synth_lead: { gain: 1.8, attack: 0.02, decay: 0.2, sustain: 0.6, release: 0.3 },
};

export class InstrumentSynthesizer {
  private audioContext: AudioContext | null = null;
  private instrument: SoundfontInstrument | null = null;
  private currentInstrumentKey: InstrumentKey | null = null;
  private loading: boolean = false;

  async loadInstrument(instrumentKey: InstrumentKey): Promise<boolean> {
    // Already loaded
    if (this.currentInstrumentKey === instrumentKey && this.instrument) {
      return true;
    }

    if (this.loading) {
      while (this.loading) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return this.currentInstrumentKey === instrumentKey && this.instrument !== null;
    }

    this.loading = true;

    try {
      // Create or reuse audio context
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // Stop any currently playing sounds
      if (this.instrument) {
        this.instrument.stop();
      }

      const soundfontName = SOUNDFONT_MAP[instrumentKey];
      const config = INSTRUMENT_CONFIG[instrumentKey];

      this.instrument = await Soundfont.instrument(
        this.audioContext,
        soundfontName as Parameters<typeof Soundfont.instrument>[1],
        {
          soundfont: 'MusyngKite',
          gain: config.gain,
        }
      ) as SoundfontInstrument;

      this.currentInstrumentKey = instrumentKey;
      this.loading = false;
      return true;
    } catch (error) {
      console.error(`Failed to load instrument ${instrumentKey}:`, error);
      this.loading = false;
      return false;
    }
  }

  playMidiNote(midiNote: number, duration: number = 0.5): void {
    if (!this.instrument || !this.audioContext || !this.currentInstrumentKey) return;

    const config = INSTRUMENT_CONFIG[this.currentInstrumentKey];
    try {
      this.instrument.play(midiNote, this.audioContext.currentTime, {
        duration: Math.min(duration * 1.5, 4.0),
        gain: config.gain * 0.4,
        attack: config.attack,
        decay: config.decay,
        sustain: config.sustain,
        release: config.release,
      });
    } catch (error) {
      console.error('Error playing note:', error);
    }
  }

  playMidiChord(midiNotes: number[], duration: number = 0.8): void {
    midiNotes.forEach((note, index) => {
      setTimeout(() => {
        this.playMidiNote(note, duration);
      }, index * 15);
    });
  }

  async playEvents(
    events: InstrumentEvent[],
    options: InstrumentPlaybackOptions,
    onPositionChange?: (position: number, total: number) => void,
    shouldStop?: () => boolean
  ): Promise<void> {
    if (events.length === 0) return;

    const playSequence = async () => {
      for (let i = 0; i < events.length; i++) {
        if (shouldStop && shouldStop()) return;

        if (onPositionChange) {
          onPositionChange(i, events.length);
        }

        const event = events[i];
        // duration: 1=whole, 2=half, 4=quarter, 8=eighth
        const durationInSeconds = (4 / event.duration) * (60 / options.tempo);

        if (event.midi_notes.length === 1) {
          this.playMidiNote(event.midi_notes[0], durationInSeconds);
        } else {
          this.playMidiChord(event.midi_notes, durationInSeconds);
        }

        const intervalMs = durationInSeconds * 1000;
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      }

      if (onPositionChange) {
        onPositionChange(events.length, events.length);
      }
    };

    do {
      await playSequence();
    } while (options.loop && (!shouldStop || !shouldStop()));
  }

  stop(): void {
    if (this.instrument) {
      this.instrument.stop();
    }
  }

  dispose(): void {
    this.stop();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.instrument = null;
    this.currentInstrumentKey = null;
  }

  isReady(): boolean {
    return !this.loading && this.instrument !== null;
  }

  getCurrentInstrument(): InstrumentKey | null {
    return this.currentInstrumentKey;
  }

  isLoading(): boolean {
    return this.loading;
  }
}

// Singleton
let instance: InstrumentSynthesizer | null = null;

export function getInstrumentSynthesizer(): InstrumentSynthesizer {
  if (!instance) {
    instance = new InstrumentSynthesizer();
  }
  return instance;
}
