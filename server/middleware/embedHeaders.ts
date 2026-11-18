import type { RequestHandler } from 'express';

/**
 * Allows the configurator to be embedded in an <iframe>.
 * We deliberately do NOT send X-Frame-Options and instead control embedding
 * with CSP `frame-ancestors`, configured via FRAME_ANCESTORS
 * (e.g. "https://shop.example.com https://*.myshopify.com" or "*").
 */
export function embedHeaders(frameAncestors: string): RequestHandler {
  const ancestors = frameAncestors
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .join(' ');
  const policy = `frame-ancestors ${ancestors || '*'}`;
  return (_req, res, next) => {
    res.removeHeader('X-Frame-Options');
    res.setHeader('Content-Security-Policy', policy);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  };
}
