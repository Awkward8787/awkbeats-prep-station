import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { IconAssets } from '../src/core/brand/IconAssets';

const root = path.resolve(__dirname, '..');

describe('AwkBeats icon assets', () => {
  it('ships the iOS icon for every installer target and the transparent logo for the window', () => {
    IconAssets.assertPresent(root);
    const files = IconAssets.rootFiles(root);
    expect(IconAssets.icoSizesIn(fs.readFileSync(files.ico))).toEqual(IconAssets.icoSizes);
    expect(IconAssets.icnsTypesIn(fs.readFileSync(files.icns))).toEqual(IconAssets.icnsTypes);
  });
});
