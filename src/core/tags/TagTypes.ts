import { Camelot } from '../analysis/Camelot';

export type ArtworkPayload = {
  mime: 'image/jpeg' | 'image/png';
  data: Buffer;
  width: number;
  height: number;
};

export type TagPayload = {
  title: string;
  artist: string;
  genre: string;
  mood: string;
  bpm: number | null;
  keyName: string | null;
  camelot: string | null;
  tags: string[];
  comment: string;
  copyright: string;
  isrc: string;
  date: string;
  producer: string;
  /** When true, the producer name is also written as the composer. */
  creditProducerAsComposer?: boolean;
  artwork: ArtworkPayload | null;
};

export type ReadTags = {
  title: string;
  producer: string;
  artist: string;
  genre: string;
  mood: string;
  bpm: number | null;
  keyName: string | null;
  camelot: string | null;
  tags: string[];
  comment: string;
  copyright: string;
  isrc: string;
  date: string;
  durationSec: number | null;
  sampleRate: number | null;
};

export class TagText {
  /** ID3 TKEY is at most three characters, for example F#m. */
  static initialKey(name: string | null): string | undefined {
    const parsed = Camelot.parse(name || '');
    if (!parsed) return undefined;
    return `${parsed.root}${parsed.mode === 'minor' ? 'm' : ''}`;
  }

  /** ID3 TCOP must start with a four-digit year and a space. */
  static copyrightFrame(copyright: string): string | undefined {
    const trimmed = copyright.trim();
    if (!trimmed) return undefined;
    const yearFirst = trimmed.match(/^(\d{4})\s+(.+)$/);
    if (yearFirst) return `${yearFirst[1]} ${yearFirst[2]}`;
    const symbol = trimmed.match(/^(?:©|\(c\)|copyright)\s*(\d{4})\s*(.*)$/i);
    if (symbol) return `${symbol[1]} ${symbol[2]}`.trim();
    const year = trimmed.match(/(\d{4})/);
    if (year) {
      const rest = trimmed
        .replace(/©|\(c\)|copyright/gi, '')
        .replace(year[1], '')
        .trim();
      return rest ? `${year[1]} ${rest}` : year[1];
    }
    return `${new Date().getFullYear()} ${trimmed}`;
  }
}
