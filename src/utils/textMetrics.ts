export const TEXT_LINE_HEIGHT = 1.15;

export interface TextBlockMetrics {
  lines: string[];
  width: number;
  height: number;
  lineHeightPx: number;
}

let measureCtx: CanvasRenderingContext2D | null = null;

export function fontString(fontFamily: string, fontWeight: number, fontPx: number): string {
  return `${fontWeight} ${fontPx}px "${fontFamily}", sans-serif`;
}

/**
 * Measures a (possibly multi-line) text block with the same canvas metrics used
 * by the Konva editor and the texture renderer, so both place text identically.
 */
export function measureTextBlock(
  text: string,
  fontFamily: string,
  fontWeight: number,
  fontPx: number,
): TextBlockMetrics {
  const lines = text.split('\n');
  const lineHeightPx = fontPx * TEXT_LINE_HEIGHT;
  if (!measureCtx) measureCtx = document.createElement('canvas').getContext('2d');
  let width = 0;
  if (measureCtx) {
    measureCtx.font = fontString(fontFamily, fontWeight, fontPx);
    for (const line of lines) width = Math.max(width, measureCtx.measureText(line).width);
  } else {
    width = Math.max(...lines.map((l) => l.length)) * fontPx * 0.55;
  }
  return { lines, width: Math.max(width, fontPx * 0.3), height: lines.length * lineHeightPx, lineHeightPx };
}
