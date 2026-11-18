import type { Cart, CartItem } from '@shared/types';
import { createId } from '@shared/utils/id';
import type { ShopifyAdapter } from './shopifyAdapter';
import { toStorefrontLines } from './cartItemBuilder';

/**
 * Local stand-in for Shopify. It performs no network calls and never claims to
 * be a live store: carts report `mode: "mock"` and have no checkout URL.
 * It records the exact Storefront mutation variables a live adapter would send.
 */
export class MockShopifyAdapter implements ShopifyAdapter {
  readonly mode = 'mock' as const;
  private readonly carts = new Map<string, { items: CartItem[]; request: unknown }>();

  async addItem(item: CartItem, cartId?: string): Promise<Cart> {
    const existing = cartId ? this.carts.get(cartId) : undefined;
    const id = existing && cartId ? cartId : `gid://shopify/Cart/MOCK-${createId()}`;
    const request = existing
      ? { mutation: 'cartLinesAdd', variables: { cartId: id, lines: toStorefrontLines(item) } }
      : { mutation: 'cartCreate', variables: { input: { lines: toStorefrontLines(item) } } };
    const entry = { items: [...(existing?.items ?? []), item], request };
    this.carts.set(id, entry);
    return this.toCart(id, entry.items, request);
  }

  async getCart(cartId: string): Promise<Cart | null> {
    const entry = this.carts.get(cartId);
    return entry ? this.toCart(cartId, entry.items, entry.request) : null;
  }

  private toCart(id: string, items: CartItem[], request: unknown): Cart {
    return {
      id,
      mode: this.mode,
      checkoutUrl: null,
      items,
      totalQuantity: items.reduce((n, i) => n + i.quantity, 0),
      total: items.reduce((n, i) => n + i.total, 0),
      currency: 'USD',
      storefrontRequest: request,
    };
  }
}
