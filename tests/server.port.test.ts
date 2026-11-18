import { describe, expect, it } from 'vitest';
import { DEFAULT_API_PORT, resolveApiPort } from '../server/config/port';

describe('resolveApiPort (shared by API server and Vite proxy)', () => {
  it('defaults to 8787', () => {
    expect(resolveApiPort({})).toBe(DEFAULT_API_PORT);
  });

  it('prefers API_PORT, then PORT', () => {
    expect(resolveApiPort({ PORT: '3000' })).toBe(3000);
    expect(resolveApiPort({ API_PORT: '9000', PORT: '3000' })).toBe(9000);
    expect(resolveApiPort({ API_PORT: '  ', PORT: '4000' })).toBe(4000);
  });

  it('rejects invalid ports instead of silently diverging', () => {
    expect(() => resolveApiPort({ API_PORT: 'abc' })).toThrow(/not a valid port/);
    expect(() => resolveApiPort({ PORT: '70000' })).toThrow();
  });
});
