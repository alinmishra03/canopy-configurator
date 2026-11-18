/**
 * Single rule for which port the configurator API listens on.
 *
 * Used by BOTH the API server (server/index.ts) and the Vite dev/preview proxy
 * (vite.config.ts), so the frontend always proxies /api to the port the API
 * actually binds. Both read the shell environment and the project .env file.
 *
 *   API_PORT  - explicit API port (preferred for local development)
 *   PORT      - conventional hosting variable (Render, Heroku, Railway, ...)
 *   8787      - default
 */
export const DEFAULT_API_PORT = 8787;

/** Identifies our API in /api/health so the dev proxy can detect a wrong target. */
export const API_SERVICE_NAME = 'canopy-configurator-api';

export function resolveApiPort(env: Record<string, string | undefined>): number {
  for (const key of ['API_PORT', 'PORT'] as const) {
    const raw = env[key]?.trim();
    if (!raw) continue;
    const port = Number(raw);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error(`${key}="${raw}" is not a valid port number`);
    }
    return port;
  }
  return DEFAULT_API_PORT;
}
