import { BpmMath } from '../analysis/BpmMath';
import { KeyChoice, type Beat } from './types';

export class CsvExport {
  static readonly headers = [
    'id',
    'title',
    'producer',
    'artist',
    'file_name',
    'file_path',
    'format',
    'duration_sec',
    'bpm',
    'bpm_detected',
    'bpm_scale',
    'bpm_override',
    'bpm_locked',
    'key',
    'camelot',
    'key_detected',
    'camelot_detected',
    'key_locked',
    'key_confidence',
    'genre',
    'mood',
    'tags',
    'status',
    'notes',
    'comment',
    'copyright',
    'isrc',
    'date',
    'analyzed_at',
    'imported_at',
    'updated_at',
  ];

  static render(beats: Beat[]): string {
    const lines = [this.headers.join(',')];
    for (const beat of beats) {
      const bpm = BpmMath.working(beat);
      const key = KeyChoice.working(beat);
      lines.push(
        [
          beat.id,
          beat.title,
          beat.producer || '',
          beat.artist,
          beat.fileName,
          beat.filePath,
          beat.format,
          beat.durationSec ?? '',
          bpm ?? '',
          beat.bpmDetected ?? '',
          beat.bpmScale,
          beat.bpmOverride ?? '',
          beat.bpmLocked ? 'true' : 'false',
          key.name ?? '',
          key.camelot ?? '',
          beat.keyDetected ?? '',
          beat.camelotDetected ?? '',
          beat.keyLocked ? 'true' : 'false',
          beat.keyConfidence ?? '',
          beat.genre,
          beat.mood,
          beat.tags.join('|'),
          beat.status,
          beat.notes,
          beat.comment,
          beat.copyright,
          beat.isrc,
          beat.date,
          beat.analyzedAt ?? '',
          beat.importedAt,
          beat.updatedAt,
        ]
          .map((value) => this.cell(value))
          .join(','),
      );
    }
    return `${lines.join('\r\n')}\r\n`;
  }

  private static cell(value: string | number): string {
    const text = String(value);
    if (/[",\r\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
    return text;
  }
}
