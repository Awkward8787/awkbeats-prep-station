/** Chooses the length used for the waveform readout and seek clamp. */
export class PlaybackSpan {
  static total(reported: number, stored: number | null | undefined): number {
    if (Number.isFinite(reported) && reported > 0) return reported;
    if (stored != null && Number.isFinite(stored) && stored > 0) return stored;
    return 0;
  }
}
