export type KeyMode = 'major' | 'minor';

export type NamedKey = {
  pitchClass: number;
  root: string;
  mode: KeyMode;
  /** Standard notation, for example "F# minor". */
  name: string;
  /** Camelot code, for example "11A". */
  camelot: string;
};

const ROOTS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

/** Camelot codes indexed by pitch class (C = 0). */
const MAJOR_CAMELOT = ['8B', '3B', '10B', '5B', '12B', '7B', '2B', '9B', '4B', '11B', '6B', '1B'];
const MINOR_CAMELOT = ['5A', '12A', '7A', '2A', '9A', '4A', '11A', '6A', '1A', '8A', '3A', '10A'];

const FLAT_TO_SHARP: Record<string, string> = {
  DB: 'C#',
  EB: 'D#',
  GB: 'F#',
  AB: 'G#',
  BB: 'A#',
};

/**
 * Camelot wheel and standard key names.
 * Pitch class 0 is C. Minor codes use the A ring; major codes use the B ring.
 */
export class Camelot {
  static roots(): readonly string[] {
    return ROOTS;
  }

  static fromPitch(pitchClass: number, mode: KeyMode): NamedKey {
    const pc = ((pitchClass % 12) + 12) % 12;
    const root = ROOTS[pc];
    const camelot = mode === 'major' ? MAJOR_CAMELOT[pc] : MINOR_CAMELOT[pc];
    const name = `${root} ${mode}`;
    return { pitchClass: pc, root, mode, name, camelot };
  }

  static parse(value: string | null | undefined): NamedKey | null {
    if (!value) return null;
    const trimmed = value.trim();
    const camelot = trimmed.toUpperCase().match(/^(\d{1,2})\s*([AB])$/);
    if (camelot) {
      const num = Number(camelot[1]);
      const ring = camelot[2];
      if (num < 1 || num > 12) return null;
      const table = ring === 'B' ? MAJOR_CAMELOT : MINOR_CAMELOT;
      const pc = table.indexOf(`${num}${ring}`);
      if (pc < 0) return null;
      return this.fromPitch(pc, ring === 'B' ? 'major' : 'minor');
    }
    const match = trimmed.match(/^([A-G])([#b♯♭]?)\s*(major|minor|maj|min|m)?$/i);
    if (!match) return null;
    let root = match[1].toUpperCase();
    const accidental = (match[2] || '').replace('♯', '#').replace('♭', 'b');
    if (accidental === '#') root += '#';
    if (accidental.toLowerCase() === 'b') root = FLAT_TO_SHARP[`${root}B`] || root;
    const pc = ROOTS.indexOf(root as (typeof ROOTS)[number]);
    if (pc < 0) return null;
    const modeToken = (match[3] || 'major').toLowerCase();
    const mode: KeyMode = modeToken === 'minor' || modeToken === 'min' || modeToken === 'm' ? 'minor' : 'major';
    return this.fromPitch(pc, mode);
  }
}
