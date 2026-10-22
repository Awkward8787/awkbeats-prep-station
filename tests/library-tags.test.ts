import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { BpmMath } from '../src/core/analysis/BpmMath';
import { PcmDecoder } from '../src/core/audio/PcmDecoder';
import { ReferenceAudio } from '../src/core/audio/ReferenceAudio';
import { CsvExport } from '../src/core/library/CsvExport';
import { Importer } from '../src/core/library/Importer';
import { BeatQuery, BeatValidation } from '../src/core/library/BeatRules';
import { BeatRecord, LibraryStore } from '../src/core/library/LibraryStore';
import { SquareCrop } from '../src/core/library/SquareCrop';
import NodeID3 from 'node-id3';
import { TagCommit } from '../src/core/tags/TagCommit';
import { TagReader } from '../src/core/tags/TagReader';
import { TagWriter } from '../src/core/tags/TagWriter';
import type { TagPayload } from '../src/core/tags/TagTypes';
import { KeyChoice, type LibraryFilters } from '../src/core/library/types';

const dirs: string[] = [];

function tempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'awkbeats-'));
  dirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of dirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

const payload = (artwork: TagPayload['artwork'] = null): TagPayload => ({
  title: 'Night Drive',
  artist: 'Awkward J',
  genre: 'Trap',
  mood: 'Dark',
  bpm: 140.25,
  keyName: 'F# minor',
  camelot: '11A',
  tags: ['night', 'keys'],
  comment: 'Open with the hats.',
  copyright: '© 2026 Awkward J',
  isrc: 'USAWK2600001',
  date: '2026-04-02',
  producer: 'Awkward J',
  artwork,
});

describe('PcmDecoder', () => {
  it('round-trips WAV and AIFF samples', () => {
    const source = ReferenceAudio.clicks({ bpm: 120, seconds: 1, sampleRate: 44100 });
    for (const encoded of [PcmDecoder.encodeWav(source, 44100), PcmDecoder.encodeAiff(source, 44100)]) {
      const decoded = PcmDecoder.decode(encoded);
      expect(decoded.sampleRate).toBe(44100);
      expect(decoded.samples.length).toBe(source.length);
      let error = 0;
      for (let i = 0; i < source.length; i++) error = Math.max(error, Math.abs(decoded.samples[i] - source[i]));
      expect(error).toBeLessThan(1 / 30000);
    }
  });
});

describe('TagWriter', () => {
  const jpeg = Buffer.from(
    '/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBxISEhUTExMWFhUXGBcYGBgYGBgYGBgYGBgYGBgYGBgYHSggGBolGxUVITEhJSkrLi4uFx8zODMtNygtLisBCgoKDg0OGhAQGy0lHyUtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLf/AABEIAQABAAMBIgACEQEDEQH/xAAbAAACAwEBAQAAAAAAAAAAAAAAAQIDBAUGB//EABQBAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8A0pN6qKKKAP/Z',
    'base64',
  );

  async function expectTags(filePath: string): Promise<void> {
    const tags = await TagReader.read(filePath);
    expect(tags.title).toBe('Night Drive');
    expect(tags.artist).toBe('Awkward J');
    expect(tags.producer).toBe('Awkward J');
    expect(tags.genre.toLowerCase()).toContain('trap');
    expect(tags.bpm).toBeCloseTo(140.25, 2);
    expect(tags.keyName).toBe('F# minor');
    expect(tags.camelot).toBe('11A');
    expect(tags.mood.toLowerCase()).toBe('dark');
    expect(tags.tags).toEqual(['night', 'keys']);
    expect(tags.comment).toContain('hats');
    expect(tags.isrc).toBe('USAWK2600001');
    expect(tags.date.startsWith('2026')).toBe(true);
  }

  it('writes ID3v2 into an MP3 and reads it back', async () => {
    const dir = tempDir();
    const filePath = path.join(dir, 'beat.mp3');
    const frame = Buffer.alloc(417);
    frame[0] = 0xff;
    frame[1] = 0xfb;
    frame[2] = 0x90;
    fs.writeFileSync(filePath, frame);
    TagWriter.write(filePath, 'mp3', payload({ mime: 'image/jpeg', data: jpeg, width: 1, height: 1 }));
    await expectTags(filePath);
  });

  it('writes RIFF INFO and ID3 into a WAV without changing the audio', async () => {
    const dir = tempDir();
    const filePath = path.join(dir, 'beat.wav');
    const audio = ReferenceAudio.keyedTone({ root: 'C', mode: 'major', seconds: 0.4 });
    fs.writeFileSync(filePath, PcmDecoder.encodeWav(audio, 44100));
    const before = PcmDecoder.decode(new Uint8Array(fs.readFileSync(filePath))).samples;
    TagWriter.write(filePath, 'wav', payload());
    const after = PcmDecoder.decode(new Uint8Array(fs.readFileSync(filePath))).samples;
    expect(Buffer.from(after.buffer).equals(Buffer.from(before.buffer))).toBe(true);
    await expectTags(filePath);
  });

  it('writes an ID3 chunk into AIFF', async () => {
    const dir = tempDir();
    const filePath = path.join(dir, 'beat.aiff');
    fs.writeFileSync(filePath, PcmDecoder.encodeAiff(ReferenceAudio.clicks({ bpm: 100, seconds: 0.5 }), 44100));
    TagWriter.write(filePath, 'aiff', payload());
    await expectTags(filePath);
  });

  it('writes Vorbis comments and a picture into FLAC', async () => {
    const dir = tempDir();
    const filePath = path.join(dir, 'beat.flac');
    fs.copyFileSync(path.join(__dirname, 'fixtures', 'silence.flac'), filePath);
    TagWriter.write(filePath, 'flac', payload({ mime: 'image/jpeg', data: jpeg, width: 1, height: 1 }));
    await expectTags(filePath);
    const again = fs.readFileSync(filePath);
    expect(again.toString('latin1', 0, 4)).toBe('fLaC');
  });
});

