/** Minimal typed JSON client for the configurator API. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, '') ?? '';

/** Message for responses that did not come from the configurator API (HTML pages, empty proxy errors). */
function notOurApi(url: string, status: number, contentType: string): string {
  const what = contentType.includes('html') ? 'an HTML page' : contentType ? `"${contentType}"` : 'an empty response';
  return (
    `The pricing server could not be reached: ${url} returned ${what} (HTTP ${status}) instead of JSON. ` +
    'The app is probably running without its API server, or another program is using the API port. ' +
    'Start both servers with "npm run dev".'
  );
}

export async function apiRequest<T>(
  path: string,
  init: { method?: 'GET' | 'POST'; body?: unknown; signal?: AbortSignal } = {},
): Promise<T> {
  const url = `${API_BASE}/api${path}`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: init.method ?? 'GET',
      headers: init.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      signal: init.signal,
    });
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err;
    throw new ApiError(0, 'network_error', 'Cannot reach the configurator server. Check your connection.');
  }

  const contentType = res.headers.get('content-type') ?? '';
  const text = await res.text();

  // Every API response, success or error, is JSON. Anything else came from a
  // different server (e.g. a static host or another app on the API port).
  if (!contentType.includes('application/json')) {
    console.error(`[api] ${init.method ?? 'GET'} ${url} -> ${res.status} ${contentType || '(no content-type)'}`, text.slice(0, 300));
    throw new ApiError(res.status, 'api_unreachable', notOurApi(url, res.status, contentType));
  }

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    console.error(`[api] ${url} returned malformed JSON`, text.slice(0, 300));
    throw new ApiError(res.status, 'invalid_response', `The server sent malformed JSON for ${url} (HTTP ${res.status}).`);
  }

  if (!res.ok) {
    const error = (data as { error?: { code?: string; message?: string; details?: unknown } } | null)?.error;
    throw new ApiError(res.status, error?.code ?? 'http_error', error?.message ?? `Request failed (${res.status}).`, error?.details);
  }
  return data as T;
}
