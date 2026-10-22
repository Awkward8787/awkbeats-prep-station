export type CropFrame = { x: number; y: number; side: number };

/** Square crop math for cover art. Zoom 1 is the largest square that fits in the image. */
export class SquareCrop {
  static readonly exportSizes = [1500, 3000] as const;

  static frame(imageWidth: number, imageHeight: number, zoom: number, offsetX: number, offsetY: number): CropFrame {
    if (imageWidth < 1 || imageHeight < 1) throw new Error('Image has no pixels.');
    const z = Math.min(6, Math.max(1, zoom));
    const side = Math.min(imageWidth, imageHeight) / z;
    const maxX = Math.max(0, imageWidth - side);
    const maxY = Math.max(0, imageHeight - side);
    return {
      x: Math.min(maxX, Math.max(0, offsetX)),
      y: Math.min(maxY, Math.max(0, offsetY)),
      side,
    };
  }
}
