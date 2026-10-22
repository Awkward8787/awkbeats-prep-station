type Closest = { closest(selector: string): unknown } | null;

/**
 * Keeps Space and Enter on the control that has focus.
 * A modifier means the key is a shortcut, so a focused row or button must not swallow it.
 */
export class ShortcutGuard {
  static controlOwnsKey(target: Closest, key: string, mod = false): boolean {
    return !mod && (key === 'Enter' || key === ' ') && Boolean(target?.closest('button, a, input, select, textarea, [role="button"], [role="radio"], [role="checkbox"], [role="slider"], [role="row"], summary'));
  }

  static spacePlaysBeat(target: Closest): boolean {
    return !target?.closest('table.tracks, button, a, [role="slider"], [role="radio"], summary');
  }

  /** Text fields swallow shortcuts. Checkboxes, radios, and buttons do not. */
  static typingTarget(target: Closest): boolean {
    return Boolean(target?.closest('textarea, select, [contenteditable="true"], input:not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="range"])'));
  }
}
