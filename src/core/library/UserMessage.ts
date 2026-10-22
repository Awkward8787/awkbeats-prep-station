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
  static readonly cropUpscale = 'This image is smaller than 3000×3000. Exporting at 3000 will upscale it.';

  static imported(count: number, duplicates: number, failed: number): string {
    const noun = count === 1 ? 'beat' : 'beats';
    const parts = [`Imported ${count} ${noun}.`];
    if (duplicates) parts.push(`${duplicates} already in the library.`);
    if (failed) parts.push(`${failed} could not be read.`);
    return parts.join(' ');
  }
}
