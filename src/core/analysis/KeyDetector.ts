import { Camelot, type NamedKey } from './Camelot';
import { Fft } from './Fft';

export type KeyEstimate = NamedKey & {
  /** 0–1 gap between the winning key and the runner-up. */
  confidence: number;
  correlation: number;
  chroma: number[];
};

/**
 * Krumhansl–Schmuckler key profiles (Cognitive Foundations of Musical Pitch, 1990).
 * Index 0 is the tonic. These are published probe-tone weights, not third-party code.
 */
const MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

/**
 * Offline musical-key detection.
 * A long-window FFT collects pitch-class energy. Each of the 24 keys is scored
 * by Pearson correlation against the Krumhansl profile, plus tonic salience so
 * a major key is not confused with its relative minor when the tonic is present.
 */
export class KeyDetector {
  static detect(samples: Float32Array, sampleRate: number): KeyEstimate {
    const chroma = this.chroma(samples, sampleRate);
    const total = chroma.reduce((sum, value) => sum + value, 0);
    if (total < 1e-8) {
      const named = Camelot.fromPitch(0, 'major');
      return { ...named, confidence: 0, correlation: 0, chroma: Array.from(chroma) };
    }
    let maxChroma = 0;
    for (const value of chroma) if (value > maxChroma) maxChroma = value;

    let bestScore = -Infinity;
    let second = -Infinity;
    let bestPc = 0;
    let bestMode: 'major' | 'minor' = 'major';
    let bestCorr = 0;
    for (const mode of ['major', 'minor'] as const) {
      const profile = mode === 'major' ? MAJOR_PROFILE : MINOR_PROFILE;
      for (let pc = 0; pc < 12; pc++) {
        const rotated = this.rotate(profile, pc);
        const correlation = this.pearson(chroma, rotated);
        const salience = maxChroma > 0 ? chroma[pc] / maxChroma : 0;
        const score = 0.82 * correlation + 0.18 * salience;
        if (score > bestScore) {
          second = bestScore;
          bestScore = score;
          bestPc = pc;
          bestMode = mode;
          bestCorr = correlation;
        } else if (score > second) {
          second = score;
        }
      }
    }
    const named = Camelot.fromPitch(bestPc, bestMode);
    const confidence = Math.max(0, Math.min(1, (bestScore - (Number.isFinite(second) ? second : 0)) / 0.12));
    return {
      ...named,
      confidence,
      correlation: bestCorr,
      chroma: Array.from(chroma),
    };
  }

  static chroma(samples: Float32Array, sampleRate: number): Float64Array {
    const fftSize = 16384;
    const hop = 8192;
    const chroma = new Float64Array(12);
    if (samples.length < fftSize) {
      const padded = new Float32Array(fftSize);
      padded.set(samples);
      this.accumulateFrame(padded, sampleRate, fftSize, chroma);
      return chroma;
    }
    for (let start = 0; start + fftSize <= samples.length; start += hop) {
      this.accumulateFrame(samples.subarray(start, start + fftSize), sampleRate, fftSize, chroma);
    }
    return chroma;
  }

  private static accumulateFrame(frame: ArrayLike<number>, sampleRate: number, fftSize: number, chroma: Float64Array): void {
    const windowed = new Float64Array(fftSize);
    for (let i = 0; i < fftSize; i++) {
      const hann = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (fftSize - 1)));
      windowed[i] = frame[i] * hann;
    }
    const mag = Fft.magnitudes(windowed);
    const binHz = sampleRate / fftSize;
    for (let k = 1; k < mag.length - 1; k++) {
      if (!(mag[k] >= mag[k - 1] && mag[k] > mag[k + 1])) continue;
      const freq = k * binHz;
      if (freq < 60 || freq > 4200) continue;
      const midi = 69 + 12 * Math.log2(freq / 440);
      const nearest = Math.round(midi);
      const distance = Math.abs(midi - nearest);
      if (distance > 0.45) continue;
      const weight = mag[k] * (1 - distance / 0.45);
      chroma[((nearest % 12) + 12) % 12] += weight;
    }
  }

  private static rotate(profile: number[], shift: number): number[] {
    const out = new Array<number>(12);
    for (let i = 0; i < 12; i++) out[(i + shift) % 12] = profile[i];
    return out;
  }

  private static pearson(a: ArrayLike<number>, b: ArrayLike<number>): number {
    const n = a.length;
    let meanA = 0;
    let meanB = 0;
    for (let i = 0; i < n; i++) {
      meanA += a[i];
      meanB += b[i];
    }
    meanA /= n;
    meanB /= n;
    let num = 0;
    let denA = 0;
    let denB = 0;
    for (let i = 0; i < n; i++) {
      const da = a[i] - meanA;
      const db = b[i] - meanB;
      num += da * db;
      denA += da * da;
      denB += db * db;
    }
    if (denA <= 1e-12 || denB <= 1e-12) return 0;
    return num / Math.sqrt(denA * denB);
  }
}
