/**
 * KeyDetector confidence is (bestScore - runnerUp) / 0.12, clamped to 0–1.
 * 0.45 means the winning key leads by only 0.054 on that score. Below that,
 * the runner-up is close enough that the producer should check by ear.
 */
export class KeyConfidence {
  static readonly reviewAt = 0.45;

  static low(confidence: number | null | undefined): boolean {
    return confidence != null && Number.isFinite(confidence) && confidence < this.reviewAt;
  }
}