describe('Library', () => {
  it('imports a WAV, analyzes it, and keeps a locked tempo', async () => {
    const dir = tempDir();
    const audioDir = path.join(dir, 'audio');
    fs.mkdirSync(audioDir);
    const filePath = path.join(audioDir, 'Loop.wav');
    const audio = ReferenceAudio.loop({ bpm: 96, root: 'F#', mode: 'minor', bars: 4 });
    fs.writeFileSync(filePath, PcmDecoder.encodeWav(audio, 44100));
    const store = new LibraryStore(path.join(dir, 'library'));
    const result = await Importer.importPaths(store, [audioDir]);
    expect(result.failed).toEqual([]);
    expect(result.imported).toHaveLength(1);
    const beat = result.imported[0];
    expect(beat.bpmDetected).toBeCloseTo(96, 2);
    expect(beat.keyDetected).toBe('F# minor');
    expect(beat.camelotDetected).toBe('11A');
    expect(BpmMath.working(beat)).toBeCloseTo(96, 2);
    store.update(beat.id, { bpmOverride: 99, bpmLocked: true, keyLocked: true });
    store.applyAnalysis(beat.id, {
      bpm: 140,
      bpmConfidence: 1,
      keyName: 'C major',
      camelot: '8B',
      keyConfidence: 1,
      durationSec: 10,
      sampleRate: 44100,
      peaks: [0.1],
    });
    const locked = store.get(beat.id)!;
    expect(BpmMath.working(locked)).toBe(99);
    expect(locked.bpmDetected).toBeCloseTo(96, 2);
    expect(KeyChoice.working(locked).name).toBe('F# minor');
    const duplicate = await Importer.importPaths(store, [filePath]);
    expect(duplicate.duplicates).toBe(1);
  });

  it('filters, sorts, validates, and exports CSV', () => {
    expect(BeatValidation.isrc('US-AWK-26-00001')).toBeNull();
    expect(BeatValidation.isrc('nope')).toMatch(/ISRC/);
    expect(BeatValidation.canonicalIsrc('us-awk-26-00001')).toBe('USAWK2600001');
    expect(BeatValidation.tags([' Night ', 'night', 'Keys'])).toEqual(['Night', 'Keys']);
    const frame = SquareCrop.frame(4000, 3000, 2, 10, -20);
    expect(frame.side).toBe(1500);
    expect(frame.y).toBe(0);
    expect(frame.x).toBe(10);

    const dir = tempDir();
    const store = new LibraryStore(dir);
    const ready = store.add(
      BeatRecord.create({
        filePath: path.join(dir, 'ready.wav'),
        format: 'wav',
        fileSize: 10,
        title: 'Ready One',
        artist: 'Awkward J',
        copyright: '© 2026 Awkward J',
        date: '2026-02-01',
      }),
    );
    store.update(ready.id, { status: 'ready', genre: 'Trap', tags: ['dark'], bpmOverride: 140 });
    store.add(
      BeatRecord.create({
        filePath: path.join(dir, 'idea.wav'),
        format: 'wav',
        fileSize: 10,
        title: 'Sketch',
        artist: 'Awkward J',
        copyright: '',
        date: '2026-03-01',
      }),
    );
    const filters: LibraryFilters = {
      search: 'ready dark',
      status: 'ready',
      producer: '',
      artist: '',
      genre: 'Trap',
      key: '',
      tag: 'dark',
      bpmMin: 100,
      bpmMax: 160,
      dateFrom: '2026-01-01',
      dateTo: '2026-12-31',
    };
    const matched = BeatQuery.sort(store.list().filter((beat) => BeatQuery.match(beat, filters)), 'bpm', 'desc');
    expect(matched.map((beat) => beat.title)).toEqual(['Ready One']);
    const csv = CsvExport.render(matched);
    expect(csv.split('\r\n')[0]).toContain('camelot');
    expect(csv).toContain('Ready One');
    expect(csv).toContain('140');
    expect(() => store.update(ready.id, { isrc: 'bad' })).toThrow(/ISRC/);
    store.batchUpdate([ready.id], { status: 'sold', addTags: ['sold'] });
    expect(store.get(ready.id)?.status).toBe('sold');
    expect(store.get(ready.id)?.tags).toContain('sold');
    expect(csv.split('\r\n')[0]).toContain('producer');
  });

  it('saves the producer default, pre-fills new beats, and keeps a per-beat override', async () => {
    const dir = tempDir();
    const libraryDir = path.join(dir, 'library');
    const first = new LibraryStore(libraryDir);
    expect(first.getSettings().producerName).toBe('');
    expect(first.getSettings().copyrightTemplate).toBe('© {year} {producer}');
    expect(first.getSettings().producerPromptDismissed).toBe(false);
    const barePath = path.join(dir, 'Bare.wav');
    fs.writeFileSync(barePath, PcmDecoder.encodeWav(ReferenceAudio.clicks({ bpm: 100, seconds: 0.25 }), 44100));
    const bare = await Importer.importPaths(first, [barePath]);
    expect(bare.imported[0].producer).toBe('');
    expect(bare.imported[0].artist).toBe('');
    expect(bare.imported[0].copyright).toBe('');
    first.updateSettings({ producerName: 'Nova Beats' });
    expect(new LibraryStore(libraryDir).getSettings().producerName).toBe('Nova Beats');
    first.updateSettings({ producerName: '' });
    expect(new LibraryStore(libraryDir).getSettings().producerName).toBe('');
    const store = new LibraryStore(libraryDir);
    store.updateSettings({ producerName: 'Nova Beats' });

    const filePath = path.join(dir, 'Plain.wav');
    fs.writeFileSync(filePath, PcmDecoder.encodeWav(ReferenceAudio.clicks({ bpm: 100, seconds: 0.25 }), 44100));
    const imported = await Importer.importPaths(store, [filePath]);
    expect(imported.failed).toEqual([]);
    const beat = imported.imported[0];
    expect(beat.producer).toBe('Nova Beats');
    expect(beat.artist).toBe('');
    expect(beat.copyright).toBe(`© ${new Date().getFullYear()} Nova Beats`);
    expect(store.clearTagsDirty(beat.id).tagsDirty).toBe(false);
    store.update(beat.id, { notes: 'Hold' });
    expect(store.get(beat.id)?.tagsDirty).toBe(false);
    store.update(beat.id, { status: 'ready' });
    expect(store.get(beat.id)?.tagsDirty).toBe(false);

    store.update(beat.id, { producer: 'Other Name', artist: 'Lina Cole' });
    const saved = new LibraryStore(libraryDir).get(beat.id)!;
    expect(saved.producer).toBe('Other Name');
    expect(saved.artist).toBe('Lina Cole');
    expect(saved.tagsDirty).toBe(true);
    expect(store.clearTagsDirty(beat.id).tagsDirty).toBe(false);
    const payloadFromBeat = TagCommit.fromBeat(saved, store.getSettings(), store);
    expect(payloadFromBeat.producer).toBe('Other Name');
    expect(payloadFromBeat.artist).toBe('Lina Cole');

    const filters: LibraryFilters = {
      search: 'lina',
      status: 'all',
      producer: 'other',
      artist: 'lina',
      genre: '',
      key: '',
      tag: '',
      bpmMin: null,
      bpmMax: null,
      dateFrom: '',
      dateTo: '',
    };
    expect(BeatQuery.match(saved, filters)).toBe(true);
    expect(BeatQuery.match(saved, { ...filters, producer: 'nova' })).toBe(false);
    expect(BeatQuery.match(saved, { ...filters, search: 'nova beats' })).toBe(false);
    const csv = CsvExport.render([saved]);
    expect(csv).toContain('Other Name');
    expect(csv).toContain('Lina Cole');
    const catalog = JSON.parse(fs.readFileSync(path.join(libraryDir, 'library.json'), 'utf8')) as {
      settings: { producerName: string };
      beats: { producer: string; artist: string }[];
    };
    expect(catalog.settings.producerName).toBe('Nova Beats');
    const edited = catalog.beats.find((item) => item.artist === 'Lina Cole');
    expect(edited?.producer).toBe('Other Name');
    expect(edited?.artist).toBe('Lina Cole');
  });
});

