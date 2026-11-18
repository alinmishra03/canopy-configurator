import { priceBook } from './priceBook';

/**
 * Maps every priced SKU to a Shopify ProductVariant GID.
 *
 * Shopify's Storefront API cannot set arbitrary line prices, so each priced
 * component of a configuration is represented by a real variant whose price in
 * Shopify equals the price-book price (canopy top, frame, wall, print, setup
 * fees...). A configured canopy therefore becomes a *bundle* of cart lines that
 * share one `_configuration_id` attribute.
 *
 * In mock mode the GIDs are clearly fake ("gid://shopify/ProductVariant/MOCK-...").
 * For a live store, provide SHOPIFY_VARIANT_MAP as JSON: {"CAN-TOP-10":"gid://shopify/ProductVariant/123", ...}
 */
export type VariantMap = Record<string, string>;

export function mockVariantMap(): VariantMap {
  return Object.fromEntries(
    Object.keys(priceBook.options).map((sku) => [sku, `gid://shopify/ProductVariant/MOCK-${sku}`]),
  );
}

export function loadVariantMap(raw: string | undefined): VariantMap {
  if (!raw) return mockVariantMap();
  const parsed = JSON.parse(raw) as unknown;
  if (typeof parsed !== 'object' || parsed === null) throw new Error('SHOPIFY_VARIANT_MAP must be a JSON object');
  const map = parsed as Record<string, unknown>;
  const missing = Object.keys(priceBook.options).filter((sku) => typeof map[sku] !== 'string');
  if (missing.length) throw new Error(`SHOPIFY_VARIANT_MAP is missing SKUs: ${missing.join(', ')}`);
  return map as VariantMap;
}
