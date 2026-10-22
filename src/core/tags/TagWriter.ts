import fs from 'node:fs';
import NodeID3 from 'node-id3';
import type { AudioFormat } from '../library/types';
import { TagText, type TagPayload } from './TagTypes';

type RiffChunk = { id: string; data: Buffer };

/**
 * Writes producer metadata into the audio file's real tags:
 * ID3v2 for MP3, a RIFF INFO list plus an ID3 chunk for WAV,
 * an ID3 chunk for AIFF, and Vorbis comments plus a picture block for FLAC.
 */
export class TagWriter {
  static write(filePath: string, format: AudioFormat, payload: TagPayload): void {
    if (format === 'mp3') this.writeMp3(filePath, payload);
    else if (format === 'wav') this.writeWav(filePath, payload);
    else if (format === 'aiff') this.writeAiff(filePath, payload);
    else if (format === 'flac') this.writeFlac(filePath, payload);
    else throw new Error('Unsupported audio format.');
  }

  static id3Tags(payload: TagPayload): NodeID3.Tags {
    const tags: NodeID3.Tags = {
      title: payload.title,
      artist: payload.artist,
      genre: payload.genre,
      comment: { language: 'eng', text: payload.comment || '' },
    };
    if (payload.producer) {
      tags.composer = payload.producer;
      tags.involvedPeopleList = `producer\0${payload.producer}`;
    }
    if (payload.bpm != null) tags.bpm = payload.bpm.toFixed(2);
    const initial = TagText.initialKey(payload.keyName);
    if (initial) tags.initialKey = initial;
    const copyright = TagText.copyrightFrame(payload.copyright);
    if (copyright) tags.copyright = copyright;
    if (payload.isrc) tags.ISRC = payload.isrc;
    if (payload.date) {
      tags.releaseTime = payload.date;
      const year = payload.date.slice(0, 4);
      if (/^\d{4}$/.test(year)) tags.year = year;
    }
    const custom: { description: string; value: string }[] = [];
    if (payload.mood) custom.push({ description: 'MOOD', value: payload.mood });
    if (payload.tags.length) custom.push({ description: 'TAGS', value: payload.tags.join(', ') });
    if (payload.keyName) custom.push({ description: 'KEY', value: payload.keyName });
    if (payload.camelot) custom.push({ description: 'CAMELOT', value: payload.camelot });
    if (payload.producer) custom.push({ description: 'PRODUCER', value: payload.producer });
    if (payload.copyright) custom.push({ description: 'COPYRIGHT', value: payload.copyright });
    if (custom.length) tags.userDefinedText = custom;
    if (payload.artwork) {
      tags.image = {
        mime: payload.artwork.mime,
        type: { id: 3, name: 'front cover' },
        description: 'Cover',
        imageBuffer: payload.artwork.data,
      };
    }
    return tags;
  }

  private static writeMp3(filePath: string, payload: TagPayload): void {
    const ok = NodeID3.write(this.id3Tags(payload), filePath);
    if (!ok) throw new Error('Could not write ID3 tags.');
  }

  private static writeWav(filePath: string, payload: TagPayload): void {
    const original = fs.readFileSync(filePath);
    if (original.toString('latin1', 0, 4) !== 'RIFF' || original.toString('latin1', 8, 12) !== 'WAVE') {
      throw new Error('Not a WAV file.');
    }
    const kept = this.readChunks(original, 12, true).filter((chunk) => {
      if (chunk.id === 'id3 ' || chunk.id === 'ID3 ') return false;
      if (chunk.id === 'LIST' && chunk.data.toString('latin1', 0, 4) === 'INFO') return false;
      return true;
    });
    kept.push(this.listInfo(payload));
    kept.push({ id: 'id3 ', data: NodeID3.create(this.id3Tags(payload)) });
    fs.writeFileSync(filePath, this.packRiff('WAVE', kept, true));
  }

