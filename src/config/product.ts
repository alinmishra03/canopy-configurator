import { getProduct, DEFAULT_PRODUCT_ID } from '@shared/catalog';
import type { Product } from '@shared/types';

/**
 * Which product this configurator instance edits. An embed can choose another
 * catalog product with ?product=<id>; unknown ids fall back to the default.
 */
function resolveProduct(): Product {
  const requested =
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('product') : null;
  return (requested && getProduct(requested)) || (getProduct(DEFAULT_PRODUCT_ID) as Product);
}

export const activeProduct: Product = resolveProduct();

/** Texture/raster resolution used for 3D textures and PDF panel previews. */
export const PIXELS_PER_INCH = 10;

export const PANEL_GROUP_LABELS: Record<string, string> = {
  roof: 'Roof',
  valance: 'Valances',
  sideWall: 'Side Walls',
  halfWall: 'Half Walls',
};

export const STORAGE_KEYS = {
  draft: 'canopy-configurator:draft:v1',
  cartId: 'canopy-configurator:cart-id',
} as const;

/** Largest edge (px) uploaded artwork is downscaled to before it enters the configuration. */
export const MAX_ASSET_DIMENSION = 1600;
