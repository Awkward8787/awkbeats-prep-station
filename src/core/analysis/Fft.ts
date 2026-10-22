/** In-place radix-2 complex FFT. Input length must be a power of two. */
export class Fft {
  static magnitudes(frame: ArrayLike<number>): Float64Array {
    const n = frame.length;
    if (n < 2 || (n & (n - 1)) !== 0) {
      throw new Error(`FFT length must be a power of two, received ${n}`);
    }
    const re = new Float64Array(n);
    const im = new Float64Array(n);
    for (let i = 0; i < n; i++) re[i] = frame[i];
    this.transform(re, im);
    const mag = new Float64Array(n / 2 + 1);
    for (let i = 0; i < mag.length; i++) mag[i] = Math.hypot(re[i], im[i]);
    return mag;
  }

  static transform(re: Float64Array, im: Float64Array): void {
    const n = re.length;
    for (let i = 1, j = 0; i < n; i++) {
      let bit = n >> 1;
      for (; (j & bit) !== 0; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) {
        const tr = re[i];
        re[i] = re[j];
        re[j] = tr;
        const ti = im[i];
        im[i] = im[j];
        im[j] = ti;
      }
    }
    for (let len = 2; len <= n; len <<= 1) {
      const ang = (-2 * Math.PI) / len;
      const wlenRe = Math.cos(ang);
      const wlenIm = Math.sin(ang);
      for (let i = 0; i < n; i += len) {
        let wRe = 1;
        let wIm = 0;
        const half = len >> 1;
        for (let j = 0; j < half; j++) {
          const uRe = re[i + j];
          const uIm = im[i + j];
          const vRe = re[i + j + half] * wRe - im[i + j + half] * wIm;
          const vIm = re[i + j + half] * wIm + im[i + j + half] * wRe;
          re[i + j] = uRe + vRe;
          im[i + j] = uIm + vIm;
          re[i + j + half] = uRe - vRe;
          im[i + j + half] = uIm - vIm;
          const nextRe = wRe * wlenRe - wIm * wlenIm;
          wIm = wRe * wlenIm + wIm * wlenRe;
          wRe = nextRe;
        }
      }
    }
  }
}
