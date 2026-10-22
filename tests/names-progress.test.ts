import { describe, expect, it } from 'vitest';
import { BeatNames } from '../src/core/library/BeatNames';
import { ImportProgress } from '../src/core/library/ImportProgress';
import { UserMessage } from '../src/core/library/UserMessage';

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

  it('restores only rows whose title still equals the applied name', () => {
    const rows = [
      { id: 'a', from: 'Night Drive', to: 'Velvet Room', tagsDirty: false, appliedAt: 't1' },
      { id: 'b', from: 'Gold Hour', to: 'Amber Alley', tagsDirty: true, appliedAt: 't2' },
    ];
    const plan = BeatNames.restorePlan(rows, [
      { id: 'a', title: 'My Edit', updatedAt: 't1' },
      { id: 'b', title: 'Amber Alley', updatedAt: 't2' },
    ]);
    expect(plan.skipped).toEqual(['My Edit']);
    expect(plan.restore).toEqual([{ id: 'b', title: 'Gold Hour', tagsDirty: true }]);
    expect(UserMessage.namesRestoredSome(plan.skipped)).toBe('Names restored. Left unchanged: My Edit.');
  });
});

describe('ImportProgress', () => {
  it('keeps a short producer status list', () => {
    expect([...ImportProgress.lines]).toEqual([
      'Finding the pocket',
      'Counting the bars out loud',
      'Tapping along to the kick',
      'Marking the tempo on the one',
      'Humming the root note',
      'Checking the swing, then the key',
      'Major or minor? Checking',
      'Reading the tags you already wrote',
      'Reading the waveform like a chart',
      'Lining up the Camelot code',
    ]);
    expect(new Set(ImportProgress.lines).size).toBe(ImportProgress.lines.length);
    for (const line of ImportProgress.lines) expect(line.length).toBeGreaterThan(8);
    expect(ImportProgress.lines.join(' ').toLowerCase()).not.toMatch(/damn|hell|shit|fuck/);
  });

  it('counts a finished file once and ignores phase ticks', () => {
    const started = ImportProgress.start(4);
    expect(started.done).toBe(0);
    expect(ImportProgress.countLabel(started)).toBe('0 of 4');
    expect(ImportProgress.fraction(started)).toBe(0);

    let run = ImportProgress.begin(4);
    run = ImportProgress.apply(run, { phase: 'loading', index: 0, total: 4 });
    run = ImportProgress.apply(run, { phase: 'analyzing', index: 0, total: 4 });
    expect(run.snapshot.done).toBe(0);
    expect(ImportProgress.fraction(run.snapshot)).toBe(0);
    expect(ImportProgress.phaseLabel(run.snapshot.phase)).toBe('Analyzing key and BPM');

    run = ImportProgress.apply(run, { phase: 'settled', index: 0, total: 4, needsDecode: false });
    expect(run.snapshot.done).toBe(1);
    expect(ImportProgress.countLabel(run.snapshot)).toBe('1 of 4');
    expect(ImportProgress.fraction(run.snapshot)).toBe(0.25);

    const again = ImportProgress.decodeFinish(run, 0);
    expect(again.snapshot.done).toBe(1);
    expect(again.snapshot.finished).toEqual([0]);
  });

  it('follows a real import: load, measure, then settle before the next file', () => {
    let run = ImportProgress.begin(2);
    run = ImportProgress.apply(run, { phase: 'loading', index: 0, total: 2 });
    expect(run.snapshot.done).toBe(0);
    expect(ImportProgress.countLabel(run.snapshot)).toBe('0 of 2');

    run = ImportProgress.apply(run, { phase: 'analyzing', index: 0, total: 2 });
    expect(ImportProgress.fraction(run.snapshot)).toBe(0);

    run = ImportProgress.apply(run, { phase: 'settled', index: 0, total: 2, needsDecode: false });
    expect(run.snapshot.done).toBe(1);
    expect(run.pending).toEqual([]);

    run = ImportProgress.apply(run, { phase: 'loading', index: 1, total: 2 });
    run = ImportProgress.apply(run, { phase: 'settled', index: 1, total: 2, needsDecode: true });
    expect(run.pending).toEqual([1]);
    expect(run.snapshot.done).toBe(1);
    expect(ImportProgress.fraction(run.snapshot)).toBe(0.5);

    run = ImportProgress.decodeStart(run, 1);
    expect(run.snapshot.phase).toBe('analyzing');
    expect(run.snapshot.done).toBe(1);
    expect(ImportProgress.countLabel(run.snapshot)).toBe('1 of 2');
    expect(ImportProgress.fraction(run.snapshot)).toBe(0.5);
    run = ImportProgress.decodeFinish(run, 1);
    expect(run.snapshot.done).toBe(2);
    expect(ImportProgress.fraction(run.snapshot)).toBe(1);
    expect(ImportProgress.countLabel(run.snapshot)).toBe('2 of 2');
  });

  it('never moves backward when MP3 or FLAC files finish after WAV files', () => {
    let run = ImportProgress.begin(14);
    const fractions = [ImportProgress.fraction(run.snapshot)];
    const record = () => {
      fractions.push(ImportProgress.fraction(run.snapshot));
    };
    for (let index = 0; index < 10; index += 1) {
      run = ImportProgress.apply(run, { phase: 'loading', index, total: 14 });
      record();
      run = ImportProgress.apply(run, { phase: 'analyzing', index, total: 14 });
      record();
      run = ImportProgress.apply(run, { phase: 'settled', index, total: 14, needsDecode: false });
      record();
    }
    for (let index = 10; index < 14; index += 1) {
      run = ImportProgress.apply(run, { phase: 'loading', index, total: 14 });
      record();
      run = ImportProgress.apply(run, { phase: 'settled', index, total: 14, needsDecode: true });
      record();
    }
    expect(run.snapshot.done).toBe(10);
    expect(run.pending).toEqual([10, 11, 12, 13]);
    expect(ImportProgress.fraction(run.snapshot)).toBeLessThan(1);
    for (let index = 10; index < 14; index += 1) {
      run = ImportProgress.decodeStart(run, index);
      record();
      expect(ImportProgress.fraction(run.snapshot)).toBeLessThan(1);
      expect(run.snapshot.done).toBe(10 + (index - 10));
      run = ImportProgress.decodeFinish(run, index);
      record();
    }
    expect(run.snapshot.done).toBe(14);
    expect(ImportProgress.fraction(run.snapshot)).toBe(1);
    for (let index = 1; index < fractions.length; index += 1) {
      expect(fractions[index]).toBeGreaterThanOrEqual(fractions[index - 1]);
    }
  });

  it('speaks a status line only after 1.5s, holds it for 3s, and does not loop', () => {
    expect(ImportProgress.spokenLine(0)).toBeNull();
    expect(ImportProgress.spokenLine(1499)).toBeNull();
    expect(ImportProgress.spokenLine(1500)).toBe(ImportProgress.lines[0]);
    expect(ImportProgress.spokenLine(4499)).toBe(ImportProgress.lines[0]);
    expect(ImportProgress.spokenLine(4500)).toBe(ImportProgress.lines[1]);
    expect(ImportProgress.spokenLine(1500 + ImportProgress.lines.length * 3000)).toBeNull();
  });

  it('announces at most five stable messages, with no running count', () => {
    const distinct = (total: number) => {
      const seen: string[] = [];
      for (let done = 0; done <= total; done += 1) {
        const text = ImportProgress.milestone({ phase: 'analyzing', done, total, line: 0, finished: [] });
        if (!seen.includes(text)) seen.push(text);
      }
      return seen;
    };
    expect(distinct(16)).toEqual([
      'Importing 16 files',
      '25% imported',
      '50% imported',
      '75% imported',
      'Imported 16 of 16',
    ]);
    expect(distinct(16).length).toBeLessThanOrEqual(5);
    expect(distinct(100)).toEqual([
      'Importing 100 files',
      '25% imported',
      '50% imported',
      '75% imported',
      'Imported 100 of 100',
    ]);
    expect(distinct(100).length).toBeLessThanOrEqual(5);
    const at = (done: number) => ImportProgress.milestone({ phase: 'analyzing', done, total: 16, line: 0, finished: [] });
    expect(at(3)).toBe(at(0));
    expect(at(7)).toBe(at(4));
  });

  it('does not invent progress for an empty run', () => {
    const empty = ImportProgress.start(0);
    expect(ImportProgress.fraction(empty)).toBe(0);
    expect(ImportProgress.countLabel(empty)).toBe('0 of 0');
    expect(ImportProgress.milestone(empty)).toBe('');
  });

  it('names the files that imported but could not be analyzed', () => {
    expect(UserMessage.imported(16, 0, 0, ['Broken Bounce.wav', 'Broken Demo.mp3'])).toBe(
      "Imported 16 beats. 2 couldn't be analyzed: Broken Bounce.wav, Broken Demo.mp3. Check they play in another app, then choose Re-analyze.",
    );
    expect(UserMessage.stopped(3, 14, 3)).toBe('Stopped after 3 of 14. 3 beats imported.');
    expect(UserMessage.stopped(1, 14, 1)).toBe('Stopped after 1 of 14. 1 beat imported.');
    expect(UserMessage.stopped(3, 40, 7, 33)).toBe(
      'Stopped after 3 of 40. 7 beats imported. 33 still need key and BPM. Select them and choose Re-analyze.',
    );
    expect(UserMessage.namesApplied).toBe('Titles updated in the library. Files are unchanged until you write tags.');
  });
});
