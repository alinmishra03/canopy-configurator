import { canopy10x10 } from '@shared/catalog';
import { createDefaultConfiguration } from '@shared/configuration';
import type { ProductConfiguration, UploadedAsset } from '@shared/types';

export const product = canopy10x10;

export function makeConfig(overrides: Partial<ProductConfiguration> = {}): ProductConfiguration {
  return { ...createDefaultConfiguration(product, new Date('2026-11-18T12:00:00Z')), ...overrides };
}

export const logoAsset: UploadedAsset = {
  id: 'asset_logo',
  name: 'logo.png',
  mimeType: 'image/png',
  width: 400,
  height: 200,
  byteSize: 1234,
  dataUrl: 'data:image/png;base64,iVBORw0KGgo=',
};
