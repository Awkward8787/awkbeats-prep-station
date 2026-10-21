export type TempoScale = 0.5 | 1 | 2;

export type TempoFields = {
  bpmDetected: number | null;
  bpmScale: TempoScale;
  bpmOverride: number | null;
};

/** Working tempo shown in the library and written into tags. */
export class BpmMath {
  static round(bpm: number): number {
    return Math.round(bpm * 100) / 100;
  }

  static half(bpm: number): number {
    return this.round(bpm / 2);
  }

  static double(bpm: number): number {
    return this.round(bpm * 2);
  }

  static inRange(bpm: number): boolean {
    return Number.isFinite(bpm) && bpm >= 40 && bpm <= 300;
  }

  static working(fields: TempoFields): number | null {
    if (fields.bpmOverride != null && Number.isFinite(fields.bpmOverride)) {
      return this.round(fields.bpmOverride);
    }
    if (fields.bpmDetected == null || !Number.isFinite(fields.bpmDetected)) return null;
    return this.round(fields.bpmDetected * fields.bpmScale);
  }

  static interpretation(fields: TempoFields): 'custom' | 'half-time' | 'double-time' | 'detected' | 'empty' {
    if (fields.bpmOverride != null) return 'custom';
    if (fields.bpmDetected == null) return 'empty';
    if (fields.bpmScale === 0.5) return 'half-time';
    if (fields.bpmScale === 2) return 'double-time';
    return 'detected';
  }
}
