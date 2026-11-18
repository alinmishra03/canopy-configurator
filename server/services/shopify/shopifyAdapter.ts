import type { Cart, CartItem } from '@shared/types';

/**
 * Port for cart operations. Implementations:
 *  - MockShopifyAdapter: in-memory, no network, clearly labelled mode "mock".
 *  - StorefrontShopifyAdapter: Shopify Storefront GraphQL API (cartCreate / cartLinesAdd).
 * Credentials live only in server environment variables.
 */
export interface ShopifyAdapter {
  readonly mode: Cart['mode'];
  addItem(item: CartItem, cartId?: string): Promise<Cart>;
  getCart(cartId: string): Promise<Cart | null>;
}
