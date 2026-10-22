import { describe, expect, it } from 'vitest';
import { BeatNames } from '../src/core/library/BeatNames';
import { ImportProgress } from '../src/core/library/ImportProgress';

describe('BeatNames', () => {
  it('builds a batch with no duplicates and nothing already in the catalog', () => {
    const taken = ['Velvet Room', 'GOLDEN HOUR', '  blue   piano '];
    const names = BeatNames.propose(12, taken, () => 0.41);
    expect(names).toHaveLength(12);
    const keys = names.map((name) => BeatNames.key(name));
    expect(new Set(keys).size).toBe(names.length);
    for (const title of taken) expect(keys).not.toContain(BeatNames.key(title));
    for (const name of names) {
      const parts = name.split(' ');
      expect(parts.length === 2 || parts.length === 3).toBe(true);
      expect(BeatNames.moods).toContain(parts[0]);
      expect(BeatNames.places).toContain(parts[1]);
    }
  });

  it('rerolls to a different set when the previous titles are treated as taken', () => {
    const first = BeatNames.propose(4, [], () => 0.2);
    const second = BeatNames.propose(4, first, () => 0.2);
    expect(second).not.toEqual(first);
    for (const name of second) expect(first.map((item) => BeatNames.key(item))).not.toContain(BeatNames.key(name));
  });

  it('is stable for the same random source', () => {
    expect(BeatNames.propose(6, ['Midnight Room'], () => 0.15)).toEqual(BeatNames.propose(6, ['Midnight Room'], () => 0.15));
  });

  it('uses a third word when every two-word title is already taken', () => {
    const pairs = BeatNames.moods.flatMap((mood) => BeatNames.places.map((place) => `${mood} ${place}`));
    const [name] = BeatNames.propose(1, pairs, () => 0.3);
    expect(name.split(' ')).toHaveLength(3);
    expect(pairs.map((item) => BeatNames.key(item))).not.toContain(BeatNames.key(name));
  });

  it('remembers the previous titles for undo', () => {
    expect(BeatNames.undo([
      { id: 'a', from: 'Night Drive' },
      { id: 'b', from: 'Glassroom' },
    ])).toEqual([
      { id: 'a', title: 'Night Drive' },
      { id: 'b', title: 'Glassroom' },
    ]);
  });
});

describe('ImportProgress', () => {
  it('keeps a short producer status list', () => {
    expect(ImportProgress.lines.length).toBeGreaterThanOrEqual(15);
    expect(ImportProgress.lines.length).toBeLessThanOrEqual(20);
    expect(new Set(ImportProgress.lines).size).toBe(ImportProgress.lines.length);
    for (const line of ImportProgress.lines) expect(line.length).toBeGreaterThan(8);
    expect(ImportProgress.lines.join(' ').toLowerCase()).not.toMatch(/damn|hell|shit|fuck/);
  });

  it('moves the bar and the status line only when the phase or the finished count changes', () => {
    const started = ImportProgress.start(4);
    expect(ImportProgress.countLabel(started)).toBe('1 of 4');
    expect(ImportProgress.fraction(started)).toBeCloseTo(0.28 / 4);
    expect(ImportProgress.statusLine(started.line)).toBe(ImportProgress.lines[0]);

    const stillLoading = ImportProgress.step(started, 'loading', 0);
    expect(stillLoading.line).toBe(0);
    expect(ImportProgress.fraction(stillLoading)).toBe(ImportProgress.fraction(started));

    const analyzing = ImportProgress.step(stillLoading, 'analyzing', 0);
    expect(analyzing.line).toBe(1);
    expect(ImportProgress.phaseLabel(analyzing.phase)).toBe('Analyzing key and BPM');
    expect(ImportProgress.fraction(analyzing)).toBeGreaterThan(ImportProgress.fraction(stillLoading));
    expect(ImportProgress.statusLine(analyzing.line)).toBe(ImportProgress.lines[1]);

    const finishedOne = ImportProgress.step(analyzing, 'analyzing', 1);
    expect(finishedOne.done).toBe(1);
    expect(finishedOne.line).toBe(2);
    expect(ImportProgress.countLabel(finishedOne)).toBe('2 of 4');
  });

  it('follows a real import: load, measure, then settle before the next file', () => {
    let run = ImportProgress.begin(2);
    run = ImportProgress.apply(run, { phase: 'loading', index: 0, total: 2 });
    expect(run.snapshot.done).toBe(0);
    expect(ImportProgress.countLabel(run.snapshot)).toBe('1 of 2');

    run = ImportProgress.apply(run, { phase: 'analyzing', index: 0, total: 2 });
    const mid = ImportProgress.fraction(run.snapshot);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(0.5);

    run = ImportProgress.apply(run, { phase: 'settled', index: 0, total: 2, needsDecode: false });
    expect(run.snapshot.done).toBe(1);
    expect(run.pending).toEqual([]);

    run = ImportProgress.apply(run, { phase: 'loading', index: 1, total: 2 });
    run = ImportProgress.apply(run, { phase: 'settled', index: 1, total: 2, needsDecode: true });
    expect(run.pending).toEqual([1]);
    expect(run.snapshot.done).toBe(1);

    run = ImportProgress.decodeStart(run, 1);
    expect(run.snapshot.phase).toBe('analyzing');
    expect(ImportProgress.countLabel(run.snapshot)).toBe('2 of 2');
    run = ImportProgress.decodeFinish(run, 1);
    expect(run.snapshot.done).toBe(2);
    expect(ImportProgress.fraction(run.snapshot)).toBe(1);
    expect(ImportProgress.countLabel(run.snapshot)).toBe('2 of 2');
  });

  it('does not invent progress for an empty run', () => {
    const empty = ImportProgress.start(0);
    expect(ImportProgress.fraction(empty)).toBe(0);
    expect(ImportProgress.countLabel(empty)).toBe('0 of 0');
  });
});