describe('producer and artist tags', () => {
  const distinct = (): TagPayload => ({
    ...payload(),
    artist: 'Lina Cole',
    producer: 'Nova Beats',
  });

  async function roundTrip(filePath: string, format: 'mp3' | 'wav' | 'aiff' | 'flac'): Promise<void> {
    TagWriter.write(filePath, format, distinct());
    const tags = await TagReader.read(filePath);
    expect(tags.artist).toBe('Lina Cole');
    expect(tags.producer).toBe('Nova Beats');
  }

  it('writes artist to TPE1 and producer to TCOM, TIPL, and TXXX:PRODUCER', async () => {
    const dir = tempDir();
    const filePath = path.join(dir, 'beat.mp3');
    const frame = Buffer.alloc(417);
    frame[0] = 0xff;
    frame[1] = 0xfb;
    frame[2] = 0x90;
    fs.writeFileSync(filePath, frame);
    await roundTrip(filePath, 'mp3');
    const id3 = NodeID3.read(filePath);
    expect(id3.artist).toBe('Lina Cole');
    expect(id3.composer).toBe('Nova Beats');
    expect(String(id3.involvedPeopleList)).toContain('producer');
    expect(String(id3.involvedPeopleList)).toContain('Nova Beats');
    const custom = Array.isArray(id3.userDefinedText) ? id3.userDefinedText : id3.userDefinedText ? [id3.userDefinedText] : [];
    expect(custom.some((item) => item.description === 'PRODUCER' && item.value === 'Nova Beats')).toBe(true);
  });

  it('reads artist and producer back from WAV, AIFF, and FLAC', async () => {
    const dir = tempDir();
    const wav = path.join(dir, 'beat.wav');
    fs.writeFileSync(wav, PcmDecoder.encodeWav(ReferenceAudio.clicks({ bpm: 100, seconds: 0.2 }), 44100));
    await roundTrip(wav, 'wav');
    const info = fs.readFileSync(wav).toString('latin1');
    expect(info).toContain('IART');
    expect(info).toContain('Lina Cole');
    expect(info).toContain('IPRO');
    expect(info).toContain('Nova Beats');

    const aiff = path.join(dir, 'beat.aiff');
    fs.writeFileSync(aiff, PcmDecoder.encodeAiff(ReferenceAudio.clicks({ bpm: 100, seconds: 0.2 }), 44100));
    await roundTrip(aiff, 'aiff');

    const flac = path.join(dir, 'beat.flac');
    fs.copyFileSync(path.join(__dirname, 'fixtures', 'silence.flac'), flac);
    await roundTrip(flac, 'flac');
    const comments = fs.readFileSync(flac).toString('utf8');
    expect(comments).toContain('ARTIST=Lina Cole');
    expect(comments).toContain('PRODUCER=Nova Beats');
    expect(comments).toContain('COMPOSER=Nova Beats');
  });
});
