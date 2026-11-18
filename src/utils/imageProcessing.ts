import type { Product, UploadedAsset } from '@shared/types';
import { createId } from '@shared/utils/id';
import { MAX_ASSET_DIMENSION } from '@/config/product';

export class UploadError extends Error {}

function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new UploadError('Could not read the file.'));
    reader.readAsDataURL(file);
  });
}

function decode(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new UploadError('The file is not a readable image.'));
    img.src = src;
  });
}

/** Approximate decoded byte size of a data URL. */
function dataUrlBytes(dataUrl: string): number {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  return Math.floor((base64.length * 3) / 4);
}

/**
 * Validates and optimizes an uploaded logo:
 *  - checks type and size against product limits
 *  - rasterizes SVG (so canvas, Three.js and jsPDF can all use it)
 *  - downscales to MAX_ASSET_DIMENSION, keeping PNG for transparency, JPEG for photos
 */
export async function processUpload(file: File, product: Product): Promise<UploadedAsset> {
  const { acceptedMimeTypes, maxUploadBytes } = product.limits;
  if (!acceptedMimeTypes.includes(file.type)) {
    throw new UploadError('Please upload a PNG, JPG, WebP or SVG image.');
  }
  if (file.size > maxUploadBytes) {
    throw new UploadError(`Images must be smaller than ${Math.round(maxUploadBytes / 1024 / 1024)} MB.`);
  }

  const source = await readAsDataUrl(file);
  const img = await decode(source);
  const naturalW = img.naturalWidth || 1000;
  const naturalH = img.naturalHeight || 1000;
  // SVGs may have no intrinsic size; rasterize them at full resolution.
  const isSvg = file.type === 'image/svg+xml';
  const scale = isSvg
    ? MAX_ASSET_DIMENSION / Math.max(naturalW, naturalH)
    : Math.min(1, MAX_ASSET_DIMENSION / Math.max(naturalW, naturalH));
  const width = Math.max(1, Math.round(naturalW * scale));
  const height = Math.max(1, Math.round(naturalH * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new UploadError('Your browser could not process this image.');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, width, height);

  const outputType = file.type === 'image/jpeg' ? 'image/jpeg' : 'image/png';
  const dataUrl = canvas.toDataURL(outputType, 0.9);

  return {
    id: createId('asset'),
    name: file.name.slice(0, 120),
    mimeType: outputType,
    width,
    height,
    byteSize: dataUrlBytes(dataUrl),
    dataUrl,
  };
}
