import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../server/app';
import { priceBook } from '../server/config/priceBook';
import { mockVariantMap } from '../server/config/shopifyVariantMap';
import { InMemoryConfigurationRepository } from '../server/services/configurationRepository';
import { MockShopifyAdapter } from '../server/services/shopify/mockShopifyAdapter';
import { logoAsset, makeConfig } from './fixtures';

let app: Express;

beforeEach(() => {
  app = createApp({
    priceBook,
    repository: new InMemoryConfigurationRepository(),
    shopify: new MockShopifyAdapter(),
    variantMap: mockVariantMap(),
    frameAncestors: '*',
  });
});

const designed = () =>
  makeConfig({
    selections: { size: 'canopy-frame', sideWalls: 'one-double', halfWalls: 'set-single' },
    assets: { [logoAsset.id]: logoAsset },
    designs: { 'wall-back': [{ id: 'i', type: 'image', assetId: logoAsset.id, x: 0.5, y: 0.5, rotation: 0, width: 0.4 }] },
  });

describe('API', () => {
  it('quotes a configuration', async () => {
    const res = await request(app).post('/api/pricing/quote').send({ configuration: designed() });
    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
    // 1148 frame + 338 one double wall + 356 half walls + 25 artwork
    expect(res.body.total).toBe(186700);
  });

  it('rejects malformed configurations with 400', async () => {
    const res = await request(app).post('/api/pricing/quote').send({ configuration: { hello: 'world' } });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('invalid_configuration');
    const missing = await request(app).post('/api/pricing/quote').send({});
    expect(missing.status).toBe(400);
  });

  it('saves and restores configurations', async () => {
    const config = designed();
    const saved = await request(app).post('/api/configurations').send({ configuration: config });
    expect(saved.status).toBe(201);
    expect(saved.body.id).toBe(config.id);
    const loaded = await request(app).get(`/api/configurations/${config.id}`);
    expect(loaded.status).toBe(200);
    expect(loaded.body.configuration.designs).toEqual(config.designs);
    expect((await request(app).get('/api/configurations/CNP-XXXX-XXXX')).status).toBe(404);
  });

  it('adds to the mock Shopify cart with server-validated pricing', async () => {
    const config = designed();
    const res = await request(app).post('/api/cart/items').send({ configuration: config, expectedTotal: 186700 });
    expect(res.status).toBe(201);
    expect(res.body.cart.mode).toBe('mock');
    expect(res.body.cart.checkoutUrl).toBeNull();
    expect(res.body.cart.total).toBe(186700);

    const lines = res.body.item.lines as Array<{ merchandiseId: string; attributes: Array<{ key: string; value: string }> }>;
    expect(lines.every((l) => l.merchandiseId.startsWith('gid://shopify/ProductVariant/MOCK-'))).toBe(true);
    expect(lines.every((l) => l.attributes.some((a) => a.key === '_configuration_id' && a.value === config.id))).toBe(true);
    expect(res.body.cart.storefrontRequest.mutation).toBe('cartCreate');

    // Configuration reference is stored for the order.
    expect((await request(app).get(`/api/configurations/${config.id}`)).status).toBe(200);

    // A second item goes to the same cart via cartLinesAdd.
    const second = await request(app)
      .post('/api/cart/items')
      .send({ configuration: makeConfig(), expectedTotal: 114800, cartId: res.body.cart.id });
    expect(second.body.cart.id).toBe(res.body.cart.id);
    expect(second.body.cart.items).toHaveLength(2);
    expect(second.body.cart.storefrontRequest.mutation).toBe('cartLinesAdd');
  });

  it('refuses a tampered or stale price with 409', async () => {
    const res = await request(app).post('/api/cart/items').send({ configuration: designed(), expectedTotal: 100 });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('price_changed');
    expect(res.body.error.details.quote.total).toBe(186700);
  });

  it('refuses invalid configurations with 422', async () => {
    const config = makeConfig({ selections: { size: 'canopy-frame', sideWalls: 'three-single', halfWalls: 'set-single' } });
    const res = await request(app).post('/api/cart/items').send({ configuration: config, expectedTotal: 0 });
    expect(res.status).toBe(422);
  });

  it('allows iframe embedding', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-frame-options']).toBeUndefined();
    expect(res.headers['content-security-policy']).toBe('frame-ancestors *');
  });

  it('serves option prices', async () => {
    const res = await request(app).get('/api/pricing/options/canopy-10x10');
    expect(res.status).toBe(200);
    expect(res.body.variants.size['light-up']).toBe(154800);
    expect((await request(app).get('/api/pricing/options/nope')).status).toBe(404);
  });
});
