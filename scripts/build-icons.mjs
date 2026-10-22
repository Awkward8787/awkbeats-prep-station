#!/usr/bin/env node
/**
 * Builds installer icons from build/icon.png (the iOS app icon)
 * and checks that build/logo.png (transparent mark) is present.
 * Outputs: build/icon.ico, build/icon.icns, build/icons/<size>x<size>.png
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const buildDir = path.join(root, 'build');
const source = path.join(buildDir, 'icon.png');
const logo = path.join(buildDir, 'logo.png');
const iconsDir = path.join(buildDir, 'icons');

const linuxSizes = [16, 24, 32, 48, 64, 128, 256, 512, 1024];
const icoSizes = [16, 24, 32, 48, 64, 128, 256];
/** PNG-in-ICNS types understood by macOS. Retina types repeat a size under a second code. */
const icnsTypes = [
  ['icp4', 16],
  ['icp5', 32],
  ['ic11', 32],
  ['icp6', 64],
  ['ic12', 64],
  ['ic07', 128],
  ['ic08', 256],
  ['ic13', 256],
  ['ic09', 512],
  ['ic14', 512],
  ['ic10', 1024],
];

function resize(size, dest) {
  execFileSync('convert', [source, '-filter', 'Lanczos', '-resize', `${size}x${size}`, dest], { stdio: 'inherit' });
}

function packIco(pngs) {
  const count = pngs.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);
  const entries = Buffer.alloc(16 * count);
  let offset = 6 + entries.length;
  const blobs = [];
  pngs.forEach((item, index) => {
    const at = index * 16;
    entries[at] = item.size >= 256 ? 0 : item.size;
    entries[at + 1] = item.size >= 256 ? 0 : item.size;
    entries.writeUInt16LE(1, at + 4);
    entries.writeUInt16LE(32, at + 6);
    entries.writeUInt32LE(item.png.length, at + 8);
    entries.writeUInt32LE(offset, at + 12);
    offset += item.png.length;
    blobs.push(item.png);
  });
  return Buffer.concat([header, entries, ...blobs]);
}

function packIcns(chunks) {
  const parts = chunks.map((chunk) => {
    const header = Buffer.alloc(8);
    header.write(chunk.type, 0, 4, 'ascii');
    header.writeUInt32BE(chunk.png.length + 8, 4);
    return Buffer.concat([header, chunk.png]);
  });
  const body = Buffer.concat(parts);
  const header = Buffer.alloc(8);
  header.write('icns', 0, 4, 'ascii');
  header.writeUInt32BE(body.length + 8, 4);
  return Buffer.concat([header, body]);
}

if (!fs.existsSync(source)) throw new Error('Missing build/icon.png');
if (!fs.existsSync(logo)) throw new Error('Missing build/logo.png');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'awkbeats-icons-'));
const pngBySize = new Map();
for (const size of linuxSizes) {
  const dest = path.join(tmp, `${size}.png`);
  resize(size, dest);
  pngBySize.set(size, fs.readFileSync(dest));
}

fs.mkdirSync(iconsDir, { recursive: true });
for (const size of linuxSizes) {
  fs.writeFileSync(path.join(iconsDir, `${size}x${size}.png`), pngBySize.get(size));
}

fs.writeFileSync(
  path.join(buildDir, 'icon.ico'),
  packIco(icoSizes.map((size) => ({ size, png: pngBySize.get(size) }))),
);
fs.writeFileSync(
  path.join(buildDir, 'icon.icns'),
  packIcns(icnsTypes.map(([type, size]) => ({ type, png: pngBySize.get(size) }))),
);
fs.rmSync(tmp, { recursive: true, force: true });
console.log('Wrote build/icon.ico, build/icon.icns, and build/icons/*.png');
