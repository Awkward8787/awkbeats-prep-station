import { Camelot } from './Camelot';

/**
 * The notes of a key's tonic triad. Major is root, major third, fifth.
 * Minor is root, minor third, fifth. Spelling follows Camelot roots (sharps).
 */
export class KeyTone {
  static triad(name: string | null | undefined): string[] | null {
    const key = Camelot.parse(name || '');
    if (!key) return null;
    const third = (key.pitchClass + (key.mode === 'minor' ? 3 : 4)) % 12;
    const fifth = (key.pitchClass + 7) % 12;
    const roots = Camelot.roots();
    return [roots[key.pitchClass], roots[third], roots[fifth]];
  }

  /** MIDI note number. Octave 4 is the octave of middle C, so C4 is 60 and A4 is 69. */
  static midi(note: string, octave = 4): number | null {
    const pitch = Camelot.roots().indexOf(note);
    if (pitch < 0) return null;
    return (octave + 1) * 12 + pitch;
  }
}
