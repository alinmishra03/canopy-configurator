import type { Product, ProductConfiguration } from '@shared/types';
import { getProduct } from '@shared/catalog';
import { deserializeConfiguration } from '@shared/configuration';
import { HttpError } from '../middleware/errors';

/** Parses untrusted request input into a typed configuration + its product, or throws 400/404. */
export function parseConfigurationInput(input: unknown): { configuration: ProductConfiguration; product: Product } {
  const result = deserializeConfiguration(input);
  if (!result.ok) {
    throw new HttpError(400, 'invalid_configuration', 'Configuration payload is malformed.', result.errors);
  }
  const product = getProduct(result.configuration.productId);
  if (!product) {
    throw new HttpError(404, 'unknown_product', `Product "${result.configuration.productId}" does not exist.`);
  }
  return { configuration: result.configuration, product };
}
