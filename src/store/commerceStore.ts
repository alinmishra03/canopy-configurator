import { create } from 'zustand';
import type { Cart, OptionPrices, Quote } from '@shared/types';

/** Server-derived commerce state (quote and cart); never part of the saved configuration. */
interface CommerceState {
  quote: Quote | null;
  quoteStatus: 'idle' | 'loading' | 'ready' | 'error';
  quoteError: string | null;
  /** Pricing key of the configuration the current quote belongs to. */
  quotedKey: string | null;
  cart: Cart | null;
  cartStatus: 'idle' | 'submitting' | 'error';
  cartError: string | null;
  optionPrices: OptionPrices | null;

  setOptionPrices(prices: OptionPrices): void;
  setQuoteLoading(): void;
  setQuote(quote: Quote, key: string): void;
  setQuoteError(message: string): void;
  setCart(cart: Cart | null): void;
  setCartStatus(status: CommerceState['cartStatus'], error?: string | null): void;
}

export const useCommerceStore = create<CommerceState>()((set) => ({
  quote: null,
  quoteStatus: 'idle',
  quoteError: null,
  quotedKey: null,
  cart: null,
  cartStatus: 'idle',
  cartError: null,
  optionPrices: null,

  setOptionPrices: (optionPrices) => set({ optionPrices }),
  setQuoteLoading: () => set({ quoteStatus: 'loading', quoteError: null }),
  setQuote: (quote, key) => set({ quote, quotedKey: key, quoteStatus: 'ready', quoteError: null }),
  setQuoteError: (quoteError) => set({ quoteStatus: 'error', quoteError }),
  setCart: (cart) => set({ cart }),
  setCartStatus: (cartStatus, cartError = null) => set({ cartStatus, cartError }),
}));
