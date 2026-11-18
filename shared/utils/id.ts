interface CryptoLike {
  randomUUID?: () => string;
  getRandomValues?: (array: Uint8Array) => Uint8Array;
}

const getCrypto = (): CryptoLike | undefined => (globalThis as { crypto?: CryptoLike }).crypto;

/**
 * Collision-resistant id that works in browsers (including non-secure iframe
 * contexts where crypto.randomUUID is unavailable) and in Node.
 */
export function createId(prefix = ''): string {
  const c = getCrypto();
  let body: string;
  if (c && typeof c.randomUUID === 'function') {
    body = c.randomUUID().replace(/-/g, '').slice(0, 16);
  } else if (c && typeof c.getRandomValues === 'function') {
    const bytes = c.getRandomValues(new Uint8Array(8));
    body = Array.from(bytes, (b: number) => b.toString(16).padStart(2, '0')).join('');
  } else {
    body = Math.random().toString(16).slice(2, 10) + Date.now().toString(16).slice(-8);
  }
  return prefix ? `${prefix}_${body}` : body;
}

/** Human-friendly configuration reference, e.g. "CNP-7K3Q-M9TX". */
export function createConfigurationId(): string {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const c = getCrypto();
  const bytes =
    c && typeof c.getRandomValues === 'function'
      ? c.getRandomValues(new Uint8Array(8))
      : Uint8Array.from({ length: 8 }, () => Math.floor(Math.random() * 256));
  const chars = Array.from(bytes, (b: number) => alphabet[b % alphabet.length]).join('');
  return `CNP-${chars.slice(0, 4)}-${chars.slice(4, 8)}`;
}

export const CONFIGURATION_ID_PATTERN = /^CNP-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
