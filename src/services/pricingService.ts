import type { OptionPrices, ProductConfiguration, Quote } from '@shared/types';
import { stripAssetData } from '@shared/configuration';
import { apiRequest } from './apiClient';

/**
 * Pricing is always calculated by the server (POST /api/pricing/quote).
 * Artwork pixels are irrelevant to price, so they are stripped from the payload.
 */
export function fetchQuote(configuration: ProductConfiguration, signal?: AbortSignal): Promise<Quote> {
  return apiRequest<Quote>('/pricing/quote', {
    method: 'POST',
    body: { configuration: stripAssetData(configuration) },
    signal,
  });
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
