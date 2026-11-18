import type {
  OptionPrices,
  PriceBook,
  Product,
  ProductConfiguration,
  Quote,
  QuoteLine,
  ValidationIssue,
} from '@shared/types';
import {
  getColorOverridePanelIds,
  getPrintedAssetIds,
  getSelectedVariant,
  hasBlockingIssues,
  validateConfiguration,
} from '@shared/configuration';

export class PriceBookError extends Error {}

function lineFor(priceBook: PriceBook, sku: string, quantity: number): QuoteLine {
  const option = priceBook.options[sku];
  if (!option) throw new PriceBookError(`Price book has no entry for SKU "${sku}"`);
  return {
    sku,
    label: option.label,
    category: option.category,
    unitPrice: option.unitPrice,
    quantity,
    amount: option.unitPrice * quantity,
  };
}

/** Merges lines with the same SKU (e.g. printing used by several variants). */
function mergeLines(lines: QuoteLine[]): QuoteLine[] {
  const bySku = new Map<string, QuoteLine>();
  for (const line of lines) {
    const existing = bySku.get(line.sku);
    if (existing) {
      existing.quantity += line.quantity;
      existing.amount += line.amount;
    } else {
      bySku.set(line.sku, { ...line });
    }
  }
  return [...bySku.values()];
}

/** Price of each variant (sum of its components) and each priced customization, in cents. */
export function getOptionPrices(product: Product, priceBook: PriceBook): OptionPrices {
  const variants: OptionPrices['variants'] = {};
  for (const section of product.sections) {
    variants[section.id] = Object.fromEntries(
      section.variants.map((v) => [
        v.id,
        v.pricing.reduce((sum, c) => sum + lineFor(priceBook, c.sku, c.quantity).amount, 0),
      ]),
    );
  }
  const customizations: OptionPrices['customizations'] = {};
  for (const c of product.customizations) {
    if (c.pricingSku) customizations[c.kind] = lineFor(priceBook, c.pricingSku, 1).unitPrice;
  }
  return {
    productId: product.id,
    priceBookVersion: priceBook.version,
    variants,
    customizations,
    volumeDiscounts: [...priceBook.volumeDiscounts].sort((a, b) => a.minQuantity - b.minQuantity),
  };
}

/**
 * Authoritative price calculation. Pure function: same inputs, same quote.
 * Runs only on the server; the browser receives the resulting Quote.
 */
export function calculateQuote(
  product: Product,
  config: ProductConfiguration,
  priceBook: PriceBook,
  now: Date = new Date(),
): Quote {
  const issues: ValidationIssue[] = validateConfiguration(product, config);
  const valid = !hasBlockingIssues(issues);

  const lines: QuoteLine[] = [];
  for (const section of product.sections) {
    const variant = getSelectedVariant(product, config.selections, section.id);
    if (!variant) continue;
    for (const component of variant.pricing) {
      lines.push(lineFor(priceBook, component.sku, component.quantity));
    }
  }

  const colorPanels = getColorOverridePanelIds(product, config).length;
  const artworkFiles = getPrintedAssetIds(product, config).length;
  for (const customization of product.customizations) {
    if (!customization.pricingSku) continue;
    const quantity =
      customization.kind === 'panelColor' ? colorPanels : customization.kind === 'artworkUpload' ? artworkFiles : 0;
    if (quantity > 0) lines.push(lineFor(priceBook, customization.pricingSku, quantity));
  }

  const merged = mergeLines(lines);
  const unitPrice = merged.reduce((sum, l) => sum + l.amount, 0);
  const quantity = Math.max(1, Math.trunc(config.quantity));
  const subtotal = unitPrice * quantity;

  const tier = [...priceBook.volumeDiscounts]
    .sort((a, b) => b.minQuantity - a.minQuantity)
    .find((d) => quantity >= d.minQuantity);
  const discount = tier
    ? { label: tier.label, rate: tier.rate, amount: Math.round(subtotal * tier.rate) }
    : null;

  return {
    productId: product.id,
    configurationId: config.id,
    currency: priceBook.currency,
    priceBookVersion: priceBook.version,
    lines: merged,
    unitPrice,
    quantity,
    subtotal,
    discount,
    total: subtotal - (discount?.amount ?? 0),
    valid,
    issues,
    calculatedAt: now.toISOString(),
  };
}
