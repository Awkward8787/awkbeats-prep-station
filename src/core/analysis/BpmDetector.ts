import { BpmMath } from './BpmMath';

export type BpmEstimate = {
  /** Tempo of the dominant pulse, rounded to 0.01 BPM. */
  bpm: number;
  /** 0–1 regularity score. */
  confidence: number;
  periodSeconds: number;
  halfTime: number;
  doubleTime: number;
  method: 'onset' | 'autocorrelation';
  onsetCount: number;
};

/**
 * Offline tempo detection.
 * Sharp onsets (kicks, clicks, drum loops) are timed sample-accurately and
 * fit with linear regression so a steady grid resolves to 0.01 BPM.
 * Sustained pulses fall back to an envelope autocorrelation with parabolic
 * peak interpolation.
 */
export class BpmDetector {
  static detect(samples: Float32Array, sampleRate: number): BpmEstimate {
    if (samples.length < sampleRate * 0.75 || sampleRate < 8000) {
      throw new Error('Need at least 0.75 seconds of audio at 8 kHz or higher to detect BPM.');
    }
    const onsets = this.findOnsets(samples, sampleRate);
    if (onsets.length >= 4) {
      const fromOnsets = this.tempoFromOnsets(onsets);
      if (fromOnsets && fromOnsets.confidence >= 0.72) {
        return { ...fromOnsets, onsetCount: onsets.length };
      }
    }
    const fromAuto = this.tempoFromAutocorrelation(samples, sampleRate);
    return { ...fromAuto, onsetCount: onsets.length };
  }

  /**
   * Pulse times in seconds. Short-time energy is peak-picked with parabolic
   * interpolation so a smooth pulse and a click are both timed to a fraction
   * of a millisecond, which is what 0.01 BPM needs after regression.
   */
  static findOnsets(samples: Float32Array, sampleRate: number): number[] {
    const hop = 32;
    const frames = Math.floor(samples.length / hop);
    if (frames < 8) return [];
    const env = new Float64Array(frames);
    for (let i = 0; i < frames; i++) {
      let acc = 0;
      const start = i * hop;
      for (let j = 0; j < hop; j++) {
        const s = samples[start + j];
        acc += s * s;
      }
      env[i] = acc / hop;
    }
    const smooth = new Float64Array(frames);
    for (let i = 0; i < frames; i++) {
      let acc = 0;
      let count = 0;
      for (let k = -3; k <= 3; k++) {
        const j = i + k;
        if (j >= 0 && j < frames) {
          acc += env[j];
          count += 1;
        }
      }
      smooth[i] = acc / count;
    }
    let max = 0;
    for (let i = 0; i < frames; i++) if (smooth[i] > max) max = smooth[i];
    if (max <= 1e-12) return [];
    const thresh = max * 0.35;
    const minGap = Math.round((0.18 * sampleRate) / hop);
    const candidates: { frame: number; value: number }[] = [];
    for (let i = 1; i < frames - 1; i++) {
      if (smooth[i] < thresh || smooth[i] < smooth[i - 1] || smooth[i] <= smooth[i + 1]) continue;
      const y0 = smooth[i - 1];
      const y1 = smooth[i];
      const y2 = smooth[i + 1];
      const denom = y0 - 2 * y1 + y2;
      let delta = 0;
      if (Math.abs(denom) > 1e-18) {
        delta = (0.5 * (y0 - y2)) / denom;
        if (delta < -1 || delta > 1) delta = 0;
      }
      candidates.push({ frame: i + delta, value: y1 });
    }
    candidates.sort((a, b) => b.value - a.value);
    const kept: { frame: number; value: number }[] = [];
    for (const candidate of candidates) {
      let near = false;
      for (const previous of kept) {
        if (Math.abs(previous.frame - candidate.frame) < minGap) {
          near = true;
          break;
        }
      }
      if (!near) kept.push(candidate);
    }
    kept.sort((a, b) => a.frame - b.frame);
    return kept.map((peak) => (peak.frame * hop) / sampleRate);
  }

