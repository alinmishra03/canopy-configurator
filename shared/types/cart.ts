import type { Quote } from './pricing';

/** Attribute pair as accepted by Shopify Storefront `CartLineInput.attributes`. */
export interface CartAttribute {
  key: string;
  value: string;
}

/** One Shopify cart line prepared from a priced quote line. */
export interface CartLineDraft {
  sku: string;
  merchandiseId: string;
  quantity: number;
  attributes: CartAttribute[];
}

/** A configured canopy in the cart: a bundle of Shopify lines sharing one configuration id. */
export interface CartItem {
  id: string;
  configurationId: string;
  productId: string;
  title: string;
  quantity: number;
  unitPrice: number;
  total: number;
  summary: CartAttribute[];
  lines: CartLineDraft[];
}

export interface Cart {
  id: string;
  mode: 'mock' | 'shopify';
  checkoutUrl: string | null;
  items: CartItem[];
  totalQuantity: number;
  total: number;
  currency: 'USD';
  /** The Storefront API request variables that were sent (live) or would be sent (mock). */
  storefrontRequest: unknown;
}

export interface AddToCartRequest {
  configuration: unknown;
  /** Total the customer saw; the server rejects with 409 if it no longer matches. */
  expectedTotal: number;
  cartId?: string;
}

export interface AddToCartResponse {
  cart: Cart;
  item: CartItem;
  quote: Quote;
}
