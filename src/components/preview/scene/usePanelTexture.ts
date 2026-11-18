import { useEffect, useMemo } from 'react';
import { CanvasTexture, SRGBColorSpace } from 'three';
import { useThree } from '@react-three/fiber';
import type { PanelDefinition } from '@shared/types';
import { useAssets, usePanelColor, usePanelElements } from '@/store/selectors';
import { useUiStore } from '@/store/uiStore';
import { drawPanel, panelPixelSize } from '@/utils/panelRenderer';
import { loadImage } from '@/utils/imageCache';
import { PIXELS_PER_INCH } from '@/config/product';

/**
 * A live CanvasTexture for one panel, redrawn whenever that panel's color,
 * elements or referenced assets change in the shared configuration store.
 */
export function usePanelTexture(panel: PanelDefinition): CanvasTexture {
  const invalidate = useThree((s) => s.invalidate);
  const maxAnisotropy = useThree((s) => s.gl.capabilities.getMaxAnisotropy());
  const color = usePanelColor(panel.id);
  const elements = usePanelElements(panel.id);
  const assets = useAssets();
  const fontsVersion = useUiStore((s) => s.fontsVersion);

  const texture = useMemo(() => {
    const { width, height } = panelPixelSize(panel, PIXELS_PER_INCH);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const tex = new CanvasTexture(canvas);
    tex.colorSpace = SRGBColorSpace;
    tex.anisotropy = Math.min(8, maxAnisotropy);
    return tex;
  }, [panel, maxAnisotropy]);

  useEffect(() => () => texture.dispose(), [texture]);

  useEffect(() => {
    let cancelled = false;
    const canvas = texture.image as HTMLCanvasElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const redraw = () => {
      if (cancelled) return;
      drawPanel(ctx, { panel, color, elements, assets }, canvas.width, canvas.height);
      texture.needsUpdate = true;
      invalidate();
    };
    redraw();
    // Draw again once any not-yet-decoded artwork becomes available.
    const sources = elements.flatMap((el) => {
      const src = el.type === 'image' ? assets[el.assetId]?.dataUrl : undefined;
      return src ? [src] : [];
    });
    if (sources.length) void Promise.allSettled(sources.map(loadImage)).then(redraw);
    return () => {
      cancelled = true;
    };
  }, [texture, panel, color, elements, assets, fontsVersion, invalidate]);

  return texture;
}
