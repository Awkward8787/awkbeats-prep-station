import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { Theme } from '../src/core/brand/Theme';

describe('Theme', () => {
  it('keeps the logo gold and purple in one token set', () => {
    expect(Theme.tokens['--plum-950']).toBe('#140b1f');
    expect(Theme.tokens['--plum-900']).toBe('#1b1029');
    expect(Theme.tokens['--line-control']).toBe('#7d68a0');
    expect(Theme.tokens['--gold']).toBe('#e4b15a');
    expect(Theme.tokens['--gold-ink']).toBe('#1f1405');
    expect(Theme.tokens['--gold-text']).toBe('#f3d7a4');
    expect(Theme.tokens['--status-sold']).toBe('#f4a6c8');
    expect(Theme.tokens['--logo-plum']).toBe('#701888');
    expect(Theme.bg).toBe('#140b1f');
    const css = fs.readFileSync(path.join(__dirname, '../src/renderer/styles.css'), 'utf8');
    const colors = css.replace(/#[a-zA-Z_][\w-]*/g, '');
    expect(colors).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    expect(css).toContain('var(--plum-950)');
    expect(css).toContain('var(--gold)');
    expect(css).toContain('var(--plum-active)');
    expect(css).not.toContain('max-width: 980px');
    const main = fs.readFileSync(path.join(__dirname, '../electron/main.ts'), 'utf8');
    expect(main).toContain('Theme.bg');
    expect(main).not.toMatch(/backgroundColor:\s*'#/);
  });
});
