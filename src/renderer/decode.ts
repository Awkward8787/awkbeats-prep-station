import { PcmDecoder } from '@core/audio/PcmDecoder';
import type { AudioFormat } from '@core/library/types';

export class WebAudioDecode {
  static async decode(bytes: Uint8Array, format: AudioFormat): Promise<{ samples: Float32Array; sampleRate: number }> {
    if (format === 'wav' || format === 'aiff') {
      const decoded = PcmDecoder.decode(bytes);
      return { samples: decoded.samples, sampleRate: decoded.sampleRate };
    }
    const copy = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    const context = new AudioContext();
    try {
      const audio = await context.decodeAudioData(copy);
      const samples = new Float32Array(audio.length);
      for (let channel = 0; channel < audio.numberOfChannels; channel++) {
        const data = audio.getChannelData(channel);
        for (let i = 0; i < audio.length; i++) samples[i] += data[i];
      }
      if (audio.numberOfChannels > 1) {
        const scale = 1 / audio.numberOfChannels;
        for (let i = 0; i < samples.length; i++) samples[i] *= scale;
      }
      return { samples, sampleRate: audio.sampleRate };
    } finally {
      await context.close();
    }
  }
}
