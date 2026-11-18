/// <reference types="vitest" />
import { defineConfig, loadEnv, type Logger, type Plugin, type ProxyOptions } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import type { ServerResponse } from 'node:http';
import { API_SERVICE_NAME, resolveApiPort } from './server/config/port';

/**
 * /api proxy for `vite` and `vite preview`. On connection failure it answers
 * with a JSON error (instead of an empty 500) so the UI can explain the problem.
 */
function apiProxy(target: string): ProxyOptions {
  return {
    target,
    changeOrigin: true,
    configure(proxy) {
      proxy.on('error', (err, _req, res) => {
        const response = res as ServerResponse;
        if (!('writeHead' in response) || response.headersSent || response.writableEnded) return;
        response.writeHead(502, { 'Content-Type': 'application/json' });
        response.end(
          JSON.stringify({
            error: {
              code: 'api_unreachable',
              message: `The pricing API is not running at ${target}. Start the app with "npm run dev".`,
              details: (err as NodeJS.ErrnoException).code ?? err.message,
            },
          }),
        );
      });
    },
  };
}

/**
 * Verifies at startup that the proxy target is this project's API and not
 * another program that happens to use the port (which would answer /api with
 * HTML and break pricing). Retries briefly because `npm run dev` starts both
 * processes at the same time.
 */
function apiTargetCheck(target: string): Plugin {
  const check = async (logger: Logger) => {
    let lastProblem = '';
    for (let attempt = 0; attempt < 20; attempt++) {
      try {
        const res = await fetch(`${target}/api/health`, { signal: AbortSignal.timeout(1500) });
        const body = (await res.json().catch(() => null)) as { service?: string } | null;
        if (body?.service === API_SERVICE_NAME) {
          logger.info(`  ✓ /api proxied to the configurator API at ${target}`, { timestamp: true });
          return;
        }
        lastProblem =
          `${target} is answering, but it is NOT the canopy configurator API ` +
          `(${res.status} ${res.headers.get('content-type') ?? 'unknown content'}). ` +
          'Another program is using this port. Stop it or set API_PORT in .env.';
        break;
      } catch {
        lastProblem = `No API is listening at ${target}. Start it with "npm run dev" (or "npm run dev:api").`;
      }
      await new Promise((r) => setTimeout(r, 500));
    }
    logger.warn(`\n  ⚠ Pricing will not work: ${lastProblem}\n`, { timestamp: true });
  };
  return {
    name: 'canopy-api-target-check',
    configureServer(server) {
      server.httpServer?.once('listening', () => void check(server.config.logger));
    },
    configurePreviewServer(server) {
      server.httpServer?.once('listening', () => void check(server.config.logger));
    },
  };
}

export default defineConfig(({ mode }) => {
  // Same sources and precedence as the API server: shell env first, then .env files.
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = `http://localhost:${resolveApiPort(env)}`;

  return {
    plugins: [react(), apiTargetCheck(apiTarget)],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '@shared': fileURLToPath(new URL('./shared', import.meta.url)),
      },
    },
    server: {
      port: 5173,
      proxy: { '/api': apiProxy(apiTarget) },
    },
    preview: {
      proxy: { '/api': apiProxy(apiTarget) },
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
      chunkSizeWarningLimit: 1600,
      rollupOptions: {
        output: {
          manualChunks: {
            three: ['three', '@react-three/fiber', '@react-three/drei'],
            konva: ['konva', 'react-konva'],
            pdf: ['jspdf'],
          },
        },
      },
    },
    test: {
      environment: 'node',
      include: ['tests/**/*.test.ts'],
    },
  };
});
