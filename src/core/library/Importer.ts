import fs from 'node:fs';
import path from 'node:path';
import { PcmDecoder } from '../audio/PcmDecoder';
import { TrackAnalyzer } from '../analysis/TrackAnalyzer';
import { TagReader } from '../tags/TagReader';
import { AudioFiles } from './AudioFiles';
import { ImageSize } from './ImageSize';
import { BeatRecord, LibraryStore } from './LibraryStore';
import type { ImportTick } from './ImportProgress';
import { CopyrightLine, type Beat, type Settings } from './types';

export type ImportResult = {
  imported: Beat[];
  duplicates: number;
  failed: { filePath: string; message: string }[];
  needsDecode: string[];
  /** File index for each id in `needsDecode`, in the same order. */
  decodeAt: number[];
  /** Beats that were added, but whose key and BPM could not be measured. */
  unanalyzed: string[];
  cancelled: boolean;
};

export class Importer {
  static async importPaths(
    store: LibraryStore,
    inputs: string[],
    onTick?: (tick: ImportTick) => void,
    shouldCancel?: () => boolean,
  ): Promise<ImportResult> {
    const files = await AudioFiles.collect(inputs);
    const settings = store.getSettings();
    const imported: Beat[] = [];
    const failed: { filePath: string; message: string }[] = [];
    const needsDecode: string[] = [];
    const decodeAt: number[] = [];
    const unanalyzed: string[] = [];
    let duplicates = 0;
    let cancelled = false;
    const total = files.length;
    for (let index = 0; index < files.length; index += 1) {
      if (shouldCancel?.()) {
        cancelled = true;
        break;
      }
      const filePath = files[index];
      onTick?.({ phase: 'loading', index, total });
      await new Promise((resolve) => setImmediate(resolve));
      if (store.findByPath(filePath)) {
        duplicates += 1;
        onTick?.({ phase: 'settled', index, total, needsDecode: false });
        continue;
      }
      try {
        const format = AudioFiles.formatOf(filePath);
        if (format === 'wav' || format === 'aiff') onTick?.({ phase: 'analyzing', index, total });
        const beat = await this.importOne(store, filePath, settings, unanalyzed);
        imported.push(beat);
        const decode = beat.format === 'mp3' || beat.format === 'flac';
        if (decode) {
          needsDecode.push(beat.id);
          decodeAt.push(index);
        }
        onTick?.({ phase: 'settled', index, total, needsDecode: decode });
      } catch (error) {
        failed.push({ filePath, message: error instanceof Error ? error.message : 'Could not import this file.' });
        onTick?.({ phase: 'settled', index, total, needsDecode: false });
      }
    }
    return { imported, duplicates, failed, needsDecode, decodeAt, unanalyzed, cancelled };
  }

  private static async importOne(store: LibraryStore, filePath: string, settings: Settings, unanalyzed: string[]): Promise<Beat> {
    const format = AudioFiles.formatOf(filePath);
    if (!format) throw new Error('Unsupported file.');
    const stat = await fs.promises.stat(filePath);
    const tags = await TagReader.read(filePath);
    const base = path.basename(filePath, path.extname(filePath));
    const year = String(new Date().getFullYear());
    const created = BeatRecord.create({
      filePath,
      format,
      fileSize: stat.size,
      title: tags.title || base,
      producer: tags.producer || settings.producerName,
      artist: tags.artist,
      copyright: CopyrightLine.forImport(settings.copyrightTemplate, year, tags.producer || settings.producerName, tags.copyright),
      date: (tags.date || stat.mtime.toISOString()).slice(0, 10),
    });
    created.genre = tags.genre;
    created.mood = tags.mood;
    created.tags = tags.tags;
    created.comment = tags.comment;
    created.isrc = tags.isrc;
    created.durationSec = tags.durationSec;
    created.sampleRate = tags.sampleRate;
    if (tags.bpm != null) created.bpmOverride = tags.bpm;
    if (tags.keyName) {
      created.keyOverride = tags.keyName;
      created.camelotOverride = tags.camelot || null;
    }
    let beat = store.add(created);
    if (format === 'wav' || format === 'aiff') {
      try {
        const decoded = PcmDecoder.decode(new Uint8Array(await fs.promises.readFile(filePath)));
        beat = store.applyAnalysis(beat.id, TrackAnalyzer.analyze(decoded.samples, decoded.sampleRate));
      } catch {
        unanalyzed.push(path.basename(filePath));
      }
    }
    const sidecar = await this.sidecarJpeg(filePath);
    if (sidecar) beat = store.setArtwork(beat.id, sidecar.bytes, sidecar.width, sidecar.height);
    return beat;
  }

  /** A JPEG sitting beside the audio file (Beat.jpg next to Beat.wav) becomes the cover. */
  private static async sidecarJpeg(filePath: string): Promise<{ bytes: Buffer; width: number; height: number } | null> {
    const base = filePath.slice(0, filePath.length - path.extname(filePath).length);
    for (const candidate of [`${base}.jpg`, `${base}.jpeg`]) {
      if (!fs.existsSync(candidate)) continue;
      const bytes = await fs.promises.readFile(candidate);
      const size = ImageSize.read(bytes);
      if (!size) continue;
      return { bytes, width: size.width, height: size.height };
    }
    return null;
  }
}
