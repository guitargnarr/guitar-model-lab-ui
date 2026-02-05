/**
 * GuitarSynthesizer - Audio playback for guitar tabs using SoundFont
 * Inspired by FretVision's Tab Player implementation
 */

import Soundfont from 'soundfont-player';

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

export interface PlaybackOptions {
  tempo: number; // BPM
  loop: boolean;
}

export type PlaybackState = 'stopped' | 'playing' | 'paused';

export class GuitarSynthesizer {
  private audioContext: AudioContext | null = null;
  private instrument: SoundfontInstrument | null = null;
  private loading: boolean = false;
  private initialized: boolean = false;

  // Standard tuning MIDI values: E2, A2, D3, G3, B3, E4
  private stringBaseMidi: Record<string, number> = {
    'E': 40, // Low E (6th string)
    'A': 45,
    'D': 50,
    'G': 55,
    'B': 59,
    'e': 64, // High e (1st string)
  };

  async initialize(): Promise<boolean> {
    if (this.initialized && this.instrument) {
      return true;
    }

    if (this.loading) {
      // Wait for current loading to complete
      while (this.loading) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return this.initialized;
    }

    this.loading = true;

    try {
      // Create audio context
      this.audioContext = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

      // Resume context if suspended (browser autoplay policy)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // Load acoustic guitar soundfont
      this.instrument = await Soundfont.instrument(
        this.audioContext,
        'acoustic_guitar_nylon',
        {
          soundfont: 'MusyngKite',
          gain: 2.0,
        }
      ) as SoundfontInstrument;

      this.initialized = true;
      this.loading = false;
      return true;
    } catch (error) {
      console.error('Failed to initialize GuitarSynthesizer:', error);
      this.loading = false;
      return false;
    }
  }

  /**
   * Play a single note given string name and fret number
   */
  playNote(stringName: string, fret: number, duration: number = 0.5): void {
    if (!this.instrument || !this.audioContext || this.loading) {
      console.warn('GuitarSynthesizer not ready');
      return;
    }

    const baseMidi = this.stringBaseMidi[stringName];
    if (baseMidi === undefined) {
      console.warn(`Unknown string: ${stringName}`);
      return;
    }

    const midiNote = baseMidi + fret;

    // Calculate sustain based on duration
    const sustain = Math.min(duration * 1.5, 2.0);

    try {
      this.instrument.play(midiNote, this.audioContext.currentTime, {
        duration: sustain,
        gain: 0.7,
        attack: 0.01,
        decay: 0.3,
        sustain: 0.6,
        release: 0.4,
      });
    } catch (error) {
      console.error('Error playing note:', error);
    }
  }

  /**
   * Play multiple notes simultaneously (chord)
   */
  playChord(notes: Array<{ string: string; fret: number }>, duration: number = 0.8): void {
    notes.forEach((note, index) => {
      // Slight strum effect - delay each note by 20ms
      setTimeout(() => {
        this.playNote(note.string, note.fret, duration);
      }, index * 20);
    });
  }

  /**
   * Parse ASCII tab and extract note sequence with timing
   */
  parseTab(tabText: string): Array<{ time: number; notes: Array<{ string: string; fret: number }> }> {
    const lines = tabText.trim().split('\n');
    const stringOrder = ['e', 'B', 'G', 'D', 'A', 'E']; // Top to bottom
    const sequence: Array<{ time: number; notes: Array<{ string: string; fret: number }> }> = [];

    // Parse each line to extract string name and content
    const stringData: Record<string, string> = {};

    lines.forEach(line => {
      const match = line.match(/^([eBGDAE])\|(.+)$/);
      if (match) {
        stringData[match[1]] = match[2];
      }
    });

    if (Object.keys(stringData).length !== 6) {
      console.warn('Invalid tab format - expected 6 strings');
      return sequence;
    }

    // Find the length of tab content
    const contentLength = stringData['e']?.length || 0;

    // Walk through each position in the tab
    let position = 0;
    let timeStep = 0;

    while (position < contentLength) {
      const notesAtPosition: Array<{ string: string; fret: number }> = [];
      let maxDigits = 1;

      // Check each string at this position
      stringOrder.forEach(stringName => {
        const content = stringData[stringName];
        if (!content || position >= content.length) return;

        const char = content[position];

        // Check if this is a digit (start of a fret number)
        if (/\d/.test(char)) {
          let fretStr = char;
          // Check for double-digit fret
          if (position + 1 < content.length && /\d/.test(content[position + 1])) {
            fretStr += content[position + 1];
            maxDigits = Math.max(maxDigits, 2);
          }

          notesAtPosition.push({
            string: stringName,
            fret: parseInt(fretStr, 10),
          });
        }
      });

      // If we found notes at this position, add them to sequence
      if (notesAtPosition.length > 0) {
        sequence.push({
          time: timeStep,
          notes: notesAtPosition,
        });
        timeStep++;
      }

      // Move to next position (skip over double-digit frets on other strings)
      position += maxDigits;
    }

    return sequence;
  }

  /**
   * Play entire tab with given tempo
   */
  async playTab(
    tabText: string,
    options: PlaybackOptions,
    onPositionChange?: (position: number, total: number) => void,
    shouldStop?: () => boolean
  ): Promise<void> {
    const sequence = this.parseTab(tabText);

    if (sequence.length === 0) {
      console.warn('No notes found in tab');
      return;
    }

    // Calculate note duration from tempo (BPM)
    // Assuming 8th notes, so 2 notes per beat
    const beatDuration = 60 / options.tempo; // seconds per beat
    const noteDuration = beatDuration / 2; // 8th note duration
    const noteInterval = noteDuration * 1000; // milliseconds

    const playSequence = async () => {
      for (let i = 0; i < sequence.length; i++) {
        // Check if we should stop
        if (shouldStop && shouldStop()) {
          return;
        }

        const { notes } = sequence[i];

        // Report position
        if (onPositionChange) {
          onPositionChange(i, sequence.length);
        }

        // Play all notes at this position
        if (notes.length === 1) {
          this.playNote(notes[0].string, notes[0].fret, noteDuration);
        } else {
          this.playChord(notes, noteDuration);
        }

        // Wait for next note
        await new Promise(resolve => setTimeout(resolve, noteInterval));
      }

      // Report completion
      if (onPositionChange) {
        onPositionChange(sequence.length, sequence.length);
      }
    };

    do {
      await playSequence();
    } while (options.loop && (!shouldStop || !shouldStop()));
  }

  /**
   * Stop all currently playing sounds
   */
  stop(): void {
    if (this.instrument) {
      this.instrument.stop();
    }
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.stop();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.instrument = null;
    this.initialized = false;
  }

  /**
   * Check if synthesizer is ready
   */
  isReady(): boolean {
    return this.initialized && !this.loading && this.instrument !== null;
  }
}

// Singleton instance
let synthesizerInstance: GuitarSynthesizer | null = null;

export function getGuitarSynthesizer(): GuitarSynthesizer {
  if (!synthesizerInstance) {
    synthesizerInstance = new GuitarSynthesizer();
  }
  return synthesizerInstance;
}
