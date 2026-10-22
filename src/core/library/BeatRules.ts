import { BpmMath } from '../analysis/BpmMath';
import { Camelot } from '../analysis/Camelot';
import { BEAT_STATUSES, KeyChoice, type Beat, type BeatStatus, type LibraryFilters, type SortDirection, type SortKey } from './types';

export class BeatValidation {
  static isrc(value: string): string | null {
    const compact = value.replace(/[-\s]/g, '').toUpperCase();
    if (!compact) return null;
    if (!/^[A-Z]{2}[A-Z0-9]{3}\d{7}$/.test(compact)) {
      return 'ISRC must be 12 characters, like US-AWK-26-00001, or left blank.';
    }
    return null;
  }

  static canonicalIsrc(value: string): string {
    return value.replace(/[-\s]/g, '').toUpperCase();
  }

  static bpm(value: number): string | null {
    if (!BpmMath.inRange(value)) return 'BPM must be between 40 and 300.';
    return null;
  }

  static tags(values: string[]): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const raw of values) {
      const tag = raw.trim().replace(/\s+/g, ' ');
      if (!tag) continue;
      const key = tag.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(tag.slice(0, 32));
      if (out.length >= 24) break;
    }
    return out;
  }

  static status(value: string): BeatStatus {
    if ((BEAT_STATUSES as readonly string[]).includes(value)) return value as BeatStatus;
    throw new Error('Unknown beat status.');
  }
}

export class BeatQuery {
  static workingBpm(beat: Beat): number | null {
    return BpmMath.working({
      bpmDetected: beat.bpmDetected,
      bpmScale: beat.bpmScale,
      bpmOverride: beat.bpmOverride,
    });
  }

  static match(beat: Beat, filters: LibraryFilters): boolean {
    if (filters.status !== 'all' && beat.status !== filters.status) return false;
    if (filters.producer && !(beat.producer || '').toLowerCase().includes(filters.producer.trim().toLowerCase())) return false;
    if (filters.artist && !(beat.artist || '').toLowerCase().includes(filters.artist.trim().toLowerCase())) return false;
    if (filters.genre && beat.genre.toLowerCase() !== filters.genre.toLowerCase()) return false;
    if (filters.tag && !beat.tags.some((tag) => tag.toLowerCase() === filters.tag.toLowerCase())) return false;
    if (filters.key) {
      const key = KeyChoice.working(beat);
      const wanted = filters.key.toLowerCase();
      const hay = `${key.name || ''} ${key.camelot || ''}`.toLowerCase();
      if (!hay.includes(wanted)) return false;
    }
    const bpm = this.workingBpm(beat);
    if (filters.bpmMin != null && (bpm == null || bpm < filters.bpmMin)) return false;
    if (filters.bpmMax != null && (bpm == null || bpm > filters.bpmMax)) return false;
    const day = (beat.date || beat.importedAt).slice(0, 10);
    if (filters.dateFrom && day < filters.dateFrom) return false;
    if (filters.dateTo && day > filters.dateTo) return false;
    const search = filters.search.trim().toLowerCase();
    if (search) {
      const key = KeyChoice.working(beat);
      const hay = [
        beat.title,
        beat.producer || '',
        beat.artist,
        beat.fileName,
        beat.genre,
        beat.mood,
        beat.notes,
        beat.comment,
        beat.isrc,
        key.name || '',
        key.camelot || '',
        ...beat.tags,
      ]
        .join(' ')
        .toLowerCase();
      const tokens = search.split(/\s+/);
      if (!tokens.every((token) => hay.includes(token))) return false;
    }
    return true;
  }

  static sort(beats: Beat[], key: SortKey, direction: SortDirection): Beat[] {
    const copy = [...beats];
    const factor = direction === 'asc' ? 1 : -1;
    copy.sort((a, b) => {
      const compared = this.compare(a, b, key);
      if (compared !== 0) return compared * factor;
      return a.title.localeCompare(b.title);
    });
    return copy;
  }

  private static compare(a: Beat, b: Beat, key: SortKey): number {
    switch (key) {
      case 'title':
        return a.title.localeCompare(b.title);
      case 'genre':
        return a.genre.localeCompare(b.genre);
      case 'status':
        return BEAT_STATUSES.indexOf(a.status) - BEAT_STATUSES.indexOf(b.status);
      case 'date':
        return (a.date || a.importedAt).localeCompare(b.date || b.importedAt);
      case 'imported':
        return a.importedAt.localeCompare(b.importedAt);
      case 'bpm':
        return (this.workingBpm(a) ?? -1) - (this.workingBpm(b) ?? -1);
      case 'key':
        return this.camelotRank(a) - this.camelotRank(b);
      default:
        return 0;
    }
  }

  private static camelotRank(beat: Beat): number {
    const code = KeyChoice.working(beat).camelot;
    if (!code) return 999;
    const parsed = Camelot.parse(code);
    if (!parsed) return 999;
    const number = Number(code.replace(/[AB]/, ''));
    return number * 2 + (parsed.mode === 'minor' ? 0 : 1);
  }
}
