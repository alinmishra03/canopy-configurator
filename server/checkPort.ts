/**
 * `npm run dev` pre-flight (runs as the "predev" script).
 *
 * Fails fast when the API port is taken, instead of starting a frontend whose
 * /api proxy would talk to the wrong process. Distinguishes "this API is
 * already running" (e.g. a second `npm run dev`) from "another program".
 */
import http from 'node:http';
import net from 'node:net';
import { API_SERVICE_NAME, resolveApiPort } from './config/port';

try {
  process.loadEnvFile?.();
} catch {
  /* no .env file */
}

const port = resolveApiPort(process.env);

function isFree(p: number): Promise<boolean> {
  return new Promise((resolve) => {
    const probe = net.createServer();
    probe.once('error', () => resolve(false));
    probe.once('listening', () => probe.close(() => resolve(true)));
    probe.listen(p);
  });
}

/** Plain http.get without keep-alive, so no sockets linger when this script exits. */
function whoIsListening(p: number): Promise<'configurator' | 'other'> {
  return new Promise((resolve) => {
    const req = http.get({ host: 'localhost', port: p, path: '/api/health', agent: false, timeout: 1500 }, (res) => {
      let raw = '';
      res.setEncoding('utf8');
      res.on('data', (chunk: string) => (raw += chunk));
      res.on('end', () => {
        try {
          resolve((JSON.parse(raw) as { service?: string }).service === API_SERVICE_NAME ? 'configurator' : 'other');
        } catch {
          resolve('other');
        }
      });
    });
    req.on('timeout', () => req.destroy());
    req.on('error', () => resolve('other'));
  });
}

if (!(await isFree(port))) {
  const owner = await whoIsListening(port);
  console.error(
    owner === 'configurator'
      ? `\n✖ The configurator API is already running on port ${port} (probably another "npm run dev").\n` +
          `  Use that instance at http://localhost:5173, or stop it before starting a new one.\n`
      : `\n✖ Port ${port} is used by another program, so the pricing API cannot start.\n` +
          `  Stop that program, or set a free port in .env, e.g.  API_PORT=8790\n` +
          `  (the Vite /api proxy reads the same setting).\n`,
  );
  // exitCode (not process.exit) lets pending handles close cleanly on Windows.
  process.exitCode = 1;
}
