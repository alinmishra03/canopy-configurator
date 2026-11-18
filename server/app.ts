import express, { type Express } from 'express';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { createApiRouter, type ApiDependencies } from './routes';
import { embedHeaders } from './middleware/embedHeaders';
import { errorHandler, notFoundHandler } from './middleware/errors';

export interface AppOptions extends ApiDependencies {
  frameAncestors: string;
  /** Directory of the built SPA to serve (production). */
  staticDir?: string;
}

export function createApp(options: AppOptions): Express {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', true);
  app.use(embedHeaders(options.frameAncestors));
  // Configurations embed optimized artwork as data URLs, hence the generous limit.
  app.use(express.json({ limit: '25mb' }));

  app.use('/api', createApiRouter(options));
  app.use('/api', notFoundHandler);

  if (options.staticDir && existsSync(options.staticDir)) {
    const dir = options.staticDir;
    app.use(express.static(dir, { index: false, maxAge: '1h' }));
    app.get('*', (_req, res) => res.sendFile(path.join(dir, 'index.html')));
  }

  app.use(errorHandler);
  return app;
}
