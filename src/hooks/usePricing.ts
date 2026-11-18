import { useEffect } from 'react';
import { configurationStore, useConfigurationStore } from '@/store/configurationStore';
import { useCommerceStore } from '@/store/commerceStore';
import { fetchQuote, pricingKey } from '@/services/pricingService';
import { ApiError } from '@/services/apiClient';
import { postToParent } from '@/utils/embed';

const DEBOUNCE_MS = 180;
const MAX_RETRIES = 4; // 1s, 2s, 4s, 8s

function isTransient(err: unknown): boolean {
  return (
    err instanceof ApiError &&
    (err.code === 'api_unreachable' || err.code === 'network_error' || err.status === 502 || err.status === 503 || err.status === 504)
  );
}

/**
 * Keeps the server quote in sync with the configuration. Mount once.
 * Requests are debounced, and superseded requests are aborted so a slow
 * response can never overwrite a newer price.
 */
export function usePricingSync(): void {
  useEffect(() => {
    let timer: number | undefined;
    let retryTimer: number | undefined;
    let retries = 0;
    let retrying = false;
    let controller: AbortController | null = null;
    let lastKey: string | null = null;

    const run = () => {
      const { configuration } = configurationStore.getState();
      const key = pricingKey(configuration);
      if (key === lastKey) return;
      if (!retrying) retries = 0; // a customer change (not an automatic retry) resets the budget
      retrying = false;
      lastKey = key;
      window.clearTimeout(timer);
      window.clearTimeout(retryTimer);
      useCommerceStore.getState().setQuoteLoading();
      timer = window.setTimeout(async () => {
        controller?.abort();
        controller = new AbortController();
        try {
          const quote = await fetchQuote(configuration, controller.signal);
          retries = 0;
          useCommerceStore.getState().setQuote(quote, key);
          postToParent({ type: 'canopy:quote', configurationId: quote.configurationId, total: quote.total, currency: quote.currency });
        } catch (err) {
          if ((err as Error).name === 'AbortError') return;
          lastKey = null; // allow retry on next change
          const message = err instanceof ApiError ? err.message : 'Pricing is temporarily unavailable.';
          useCommerceStore.getState().setQuoteError(message);
          // The API may still be starting (npm run dev starts both at once) or restarting:
          // retry unreachable-server errors with backoff. Validation errors are never retried.
          if (isTransient(err) && retries < MAX_RETRIES) {
            const delay = 1000 * 2 ** retries++;
            retryTimer = window.setTimeout(() => {
              retrying = true;
              run();
            }, delay);
          }
        }
      }, DEBOUNCE_MS);
    };

    run();
    const unsubscribe = configurationStore.subscribe(run);
    return () => {
      unsubscribe();
      window.clearTimeout(timer);
      window.clearTimeout(retryTimer);
      controller?.abort();
    };
  }, []);
}

/** Re-requests the quote for the current configuration (used by "Retry"). */
export async function refreshQuote(): Promise<void> {
  const { configuration } = configurationStore.getState();
  const store = useCommerceStore.getState();
  store.setQuoteLoading();
  try {
    store.setQuote(await fetchQuote(configuration), pricingKey(configuration));
  } catch (err) {
    store.setQuoteError(err instanceof ApiError ? err.message : 'Pricing is temporarily unavailable.');
  }
}

/** True when the displayed quote belongs to the current configuration. */
export function useQuoteIsCurrent(): boolean {
  const quotedKey = useCommerceStore((s) => s.quotedKey);
  const status = useCommerceStore((s) => s.quoteStatus);
  const currentKey = useConfigurationStore((s) => pricingKey(s.configuration));
  return status === 'ready' && quotedKey === currentKey;
}
