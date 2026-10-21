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
        const raw = typeof frame.value === 'string' || typeof frame.value === 'number' ? String(frame.value) : '';
        if (!raw) continue;
        if ((id === 'BPM' || id === 'TBPM') && raw.includes('.')) {
          const bpm = Number(raw);
          if (Number.isFinite(bpm)) target.bpm = bpm;
        } else if (id === 'TAGS') {
          target.tags = raw.split(',').map((tag) => tag.trim()).filter(Boolean);
        } else if (id === 'MOOD') target.mood = raw;
        else if (id === 'KEY') target.keyName = raw;
        else if (id === 'CAMELOT' || id === 'INITIALKEY') {
          const parsed = Camelot.parse(raw);
          if (parsed) target.camelot = parsed.camelot;
          else if (id === 'CAMELOT') target.camelot = raw;
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
    }
  }

  private static empty(): ReadTags {
    return {
      title: '',
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
