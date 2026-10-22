export class UserMessage {
  static readonly emptyTitle = 'No beats in the library yet';
  static readonly emptyBody = 'Drop WAV, MP3, AIFF, or FLAC files here, or import a folder.';
  static readonly noMatches = 'No beats match these filters.';
  static readonly fileMissing = 'This file is missing from disk.';
  static readonly tagsWritten = 'Tags were written to the file.';
  static readonly tagsFailed = 'Tags could not be written. The file may be open in another app or read-only.';
  static readonly isrcInvalid = 'ISRC must be 12 characters, like US-AWK-26-00001, or left blank.';
  static readonly bpmInvalid = 'BPM must be between 40 and 300.';
  static readonly removeTitle = 'Remove from library';
  static readonly removeBody = 'Remove the selected beats from the library? The audio files stay on disk.';
  static readonly analyzeIdle = 'Analyze to measure tempo, key, and the waveform.';
  static readonly nothingToImport = 'No audio files found.';
  static readonly namesApplied = 'Titles updated in the library. Files are unchanged until you write tags.';
  static readonly namesRestored = 'Names restored.';
  static readonly namesFailed = 'Not enough unique beat names are left.';
  static readonly cropUpscale = 'This image is smaller than 3000×3000. Exporting at 3000 will upscale it.';

  static imported(count: number, duplicates: number, failed: number, unanalyzed: string[] = []): string {
    const noun = count === 1 ? 'beat' : 'beats';
    const parts = [`Imported ${count} ${noun}.`];
    if (duplicates) parts.push(`${duplicates} already in the library.`);
    if (failed) parts.push(`${failed} could not be read.`);
    const missed = this.unanalyzed(unanalyzed);
    if (missed) parts.push(missed);
    return parts.join(' ');
  }

  static unanalyzed(names: string[]): string {
    if (!names.length) return '';
    return `${names.length} couldn't be analyzed: ${names.join(', ')}. Check they play in another app, then choose Re-analyze.`;
  }

  static stopped(done: number, total: number, imported: number, pendingAnalysis = 0): string {
    const noun = imported === 1 ? 'beat' : 'beats';
    const rest = pendingAnalysis ? ` ${pendingAnalysis} still need key and BPM. Select them and choose Re-analyze.` : '';
    return `Stopped after ${done} of ${total}. ${imported} ${noun} imported.${rest}`;
  }

  /** A stop that left beats unanalyzed stays up until dismissed. */
  static stoppedTone(pendingAnalysis: number): 'ok' | 'look' {
    return pendingAnalysis > 0 ? 'look' : 'ok';
  }

  static namesRestoredSome(skipped: string[]): string {
    return `Names restored. Left unchanged: ${skipped.join(', ')}.`;
  }
}
