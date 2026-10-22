import fs from 'node:fs';
import path from 'node:path';
import type { AudioFormat } from './types';

export class AudioFiles {
  static readonly extensions = new Map<string, AudioFormat>([
    ['.wav', 'wav'],
    ['.mp3', 'mp3'],
    ['.aiff', 'aiff'],
    ['.aif', 'aiff'],
    ['.flac', 'flac'],
  ]);

  static formatOf(filePath: string): AudioFormat | null {
    return this.extensions.get(path.extname(filePath).toLowerCase()) ?? null;
  }

  static async collect(inputs: string[]): Promise<string[]> {
    const found: string[] = [];
    for (const input of inputs) {
      await this.walk(input, found);
    }
    return [...new Set(found)].sort((a, b) => a.localeCompare(b));
  }

  private static async walk(target: string, found: string[]): Promise<void> {
    let stat: fs.Stats;
    try {
      stat = await fs.promises.stat(target);
    } catch {
      return;
    }
    if (stat.isFile()) {
      if (this.formatOf(target) && stat.size > 0 && stat.size <= 2 * 1024 * 1024 * 1024) found.push(path.resolve(target));
      return;
    }
    if (!stat.isDirectory()) return;
    const entries = await fs.promises.readdir(target);
    for (const entry of entries) {
      if (entry.startsWith('.')) continue;
      await this.walk(path.join(target, entry), found);
    }
  }
}