  private static writeAiff(filePath: string, payload: TagPayload): void {
    const original = fs.readFileSync(filePath);
    if (original.toString('latin1', 0, 4) !== 'FORM') throw new Error('Not an AIFF file.');
    const form = original.toString('latin1', 8, 12);
    if (form !== 'AIFF' && form !== 'AIFC') throw new Error('Not an AIFF file.');
    const drop = new Set(['NAME', 'AUTH', 'ANNO', 'ID3 ', 'id3 ']);
    const kept = this.readChunks(original, 12, false).filter((chunk) => !drop.has(chunk.id));
    if (payload.title) kept.push({ id: 'NAME', data: Buffer.from(payload.title, 'utf8') });
    if (payload.artist) kept.push({ id: 'AUTH', data: Buffer.from(payload.artist, 'utf8') });
    if (payload.comment) kept.push({ id: 'ANNO', data: Buffer.from(payload.comment, 'utf8') });
    kept.push({ id: 'ID3 ', data: NodeID3.create(this.id3Tags(payload)) });
    fs.writeFileSync(filePath, this.packRiff(form, kept, false));
  }

  private static writeFlac(filePath: string, payload: TagPayload): void {
    const original = fs.readFileSync(filePath);
    if (original.toString('latin1', 0, 4) !== 'fLaC') throw new Error('Not a FLAC file.');
    const parsed = this.readFlacBlocks(original);
    const kept = parsed.blocks.filter((block) => block.type !== 4 && block.type !== 6 && block.type !== 1);
    const comments = this.vorbisComment(payload);
    const blocks = [...kept, { type: 4, data: comments }];
    if (payload.artwork) blocks.push({ type: 6, data: this.flacPicture(payload) });
    blocks.push({ type: 1, data: Buffer.alloc(256) });
    const parts: Buffer[] = [Buffer.from('fLaC')];
    blocks.forEach((block, index) => {
      const header = Buffer.alloc(4);
      const last = index === blocks.length - 1 ? 0x80 : 0;
      header[0] = last | block.type;
      header[1] = (block.data.length >> 16) & 0xff;
      header[2] = (block.data.length >> 8) & 0xff;
      header[3] = block.data.length & 0xff;
      parts.push(header, block.data);
    });
    parts.push(parsed.audio);
    fs.writeFileSync(filePath, Buffer.concat(parts));
  }

  private static listInfo(payload: TagPayload): RiffChunk {
    const entries: [string, string][] = [
      ['INAM', payload.title],
      ['IART', payload.artist],
      ['IPRO', payload.producer],
      ['IGNR', payload.genre],
      ['ICMT', payload.comment],
      ['ICRD', payload.date],
      ['ICOP', payload.copyright],
      ['ISBJ', payload.mood],
    ];
    const parts: Buffer[] = [Buffer.from('INFO')];
    for (const [id, value] of entries) {
      if (!value) continue;
      const data = Buffer.concat([Buffer.from(value, 'utf8'), Buffer.alloc(1)]);
      const size = Buffer.alloc(4);
      size.writeUInt32LE(data.length);
      const pad = data.length % 2 === 1 ? Buffer.alloc(1) : Buffer.alloc(0);
      parts.push(Buffer.from(id), size, data, pad);
    }
    return { id: 'LIST', data: Buffer.concat(parts) };
  }

  private static vorbisComment(payload: TagPayload): Buffer {
    const pairs: [string, string][] = [
      ['TITLE', payload.title],
      ['ARTIST', payload.artist],
      ['COMPOSER', payload.producer],
      ['GENRE', payload.genre],
      ['COMMENT', payload.comment],
      ['DATE', payload.date],
      ['COPYRIGHT', payload.copyright],
      ['ISRC', payload.isrc],
      ['MOOD', payload.mood],
      ['TAGS', payload.tags.join(', ')],
      ['KEY', payload.keyName || ''],
      ['INITIALKEY', payload.camelot || ''],
      ['CAMELOT', payload.camelot || ''],
      ['BPM', payload.bpm != null ? payload.bpm.toFixed(2) : ''],
      ['PRODUCER', payload.producer],
    ].filter((pair): pair is [string, string] => Boolean(pair[1]));
    const vendor = Buffer.from('AwkBeats Prep Station', 'utf8');
    const chunks: Buffer[] = [this.u32(vendor.length, true), vendor, this.u32(pairs.length, true)];
    for (const [key, value] of pairs) {
      const line = Buffer.from(`${key}=${value}`, 'utf8');
      chunks.push(this.u32(line.length, true), line);
    }
    return Buffer.concat(chunks);
  }

