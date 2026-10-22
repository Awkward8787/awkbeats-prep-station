/**
 * Plum surfaces and a gold accent. Hex values live only here.
 * `--logo-plum` is the logo facet and must not be used as text or a border.
 */
export class Theme {
  static readonly tokens: Record<string, string> = {
    '--plum-950': '#140b1f',
    '--plum-900': '#1b1029',
    '--plum-850': '#24163a',
    '--plum-800': '#2f1d4a',
    '--plum-hover': '#291a40',
    '--plum-active': '#3a2260',
    '--line': '#3a2a52',
    '--line-control': '#7d68a0',
    '--text': '#f7f2fb',
    '--text-dim': '#cdbfe0',
    '--text-faint': '#a896c2',
    '--gold': '#e4b15a',
    '--gold-hover': '#f0c46e',
    '--gold-text': '#f3d7a4',
    '--gold-ink': '#1f1405',
    '--status-idea': '#a896c2',
    '--status-progress': '#e4b15a',
    '--status-ready': '#8ee0b8',
    '--status-leased': '#9eb6f0',
    '--status-sold': '#f4a6c8',
    '--danger-text': '#f09a86',
    '--focus': '#f3d7a4',
    '--logo-plum': '#701888',
    '--scrim': 'rgb(8 4 14 / 0.72)',
    '--shadow': '0 16px 40px rgb(8 4 14 / 0.45)',
  };

  static get bg(): string {
    return this.tokens['--plum-950'];
  }

  static apply(root: HTMLElement): void {
    for (const [name, value] of Object.entries(this.tokens)) root.style.setProperty(name, value);
  }
}
