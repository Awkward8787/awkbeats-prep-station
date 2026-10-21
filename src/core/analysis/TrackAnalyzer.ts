import { BpmDetector } from './BpmDetector';
import { KeyDetector } from './KeyDetector';
import type { AnalysisResult } from '../library/types';

/** Runs key and tempo detection on mono audio and builds a display waveform. */
export class TrackAnalyzer {
  static analyze(samples: Float32Array, sampleRate: number): AnalysisResult {
    const capped = samples.subarray(0, Math.min(samples.length, Math.floor(sampleRate * 90)));
    let bpm: number | null = null;
    let bpmConfidence: number | null = null;
    if (capped.length >= sampleRate * 0.75) {
      try {
        const tempo = BpmDetector.detect(capped, sampleRate);
        bpm = tempo.bpm;
        bpmConfidence = tempo.confidence;
      } catch {
        bpm = null;
      }
    }
    let keyName: string | null = null;
    let camelot: string | null = null;
    let keyConfidence: number | null = null;
    if (capped.length >= 2048) {
      const key = KeyDetector.detect(capped, sampleRate);
      if (key.confidence > 0) {
        keyName = key.name;
        camelot = key.camelot;
        keyConfidence = key.confidence;
      }
    }
    return {
      bpm,
      bpmConfidence,
      keyName,
      camelot,
      keyConfidence,
      durationSec: samples.length / sampleRate,
      sampleRate,
      peaks: this.peaks(capped, 160),
    };
  }

  static peaks(samples: Float32Array, buckets: number): number[] {
    if (samples.length === 0 || buckets < 1) return [];
    const size = Math.max(1, Math.floor(samples.length / buckets));
    const out: number[] = [];
    let max = 0;
    for (let i = 0; i < buckets; i++) {
      let peak = 0;
      const start = i * size;
      const end = Math.min(samples.length, start + size);
      if (start >= samples.length) break;
      for (let j = start; j < end; j++) {
        const value = Math.abs(samples[j]);
        if (value > peak) peak = value;
      }
      out.push(peak);
      if (peak > max) max = peak;
    }
    if (max > 0) {
      for (let i = 0; i < out.length; i++) out[i] = Math.round((out[i] / max) * 1000) / 1000;
    }
    return out;
  }
}
