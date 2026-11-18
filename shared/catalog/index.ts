import type { Product } from '../types';
import { canopy10x10 } from './canopy10x10';

/** Catalog registry. Add new configurable products here. */
const products: Record<string, Product> = {
  [canopy10x10.id]: canopy10x10,
};

export const DEFAULT_PRODUCT_ID = canopy10x10.id;

export function getProduct(productId: string): Product | undefined {
  return products[productId];
}

export function listProducts(): Product[] {
  return Object.values(products);
}

export { canopy10x10 };
