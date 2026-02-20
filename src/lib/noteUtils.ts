const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function midiToNoteName(midi: number): string {
  const octave = Math.floor(midi / 12) - 1;
  const note = NOTE_NAMES[midi % 12];
  return `${note}${octave}`;
}

export function durationToName(duration: number): string {
  const names: Record<number, string> = {
    1: 'whole',
    2: 'half',
    4: 'quarter',
    8: '8th',
    16: '16th',
    32: '32nd',
  };
  return names[duration] || `1/${duration}`;
}
