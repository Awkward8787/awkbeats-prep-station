import fs from 'node:fs';
import path from 'node:path';
import { BpmMath } from '../analysis/BpmMath';
import { DEFAULT_SETTINGS, type AnalysisResult, type AudioFormat, type BatchPatch, type Beat, type Settings, type UserPatch } from './types';
import { BeatValidation } from './BeatRules';

type LibraryFile = {
  version: 1;
  beats: Beat[];
  settings: Settings;
};

export class LibraryStore {
  private beats: Beat[] = [];
  private settings: Settings = { ...DEFAULT_SETTINGS };

  constructor(private readonly directory: string) {
    fs.mkdirSync(directory, { recursive: true });
    fs.mkdirSync(this.artworkDir, { recursive: true });
    this.load();
  }

  get artworkDir(): string {
    return path.join(this.directory, 'artwork');
  }

  private get filePath(): string {
    return path.join(this.directory, 'library.json');
  }

  list(): Beat[] {
    return this.beats.map((beat) => ({ ...beat, tags: [...beat.tags], peaks: [...beat.peaks], missing: !fs.existsSync(beat.filePath) }));
  }

  get(id: string): Beat | null {
    const beat = this.beats.find((item) => item.id === id);
    if (!beat) return null;
    return { ...beat, tags: [...beat.tags], peaks: [...beat.peaks], missing: !fs.existsSync(beat.filePath) };
  }

  findByPath(filePath: string): Beat | null {
    const resolved = path.resolve(filePath);
    return this.beats.find((beat) => path.resolve(beat.filePath) === resolved) ?? null;
  }

  getSettings(): Settings {
    return { ...this.settings };
  }

  updateSettings(patch: Partial<Settings>): Settings {
    if (patch.producerName != null) this.settings.producerName = patch.producerName.trim().slice(0, 200);
    if (patch.copyrightTemplate != null) this.settings.copyrightTemplate = patch.copyrightTemplate;
    if (patch.artworkExportSize === 1500 || patch.artworkExportSize === 3000) {
      this.settings.artworkExportSize = patch.artworkExportSize;
    }
    if (typeof patch.producerPromptDismissed === 'boolean') {
      this.settings.producerPromptDismissed = patch.producerPromptDismissed;
    }
    this.save();
    return this.getSettings();
  }

  add(beat: Beat): Beat {
    if (this.findByPath(beat.filePath)) throw new Error('That file is already in the library.');
    this.beats.push(beat);
    this.save();
    return this.get(beat.id)!;
  }

  update(id: string, patch: UserPatch): Beat {
    const beat = this.require(id);
    if (patch.title != null) beat.title = patch.title.trim().slice(0, 200);
    if (patch.producer != null) beat.producer = patch.producer.trim().slice(0, 200);
    if (patch.artist != null) beat.artist = patch.artist.trim().slice(0, 200);
    if (patch.genre != null) beat.genre = patch.genre.trim().slice(0, 80);
    if (patch.mood != null) beat.mood = patch.mood.trim().slice(0, 80);
    if (patch.tags) beat.tags = BeatValidation.tags(patch.tags);
    if (patch.comment != null) beat.comment = patch.comment.slice(0, 4000);
    if (patch.copyright != null) beat.copyright = patch.copyright.slice(0, 400);
    if (patch.isrc != null) {
      const error = BeatValidation.isrc(patch.isrc);
      if (error) throw new Error(error);
      beat.isrc = BeatValidation.canonicalIsrc(patch.isrc);
    }
    if (patch.date != null) beat.date = patch.date.slice(0, 10);
    if (patch.bpmOverride !== undefined) {
      if (patch.bpmOverride != null) {
        const error = BeatValidation.bpm(patch.bpmOverride);
        if (error) throw new Error(error);
        beat.bpmOverride = BpmMath.round(patch.bpmOverride);
      } else beat.bpmOverride = null;
    }
    if (patch.bpmScale != null) beat.bpmScale = patch.bpmScale;
    if (patch.bpmLocked != null) beat.bpmLocked = patch.bpmLocked;
    if (patch.keyOverride !== undefined) {
      beat.keyOverride = patch.keyOverride;
      beat.camelotOverride = patch.camelotOverride ?? null;
    }
    if (patch.keyLocked != null) beat.keyLocked = patch.keyLocked;
    if (patch.status != null) beat.status = BeatValidation.status(patch.status);
    if (patch.notes != null) beat.notes = patch.notes.slice(0, 8000);
    if (this.fileBound(patch)) beat.tagsDirty = true;
    beat.updatedAt = new Date().toISOString();
    this.save();
    return this.get(id)!;
  }

  batchUpdate(ids: string[], patch: BatchPatch): Beat[] {
    const updated: Beat[] = [];
    for (const id of ids) {
      const beat = this.beats.find((item) => item.id === id);
      if (!beat) continue;
      if (patch.status) beat.status = BeatValidation.status(patch.status);
      if (patch.genre != null) beat.genre = patch.genre.trim().slice(0, 80);
      if (patch.mood != null) beat.mood = patch.mood.trim().slice(0, 80);
      if (patch.producer != null) beat.producer = patch.producer.trim().slice(0, 200);
      if (patch.artist != null) beat.artist = patch.artist.trim().slice(0, 200);
      if (patch.copyright != null) beat.copyright = patch.copyright.slice(0, 400);
      if (patch.addTags?.length) beat.tags = BeatValidation.tags([...beat.tags, ...patch.addTags]);
      if (
        patch.genre != null ||
        patch.mood != null ||
        patch.producer != null ||
        patch.artist != null ||
        patch.copyright != null ||
        Boolean(patch.addTags?.length)
      ) {
        beat.tagsDirty = true;
      }
      beat.updatedAt = new Date().toISOString();
      updated.push(this.get(id)!);
    }
    this.save();
    return updated;
  }

