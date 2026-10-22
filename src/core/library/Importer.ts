import fs from 'node:fs';
import path from 'node:path';
import { PcmDecoder } from '../audio/PcmDecoder';
import { TrackAnalyzer } from '../analysis/TrackAnalyzer';
import { TagReader } from '../tags/TagReader';
import { AudioFiles } from './AudioFiles';
import { ImageSize } from './ImageSize';
import { BeatRecord, LibraryStore } from './LibraryStore';
import { CopyrightLine, type Beat, type Settings } from './types';

export type ImportResult = {
  imported: Beat[];
  duplicates: number;
  failed: { filePath: string; message: string }[];
  needsDecode: string[];
};

export class Importer {
  static async importPaths(store: LibraryStore, inputs: string[]): Promise<ImportResult> {
    const files = await AudioFiles.collect(inputs);
    const settings = store.getSettings();
    const imported: Beat[] = [];
    const failed: { filePath: string; message: string }[] = [];
    const needsDecode: string[] = [];
    let duplicates = 0;
    for (const filePath of files) {
      if (store.findByPath(filePath)) {
        duplicates += 1;
        continue;
      }
      try {
        const beat = await this.importOne(store, filePath, settings);
        imported.push(beat);
        if (beat.format === 'mp3' || beat.format === 'flac') needsDecode.push(beat.id);
      } catch (error) {
        failed.push({ filePath, message: error instanceof Error ? error.message : 'Could not import this file.' });
      }
    }
    return { imported, duplicates, failed, needsDecode };
  }

  private static async importOne(store: LibraryStore, filePath: string, settings: Settings): Promise<Beat> {
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
      const decoded = PcmDecoder.decode(new Uint8Array(await fs.promises.readFile(filePath)));
      beat = store.applyAnalysis(beat.id, TrackAnalyzer.analyze(decoded.samples, decoded.sampleRate));
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
