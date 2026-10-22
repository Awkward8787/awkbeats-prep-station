export const BEAT_STATUSES = ['idea', 'in_progress', 'ready', 'leased', 'sold'] as const;
export type BeatStatus = (typeof BEAT_STATUSES)[number];
export type AudioFormat = 'wav' | 'mp3' | 'aiff' | 'flac';
export type TempoScale = 0.5 | 1 | 2;

export type Beat = {
  id: string;
  filePath: string;
  fileName: string;
  format: AudioFormat;
  fileSize: number;
  durationSec: number | null;
  sampleRate: number | null;
  title: string;
  producer: string;
  artist: string;
  genre: string;
  mood: string;
  tags: string[];
  comment: string;
  copyright: string;
  isrc: string;
  date: string;
  bpmDetected: number | null;
  bpmScale: TempoScale;
  bpmOverride: number | null;
  bpmLocked: boolean;
  bpmConfidence: number | null;
  keyDetected: string | null;
  camelotDetected: string | null;
  keyOverride: string | null;
  camelotOverride: string | null;
  keyLocked: boolean;
  keyConfidence: number | null;
  status: BeatStatus;
  notes: string;
  /** True after a change that Write tags to file would put in the audio file. */
  tagsDirty: boolean;
  artworkFile: string | null;
  artworkWidth: number | null;
  artworkHeight: number | null;
  peaks: number[];
  missing: boolean;
  analyzedAt: string | null;
  createdAt: string;
  updatedAt: string;
  importedAt: string;
};

export type Settings = {
  producerName: string;
  copyrightTemplate: string;
  artworkExportSize: 1500 | 3000;
  /** True after the producer dismisses the first-launch name sheet without saving a name. */
  producerPromptDismissed: boolean;
};

export type AnalysisResult = {
  bpm: number | null;
  bpmConfidence: number | null;
  keyName: string | null;
  camelot: string | null;
  keyConfidence: number | null;
  durationSec: number;
  sampleRate: number;
  peaks: number[];
};

export type UserPatch = {
  title?: string;
  producer?: string;
  artist?: string;
  genre?: string;
  mood?: string;
  tags?: string[];
  comment?: string;
  copyright?: string;
  isrc?: string;
  date?: string;
  bpmScale?: TempoScale;
  bpmOverride?: number | null;
  bpmLocked?: boolean;
  keyOverride?: string | null;
  camelotOverride?: string | null;
  keyLocked?: boolean;
  status?: BeatStatus;
  notes?: string;
};

export type BatchPatch = {
  status?: BeatStatus;
  genre?: string;
  mood?: string;
  addTags?: string[];
  producer?: string;
  artist?: string;
  copyright?: string;
};

export type LibraryFilters = {
  search: string;
  status: BeatStatus | 'all';
  producer: string;
  artist: string;
  genre: string;
  key: string;
  tag: string;
  bpmMin: number | null;
  bpmMax: number | null;
  dateFrom: string;
  dateTo: string;
};

export type SortKey = 'title' | 'bpm' | 'key' | 'date' | 'status' | 'genre' | 'imported';
export type SortDirection = 'asc' | 'desc';

export const DEFAULT_SETTINGS: Settings = {
  producerName: '',
  copyrightTemplate: '© {year} {producer}',
  artworkExportSize: 3000,
  producerPromptDismissed: false,
};

/** Copyright line written on import when the file has no copyright tag. */
export class CopyrightLine {
  static forImport(template: string, year: string, producer: string, tagged: string): string {
    if (tagged.trim()) return tagged;
    if (!producer.trim()) return '';
    return template.replaceAll('{year}', year).replaceAll('{producer}', producer.trim());
  }
}

export class BeatStatusLabel {
  static text(status: BeatStatus): string {
    switch (status) {
      case 'idea':
        return 'Idea';
      case 'in_progress':
        return 'In progress';
      case 'ready':
        return 'Ready';
      case 'leased':
        return 'Leased';
      case 'sold':
        return 'Sold';
    }
  }
}

export class BeatCatalog {
  static readonly genres = [
    'Trap',
    'Drill',
    'Hip-Hop',
    'R&B',
    'Pop',
    'Afrobeats',
    'Amapiano',
    'Jersey Club',
    'House',
    'Techno',
    'Boom Bap',
    'Lo-fi',
    'Rage',
    'Dancehall',
    'Reggaeton',
  ];

  static readonly moods = ['Dark', 'Energetic', 'Chill', 'Melodic', 'Aggressive', 'Sad', 'Bouncy', 'Soulful', 'Spacey', 'Uplifting'];
}

export class KeyChoice {
  static working(beat: Pick<Beat, 'keyDetected' | 'camelotDetected' | 'keyOverride' | 'camelotOverride'>): {
    name: string | null;
    camelot: string | null;
  } {
    if (beat.keyOverride) return { name: beat.keyOverride, camelot: beat.camelotOverride };
    return { name: beat.keyDetected, camelot: beat.camelotDetected };
  }
}

export class Format {
  static bpm(value: number | null | undefined): string {
    if (value == null || !Number.isFinite(value)) return '';
    const rounded = Math.round(value * 100) / 100;
    if (Math.abs(rounded - Math.round(rounded)) < 0.001) return String(Math.round(rounded));
    return rounded.toFixed(2);
  }

  static duration(seconds: number | null | undefined): string {
    if (seconds == null || !Number.isFinite(seconds)) return '';
    const total = Math.max(0, Math.round(seconds));
    const minutes = Math.floor(total / 60);
    const rest = total % 60;
    return `${minutes}:${rest.toString().padStart(2, '0')}`;
  }

  static fileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
