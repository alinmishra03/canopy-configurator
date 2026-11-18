import { useEffect, useState } from 'react';

/**
 * Decoded-image cache shared by the 2D editor, 3D textures and PDF export so
 * each uploaded asset is decoded once.
 */
const cache = new Map<string, HTMLImageElement>();
const pending = new Map<string, Promise<HTMLImageElement>>();

export function getLoadedImage(src: string): HTMLImageElement | null {
  return cache.get(src) ?? null;
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  const cached = cache.get(src);
  if (cached) return Promise.resolve(cached);
  const inFlight = pending.get(src);
  if (inFlight) return inFlight;
  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      cache.set(src, img);
      pending.delete(src);
      resolve(img);
    };
    img.onerror = () => {
      pending.delete(src);
      reject(new Error('Image failed to load'));
    };
    img.src = src;
  });
  pending.set(src, promise);
  return promise;
}

/** Ensures all sources are decoded; resolves with the ones that succeeded. */
export async function preloadImages(sources: string[]): Promise<void> {
  await Promise.allSettled(sources.map(loadImage));
}

export function useLoadedImage(src: string | undefined): HTMLImageElement | null {
  const [image, setImage] = useState<HTMLImageElement | null>(() => (src ? getLoadedImage(src) : null));
  useEffect(() => {
    if (!src) {
      setImage(null);
      return;
    }
    let active = true;
    const cached = getLoadedImage(src);
    if (cached) {
      setImage(cached);
      return;
    }
    loadImage(src)
      .then((img) => active && setImage(img))
      .catch(() => active && setImage(null));
    return () => {
      active = false;
    };
  }, [src]);
  return image;
}
