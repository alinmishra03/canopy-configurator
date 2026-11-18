import type { DesignElement, PanelDefinition, UploadedAsset } from '@shared/types';
import { fontString, measureTextBlock } from './textMetrics';
import { getLoadedImage } from './imageCache';

/**
 * Framework-free panel rasterizer. It is the single source of truth for how a
 * panel's color + design elements look as pixels, used by:
 *  - the Three.js CanvasTextures (3D preview)
 *  - the PDF panel previews
 * The Konva editor renders the same normalized data interactively.
 */

export interface PanelRenderInput {
  panel: PanelDefinition;
  color: string;
  elements: DesignElement[];
  assets: Record<string, UploadedAsset>;
}

/** Traces the panel outline in pixel space (triangle apex at top centre). */
export function tracePanelPath(
  ctx: Pick<CanvasRenderingContext2D, 'beginPath' | 'moveTo' | 'lineTo' | 'closePath' | 'rect'>,
  panel: PanelDefinition,
  width: number,
  height: number,
): void {
  ctx.beginPath();
  if (panel.shape === 'triangle') {
    ctx.moveTo(0, height);
    ctx.lineTo(width, height);
    ctx.lineTo(width / 2, 0);
    ctx.closePath();
  } else {
    ctx.rect(0, 0, width, height);
  }
}

/** Size of an image element in pixels for a panel rendered at width x height. */
export function imageElementSize(
  width: number,
  asset: UploadedAsset | undefined,
  panelWidthPx: number,
): { w: number; h: number } {
  const w = width * panelWidthPx;
  const ratio = asset && asset.width > 0 ? asset.height / asset.width : 1;
  return { w, h: w * ratio };
}

export function drawElement(
  ctx: CanvasRenderingContext2D,
  el: DesignElement,
  assets: Record<string, UploadedAsset>,
  width: number,
  height: number,
): void {
  ctx.save();
  ctx.translate(el.x * width, el.y * height);
  ctx.rotate((el.rotation * Math.PI) / 180);
  if (el.type === 'text') {
    const fontPx = el.fontSize * height;
    const metrics = measureTextBlock(el.text, el.fontFamily, el.fontWeight, fontPx);
    ctx.font = fontString(el.fontFamily, el.fontWeight, fontPx);
    ctx.fillStyle = el.color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    metrics.lines.forEach((line, i) => {
      const y = -metrics.height / 2 + metrics.lineHeightPx * (i + 0.5);
      ctx.fillText(line, 0, y);
    });
  } else {
    const asset = assets[el.assetId];
    const img = asset?.dataUrl ? getLoadedImage(asset.dataUrl) : null;
    if (img) {
      const { w, h } = imageElementSize(el.width, asset, width);
      ctx.drawImage(img, -w / 2, -h / 2, w, h);
    }
  }
  ctx.restore();
}

export function drawPanel(
  ctx: CanvasRenderingContext2D,
  input: PanelRenderInput,
  width: number,
  height: number,
  options: { outline?: boolean } = {},
): void {
  ctx.clearRect(0, 0, width, height);
  ctx.save();
  tracePanelPath(ctx, input.panel, width, height);
  ctx.fillStyle = input.color;
  ctx.fill();
  ctx.clip();
  for (const el of input.elements) drawElement(ctx, el, input.assets, width, height);
  ctx.restore();
  if (options.outline) {
    tracePanelPath(ctx, input.panel, width, height);
    ctx.strokeStyle = 'rgba(27,26,24,0.25)';
    ctx.lineWidth = Math.max(1, width / 400);
    ctx.stroke();
  }
}

export function panelPixelSize(panel: PanelDefinition, pixelsPerInch: number): { width: number; height: number } {
  return {
    width: Math.round(panel.widthIn * pixelsPerInch),
    height: Math.round(panel.heightIn * pixelsPerInch),
  };
}

/** Renders a panel to a new canvas (used for PDF previews). */
export function renderPanelToCanvas(
  input: PanelRenderInput,
  pixelsPerInch: number,
  options: { outline?: boolean } = {},
): HTMLCanvasElement {
  const { width, height } = panelPixelSize(input.panel, pixelsPerInch);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) drawPanel(ctx, input, width, height, options);
  return canvas;
}
