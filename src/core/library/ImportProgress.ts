export type ImportPhase = 'loading' | 'analyzing';

export type ImportSnapshot = {
  phase: ImportPhase;
  /** Tracks fully finished (loaded, and analyzed when this pass measures them). */
  done: number;
  total: number;
  /** Index into the status lines. Moves only when a real step changes. */
  line: number;
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
    'Checking the kick against the snare',
    'Listening for the key, not the guess',
    'Counting the bars out loud',
    'Leaving a little room in the hats',
    'Letting the 808 sit in the floor',
    'Marking the tempo on the one',
    'Keeping the low end honest',
    'Giving the loop one more pass',
    'Parking the vocal chop for later',
    'Checking the swing, then the key',
    'Making sure the drop has a home',
    'Reading the waveform like a chart',
    'Saving headroom for the mix',
    'Asking the snare if it means it',
    'Lining the clap up with the kick',
    'Giving the bass its own lane',
    'Turning the monitors down a notch',
  ] as const;

  static start(total: number, phase: ImportPhase = 'loading'): ImportSnapshot {
    return { phase, done: 0, total: this.safeTotal(total), line: 0 };
  }

  static begin(total: number, phase: ImportPhase = 'loading'): ImportRun {
    return { snapshot: this.start(total, phase), pending: [] };
  }

  /**
   * Record a real step. The status line advances only when the phase or the
   * finished count changes.
   */
  static step(snapshot: ImportSnapshot, phase: ImportPhase, done: number): ImportSnapshot {
    const nextDone = Math.max(0, Math.min(snapshot.total, Math.floor(done)));
    const moved = phase !== snapshot.phase || nextDone !== snapshot.done;
    return {
      phase,
      done: nextDone,
      total: snapshot.total,
      line: moved ? snapshot.line + 1 : snapshot.line,
    };
  }

  static apply(run: ImportRun, tick: ImportTick): ImportRun {
    const base = tick.total === run.snapshot.total ? run : this.begin(tick.total);
    if (tick.phase === 'settled') {
      if (tick.needsDecode) return { snapshot: base.snapshot, pending: [...base.pending, tick.index] };
      return { snapshot: this.step(base.snapshot, 'analyzing', tick.index + 1), pending: base.pending };
    }
    return { snapshot: this.step(base.snapshot, tick.phase, tick.index), pending: base.pending };
  }

  static decodeStart(run: ImportRun, index: number): ImportRun {
    return { snapshot: this.step(run.snapshot, 'analyzing', index), pending: run.pending };
  }

  static decodeFinish(run: ImportRun, index: number): ImportRun {
    return { snapshot: this.step(run.snapshot, 'analyzing', index + 1), pending: run.pending };
  }

  /** Share of the bar. A track in progress fills part of its slot; only a finished track fills it. */
  static fraction(snapshot: ImportSnapshot): number {
    if (snapshot.total <= 0) return 0;
    if (snapshot.done >= snapshot.total) return 1;
    const partial = snapshot.phase === 'analyzing' ? 0.62 : 0.28;
    return (snapshot.done + partial) / snapshot.total;
  }

  /** "2 of 12" for the track currently in progress, or the finished count when the run is done. */
  static countLabel(snapshot: ImportSnapshot): string {
    if (snapshot.total <= 0) return '0 of 0';
    const shown = snapshot.done >= snapshot.total ? snapshot.total : snapshot.done + 1;
    return `${shown} of ${snapshot.total}`;
  }

  static phaseLabel(phase: ImportPhase): string {
    return phase === 'loading' ? 'Loading' : 'Analyzing key and BPM';
  }

  static statusLine(line: number): string {
    const count = this.lines.length;
    const index = ((Math.floor(line) % count) + count) % count;
    return this.lines[index];
  }

  private static safeTotal(total: number): number {
    if (!Number.isFinite(total)) return 0;
    return Math.max(0, Math.floor(total));
  }
}
