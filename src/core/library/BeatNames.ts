/** Curated two-word beat titles, with a third word only when the catalog is crowded. */
export class BeatNames {
  static readonly moods = [
    'Midnight',
    'Velvet',
    'Amber',
    'Quiet',
    'Golden',
    'Smoked',
    'Slow',
    'Soft',
    'Late',
    'Blue',
    'Warm',
    'Dusty',
    'Silver',
    'Honey',
    'Neon',
    'Hollow',
    'Bright',
    'Silk',
    'Copper',
    'Faded',
    'Lunar',
    'Gentle',
    'Crisp',
    'Mellow',
  ] as const;

  static readonly places = [
    'Room',
    'Alley',
    'Session',
    'Pocket',
    'Tape',
    'Hour',
    'Lane',
    'Window',
    'Chorus',
    'Loop',
    'Floor',
    'City',
    'Piano',
    'Booth',
    'Street',
    'Grove',
    'Radio',
    'Studio',
    'Wave',
    'Porch',
    'Hall',
    'Bridge',
    'Corner',
    'Garden',
  ] as const;

  static readonly extras = ['Take', 'Cut', 'Mix', 'Reel', 'Vibe'] as const;

  static key(title: string): string {
    return title.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  /**
   * `count` titles that are not already in `taken` (case-insensitive) and not
   * repeated inside the batch. `random` is injectable so a reroll is testable.
   */
  static propose(count: number, taken: Iterable<string> = [], random: () => number = Math.random): string[] {
    const need = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
    const used = new Set<string>();
    for (const title of taken) {
      const key = this.key(title);
      if (key) used.add(key);
    }
    const names: string[] = [];
    this.takeFrom(this.shuffle(this.pairs(), random), used, names, need);
    if (names.length < need) this.takeFrom(this.shuffle(this.triples(), random), used, names, need);
    if (names.length < need) throw new Error('Not enough unique beat names are left.');
    return names;
  }

  /** Titles to write back when a random-name pass is undone. */
  static undo(rows: { id: string; from: string }[]): { id: string; title: string }[] {
    return rows.map((row) => ({ id: row.id, title: row.from }));
  }

  /**
   * Restore a title only when the row still shows the name this pass applied.
   * A later edit is skipped and reported by its current title.
   */
  static restorePlan(
    rows: { id: string; from: string; to: string; tagsDirty: boolean; appliedAt: string }[],
    current: { id: string; title: string; updatedAt: string }[],
  ): { restore: { id: string; title: string; tagsDirty: boolean }[]; skipped: string[] } {
    const restore: { id: string; title: string; tagsDirty: boolean }[] = [];
    const skipped: string[] = [];
    for (const row of rows) {
      const beat = current.find((item) => item.id === row.id);
      if (!beat || beat.title !== row.to) {
        skipped.push(beat?.title || row.to);
        continue;
      }
      const untouched = beat.updatedAt === row.appliedAt;
      restore.push({ id: row.id, title: row.from, tagsDirty: untouched ? row.tagsDirty : true });
    }
    return { restore, skipped };
  }

  private static pairs(): string[] {
    const names: string[] = [];
    for (const mood of this.moods) {
      for (const place of this.places) names.push(`${mood} ${place}`);
    }
    return names;
  }

  private static triples(): string[] {
    const names: string[] = [];
    for (const mood of this.moods) {
      for (const place of this.places) {
        for (const extra of this.extras) names.push(`${mood} ${place} ${extra}`);
      }
    }
    return names;
  }

  private static takeFrom(pool: string[], used: Set<string>, names: string[], need: number): void {
    for (const name of pool) {
      if (names.length >= need) return;
      const key = this.key(name);
      if (used.has(key)) continue;
      used.add(key);
      names.push(name);
    }
  }

  private static shuffle(pool: string[], random: () => number): string[] {
    const order = pool.slice();
    for (let index = order.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(this.unit(random) * (index + 1));
      const current = order[index];
      order[index] = order[swap];
      order[swap] = current;
    }
    return order;
  }

  private static unit(random: () => number): number {
    const value = random();
    if (!Number.isFinite(value)) return 0;
    if (value <= 0) return 0;
    if (value >= 1) return 0.999999;
    return value;
  }
}
