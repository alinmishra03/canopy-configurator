import path from 'node:path';
import { createApp } from './app';
import { priceBook } from './config/priceBook';
import { loadVariantMap } from './config/shopifyVariantMap';
import { FileConfigurationRepository } from './services/configurationRepository';
import { createShopifyAdapter } from './services/shopify';

// Node >= 20.6 can load .env natively; ignore if absent.
try {
  process.loadEnvFile?.();
} catch {
  /* no .env file */
}

const root = process.cwd();
const port = Number(process.env.PORT ?? process.env.API_PORT ?? 8787);
const shopify = createShopifyAdapter(process.env);

const app = createApp({
  priceBook,
  repository: new FileConfigurationRepository(path.join(root, 'server', 'data', 'configurations')),
  shopify,
  variantMap: loadVariantMap(shopify.mode === 'shopify' ? process.env.SHOPIFY_VARIANT_MAP : undefined),
  frameAncestors: process.env.FRAME_ANCESTORS ?? '*',
  staticDir: path.join(root, 'dist'),
});

app.listen(port, () => {
  console.log(`[api] listening on http://localhost:${port} (shopify: ${shopify.mode}, prices: ${priceBook.version})`);
});
