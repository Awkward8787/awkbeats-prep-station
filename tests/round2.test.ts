import { describe, expect, it } from 'vitest';
import { ByteRange } from '../src/core/audio/ByteRange';
import { PlaybackSpan } from '../src/core/audio/PlaybackSpan';
import { KeyPreview } from '../src/renderer/KeyPreview';
import { ShortcutGuard } from '../src/renderer/ShortcutGuard';

class FakeTarget {
  constructor(private hits: string[]) {}
  closest(selector: string): unknown {
    const parts = selector.split(',').map((part) => part.trim());
    return parts.some((part) => this.hits.includes(part)) ? this : null;
  }
}

describe('ShortcutGuard', () => {
  it('lets Space play the beat only when focus is not on a control', () => {
    expect(ShortcutGuard.spacePlaysBeat(null)).toBe(true);
    expect(ShortcutGuard.spacePlaysBeat(new FakeTarget([]))).toBe(true);
    expect(ShortcutGuard.spacePlaysBeat(new FakeTarget(['button']))).toBe(false);
    expect(ShortcutGuard.spacePlaysBeat(new FakeTarget(['table.tracks']))).toBe(false);
    expect(ShortcutGuard.spacePlaysBeat(new FakeTarget(['[role="radio"]']))).toBe(false);
    expect(ShortcutGuard.spacePlaysBeat(new FakeTarget(['[role="slider"]']))).toBe(false);
  });

  it('leaves Enter and Space to buttons, links, and roles', () => {
    const button = new FakeTarget(['button']);
    expect(ShortcutGuard.controlOwnsKey(button, ' ')).toBe(true);
    expect(ShortcutGuard.controlOwnsKey(button, 'Enter')).toBe(true);
    expect(ShortcutGuard.controlOwnsKey(button, 'k')).toBe(false);
    expect(ShortcutGuard.controlOwnsKey(new FakeTarget([]), ' ')).toBe(false);
  });

  it('lets Cmd or Ctrl shortcuts through a focused row, button, or grid', () => {
    const button = new FakeTarget(['button']);
    const row = new FakeTarget(['[role="row"]']);
    const grid = new FakeTarget(['[role="grid"]']);
    expect(ShortcutGuard.controlOwnsKey(button, 'Enter', true)).toBe(false);
    expect(ShortcutGuard.controlOwnsKey(button, ' ', true)).toBe(false);
    expect(ShortcutGuard.controlOwnsKey(row, 'Enter')).toBe(true);
    expect(ShortcutGuard.controlOwnsKey(row, 'Enter', true)).toBe(false);
    expect(ShortcutGuard.controlOwnsKey(row, ' ', true)).toBe(false);
    expect(ShortcutGuard.controlOwnsKey(grid, ' ')).toBe(false);
    expect(ShortcutGuard.controlOwnsKey(grid, 'Enter')).toBe(false);
  });

  it('does not swallow Ctrl+Enter when a checkbox is focused', () => {
    const checkbox = new FakeTarget(['input']);
    const field = new FakeTarget(['input:not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="range"])']);
    expect(ShortcutGuard.typingTarget(checkbox)).toBe(false);
    expect(ShortcutGuard.typingTarget(field)).toBe(true);
    expect(ShortcutGuard.typingTarget(new FakeTarget(['textarea']))).toBe(true);
    expect(ShortcutGuard.controlOwnsKey(checkbox, 'Enter', true)).toBe(false);
    expect(ShortcutGuard.controlOwnsKey(checkbox, ' ', false)).toBe(true);
  });
});

describe('PlaybackSpan', () => {
  it('falls back to the stored length when the reported duration is not finite', () => {
    expect(PlaybackSpan.total(Number.POSITIVE_INFINITY, 6.2)).toBe(6.2);
    expect(PlaybackSpan.total(Number.NaN, 4)).toBe(4);
    expect(PlaybackSpan.total(0, 3)).toBe(3);
    expect(PlaybackSpan.total(5.5, 9)).toBe(5.5);
    expect(PlaybackSpan.total(Number.POSITIVE_INFINITY, null)).toBe(0);
  });
});

describe('ByteRange', () => {
  it('parses open, closed, and suffix ranges', () => {
    expect(ByteRange.resolve(null, 100)).toEqual({ kind: 'all' });
    expect(ByteRange.resolve('bytes=0-', 100)).toEqual({ kind: 'partial', span: { start: 0, end: 99 } });
    expect(ByteRange.resolve('bytes=10-20', 100)).toEqual({ kind: 'partial', span: { start: 10, end: 20 } });
    expect(ByteRange.resolve('bytes=-8', 100)).toEqual({ kind: 'partial', span: { start: 92, end: 99 } });
    expect(ByteRange.resolve('bytes=100-120', 100).kind).toBe('invalid');
  });
});

class FakeOsc {
  type = '';
  frequency = { setValueAtTime() {} };
  connect() {}
  start() {}
  stop() {}
}

class FakeAudio {
  currentTime = 0;
  destination = {};
  resume() { return Promise.resolve(); }
  createOscillator() { return new FakeOsc(); }
  createGain() {
    return {
      gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
      connect() {},
    };
  }
}

describe('KeyPreview hold', () => {
  it('stops a held drone on stop, and only toggles off when the name matches', () => {
    const previous = globalThis.AudioContext;
    globalThis.AudioContext = FakeAudio as unknown as typeof AudioContext;
    KeyPreview.stop();
    KeyPreview.toggleHold('A minor');
    expect(KeyPreview.snapshot()).toMatchObject({ holding: true, sounding: true, name: 'A minor' });
    KeyPreview.stop();
    expect(KeyPreview.snapshot()).toMatchObject({ holding: false, sounding: false, name: null });

    KeyPreview.toggleHold('A minor');
    KeyPreview.toggleHold('F# minor');
    expect(KeyPreview.snapshot()).toMatchObject({ holding: true, name: 'F# minor' });
    KeyPreview.toggleHold('F# minor');
    expect(KeyPreview.snapshot().holding).toBe(false);
    KeyPreview.stop();
    globalThis.AudioContext = previous;
  });
});
