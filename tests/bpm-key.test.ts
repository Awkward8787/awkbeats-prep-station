import { describe, expect, it } from 'vitest';
import { BpmDetector } from '../src/core/analysis/BpmDetector';
import { BpmMath } from '../src/core/analysis/BpmMath';
import { Camelot } from '../src/core/analysis/Camelot';
import { Fft } from '../src/core/analysis/Fft';
import { KeyDetector } from '../src/core/analysis/KeyDetector';
import { ReferenceAudio } from '../src/core/audio/ReferenceAudio';

const SAMPLE_RATE = 44100;

describe('Fft', () => {
  it('peaks on the bin of a pure sine', () => {
    const n = 1024;
    const bin = 8;
    const frame = new Float32Array(n);
    for (let i = 0; i < n; i++) frame[i] = Math.sin((2 * Math.PI * bin * i) / n);
    const mag = Fft.magnitudes(frame);
    let peak = 0;
    for (let i = 1; i < mag.length; i++) if (mag[i] > mag[peak]) peak = i;
    expect(peak).toBe(bin);
  });
});

describe('Camelot', () => {
  it('maps F# minor to 11A and C major to 8B', () => {
    const minor = Camelot.parse('F# minor');
    const major = Camelot.parse('C major');
    expect(minor?.name).toBe('F# minor');
    expect(minor?.camelot).toBe('11A');
    expect(major?.name).toBe('C major');
    expect(major?.camelot).toBe('8B');
  });

  it('accepts Camelot codes and flat spellings', () => {
    expect(Camelot.parse('11A')?.name).toBe('F# minor');
    expect(Camelot.parse('Bb minor')?.name).toBe('A# minor');
    expect(Camelot.parse('Eb major')?.camelot).toBe('5B');
  });
});

describe('BpmMath', () => {
  it('rounds to 0.01 and folds half and double time', () => {
    expect(BpmMath.round(140.254)).toBe(140.25);
    expect(BpmMath.half(140.25)).toBe(70.13);
    expect(BpmMath.double(70.125)).toBe(140.25);
  });

  it('prefers a typed override, otherwise the detected tempo times the scale', () => {
    expect(BpmMath.working({ bpmDetected: 140, bpmScale: 0.5, bpmOverride: null })).toBe(70);
    expect(BpmMath.working({ bpmDetected: 140, bpmScale: 2, bpmOverride: null })).toBe(280);
    expect(BpmMath.working({ bpmDetected: 140, bpmScale: 0.5, bpmOverride: 96.5 })).toBe(96.5);
    expect(BpmMath.interpretation({ bpmDetected: 140, bpmScale: 0.5, bpmOverride: null })).toBe('half-time');
  });
});

describe('BpmDetector', () => {
  const clickTempos = [72.5, 90, 96, 120, 128.05, 140.25, 150, 174];

  it.each(clickTempos)('measures click track at %s BPM within 0.01', (bpm) => {
    const audio = ReferenceAudio.clicks({ bpm, seconds: 12, sampleRate: SAMPLE_RATE });
    const result = BpmDetector.detect(audio, SAMPLE_RATE);
    expect(result.method).toBe('onset');
    expect(Math.abs(result.bpm - bpm)).toBeLessThanOrEqual(0.01);
    expect(result.halfTime).toBe(BpmMath.half(result.bpm));
    expect(result.doubleTime).toBe(BpmMath.double(result.bpm));
    expect(result.confidence).toBeGreaterThan(0.8);
  });

  it('measures a noise-burst loop at 100 BPM within 0.01', () => {
    const audio = ReferenceAudio.noiseBursts({ bpm: 100, seconds: 10, sampleRate: SAMPLE_RATE });
    const result = BpmDetector.detect(audio, SAMPLE_RATE);
    expect(Math.abs(result.bpm - 100)).toBeLessThanOrEqual(0.01);
  });

  it('measures soft pulses within 0.01 BPM', () => {
    const audio = ReferenceAudio.softPulses({ bpm: 110, seconds: 16, sampleRate: SAMPLE_RATE });
    const result = BpmDetector.detect(audio, SAMPLE_RATE);
    expect(Math.abs(result.bpm - 110)).toBeLessThanOrEqual(0.01);
    expect(result.confidence).toBeGreaterThan(0.8);
  });

  it('does not report double time for an 80 BPM click track', () => {
    const audio = ReferenceAudio.clicks({ bpm: 80, seconds: 10, sampleRate: SAMPLE_RATE });
    const result = BpmDetector.detect(audio, SAMPLE_RATE);
    expect(Math.abs(result.bpm - 80)).toBeLessThanOrEqual(0.01);
  });
});

describe('KeyDetector', () => {
  const roots = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  it.each(roots)('identifies %s major', (root) => {
    const audio = ReferenceAudio.keyedTone({ root, mode: 'major', seconds: 4, sampleRate: SAMPLE_RATE });
    const result = KeyDetector.detect(audio, SAMPLE_RATE);
    expect(result.name).toBe(`${root} major`);
    expect(result.camelot).toBe(Camelot.parse(`${root} major`)?.camelot);
    expect(result.confidence).toBeGreaterThan(0.2);
  });

  it.each(roots)('identifies %s minor', (root) => {
    const audio = ReferenceAudio.keyedTone({ root, mode: 'minor', seconds: 4, sampleRate: SAMPLE_RATE });
    const result = KeyDetector.detect(audio, SAMPLE_RATE);
    expect(result.name).toBe(`${root} minor`);
    expect(result.camelot).toBe(Camelot.parse(`${root} minor`)?.camelot);
    expect(result.confidence).toBeGreaterThan(0.2);
  });

  it('reads key and tempo together on a tonal drum loop', () => {
    const audio = ReferenceAudio.loop({
      bpm: 96,
      root: 'F#',
      mode: 'minor',
      bars: 8,
      sampleRate: SAMPLE_RATE,
    });
    const bpm = BpmDetector.detect(audio, SAMPLE_RATE);
    const key = KeyDetector.detect(audio, SAMPLE_RATE);
    expect(Math.abs(bpm.bpm - 96)).toBeLessThanOrEqual(0.01);
    expect(key.name).toBe('F# minor');
    expect(key.camelot).toBe('11A');
  });
});
