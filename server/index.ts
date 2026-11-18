import path from 'node:path';
import { createApp } from './app';
import { priceBook } from './config/priceBook';
import { loadVariantMap } from './config/shopifyVariantMap';
import { resolveApiPort } from './config/port';
import { FileConfigurationRepository } from './services/configurationRepository';
import { createShopifyAdapter } from './services/shopify';

// Node >= 20.6 can load .env natively; ignore if absent.
try {
  process.loadEnvFile?.();
} catch {
  /* no .env file */
}

const root = process.cwd();
// Same rule as the Vite /api proxy (see server/config/port.ts).
const port = resolveApiPort(process.env);
const shopify = createShopifyAdapter(process.env);

const app = createApp({
  priceBook,
  repository: new FileConfigurationRepository(path.join(root, 'server', 'data', 'configurations')),
  shopify,
  variantMap: loadVariantMap(shopify.mode === 'shopify' ? process.env.SHOPIFY_VARIANT_MAP : undefined),
  frameAncestors: process.env.FRAME_ANCESTORS ?? '*',
  staticDir: path.join(root, 'dist'),
});

const server = app.listen(port, () => {
  console.log(`[api] listening on http://localhost:${port} (shopify: ${shopify.mode}, prices: ${priceBook.version})`);
});

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(
      `[api] Port ${port} is already in use by another process, so the pricing API cannot start.\n` +
        `[api] Stop that process, or choose another port with API_PORT in .env (the Vite proxy follows it automatically).`,
    );
  } else {
    console.error('[api] failed to start:', err);
  }
  // Exit non-zero so `npm run dev` stops the frontend too instead of running without an API.
  process.exit(1);
});
