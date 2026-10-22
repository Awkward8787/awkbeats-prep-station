import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { PcmDecoder } from '../src/core/audio/PcmDecoder';
import { ReferenceAudio } from '../src/core/audio/ReferenceAudio';
import { Importer } from '../src/core/library/Importer';
import { LibraryStore } from '../src/core/library/LibraryStore';
import { TagWriter } from '../src/core/tags/TagWriter';

async function main(): Promise<void> {
const userData = process.argv[2];
const audioDir = process.argv[3];
if (!userData || !audioDir) {
  throw new Error('Usage: seed-demo <userData> <audioDir>');
}
fs.mkdirSync(audioDir, { recursive: true });
fs.rmSync(userData, { recursive: true, force: true });

const beats = [
  { file: 'Night Drive', bpm: 140.25, root: 'F#', mode: 'minor' as const, genre: 'Trap', mood: 'Dark', tags: ['night', 'keys'], status: 'ready' as const, notes: 'Open with the filtered hats. Lease candidate.' },
  { file: 'Glassroom', bpm: 96, root: 'C', mode: 'major' as const, genre: 'R&B', mood: 'Soulful', tags: ['chords'], status: 'in_progress' as const, notes: 'Needs a new drum pocket.' },
  { file: 'Alley Light', bpm: 150, root: 'A', mode: 'minor' as const, genre: 'Drill', mood: 'Aggressive', tags: ['dark'], status: 'idea' as const, notes: '' },
  { file: 'Gold Hour', bpm: 86, root: 'D', mode: 'major' as const, genre: 'Pop', mood: 'Uplifting', tags: ['topline'], status: 'leased' as const, notes: 'Leased for a feature verse.' },
];

for (const beat of beats) {
  const samples = ReferenceAudio.loop({ bpm: beat.bpm, root: beat.root, mode: beat.mode, bars: 4 });
  const filePath = path.join(audioDir, `${beat.file}.wav`);
  fs.writeFileSync(filePath, PcmDecoder.encodeWav(samples, 44100));
  TagWriter.write(filePath, 'wav', {
    title: beat.file,
    artist: beat.file === 'Night Drive' ? 'Demo Artist' : '',
    producer: 'Demo Producer',
    genre: beat.genre,
    mood: beat.mood,
    bpm: beat.bpm,
    keyName: `${beat.root} ${beat.mode}`,
    camelot: '',
    tags: beat.tags,
    comment: beat.notes,
    copyright: '© 2026 Demo Producer',
    isrc: '',
    date: '2026-04-02',
    artwork: null,
  });
}

execFileSync('convert', [
  '-size', '1800x2400',
  'radial-gradient:#3a2a14-#120e0a',
  '-fill', '#e4b15a',
  '-font', 'DejaVu-Sans',
  '-gravity', 'center',
  '-pointsize', '140',
  '-annotate', '0', 'NIGHT DRIVE',
  '-fill', '#f4f0e8',
  '-pointsize', '48',
  '-annotate', '+0+180', 'AWKBEATS',
  path.join(audioDir, 'Night Drive.jpg'),
]);
const store = new LibraryStore(userData);
store.updateSettings({ producerName: 'Demo Producer', producerPromptDismissed: true });
const result = await Importer.importPaths(store, [audioDir]);
if (result.failed.length) {
  console.error(result.failed);
  process.exit(1);
}
for (const beat of result.imported) {
  const spec = beats.find((item) => item.file === beat.title);
  if (!spec) continue;
  store.update(beat.id, { status: spec.status, notes: spec.notes });
}
for (const beat of store.list()) store.clearTagsDirty(beat.id);
const night = store.list().find((beat) => beat.title === 'Night Drive');
console.log(JSON.stringify(store.list().map((beat) => ({
  title: beat.title,
  bpm: beat.bpmDetected,
  key: beat.keyDetected,
  camelot: beat.camelotDetected,
})), null, 2));
if (!night || Math.abs((night.bpmDetected || 0) - 140.25) > 0.01 || night.keyDetected !== 'F# minor') {
  throw new Error('Demo analysis did not match the reference loop.');
}
}

void main();
