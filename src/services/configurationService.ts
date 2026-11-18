import type { Product, ProductConfiguration } from '@shared/types';
import { deserializeConfiguration, serializeConfiguration } from '@shared/configuration';
import { STORAGE_KEYS } from '@/config/product';
import { apiRequest } from './apiClient';

export class ConfigurationLoadError extends Error {}

function ensureProduct(configuration: ProductConfiguration, product: Product): ProductConfiguration {
  if (configuration.productId !== product.id) {
    throw new ConfigurationLoadError(`This design is for a different product (${configuration.productId}).`);
  }
  return configuration;
}

export function parseConfiguration(input: unknown, product: Product): ProductConfiguration {
  const result = deserializeConfiguration(input);
  if (!result.ok) {
    throw new ConfigurationLoadError(`Invalid configuration file: ${result.errors.slice(0, 3).join('; ')}`);
  }
  return ensureProduct(result.configuration, product);
}

/** Saves to the server and returns a shareable URL that restores the design. */
export async function saveConfiguration(configuration: ProductConfiguration): Promise<{ id: string; url: string }> {
  const res = await apiRequest<{ id: string; url: string }>('/configurations', {
    method: 'POST',
    body: { configuration },
  });
  // Use the browser's own origin so links work behind proxies and in dev.
  const url = new URL(window.location.href);
  url.search = '';
  url.searchParams.set('config', res.id);
  return { id: res.id, url: url.toString() };
}

export async function loadSavedConfiguration(id: string, product: Product): Promise<ProductConfiguration> {
  const res = await apiRequest<{ configuration: unknown }>(`/configurations/${encodeURIComponent(id)}`);
  return parseConfiguration(res.configuration, product);
}

export function downloadConfigurationFile(configuration: ProductConfiguration): void {
  const blob = new Blob([serializeConfiguration(configuration, { pretty: true })], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${configuration.id}.canopy.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function readConfigurationFile(file: File, product: Product): Promise<ProductConfiguration> {
  if (file.size > 30 * 1024 * 1024) throw new ConfigurationLoadError('Configuration file is too large.');
  return parseConfiguration(await file.text(), product);
}

/** Local autosave so a refresh never loses work. Storage may be unavailable (private mode, iframes). */
export const draftStorage = {
  save(configuration: ProductConfiguration): boolean {
    try {
      localStorage.setItem(STORAGE_KEYS.draft, serializeConfiguration(configuration));
      return true;
    } catch {
      try {
        // Quota exceeded: keep options and layout even if artwork pixels do not fit.
        localStorage.setItem(STORAGE_KEYS.draft, serializeConfiguration(configuration, { includeAssetData: false }));
      } catch {
        /* storage unavailable */
      }
      return false;
    }
  },
  load(product: Product): ProductConfiguration | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.draft);
      if (!raw) return null;
      const config = parseConfiguration(raw, product);
      // Drop image elements whose pixels could not be stored.
      const designs = Object.fromEntries(
        Object.entries(config.designs).map(([panelId, els]) => [
          panelId,
          els.filter((el) => el.type !== 'image' || config.assets[el.assetId]?.dataUrl),
        ]),
      );
      return { ...config, designs };
    } catch {
      return null;
    }
  },
  clear(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.draft);
    } catch {
      /* ignore */
    }
  },
};
