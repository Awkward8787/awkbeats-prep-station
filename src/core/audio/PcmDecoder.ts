export type DecodedAudio = {
  samples: Float32Array;
  sampleRate: number;
  channels: number;
  durationSec: number;
};

/** WAV and AIFF PCM decoder and encoder. Pure typed arrays so it runs in Node and the renderer. */
export class PcmDecoder {
  static decode(bytes: Uint8Array): DecodedAudio {
    if (bytes.length >= 12 && this.ascii(bytes, 0, 4) === 'RIFF' && this.ascii(bytes, 8, 12) === 'WAVE') {
      return this.decodeWav(bytes);
    }
    if (bytes.length >= 12 && this.ascii(bytes, 0, 4) === 'FORM') {
      const form = this.ascii(bytes, 8, 12);
      if (form === 'AIFF' || form === 'AIFC') return this.decodeAiff(bytes);
    }
    throw new Error('Only WAV and AIFF can be decoded with the built-in reader.');
  }

  static encodeWav(samples: Float32Array, sampleRate: number): Uint8Array {
    const dataSize = samples.length * 2;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);
    this.writeAscii(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    this.writeAscii(view, 8, 'WAVE');
    this.writeAscii(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    this.writeAscii(view, 36, 'data');
    view.setUint32(40, dataSize, true);
    let offset = 44;
    for (let i = 0; i < samples.length; i++) {
      const clamped = Math.max(-1, Math.min(1, samples[i]));
      const quantized = Math.max(-32768, Math.min(32767, Math.round(clamped * 32768)));
      view.setInt16(offset, quantized, true);
      offset += 2;
    }
    return new Uint8Array(buffer);
  }

  static encodeAiff(samples: Float32Array, sampleRate: number): Uint8Array {
    const dataSize = samples.length * 2;
    const ssndSize = 8 + dataSize;
    const commSize = 18;
    const formSize = 4 + (8 + commSize) + (8 + ssndSize);
    const buffer = new ArrayBuffer(8 + formSize);
    const view = new DataView(buffer);
    this.writeAscii(view, 0, 'FORM');
    view.setUint32(4, formSize, false);
    this.writeAscii(view, 8, 'AIFF');
    this.writeAscii(view, 12, 'COMM');
    view.setUint32(16, commSize, false);
    view.setInt16(20, 1, false);
    view.setUint32(22, samples.length, false);
    view.setInt16(26, 16, false);
    this.writeExtended80(view, 28, sampleRate);
    this.writeAscii(view, 38, 'SSND');
    view.setUint32(42, ssndSize, false);
    view.setUint32(46, 0, false);
    view.setUint32(50, 0, false);
    let offset = 54;
    for (let i = 0; i < samples.length; i++) {
      const clamped = Math.max(-1, Math.min(1, samples[i]));
      const quantized = Math.max(-32768, Math.min(32767, Math.round(clamped * 32768)));
      view.setInt16(offset, quantized, false);
      offset += 2;
    }
    return new Uint8Array(buffer);
  }

  private static decodeWav(bytes: Uint8Array): DecodedAudio {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let format = 1;
    let channels = 1;
    let sampleRate = 44100;
    let bits = 16;
    let data: Uint8Array | null = null;
    let offset = 12;
    while (offset + 8 <= bytes.length) {
      const id = this.ascii(bytes, offset, offset + 4);
      const size = view.getUint32(offset + 4, true);
      const start = offset + 8;
      const end = Math.min(bytes.length, start + size);
      if (id === 'fmt ' && end - start >= 16) {
        format = view.getUint16(start, true);
        channels = view.getUint16(start + 2, true);
        sampleRate = view.getUint32(start + 4, true);
        bits = view.getUint16(start + 14, true);
        if (format === 0xfffe && end - start >= 40) {
          format = view.getUint16(start + 24, true);
        }
      } else if (id === 'data') {
        data = bytes.subarray(start, end);
      }
      offset = start + size + (size % 2);
    }
    if (!data || channels < 1 || sampleRate < 1000) throw new Error('This WAV file has no audio data.');
    const samples = this.pcmToMono(data, channels, bits, format === 3, true);
    return { samples, sampleRate, channels, durationSec: samples.length / sampleRate };
  }

  private static decodeAiff(bytes: Uint8Array): DecodedAudio {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let channels = 1;
    let sampleRate = 44100;
    let bits = 16;
    let littleEndian = false;
    let data: Uint8Array | null = null;
    let offset = 12;
    while (offset + 8 <= bytes.length) {
      const id = this.ascii(bytes, offset, offset + 4);
      const size = view.getUint32(offset + 4, false);
      const start = offset + 8;
      const end = Math.min(bytes.length, start + size);
      if (id === 'COMM' && end - start >= 18) {
        channels = view.getInt16(start, false);
        bits = view.getInt16(start + 6, false);
        sampleRate = this.readExtended80(view, start + 8);
        if (end - start >= 22) {
          const compression = this.ascii(bytes, start + 18, start + 22);
          if (compression === 'sowt') littleEndian = true;
          else if (compression !== 'NONE' && compression !== 'none' && compression !== 'twos') {
            throw new Error(`Compressed AIFF (${compression}) is not supported.`);
          }
        }
      } else if (id === 'SSND' && end - start >= 8) {
        const dataOffset = view.getUint32(start, false);
        data = bytes.subarray(start + 8 + dataOffset, end);
      }
      offset = start + size + (size % 2);
    }
    if (!data || channels < 1) throw new Error('This AIFF file has no audio data.');
    const samples = this.pcmToMono(data, channels, bits, false, littleEndian);
    return { samples, sampleRate: Math.round(sampleRate), channels, durationSec: samples.length / Math.round(sampleRate) };
  }

  private static pcmToMono(data: Uint8Array, channels: number, bits: number, float: boolean, littleEndian: boolean): Float32Array {
    const bytesPerSample = bits / 8;
    if (![2, 3, 4].includes(bytesPerSample)) throw new Error(`Unsupported bit depth: ${bits}.`);
    const frameSize = bytesPerSample * channels;
    const frames = Math.floor(data.length / frameSize);
    const out = new Float32Array(frames);
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    for (let i = 0; i < frames; i++) {
      let sum = 0;
      for (let c = 0; c < channels; c++) {
        const offset = i * frameSize + c * bytesPerSample;
        sum += this.readSample(view, offset, bits, float, littleEndian);
      }
      out[i] = sum / channels;
    }
    return out;
  }

  private static readSample(view: DataView, offset: number, bits: number, float: boolean, littleEndian: boolean): number {
    if (float && bits === 32) return view.getFloat32(offset, littleEndian);
    if (bits === 16) return view.getInt16(offset, littleEndian) / 32768;
    if (bits === 32) return view.getInt32(offset, littleEndian) / 2147483648;
    if (bits === 24) {
      let value: number;
      if (littleEndian) {
        value = view.getUint8(offset) | (view.getUint8(offset + 1) << 8) | (view.getUint8(offset + 2) << 16);
      } else {
        value = (view.getUint8(offset) << 16) | (view.getUint8(offset + 1) << 8) | view.getUint8(offset + 2);
      }
      if (value & 0x800000) value |= ~0xffffff;
      return value / 8388608;
    }
    throw new Error(`Unsupported sample format (${bits}-bit).`);
  }

  private static readExtended80(view: DataView, offset: number): number {
    const exponent = ((view.getUint8(offset) & 0x7f) << 8) | view.getUint8(offset + 1);
    const sign = view.getUint8(offset) & 0x80;
    let mantissa = 0;
    for (let i = 0; i < 8; i++) mantissa = mantissa * 256 + view.getUint8(offset + 2 + i);
    if (exponent === 0 && mantissa === 0) return 0;
    const value = mantissa * 2 ** (exponent - 16383 - 63);
    return sign ? -value : value;
  }

  private static writeExtended80(view: DataView, offset: number, value: number): void {
    if (value === 0) {
      for (let i = 0; i < 10; i++) view.setUint8(offset + i, 0);
      return;
    }
    const sign = value < 0 ? 0x8000 : 0;
    let v = Math.abs(value);
    let exponent = 16383;
    while (v >= 2) {
      v /= 2;
      exponent += 1;
    }
    while (v < 1) {
      v *= 2;
      exponent -= 1;
    }
    view.setUint16(offset, sign | exponent, false);
    let mantissa = Math.round(v * 2 ** 63);
    for (let i = 7; i >= 0; i--) {
      view.setUint8(offset + 2 + i, mantissa % 256);
      mantissa = Math.floor(mantissa / 256);
    }
  }

  private static ascii(bytes: Uint8Array, start: number, end: number): string {
    let out = '';
    for (let i = start; i < end; i++) out += String.fromCharCode(bytes[i]);
    return out;
  }

  private static writeAscii(view: DataView, offset: number, text: string): void {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  }
}
