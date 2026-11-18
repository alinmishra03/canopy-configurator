import type { OptionPrices, ProductConfiguration, Quote } from '@shared/types';
import { stripAssetData } from '@shared/configuration';
import { ApiError, apiRequest } from './apiClient';

/**
 * Pricing is always calculated by the server (POST /api/pricing/quote).
 * Artwork pixels are irrelevant to price, so they are stripped from the payload.
 */
export async function fetchQuote(configuration: ProductConfiguration, signal?: AbortSignal): Promise<Quote> {
  const data = await apiRequest<unknown>('/pricing/quote', {
    method: 'POST',
    body: { configuration: stripAssetData(configuration) },
    signal,
  });
  if (!isQuote(data)) {
    console.error('[pricing] unexpected quote payload', data);
    throw new ApiError(200, 'invalid_quote', 'The pricing server returned a quote in an unexpected format.');
  }
  return data;
}

const isNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Runtime check that a response matches the Quote contract the UI renders. */
export function isQuote(value: unknown): value is Quote {
  if (typeof value !== 'object' || value === null) return false;
  const q = value as Record<string, unknown>;
  return (
    typeof q.productId === 'string' &&
    typeof q.configurationId === 'string' &&
    typeof q.priceBookVersion === 'string' &&
    typeof q.valid === 'boolean' &&
    isNumber(q.unitPrice) &&
    isNumber(q.quantity) &&
    isNumber(q.subtotal) &&
    isNumber(q.total) &&
    Array.isArray(q.issues) &&
    Array.isArray(q.lines) &&
    q.lines.every((l) => {
      const line = l as Record<string, unknown>;
      return typeof line?.sku === 'string' && typeof line.label === 'string' && isNumber(line.amount) && isNumber(line.quantity);
    })
  );
}

/** Display prices for option cards. Informational only; the quote is authoritative. */
export function fetchOptionPrices(productId: string): Promise<OptionPrices> {
  return apiRequest<OptionPrices>(`/pricing/options/${encodeURIComponent(productId)}`);
}

/**
 * A stable key of everything that can affect price or validation. Moving an
 * element changes the design but not the price, so it does not trigger a re-quote.
 */
export function pricingKey(configuration: ProductConfiguration): string {
  const designs = Object.fromEntries(
    Object.entries(configuration.designs).map(([panelId, els]) => [
      panelId,
      els.map((el) => (el.type === 'image' ? `i:${el.assetId}` : `t:${el.text.length}:${el.fontFamily}`)),
    ]),
  );
  return JSON.stringify({
    id: configuration.id,
    s: configuration.selections,
    q: configuration.quantity,
    c: configuration.colors,
    d: designs,
    a: Object.keys(configuration.assets),
  });
}
