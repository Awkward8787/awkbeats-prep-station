import fs from 'node:fs';
import { BpmMath } from '../analysis/BpmMath';
import type { LibraryStore } from '../library/LibraryStore';
import { KeyChoice, type Beat, type Settings } from '../library/types';
import type { TagPayload } from './TagTypes';

export class TagCommit {
  static fromBeat(beat: Beat, settings: Settings, store: LibraryStore): TagPayload {
    const key = KeyChoice.working(beat);
    const artworkPath = store.artworkPath(beat.id);
    const artwork =
      artworkPath && beat.artworkWidth && beat.artworkHeight
        ? {
            mime: 'image/jpeg' as const,
            data: fs.readFileSync(artworkPath),
            width: beat.artworkWidth,
            height: beat.artworkHeight,
          }
        : null;
    return {
      title: beat.title,
      artist: beat.artist,
      genre: beat.genre,
      mood: beat.mood,
      bpm: BpmMath.working(beat),
      keyName: key.name,
      camelot: key.camelot,
      tags: beat.tags,
      comment: beat.comment,
      copyright: beat.copyright,
      isrc: beat.isrc,
      date: beat.date,
      producer: beat.producer,
      artwork,
    };
  }
}
