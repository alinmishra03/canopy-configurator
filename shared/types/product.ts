/**
 * Product catalog types. A Product describes *what can be configured*;
 * it never holds a customer's choices (see ProductConfiguration).
 * The model is product-agnostic so more products can be added to the catalog
 * registry without changing the configurator engine.
 */

/** Unique identifier for a printable surface on a product (e.g. "roof-front"). */
export type PanelId = string;

export type PanelShape = 'rect' | 'triangle';

export type PanelGroup = 'roof' | 'valance' | 'sideWall' | 'halfWall';

/** A reference to one or more variants of a section; used for panel availability and rules. */
export interface VariantCondition {
  sectionId: string;
  variantIds: string[];
}

/** A printable/colorable surface. Dimensions are the physical print area in inches. */
export interface PanelDefinition {
  id: PanelId;
  label: string;
  group: PanelGroup;
  shape: PanelShape;
  widthIn: number;
  heightIn: number;
  /** Panel only exists when ALL conditions match. Omitted = always present. */
  requires?: VariantCondition[];
  /** Variants for which this panel is printed on both faces. */
  doubleSidedWhen?: VariantCondition;
}

/** A line in the price book a variant consumes (see shared/pricing/priceBook.ts). */
export interface VariantPriceComponent {
  sku: string;
  quantity: number;
}

/** A selectable option inside a section, e.g. "Three 10ft Side Walls - Double Sided Print". */
export interface ProductVariant {
  id: string;
  label: string;
  shortLabel: string;
  description?: string;
  /** Priced components; resolved against the server-owned price book. */
  pricing: VariantPriceComponent[];
  /** Structured attributes consumed by renderers (frame type, wall count, ...). */
  attributes: Record<string, string | number | boolean>;
}

/** A single-choice option group, e.g. Size / Side Walls / Half Walls. */
export interface ProductSection {
  id: string;
  label: string;
  description?: string;
  required: boolean;
  defaultVariantId: string;
  variants: ProductVariant[];
}

/**
 * Mutual-exclusion rule. When `when` matches, `disallow` variants are invalid.
 * The UI auto-resolves conflicts by resetting the other section to `resolveTo`;
 * the server rejects configurations that still violate a rule.
 */
export interface ConfigurationRule {
  id: string;
  when: VariantCondition;
  disallow: VariantCondition;
  resolveTo: string;
  message: string;
}

export type CustomizationKind = 'panelColor' | 'artworkUpload' | 'text';

/** A design capability offered on the product and how it is priced. */
export interface Customization {
  kind: CustomizationKind;
  label: string;
  description: string;
  /** Price-book SKU charged for this customization, if any. */
  pricingSku?: string;
}

export interface ColorSwatch {
  name: string;
  hex: string;
}

export interface ProductLimits {
  maxElementsPerPanel: number;
  maxTextLength: number;
  maxUploadBytes: number;
  maxAssets: number;
  acceptedMimeTypes: string[];
}

export interface Product {
  id: string;
  handle: string;
  name: string;
  description: string;
  sections: ProductSection[];
  panels: PanelDefinition[];
  rules: ConfigurationRule[];
  customizations: Customization[];
  palette: ColorSwatch[];
  fonts: string[];
  defaultColor: string;
  quantity: { min: number; max: number };
  limits: ProductLimits;
}
