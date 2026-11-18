import type { ErrorRequestHandler, RequestHandler } from 'express';

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown };
}

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new HttpError(404, 'not_found', `No API route for ${req.method} ${req.path}`));
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    const body: ApiErrorBody = { error: { code: err.code, message: err.message, details: err.details } };
    res.status(err.status).json(body);
    return;
  }
  // body-parser errors (payload too large, malformed JSON)
  const status = typeof err?.status === 'number' ? err.status : 500;
  if (status === 413) {
    res.status(413).json({ error: { code: 'payload_too_large', message: 'Configuration is too large. Try smaller images.' } });
    return;
  }
  if (status === 400 && err?.type === 'entity.parse.failed') {
    res.status(400).json({ error: { code: 'invalid_json', message: 'Request body is not valid JSON.' } });
    return;
  }
  console.error('[api] unhandled error', err);
  res.status(500).json({ error: { code: 'internal_error', message: 'Unexpected server error.' } });
};