  private static flacPicture(payload: TagPayload): Buffer {
    const art = payload.artwork;
    if (!art) return Buffer.alloc(0);
    const mime = Buffer.from(art.mime, 'ascii');
    const description = Buffer.from('Cover', 'utf8');
    return Buffer.concat([
      this.u32(3, false),
      this.u32(mime.length, false),
      mime,
      this.u32(description.length, false),
      description,
      this.u32(art.width, false),
      this.u32(art.height, false),
      this.u32(24, false),
      this.u32(0, false),
      this.u32(art.data.length, false),
      art.data,
    ]);
  }

  private static readChunks(buffer: Buffer, start: number, littleEndian: boolean): RiffChunk[] {
    const chunks: RiffChunk[] = [];
    let offset = start;
    while (offset + 8 <= buffer.length) {
      const id = buffer.toString('latin1', offset, offset + 4);
      const size = littleEndian ? buffer.readUInt32LE(offset + 4) : buffer.readUInt32BE(offset + 4);
      const dataStart = offset + 8;
      const dataEnd = Math.min(buffer.length, dataStart + size);
      chunks.push({ id, data: Buffer.from(buffer.subarray(dataStart, dataEnd)) });
      offset = dataStart + size + (size % 2);
    }
    return chunks;
  }

  private static packRiff(form: string, chunks: RiffChunk[], littleEndian: boolean): Buffer {
    const bodies = chunks.map((chunk) => {
      const header = Buffer.alloc(8);
      header.write(chunk.id, 0, 'latin1');
      if (littleEndian) header.writeUInt32LE(chunk.data.length, 4);
      else header.writeUInt32BE(chunk.data.length, 4);
      const pad = chunk.data.length % 2 === 1 ? Buffer.alloc(1) : Buffer.alloc(0);
      return Buffer.concat([header, chunk.data, pad]);
    });
    const body = Buffer.concat(bodies);
    const header = Buffer.alloc(12);
    header.write(littleEndian ? 'RIFF' : 'FORM', 0, 'latin1');
    const formSize = 4 + body.length;
    if (littleEndian) header.writeUInt32LE(formSize, 4);
    else header.writeUInt32BE(formSize, 4);
    header.write(form, 8, 'latin1');
    return Buffer.concat([header, body]);
  }

  private static readFlacBlocks(buffer: Buffer): { blocks: { type: number; data: Buffer }[]; audio: Buffer } {
    const blocks: { type: number; data: Buffer }[] = [];
    let offset = 4;
    while (offset + 4 <= buffer.length) {
      const header = buffer[offset];
      const type = header & 0x7f;
      const size = (buffer[offset + 1] << 16) | (buffer[offset + 2] << 8) | buffer[offset + 3];
      const dataStart = offset + 4;
      const dataEnd = dataStart + size;
      if (dataEnd > buffer.length) throw new Error('FLAC metadata is truncated.');
      blocks.push({ type, data: Buffer.from(buffer.subarray(dataStart, dataEnd)) });
      offset = dataEnd;
      if (header & 0x80) return { blocks, audio: Buffer.from(buffer.subarray(offset)) };
    }
    throw new Error('FLAC metadata has no final block.');
  }

  private static u32(value: number, littleEndian: boolean): Buffer {
    const buffer = Buffer.alloc(4);
    if (littleEndian) buffer.writeUInt32LE(value);
    else buffer.writeUInt32BE(value);
    return buffer;
  }
}
