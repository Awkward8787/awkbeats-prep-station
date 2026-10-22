export type ImportPhase = 'loading' | 'analyzing';

export type ImportSnapshot = {
  phase: ImportPhase;
  /** Tracks fully finished (loaded, and analyzed when this pass measures them). */
  done: number;
  total: number;
  /** Kept at 0. The decorative line is chosen by elapsed time, not by steps. */
  line: number;
  /** File indexes that have already counted toward `done`. */
  finished: number[];
};

export type ImportTick = {
  phase: ImportPhase | 'settled';
  index: number;
  total: number;
  needsDecode?: boolean;
};

export type ImportRun = {
  snapshot: ImportSnapshot;
  /** File indexes still waiting on renderer-side key and BPM analysis. */
  pending: number[];
};

/** Progress for a real import or re-analyze. The bar follows finished work, not a clock. */
export class ImportProgress {
  static readonly lines = [
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
  ] as const;

  static start(total: number, phase: ImportPhase = 'loading'): ImportSnapshot {
    return { phase, done: 0, total: this.safeTotal(total), line: 0, finished: [] };
  }

  static begin(total: number, phase: ImportPhase = 'loading'): ImportRun {
    return { snapshot: this.start(total, phase), pending: [] };
  }

  /** One finished file. A repeated index does not move `done`. Phase ticks never call this. */
  static complete(snapshot: ImportSnapshot, index: number): ImportSnapshot {
    return this.finish(snapshot, index, snapshot.phase);
  }

  static apply(run: ImportRun, tick: ImportTick): ImportRun {
    const base = tick.total === run.snapshot.total ? run : this.begin(tick.total);
    if (tick.phase === 'settled') {
      if (tick.needsDecode) {
        return { snapshot: { ...base.snapshot, phase: 'analyzing' }, pending: [...base.pending, tick.index] };
      }
      return { snapshot: this.finish(base.snapshot, tick.index, 'analyzing'), pending: base.pending };
    }
    return { snapshot: { ...base.snapshot, phase: tick.phase }, pending: base.pending };
  }

  static decodeStart(run: ImportRun, _index: number): ImportRun {
    return { snapshot: { ...run.snapshot, phase: 'analyzing' }, pending: run.pending };
  }

  static decodeFinish(run: ImportRun, index: number): ImportRun {
    return { snapshot: this.finish(run.snapshot, index, 'analyzing'), pending: run.pending };
  }

  /** Share of the bar. Only a finished file fills its slot, so the value cannot move backward. */
  static fraction(snapshot: ImportSnapshot): number {
    return snapshot.total > 0 ? snapshot.done / snapshot.total : 0;
  }

  /** Finished count, never the file currently in progress. */
  static countLabel(snapshot: ImportSnapshot): string {
    return `${snapshot.done} of ${snapshot.total}`;
  }

  static phaseLabel(phase: ImportPhase): string {
    return phase === 'loading' ? 'Loading' : 'Analyzing key and BPM';
  }

  /**
   * Decorative line. Hidden until the run has lasted 1.5s, then a new line at most
   * every 3s. After one pass, returns null so the UI shows the phase label only.
   */
  static spokenLine(elapsedMs: number): string | null {
    if (!Number.isFinite(elapsedMs) || elapsedMs < 1500) return null;
    const index = Math.floor((elapsedMs - 1500) / 3000);
    if (index < 0 || index >= this.lines.length) return null;
    return this.lines[index];
  }

  /**
   * Screen-reader text. Stable inside a 25% bucket so the live region does not
   * speak on every file: the start, each quarter, and the end.
   */
  static milestone(snapshot: ImportSnapshot): string {
    const { done, total } = snapshot;
    if (total <= 0) return '0 of 0';
    if (done >= total) return `${done} of ${total} done`;
    const quarter = Math.floor((done / total) * 4);
    if (quarter <= 0) return `Importing ${total} files`;
    return `${quarter * 25}% imported, ${done} of ${total} done`;
  }

  private static finish(snapshot: ImportSnapshot, index: number, phase: ImportPhase): ImportSnapshot {
    if (snapshot.finished.includes(index)) return { ...snapshot, phase };
    const finished = [...snapshot.finished, index];
    return { ...snapshot, phase, finished, done: Math.min(snapshot.total, finished.length) };
  }

  private static safeTotal(total: number): number {
    if (!Number.isFinite(total)) return 0;
    return Math.max(0, Math.floor(total));
  }
}
