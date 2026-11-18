import type { AddToCartResponse, Cart, ProductConfiguration } from '@shared/types';
import { STORAGE_KEYS } from '@/config/product';
import { apiRequest } from './apiClient';

/**
 * Browser side of the Shopify flow. The browser never talks to Shopify directly
 * and never holds credentials; it sends the configuration and the total the
 * customer saw to our server, which re-validates, re-prices, saves the
 * configuration and creates the Storefront cart (or the mock cart).
 */

function storedCartId(): string | undefined {
  try {
    return localStorage.getItem(STORAGE_KEYS.cartId) ?? undefined;
  } catch {
    return undefined;
  }
}

function rememberCart(cart: Cart): void {
  try {
    localStorage.setItem(STORAGE_KEYS.cartId, cart.id);
  } catch {
    /* storage unavailable */
  }
}

export async function addConfigurationToCart(
  configuration: ProductConfiguration,
  expectedTotal: number,
): Promise<AddToCartResponse> {
  const send = (cartId: string | undefined) =>
    apiRequest<AddToCartResponse>('/cart/items', {
      method: 'POST',
      body: { configuration, expectedTotal, cartId },
    });
  const response = await send(storedCartId());
  rememberCart(response.cart);
  return response;
}

export async function fetchCart(): Promise<Cart | null> {
  const id = storedCartId();
  if (!id) return null;
  try {
    return await apiRequest<Cart>(`/cart/${encodeURIComponent(id)}`);
  } catch {
    return null;
  }
}
