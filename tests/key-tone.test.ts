import { describe, expect, it } from 'vitest';
import { KeyConfidence } from '../src/core/analysis/KeyConfidence';
import { KeyTone } from '../src/core/analysis/KeyTone';
import { Format } from '../src/core/library/types';

describe('KeyTone', () => {
  it('maps A minor to A C E and F# major to F# A# C#', () => {
    expect(KeyTone.triad('A minor')).toEqual(['A', 'C', 'E']);
    expect(KeyTone.triad('F# major')).toEqual(['F#', 'A#', 'C#']);
  });

  it('uses a minor third for minor keys and a major third for major keys', () => {
    expect(KeyTone.triad('C major')).toEqual(['C', 'E', 'G']);
    expect(KeyTone.triad('C minor')).toEqual(['C', 'D#', 'G']);
    expect(KeyTone.triad('F# minor')).toEqual(['F#', 'A', 'C#']);
    expect(KeyTone.triad('Eb major')).toEqual(['D#', 'G', 'A#']);
    expect(KeyTone.triad('11A')).toEqual(['F#', 'A', 'C#']);
  });

  it('numbers middle C as MIDI 60', () => {
    expect(KeyTone.midi('C', 4)).toBe(60);
    expect(KeyTone.midi('A', 4)).toBe(69);
    expect(KeyTone.midi('F#', 4)).toBe(66);
    expect(KeyTone.triad('not a key')).toBeNull();
    expect(KeyTone.midi('H')).toBeNull();
    expect(KeyTone.midi('C', 3)).toBe(48);
  });
});

describe('display formatting', () => {
  it('shows whole BPM as an integer and keeps real decimals', () => {
    expect(Format.bpm(86)).toBe('86');
    expect(Format.bpm(86.0)).toBe('86');
    expect(Format.bpm(140.25)).toBe('140.25');
    expect(Format.bpm(null)).toBe('');
  });

  it('flags low key confidence below 0.45', () => {
    expect(KeyConfidence.reviewAt).toBe(0.45);
    expect(KeyConfidence.low(0.44)).toBe(true);
    expect(KeyConfidence.low(0.45)).toBe(false);
    expect(KeyConfidence.low(null)).toBe(false);
  });
});
