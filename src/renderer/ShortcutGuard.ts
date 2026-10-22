type Closest = { closest(selector: string): unknown } | null;

/** Keeps Space and Enter on the control that has focus. */
export class ShortcutGuard {
  static controlOwnsKey(target: Closest, key: string): boolean {
    return (key === 'Enter' || key === ' ') && Boolean(target?.closest('button, a, [role]'));
  }

  static spacePlaysBeat(target: Closest): boolean {
    return !target?.closest('table.tracks, button, a, [role="slider"], [role="radio"], summary');
  }
}
