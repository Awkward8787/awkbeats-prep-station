import { Camelot } from '../analysis/Camelot';

const MAJOR_INTERVALS = [0, 2, 4, 5, 7, 9, 11];
const MINOR_INTERVALS = [0, 2, 3, 5, 7, 8, 10];

/** Synthetic clicks, tones, and loops with known tempo and key. Used by tests and local demos. */
export class ReferenceAudio {
  static clicks(options: { bpm: number; seconds: number; sampleRate?: number; frequency?: number }): Float32Array {
    const sampleRate = options.sampleRate ?? 44100;
    const frequency = options.frequency ?? 1000;
    const n = Math.floor(options.seconds * sampleRate);
    const out = new Float32Array(n);
    const period = (60 / options.bpm) * sampleRate;
    const burst = Math.floor(sampleRate * 0.012);
    for (let beat = 0; beat * period < n; beat++) {
      const start = Math.round(beat * period);
      for (let k = 0; k < burst && start + k < n; k++) {
        const env = Math.exp(-k / (sampleRate * 0.0022));
        out[start + k] += Math.sin((2 * Math.PI * frequency * k) / sampleRate) * env * 0.9;
      }
    }
    return out;
  }

  static noiseBursts(options: { bpm: number; seconds: number; sampleRate?: number }): Float32Array {
    const sampleRate = options.sampleRate ?? 44100;
    const n = Math.floor(options.seconds * sampleRate);
    const out = new Float32Array(n);
    const period = (60 / options.bpm) * sampleRate;
    const burst = Math.floor(sampleRate * 0.03);
    let state = 123456789;
    const rand = () => {
      state = (1664525 * state + 1013904223) >>> 0;
      return state / 0xffffffff;
    };
    for (let beat = 0; beat * period < n; beat++) {
      const start = Math.round(beat * period);
      for (let k = 0; k < burst && start + k < n; k++) {
        const env = Math.exp(-k / (sampleRate * 0.006));
        out[start + k] += (rand() * 2 - 1) * env * 0.85;
      }
    }
    return out;
  }

  /** Raised-cosine pulses with no sharp transient, for the autocorrelation path. */
  static softPulses(options: { bpm: number; seconds: number; sampleRate?: number }): Float32Array {
    const sampleRate = options.sampleRate ?? 44100;
    const n = Math.floor(options.seconds * sampleRate);
    const out = new Float32Array(n);
    const period = (60 / options.bpm) * sampleRate;
    const width = Math.floor(sampleRate * 0.09);
    for (let beat = 0; beat * period < n; beat++) {
      const center = Math.round(beat * period + width / 2);
      for (let k = -width; k <= width; k++) {
        const index = center + k;
        if (index < 0 || index >= n) continue;
        const window = 0.5 * (1 + Math.cos((Math.PI * k) / width));
        out[index] += window * 0.8;
      }
    }
    return out;
  }

  static keyedTone(options: {
    root: string;
    mode: 'major' | 'minor';
    seconds: number;
    sampleRate?: number;
    octave?: number;
  }): Float32Array {
    const named = Camelot.parse(`${options.root} ${options.mode}`);
    if (!named) throw new Error(`Unknown key ${options.root} ${options.mode}`);
    const sampleRate = options.sampleRate ?? 44100;
    const octave = options.octave ?? 4;
    const n = Math.floor(options.seconds * sampleRate);
    const out = new Float32Array(n);
    const intervals = options.mode === 'major' ? MAJOR_INTERVALS : MINOR_INTERVALS;
    const tonicMidi = 12 * (octave + 1) + named.pitchClass;
    const notes: { midi: number; amp: number }[] = [];
    for (const interval of intervals) {
      notes.push({ midi: tonicMidi + interval, amp: interval === 0 ? 0.42 : 0.16 });
    }
    notes.push({ midi: tonicMidi - 12, amp: 0.28 });
    notes.push({ midi: tonicMidi + 12, amp: 0.2 });
    for (const note of notes) {
      const freq = 440 * Math.pow(2, (note.midi - 69) / 12);
      for (let i = 0; i < n; i++) {
        out[i] += note.amp * Math.sin((2 * Math.PI * freq * i) / sampleRate);
      }
    }
    return this.normalize(out, 0.9);
  }

  static loop(options: {
    bpm: number;
    root: string;
    mode: 'major' | 'minor';
    bars: number;
    sampleRate?: number;
  }): Float32Array {
    const sampleRate = options.sampleRate ?? 44100;
    const seconds = (options.bars * 4 * 60) / options.bpm;
    const tone = this.keyedTone({
      root: options.root,
      mode: options.mode,
      seconds,
      sampleRate,
    });
    const kicks = this.noiseBursts({ bpm: options.bpm, seconds, sampleRate });
    const out = new Float32Array(tone.length);
    for (let i = 0; i < out.length; i++) out[i] = tone[i] * 0.45 + kicks[i] * 0.9;
    return this.normalize(out, 0.95);
  }

  private static normalize(samples: Float32Array, peak: number): Float32Array {
    let max = 0;
    for (let i = 0; i < samples.length; i++) {
      const a = Math.abs(samples[i]);
      if (a > max) max = a;
    }
    if (max < 1e-8) return samples;
    const gain = peak / max;
    for (let i = 0; i < samples.length; i++) samples[i] *= gain;
    return samples;
  }
}
