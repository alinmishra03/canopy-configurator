import { Router, type NextFunction, type Request, type RequestHandler, type Response } from 'express';
import type { AddToCartResponse, PriceBook, ProductConfiguration } from '@shared/types';
import { hasBlockingIssues } from '@shared/configuration';
import { HttpError } from '../middleware/errors';
import { parseConfigurationInput } from '../services/configurationParser';
import type { ConfigurationRepository } from '../services/configurationRepository';
import { getProduct } from '@shared/catalog';
import { calculateQuote, getOptionPrices } from '../services/pricingEngine';
import { buildCartItem, type ShopifyAdapter } from '../services/shopify';
import type { VariantMap } from '../config/shopifyVariantMap';

export interface ApiDependencies {
  priceBook: PriceBook;
  repository: ConfigurationRepository;
  shopify: ShopifyAdapter;
  variantMap: VariantMap;
}

/** Express 4 does not forward async rejections; this does. */
const asyncRoute =
  (fn: (req: Request, res: Response) => Promise<void>): RequestHandler =>
  (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };

function bodyConfiguration(req: Request): unknown {
  const body = req.body as { configuration?: unknown } | undefined;
  if (!body || body.configuration === undefined) {
    throw new HttpError(400, 'missing_configuration', 'Request body must include "configuration".');
  }
  return body.configuration;
}

function shareUrl(req: Request, id: string): string {
  return `${req.protocol}://${req.get('host')}/?config=${encodeURIComponent(id)}`;
}

export function createApiRouter(deps: ApiDependencies): Router {
  const router = Router();

  router.get('/health', (_req, res) => {
    res.json({ status: 'ok', shopifyMode: deps.shopify.mode, priceBookVersion: deps.priceBook.version });
  });

  /** Per-option and per-customization prices for displaying "+$X" on option cards. */
  router.get('/pricing/options/:productId', (req, res) => {
    const product = getProduct(req.params.productId ?? '');
    if (!product) throw new HttpError(404, 'unknown_product', 'Unknown product.');
    res.json(getOptionPrices(product, deps.priceBook));
  });

  /** Quote a configuration. Invalid configurations still return 200 with valid=false and issues. */
  router.post('/pricing/quote', (req, res) => {
    const { configuration, product } = parseConfigurationInput(bodyConfiguration(req));
    res.json(calculateQuote(product, configuration, deps.priceBook));
  });

  /** Save a configuration so it can be restored or linked from an order. */
  router.post(
    '/configurations',
    asyncRoute(async (req, res) => {
      const { configuration, product } = parseConfigurationInput(bodyConfiguration(req));
      const quote = calculateQuote(product, configuration, deps.priceBook);
      if (hasBlockingIssues(quote.issues)) {
        throw new HttpError(422, 'configuration_invalid', 'Configuration has errors.', quote.issues);
      }
      const stored = await deps.repository.save({ ...configuration, updatedAt: new Date().toISOString() });
      res.status(201).json({ id: configuration.id, savedAt: stored.savedAt, url: shareUrl(req, configuration.id) });
    }),
  );

  router.get(
    '/configurations/:id',
    asyncRoute(async (req, res) => {
      const stored = await deps.repository.get(req.params.id ?? '');
      if (!stored) throw new HttpError(404, 'configuration_not_found', 'No saved configuration with that id.');
      res.json(stored);
    }),
  );

  /**
   * Add a configured product to the cart. The server re-validates the configuration,
   * recalculates the price and refuses if it differs from what the customer saw.
   */
  router.post(
    '/cart/items',
    asyncRoute(async (req, res) => {
      const { configuration, product } = parseConfigurationInput(bodyConfiguration(req));
      const { expectedTotal, cartId } = req.body as { expectedTotal?: unknown; cartId?: unknown };

      const quote = calculateQuote(product, configuration, deps.priceBook);
      if (!quote.valid) {
        throw new HttpError(422, 'configuration_invalid', 'Configuration has errors and cannot be ordered.', quote.issues);
      }
      if (typeof expectedTotal !== 'number' || expectedTotal !== quote.total) {
        throw new HttpError(409, 'price_changed', 'The price was updated. Please review the new total.', { quote });
      }

      const saved: ProductConfiguration = { ...configuration, updatedAt: new Date().toISOString() };
      await deps.repository.save(saved);

      const item = buildCartItem(product, saved, quote, deps.variantMap, shareUrl(req, saved.id));
      const cart = await deps.shopify.addItem(item, typeof cartId === 'string' && cartId ? cartId : undefined);
      const body: AddToCartResponse = { cart, item, quote };
      res.status(201).json(body);
    }),
  );

  router.get(
    '/cart/:id',
    asyncRoute(async (req, res) => {
      const cart = await deps.shopify.getCart(req.params.id ?? '');
      if (!cart) throw new HttpError(404, 'cart_not_found', 'Cart not found.');
      res.json(cart);
    }),
  );

  return router;
}
