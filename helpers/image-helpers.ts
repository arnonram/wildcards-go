const MAX_PORTRAIT_DIMENSION = 512;
const PORTRAIT_QUALITY = 0.82;

/**
 * Downscale and center-crop a portrait before storing it as a data URL.
 * Full-size phone photos turn into multi-megabyte base64 strings, which
 * exceed the API body limit and are far larger than the portrait slots need.
 */
export async function fileToPortraitDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);

  try {
    const sourceSize = Math.min(bitmap.width, bitmap.height);
    const targetSize = Math.min(MAX_PORTRAIT_DIMENSION, sourceSize);
    const canvas = document.createElement('canvas');
    canvas.width = targetSize;
    canvas.height = targetSize;

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Could not create an image canvas.');
    }

    const sourceX = (bitmap.width - sourceSize) / 2;
    const sourceY = (bitmap.height - sourceSize) / 2;
    context.drawImage(
      bitmap,
      sourceX,
      sourceY,
      sourceSize,
      sourceSize,
      0,
      0,
      targetSize,
      targetSize,
    );

    return canvas.toDataURL('image/webp', PORTRAIT_QUALITY);
  } finally {
    bitmap.close();
  }
}
