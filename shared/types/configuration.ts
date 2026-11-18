import type { PanelId } from './product';

/** Bump when the persisted shape changes; deserializeConfiguration() migrates older versions. */
export const CONFIGURATION_SCHEMA_VERSION = 1 as const;

/** An image the customer uploaded. `dataUrl` is omitted from pricing payloads. */
export interface UploadedAsset {
  id: string;
  name: string;
  mimeType: string;
  /** Pixel dimensions after client-side optimization. */
  width: number;
  height: number;
  byteSize: number;
  dataUrl?: string;
}

/**
 * Elements use panel-normalized coordinates so the same data drives the
 * Konva editor, the Three.js textures and the PDF at any resolution:
 *  - x, y: centre of the element, 0..1 across the panel width / height
 *  - rotation: degrees clockwise
 */
interface DesignElementBase {
  id: string;
  x: number;
  y: number;
  rotation: number;
}

export interface TextElement extends DesignElementBase {
  type: 'text';
  text: string;
  fontFamily: string;
  fontWeight: 400 | 700;
  /** Line height as a fraction of panel height. */
  fontSize: number;
  color: string;
}

export interface ImageElement extends DesignElementBase {
  type: 'image';
  assetId: string;
  /** Rendered width as a fraction of panel width; height follows the asset aspect ratio. */
  width: number;
}

export type DesignElement = TextElement | ImageElement;

export interface ConfigurationColors {
  /** Canopy color applied to every panel unless overridden. */
  base: string;
  /** Per-panel color overrides. */
  panels: Record<PanelId, string>;
}

/** The persistent, serializable customer configuration. No UI state lives here. */
export interface ProductConfiguration {
  schemaVersion: typeof CONFIGURATION_SCHEMA_VERSION;
  id: string;
  productId: string;
  /** sectionId -> variantId */
  selections: Record<string, string>;
  quantity: number;
  colors: ConfigurationColors;
  /** panelId -> elements, ordered bottom-most first */
  designs: Record<PanelId, DesignElement[]>;
  assets: Record<string, UploadedAsset>;
  createdAt: string;
  updatedAt: string;
}

export type IssueSeverity = 'error' | 'warning';

export interface ValidationIssue {
  code: string;
  severity: IssueSeverity;
  message: string;
  path?: string;
}