  private static tempoFromOnsets(times: number[]): Omit<BpmEstimate, 'onsetCount'> | null {
    const iois: number[] = [];
    for (let i = 1; i < times.length; i++) {
      const dt = times[i] - times[i - 1];
      if (dt >= 0.18 && dt <= 1.2) iois.push(dt);
    }
    if (iois.length < 3) return null;
    const sorted = [...iois].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const close = iois.filter((dt) => Math.abs(dt - median) / median <= 0.04);
    if (close.length < 3) return null;
    const periodGuess = close.reduce((sum, dt) => sum + dt, 0) / close.length;
    const t0 = times[0];
    let count = 0;
    let sumX = 0;
    let sumY = 0;
    let sumXX = 0;
    let sumXY = 0;
    for (const t of times) {
      const index = Math.round((t - t0) / periodGuess);
      if (index < 0) continue;
      const predicted = t0 + index * periodGuess;
      if (Math.abs(t - predicted) > periodGuess * 0.08) continue;
      count += 1;
      sumX += index;
      sumY += t;
      sumXX += index * index;
      sumXY += index * t;
    }
    const denom = count * sumXX - sumX * sumX;
    if (count < 4 || Math.abs(denom) < 1e-9) return null;
    const period = (count * sumXY - sumX * sumY) / denom;
    if (!(period >= 0.18 && period <= 1.5)) return null;
    const bpm = BpmMath.round(60 / period);
    if (bpm < 40 || bpm > 330) return null;
    const regularity = close.length / iois.length;
    const confidence = Math.max(0, Math.min(1, regularity));
    return {
      bpm,
      confidence,
      periodSeconds: period,
      halfTime: BpmMath.half(bpm),
      doubleTime: BpmMath.double(bpm),
      method: 'onset',
    };
  }

  private static tempoFromAutocorrelation(samples: Float32Array, sampleRate: number): Omit<BpmEstimate, 'onsetCount'> {
    const envelopeRate = 200;
    const hop = Math.max(1, Math.round(sampleRate / envelopeRate));
    const frames = Math.floor(samples.length / hop);
    const env = new Float64Array(frames);
    for (let i = 0; i < frames; i++) {
      let acc = 0;
      const start = i * hop;
      const end = Math.min(samples.length, start + hop);
      for (let j = start; j < end; j++) acc += Math.abs(samples[j]);
      env[i] = acc / (end - start);
    }
    let mean = 0;
    for (let i = 0; i < env.length; i++) mean += env[i];
    mean /= env.length;
    for (let i = 0; i < env.length; i++) env[i] -= mean;

    const minLag = Math.max(2, Math.round(envelopeRate * 0.18));
    const maxLag = Math.min(frames - 3, Math.round(envelopeRate * 1.5));
    const corr = new Float64Array(maxLag + 3);
    let bestLag = minLag;
    let best = -Infinity;
    for (let lag = minLag; lag <= maxLag; lag++) {
      let sum = 0;
      const limit = frames - lag;
      for (let i = 0; i < limit; i++) sum += env[i] * env[i + lag];
      corr[lag] = sum / limit;
      if (corr[lag] > best) {
        best = corr[lag];
        bestLag = lag;
      }
    }
    // A steady pulse also correlates at double and triple the period.
    // Keep the shorter lag when it is essentially as strong, so a tied
    // half-time peak does not hide the fundamental.
    const fundamentalLag = bestLag;
    const fundamentalScore = best;
    for (const divisor of [2, 3]) {
      const target = fundamentalLag / divisor;
      if (target < minLag) continue;
      const window = Math.max(2, Math.round(envelopeRate * 0.03));
      let localLag = Math.round(target);
      let local = -Infinity;
      const start = Math.max(minLag, localLag - window);
      const end = Math.min(maxLag, localLag + window);
      for (let lag = start; lag <= end; lag++) {
        if (corr[lag] > local) {
          local = corr[lag];
          localLag = lag;
        }
      }
      if (local >= fundamentalScore * 0.92 && localLag < bestLag) {
        bestLag = localLag;
        best = local;
      }
    }
    let refined = bestLag;
    if (bestLag > minLag && bestLag < maxLag) {
      const y0 = corr[bestLag - 1];
      const y1 = corr[bestLag];
      const y2 = corr[bestLag + 1];
      const denom = y0 - 2 * y1 + y2;
      if (Math.abs(denom) > 1e-12) {
        const delta = (0.5 * (y0 - y2)) / denom;
        if (delta > -1 && delta < 1) refined = bestLag + delta;
      }
    }
    const period = refined / envelopeRate;
    const bpm = BpmMath.round(60 / period);
    const left = corr[Math.max(minLag, bestLag - 2)];
    const confidence = best <= 0 ? 0 : Math.max(0, Math.min(1, (best - left) / Math.abs(best)));
    return {
      bpm,
      confidence,
      periodSeconds: period,
      halfTime: BpmMath.half(bpm),
      doubleTime: BpmMath.double(bpm),
      method: 'autocorrelation',
    };
  }
}
