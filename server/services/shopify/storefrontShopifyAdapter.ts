import type { Cart, CartItem } from '@shared/types';
import type { ShopifyAdapter } from './shopifyAdapter';
import { CONFIG_ATTRIBUTE, toStorefrontLines } from './cartItemBuilder';

export interface StorefrontConfig {
  storeDomain: string;
  /** Private Storefront token: server-side only, sent as Shopify-Storefront-Private-Token. */
  privateToken: string;
  apiVersion: string;
}

const CART_FIELDS = /* GraphQL */ `
  id
  checkoutUrl
  totalQuantity
  cost { totalAmount { amount currencyCode } }
  lines(first: 100) {
    nodes {
      quantity
      attributes { key value }
      merchandise { ... on ProductVariant { id sku } }
    }
  }
`;

const CART_CREATE = `mutation CartCreate($input: CartInput!) {
  cartCreate(input: $input) { cart { ${CART_FIELDS} } userErrors { field message } }
}`;

const CART_LINES_ADD = `mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
  cartLinesAdd(cartId: $cartId, lines: $lines) { cart { ${CART_FIELDS} } userErrors { field message } }
}`;

const CART_QUERY = `query Cart($id: ID!) { cart(id: $id) { ${CART_FIELDS} } }`;

interface StorefrontCart {
  id: string;
  checkoutUrl: string;
  totalQuantity: number;
  cost: { totalAmount: { amount: string; currencyCode: string } };
  lines: {
    nodes: Array<{
      quantity: number;
      attributes: Array<{ key: string; value: string }>;
      merchandise: { id: string; sku: string | null };
    }>;
  };
}

/**
 * Live Shopify Storefront API adapter. Only used when SHOPIFY_STORE_DOMAIN and
 * SHOPIFY_STOREFRONT_TOKEN are configured on the server.
 */
export class StorefrontShopifyAdapter implements ShopifyAdapter {
  readonly mode = 'shopify' as const;
  /** Configured items we created, keyed by configuration id, to enrich cart responses. */
  private readonly knownItems = new Map<string, CartItem>();

  constructor(private readonly config: StorefrontConfig) {}

  private async request<T>(query: string, variables: Record<string, unknown>): Promise<T> {
    const url = `https://${this.config.storeDomain}/api/${this.config.apiVersion}/graphql.json`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Shopify-Storefront-Private-Token': this.config.privateToken,
      },
      body: JSON.stringify({ query, variables }),
    });
    if (!res.ok) throw new Error(`Shopify Storefront API responded ${res.status}`);
    const body = (await res.json()) as { data?: T; errors?: Array<{ message: string }> };
    if (body.errors?.length) throw new Error(`Shopify: ${body.errors.map((e) => e.message).join('; ')}`);
    if (!body.data) throw new Error('Shopify returned no data');
    return body.data;
  }

  async addItem(item: CartItem, cartId?: string): Promise<Cart> {
    this.knownItems.set(item.configurationId, item);
    const lines = toStorefrontLines(item);
    if (cartId) {
      const variables = { cartId, lines };
      const data = await this.request<{
        cartLinesAdd: { cart: StorefrontCart | null; userErrors: Array<{ message: string }> };
      }>(CART_LINES_ADD, variables);
      return this.unwrap(data.cartLinesAdd, { mutation: 'cartLinesAdd', variables });
    }
    const variables = { input: { lines } };
    const data = await this.request<{
      cartCreate: { cart: StorefrontCart | null; userErrors: Array<{ message: string }> };
    }>(CART_CREATE, variables);
    return this.unwrap(data.cartCreate, { mutation: 'cartCreate', variables });
  }

  async getCart(cartId: string): Promise<Cart | null> {
    const data = await this.request<{ cart: StorefrontCart | null }>(CART_QUERY, { id: cartId });
    return data.cart ? this.toCart(data.cart, null) : null;
  }

  private unwrap(
    payload: { cart: StorefrontCart | null; userErrors: Array<{ message: string }> },
    request: unknown,
  ): Cart {
    if (payload.userErrors.length || !payload.cart) {
      throw new Error(`Shopify cart error: ${payload.userErrors.map((e) => e.message).join('; ') || 'no cart returned'}`);
    }
    return this.toCart(payload.cart, request);
  }

  private toCart(cart: StorefrontCart, request: unknown): Cart {
    const configIds = new Set(
      cart.lines.nodes.flatMap((l) => l.attributes.filter((a) => a.key === CONFIG_ATTRIBUTE).map((a) => a.value)),
    );
    const items = [...configIds].flatMap((id) => {
      const item = this.knownItems.get(id);
      return item ? [item] : [];
    });
    return {
      id: cart.id,
      mode: this.mode,
      checkoutUrl: cart.checkoutUrl,
      items,
      totalQuantity: items.reduce((n, i) => n + i.quantity, 0),
      total: Math.round(Number(cart.cost.totalAmount.amount) * 100),
      currency: 'USD',
      storefrontRequest: request,
    };
  }
}
