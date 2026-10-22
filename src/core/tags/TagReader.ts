import { parseFile } from 'music-metadata';
import NodeID3 from 'node-id3';
import { Camelot } from '../analysis/Camelot';
import type { ReadTags } from './TagTypes';

/** Reads existing tags so an import can start from what is already in the file. */
export class TagReader {
  static async read(filePath: string): Promise<ReadTags> {
    const empty = this.empty();
    try {
      const metadata = await parseFile(filePath, { duration: true });
      const common = metadata.common;
      const comment = Array.isArray(common.comment) ? common.comment.join('\n') : '';
      const parsedKey = Camelot.parse(common.key || '');
      empty.title = common.title || '';
      empty.artist = common.artist || '';
      empty.producer = this.firstText(common.producer);
      empty.genre = common.genre?.[0] || '';
      empty.mood = common.mood || '';
      empty.bpm = typeof common.bpm === 'number' && Number.isFinite(common.bpm) ? common.bpm : null;
      empty.keyName = parsedKey?.name || common.key || '';
      empty.camelot = parsedKey?.camelot || '';
      empty.comment = comment;
      empty.copyright = common.copyright || '';
      empty.isrc = common.isrc?.[0]?.replace(/[-\s]/g, '').toUpperCase() || '';
      empty.date = common.date || (common.year ? String(common.year) : '');
      empty.durationSec = metadata.format.duration ?? null;
      empty.sampleRate = metadata.format.sampleRate ?? null;
      this.readNative(empty, metadata.native);
    } catch {
      // A file can still be imported when its tags cannot be parsed.
    }
    try {
      const id3 = NodeID3.read(filePath);
      this.mergeId3(empty, id3);
    } catch {
      // WAV, AIFF, and FLAC may not expose a leading ID3 tag to node-id3.
    }
    if (empty.keyName && !empty.camelot) {
      const parsed = Camelot.parse(empty.keyName);
      if (parsed) {
        empty.keyName = parsed.name;
        empty.camelot = parsed.camelot;
      }
    }
    return empty;
  }

  /**
   * music-metadata stores BPM with parseInt, which drops the 0.01 precision we write,
   * and it does not map our TAGS comment into a common field.
   */
  private static readNative(target: ReadTags, native: unknown): void {
    if (!native || typeof native !== 'object') return;
    for (const frames of Object.values(native as Record<string, unknown>)) {
      if (!Array.isArray(frames)) continue;
      for (const frame of frames) {
        const id = String(frame.id || '').toUpperCase();
        const described = this.describedText(frame.value);
        const raw = described.text;
        if (described.role === 'PRODUCER' && raw) target.producer = raw;
        if (!raw) continue;
        if ((id === 'BPM' || id === 'TBPM') && raw.includes('.')) {
          const bpm = Number(raw);
          if (Number.isFinite(bpm)) target.bpm = bpm;
        } else if (id === 'TAGS' || id === 'TXXX:TAGS') {
          target.tags = raw.split(',').map((tag) => tag.trim()).filter(Boolean);
        } else if (id === 'MOOD' || id === 'TXXX:MOOD') target.mood = raw;
        else if (id === 'KEY' || id === 'TXXX:KEY') target.keyName = raw;
        else if (id === 'CAMELOT' || id === 'INITIALKEY' || id === 'TXXX:CAMELOT') {
          const parsed = Camelot.parse(raw);
          if (parsed) target.camelot = parsed.camelot;
          else if (id === 'CAMELOT' || id === 'TXXX:CAMELOT') target.camelot = raw;
        } else if (id === 'PRODUCER' || id === 'IPRO' || id === 'TXXX:PRODUCER') target.producer = raw;
        else if ((id === 'COMPOSER' || id === 'TCOM') && !target.producer) target.producer = raw;
        else if (id === 'TIPL' || id === 'IPLS') {
          const fromRole = this.tiplProducer(frame.value);
          if (fromRole) target.producer = fromRole;
        }
      }
    }
  }

