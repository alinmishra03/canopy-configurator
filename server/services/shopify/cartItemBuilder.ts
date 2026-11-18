import type { CartAttribute, CartItem, CartLineDraft, Product, ProductConfiguration, Quote } from '@shared/types';
import { describePanels, describeSelections, getPrintedAssetIds } from '@shared/configuration';
import { createId } from '@shared/utils/id';
import type { VariantMap } from '../../config/shopifyVariantMap';

export const CONFIG_ATTRIBUTE = '_configuration_id';
export const BUNDLE_ROLE_ATTRIBUTE = '_bundle_role';

/**
 * Converts a validated configuration + authoritative quote into Shopify cart lines.
 * Visible attributes (no leading underscore) appear on the order for production staff;
 * underscore-prefixed attributes are hidden from customers in Shopify themes.
 */
export function buildCartItem(
  product: Product,
  configuration: ProductConfiguration,
  quote: Quote,
  variantMap: VariantMap,
  publicConfigUrl: string,
): CartItem {
  const panels = describePanels(product, configuration);
  const summary: CartAttribute[] = [
    ...describeSelections(product, configuration).map((row) => ({ key: row.label, value: row.value })),
    { key: 'Canopy Color', value: configuration.colors.base.toUpperCase() },
    {
      key: 'Custom Panels',
      value:
        panels
          .filter((p) => p.colorOverridden || p.texts.length || p.imageNames.length)
          .map((p) => p.label)
          .join(', ') || 'None',
    },
    { key: 'Artwork Files', value: String(getPrintedAssetIds(product, configuration).length) },
    { key: 'Configuration', value: configuration.id },
  ];

  const hidden: CartAttribute[] = [
    { key: CONFIG_ATTRIBUTE, value: configuration.id },
    { key: '_configuration_url', value: publicConfigUrl },
    { key: '_price_book', value: quote.priceBookVersion },
  ];

  const lines: CartLineDraft[] = quote.lines.map((line, index) => {
    const merchandiseId = variantMap[line.sku];
    if (!merchandiseId) throw new Error(`No Shopify variant mapped for SKU ${line.sku}`);
    const isPrimary = index === 0;
    return {
      sku: line.sku,
      merchandiseId,
      quantity: line.quantity * quote.quantity,
      attributes: isPrimary
        ? [...summary, ...hidden, { key: BUNDLE_ROLE_ATTRIBUTE, value: 'primary' }]
        : [...hidden, { key: BUNDLE_ROLE_ATTRIBUTE, value: 'component' }],
    };
  });

  return {
    id: createId('item'),
    configurationId: configuration.id,
    productId: product.id,
    title: product.name,
    quantity: quote.quantity,
    unitPrice: quote.unitPrice,
    total: quote.total,
    summary,
    lines,
  };
}

/** Variables for Storefront `CartLineInput[]`. */
export function toStorefrontLines(item: CartItem) {
  return item.lines.map((l) => ({ merchandiseId: l.merchandiseId, quantity: l.quantity, attributes: l.attributes }));
}
