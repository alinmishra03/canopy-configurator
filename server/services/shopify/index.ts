import type { ShopifyAdapter } from './shopifyAdapter';
import { MockShopifyAdapter } from './mockShopifyAdapter';
import { StorefrontShopifyAdapter } from './storefrontShopifyAdapter';

export type { ShopifyAdapter } from './shopifyAdapter';
export { buildCartItem } from './cartItemBuilder';

/** Chooses the live adapter only when credentials are present; otherwise the mock. */
export function createShopifyAdapter(env: NodeJS.ProcessEnv): ShopifyAdapter {
  const storeDomain = env.SHOPIFY_STORE_DOMAIN?.trim();
  const privateToken = env.SHOPIFY_STOREFRONT_TOKEN?.trim();
  if (storeDomain && privateToken) {
    return new StorefrontShopifyAdapter({
      storeDomain,
      privateToken,
      apiVersion: env.SHOPIFY_API_VERSION?.trim() || '2024-10',
    });
  }
  return new MockShopifyAdapter();
}
