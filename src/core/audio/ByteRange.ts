export type ByteSpan = { start: number; end: number };

/** Parses an HTTP Range header against a file size. */
export class ByteRange {
  static resolve(header: string | null, size: number): { kind: 'all' } | { kind: 'partial'; span: ByteSpan } | { kind: 'invalid' } {
    if (!header) return { kind: 'all' };
    const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
    if (!match || size <= 0 || (match[1] === '' && match[2] === '')) return { kind: 'invalid' };
    let start: number;
    let end: number;
    if (match[1] === '') {
      const suffix = Number(match[2]);
      if (!Number.isFinite(suffix) || suffix <= 0) return { kind: 'invalid' };
      start = Math.max(0, size - suffix);
      end = size - 1;
    } else {
      start = Number(match[1]);
      end = match[2] === '' ? size - 1 : Number(match[2]);
    }
    if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || start >= size || end < start) {
      return { kind: 'invalid' };
    }
    return { kind: 'partial', span: { start, end: Math.min(end, size - 1) } };
  }
}
