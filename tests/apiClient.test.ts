import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiRequest } from '@/services/apiClient';
import { fetchQuote, isQuote } from '@/services/pricingService';
import { makeConfig } from './fixtures';

function mockFetch(body: string, init: { status?: number; contentType?: string | null } = {}) {
  const headers = new Headers();
  if (init.contentType !== null) headers.set('content-type', init.contentType ?? 'application/json; charset=utf-8');
  const fn = vi.fn(async () => new Response(body, { status: init.status ?? 200, headers }));
  vi.stubGlobal('fetch', fn);
  return fn;
}

const quoteBody = {
  productId: 'canopy-10x10',
  configurationId: 'CNP-TEST-AAAA',
  currency: 'USD',
  priceBookVersion: 'mock-2026.11',
  lines: [{ sku: 'CAN-TOP-10', label: 'Top', category: 'base', unitPrice: 38900, quantity: 1, amount: 38900 }],
  unitPrice: 64900,
  quantity: 1,
  subtotal: 64900,
  discount: null,
  total: 64900,
  valid: true,
  issues: [],
  calculatedAt: '2026-11-18T00:00:00.000Z',
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('apiRequest', () => {
  it('parses JSON responses', async () => {
    const fetch = mockFetch(JSON.stringify({ ok: 1 }));
    await expect(apiRequest('/health')).resolves.toEqual({ ok: 1 });
    expect(fetch).toHaveBeenCalledWith('/api/health', expect.objectContaining({ method: 'GET' }));
  });

  it('explains an HTML page from a different server (the reported bug)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockFetch('<!DOCTYPE html><html>Not found</html>', { status: 404, contentType: 'text/html; charset=utf-8' });
    const err = await apiRequest('/pricing/quote', { method: 'POST', body: {} }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).code).toBe('api_unreachable');
    expect((err as ApiError).message).toMatch(/returned an HTML page \(HTTP 404\)/);
    expect((err as ApiError).message).toMatch(/npm run dev/);
  });

  it('explains an empty proxy error when the API is down', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockFetch('', { status: 500, contentType: 'text/plain' });
    const err = (await apiRequest('/pricing/quote').catch((e: unknown) => e)) as ApiError;
    expect(err.code).toBe('api_unreachable');
    expect(err.status).toBe(500);
  });

  it('surfaces structured API errors unchanged', async () => {
    mockFetch(JSON.stringify({ error: { code: 'price_changed', message: 'The price was updated.' } }), { status: 409 });
    const err = (await apiRequest('/cart/items').catch((e: unknown) => e)) as ApiError;
    expect(err).toMatchObject({ status: 409, code: 'price_changed', message: 'The price was updated.' });
  });

  it('reports malformed JSON', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockFetch('{"total": ', { status: 200 });
    const err = (await apiRequest('/pricing/quote').catch((e: unknown) => e)) as ApiError;
    expect(err.code).toBe('invalid_response');
  });
});

describe('fetchQuote', () => {
  it('returns a valid quote', async () => {
    mockFetch(JSON.stringify(quoteBody));
    await expect(fetchQuote(makeConfig())).resolves.toMatchObject({ total: 64900 });
  });

  it('rejects JSON that is not a quote instead of rendering it', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockFetch(JSON.stringify({ price: 649 }));
    const err = (await fetchQuote(makeConfig()).catch((e: unknown) => e)) as ApiError;
    expect(err.code).toBe('invalid_quote');
  });

  it('isQuote validates line items', () => {
    expect(isQuote(quoteBody)).toBe(true);
    expect(isQuote({ ...quoteBody, lines: [{ sku: 1 }] })).toBe(false);
    expect(isQuote({ ...quoteBody, total: '649' })).toBe(false);
  });
});
