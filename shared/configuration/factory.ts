import type { Product, ProductConfiguration } from '../types';
import { CONFIGURATION_SCHEMA_VERSION } from '../types';
import { createConfigurationId } from '../utils/id';
import { getDefaultSelections } from './rules';

export function createDefaultConfiguration(product: Product, now = new Date()): ProductConfiguration {
  const timestamp = now.toISOString();
  return {
    schemaVersion: CONFIGURATION_SCHEMA_VERSION,
    id: createConfigurationId(),
    productId: product.id,
    selections: getDefaultSelections(product),
    quantity: product.quantity.min,
    colors: { base: product.defaultColor, panels: {} },
    designs: {},
    assets: {},
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}