  private static mergeId3(target: ReadTags, tags: NodeID3.Tags): void {
    if (!tags || Object.keys(tags).length === 0) return;
    if (tags.title) target.title = tags.title;
    if (tags.artist) target.artist = tags.artist;
    if (tags.genre) target.genre = String(tags.genre);
    if (tags.bpm) {
      const bpm = Number(tags.bpm);
      if (Number.isFinite(bpm)) target.bpm = bpm;
    }
    if (tags.initialKey) {
      const parsed = Camelot.parse(tags.initialKey);
      if (parsed) {
        target.keyName = parsed.name;
        target.camelot = parsed.camelot;
      }
    }
    if (tags.ISRC) target.isrc = tags.ISRC.replace(/[-\s]/g, '').toUpperCase();
    if (tags.copyright) target.copyright = tags.copyright;
    if (typeof tags.comment === 'object' && tags.comment && 'text' in tags.comment && tags.comment.text) {
      target.comment = tags.comment.text;
    }
    if (tags.releaseTime) target.date = tags.releaseTime;
    else if (tags.year && !target.date) target.date = tags.year;
    const custom = tags.userDefinedText;
    const list = Array.isArray(custom) ? custom : custom ? [custom] : [];
    for (const frame of list) {
      const description = frame.description?.toUpperCase();
      if (description === 'MOOD' && frame.value) target.mood = frame.value;
      if (description === 'TAGS' && frame.value) {
        target.tags = frame.value.split(',').map((tag) => tag.trim()).filter(Boolean);
      }
      if (description === 'KEY' && frame.value) target.keyName = frame.value;
      if ((description === 'CAMELOT' || description === 'INITIALKEY') && frame.value) {
        const parsed = Camelot.parse(frame.value);
        target.camelot = parsed?.camelot || frame.value;
      }
      if (description === 'COPYRIGHT' && frame.value) target.copyright = frame.value;
      if (description === 'PRODUCER' && frame.value) target.producer = frame.value;
    }
    if (!target.producer && tags.composer) target.producer = String(tags.composer);
    if (!target.producer && tags.involvedPeopleList) {
      const fromRole = this.tiplProducer(tags.involvedPeopleList);
      if (fromRole) target.producer = fromRole;
    }
  }

  private static firstText(value: unknown): string {
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) return value.map((item) => String(item)).filter(Boolean).join(', ');
    return '';
  }

  private static describedText(value: unknown): { text: string; role: string } {
    if (typeof value === 'string' || typeof value === 'number') return { text: String(value), role: '' };
    if (!value || typeof value !== 'object') return { text: '', role: '' };
    const record = value as { description?: string; text?: unknown; value?: unknown; producer?: unknown };
    const role = typeof record.description === 'string' ? record.description.toUpperCase() : '';
    const text = this.firstText(record.text ?? record.value ?? record.producer);
    return { text, role };
  }

  /** TIPL is role/name pairs. node-id3 also returns the pair with the null stripped. */
  private static tiplProducer(value: unknown): string {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const named = (value as { producer?: unknown }).producer;
      const text = this.firstText(named);
      if (text) return text;
    }
    if (typeof value !== 'string' || !value) return '';
    const parts = value.split('\0');
    if (parts.length >= 2 && parts[0].trim().toLowerCase() === 'producer') return parts[1].trim();
    const glued = value.match(/^producer(.+)$/i);
    return glued ? glued[1].trim() : '';
  }

  private static empty(): ReadTags {
    return {
      title: '',
      producer: '',
      artist: '',
      genre: '',
      mood: '',
      bpm: null,
      keyName: '',
      camelot: '',
      tags: [],
      comment: '',
      copyright: '',
      isrc: '',
      date: '',
      durationSec: null,
      sampleRate: null,
    };
  }
}