  applyAnalysis(id: string, analysis: AnalysisResult): Beat {
    const beat = this.require(id);
    beat.durationSec = analysis.durationSec;
    beat.sampleRate = analysis.sampleRate;
    beat.peaks = analysis.peaks;
    if (!beat.bpmLocked && analysis.bpm != null) {
      beat.bpmDetected = analysis.bpm;
      beat.bpmConfidence = analysis.bpmConfidence;
      beat.bpmOverride = null;
    }
    const keyChanges = !beat.keyLocked && Boolean(analysis.keyName);
    if (keyChanges) {
      beat.keyDetected = analysis.keyName;
      beat.camelotDetected = analysis.camelot;
      beat.keyConfidence = analysis.keyConfidence;
      beat.keyOverride = null;
      beat.camelotOverride = null;
    }
    if ((!beat.bpmLocked && analysis.bpm != null) || keyChanges) beat.tagsDirty = true;
    beat.analyzedAt = new Date().toISOString();
    beat.updatedAt = beat.analyzedAt;
    this.save();
    return this.get(id)!;
  }

  setArtwork(id: string, jpeg: Buffer, width: number, height: number): Beat {
    const beat = this.require(id);
    const filename = `${id}.jpg`;
    fs.writeFileSync(path.join(this.artworkDir, filename), jpeg);
    beat.artworkFile = filename;
    beat.artworkWidth = width;
    beat.artworkHeight = height;
    beat.tagsDirty = true;
    beat.updatedAt = new Date().toISOString();
    this.save();
    return this.get(id)!;
  }

  artworkPath(id: string): string | null {
    const beat = this.beats.find((item) => item.id === id);
    if (!beat?.artworkFile) return null;
    const full = path.join(this.artworkDir, beat.artworkFile);
    return fs.existsSync(full) ? full : null;
  }

  clearTagsDirty(id: string): Beat {
    const beat = this.require(id);
    beat.tagsDirty = false;
    beat.updatedAt = new Date().toISOString();
    this.save();
    return this.get(id)!;
  }

  remove(ids: string[]): void {
    const dropping = new Set(ids);
    for (const beat of this.beats) {
      if (dropping.has(beat.id) && beat.artworkFile) {
        const full = path.join(this.artworkDir, beat.artworkFile);
        if (fs.existsSync(full)) fs.unlinkSync(full);
      }
    }
    this.beats = this.beats.filter((beat) => !dropping.has(beat.id));
    this.save();
  }

  private normalize(beat: Beat): Beat {
    return {
      ...beat,
      producer: typeof beat.producer === 'string' ? beat.producer : '',
      artist: beat.artist ?? '',
      tags: beat.tags ?? [],
      peaks: beat.peaks ?? [],
      tagsDirty: beat.tagsDirty === true,
    };
  }

  private require(id: string): Beat {
    const beat = this.beats.find((item) => item.id === id);
    if (!beat) throw new Error('That beat is not in the library.');
    return beat;
  }

  private load(): void {
    if (!fs.existsSync(this.filePath)) return;
    const parsed = JSON.parse(fs.readFileSync(this.filePath, 'utf8')) as LibraryFile;
    if (parsed.version !== 1 || !Array.isArray(parsed.beats)) throw new Error('Library file is not version 1.');
    this.beats = parsed.beats.map((beat) => this.normalize(beat));
    this.settings = { ...DEFAULT_SETTINGS, ...parsed.settings };
    if (typeof this.settings.producerName !== 'string') this.settings.producerName = '';
    if (typeof this.settings.producerPromptDismissed !== 'boolean') this.settings.producerPromptDismissed = false;
  }

  private fileBound(patch: UserPatch): boolean {
    return (
      patch.title != null ||
      patch.producer != null ||
      patch.artist != null ||
      patch.genre != null ||
      patch.mood != null ||
      patch.tags != null ||
      patch.comment != null ||
      patch.copyright != null ||
      patch.isrc != null ||
      patch.date != null ||
      patch.bpmScale != null ||
      patch.bpmOverride !== undefined ||
      patch.keyOverride !== undefined
    );
  }

  private save(): void {
    const body: LibraryFile = { version: 1, beats: this.beats, settings: this.settings };
    const temp = `${this.filePath}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(body));
    fs.renameSync(temp, this.filePath);
  }
}

export class BeatRecord {
  static create(input: {
  filePath: string;
  format: AudioFormat;
  fileSize: number;
  title: string;
  producer?: string;
  artist: string;
  copyright: string;
  date: string;
}): Beat {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    filePath: input.filePath,
    fileName: path.basename(input.filePath),
    format: input.format,
    fileSize: input.fileSize,
    durationSec: null,
    sampleRate: null,
    title: input.title,
    producer: input.producer ?? '',
    artist: input.artist,
    genre: '',
    mood: '',
    tags: [],
    comment: '',
    copyright: input.copyright,
    isrc: '',
    date: input.date,
    bpmDetected: null,
    bpmScale: 1,
    bpmOverride: null,
    bpmLocked: false,
    bpmConfidence: null,
    keyDetected: null,
    camelotDetected: null,
    keyOverride: null,
    camelotOverride: null,
    keyLocked: false,
    keyConfidence: null,
    status: 'idea',
    notes: '',
    tagsDirty: false,
    artworkFile: null,
    artworkWidth: null,
    artworkHeight: null,
    peaks: [],
    missing: false,
    analyzedAt: null,
    createdAt: now,
    updatedAt: now,
    importedAt: now,
  };
}
}
