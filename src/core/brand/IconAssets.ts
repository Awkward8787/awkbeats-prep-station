import fs from 'node:fs';
import path from 'node:path';

/** Installer and in-app mark files. The iOS icon is opaque; the logo is the transparent mark. */
export class IconAssets {
  static readonly icoSizes = [16, 24, 32, 48, 64, 128, 256];
  static readonly linuxSizes = [16, 24, 32, 48, 64, 128, 256, 512, 1024];
  static readonly icnsTypes = ['icp4', 'icp5', 'ic11', 'icp6', 'ic12', 'ic07', 'ic08', 'ic13', 'ic09', 'ic14', 'ic10'];

  static rootFiles(repoRoot: string): { icon: string; logo: string; ico: string; icns: string } {
    return {
      icon: path.join(repoRoot, 'build', 'icon.png'),
      logo: path.join(repoRoot, 'build', 'logo.png'),
      ico: path.join(repoRoot, 'build', 'icon.ico'),
      icns: path.join(repoRoot, 'build', 'icon.icns'),
    };
  }

  static linuxPath(repoRoot: string, size: number): string {
    return path.join(repoRoot, 'build', 'icons', `${size}x${size}.png`);
  }

  static icoSizesIn(buffer: Buffer): number[] {
    if (buffer.length < 6 || buffer.readUInt16LE(0) !== 0 || buffer.readUInt16LE(2) !== 1) {
      throw new Error('icon.ico is not an ICO file.');
    }
    const count = buffer.readUInt16LE(4);
    const sizes: number[] = [];
    for (let index = 0; index < count; index += 1) {
      const at = 6 + index * 16;
      if (at + 16 > buffer.length) throw new Error('icon.ico directory is truncated.');
      const width = buffer[at] === 0 ? 256 : buffer[at];
      sizes.push(width);
    }
    return sizes;
  }

  static icnsTypesIn(buffer: Buffer): string[] {
    if (buffer.length < 8 || buffer.toString('ascii', 0, 4) !== 'icns') {
      throw new Error('icon.icns is not an ICNS file.');
    }
    const declared = buffer.readUInt32BE(4);
    if (declared !== buffer.length) throw new Error('icon.icns length does not match its header.');
    const types: string[] = [];
    let offset = 8;
    while (offset + 8 <= buffer.length) {
      const type = buffer.toString('ascii', offset, offset + 4);
      const length = buffer.readUInt32BE(offset + 4);
      if (length < 8 || offset + length > buffer.length) throw new Error(`icon.icns chunk ${type} is truncated.`);
      types.push(type);
      offset += length;
    }
    return types;
  }

  static pngSize(buffer: Buffer): { width: number; height: number; colorType: number } {
    if (buffer.length < 26 || buffer.toString('ascii', 1, 4) !== 'PNG') throw new Error('Not a PNG.');
    return {
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20),
      colorType: buffer[25],
    };
  }

  /** Throws when an installer or in-app mark is missing or the wrong shape. */
  static assertPresent(repoRoot: string): void {
    const files = this.rootFiles(repoRoot);
    const icon = fs.readFileSync(files.icon);
    const iconSize = this.pngSize(icon);
    if (iconSize.width !== 1024 || iconSize.height !== 1024) {
      throw new Error('build/icon.png must be 1024×1024.');
    }
    const logo = fs.readFileSync(files.logo);
    const logoSize = this.pngSize(logo);
    if (logoSize.width !== 1024 || logoSize.height !== 1024 || logoSize.colorType !== 6) {
      throw new Error('build/logo.png must be a 1024×1024 PNG with an alpha channel.');
    }
    const ico = this.icoSizesIn(fs.readFileSync(files.ico));
    for (const size of this.icoSizes) {
      if (!ico.includes(size)) throw new Error(`build/icon.ico is missing the ${size}px image.`);
    }
    const icns = this.icnsTypesIn(fs.readFileSync(files.icns));
    for (const type of this.icnsTypes) {
      if (!icns.includes(type)) throw new Error(`build/icon.icns is missing ${type}.`);
    }
    for (const size of this.linuxSizes) {
      const file = this.linuxPath(repoRoot, size);
      const png = this.pngSize(fs.readFileSync(file));
      if (png.width !== size || png.height !== size) {
        throw new Error(`${path.basename(file)} is ${png.width}×${png.height}.`);
      }
    }
    if (fs.existsSync(path.join(repoRoot, 'build', 'icon.svg'))) {
      throw new Error('build/icon.svg is the retired AJ mark and must not be shipped.');
    }
  }
}
