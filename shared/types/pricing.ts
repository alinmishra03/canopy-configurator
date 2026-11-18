import type { ValidationIssue } from './configuration';

export type PriceCategory =
  | 'base'
  | 'frame'
  | 'sideWalls'
  | 'halfWalls'
  | 'printing'
  | 'customization';

/** A price-book entry. All money values are integer cents. */
export interface PricingOption {
  sku: string;
  label: string;
  category: PriceCategory;
  unitPrice: number;
}

export interface VolumeDiscount {
  minQuantity: number;
  rate: number;
  label: string;
}

export interface PriceBook {
  version: string;
  currency: 'USD';
  options: Record<string, PricingOption>;
  volumeDiscounts: VolumeDiscount[];
}

export interface QuoteLine {
  sku: string;
  label: string;
  category: PriceCategory;
  unitPrice: number;
  quantity: number;
  /** unitPrice x quantity, for ONE configured canopy. */
  amount: number;
}

/** Display prices for option cards (GET /api/pricing/options/:productId). */
export interface OptionPrices {
  productId: string;
  priceBookVersion: string;
  /** sectionId -> variantId -> cents */
  variants: Record<string, Record<string, number>>;
  /** customization kind -> unit price in cents */
  customizations: Partial<Record<string, number>>;
  volumeDiscounts: VolumeDiscount[];
}

export interface Quote {
  productId: string;
  configurationId: string;
  currency: 'USD';
  priceBookVersion: string;
  /** Lines for a single canopy. */
  lines: QuoteLine[];
  unitPrice: number;
  quantity: number;
  subtotal: number;
  discount: { label: string; rate: number; amount: number } | null;
  total: number;
  valid: boolean;
  issues: ValidationIssue[];
  calculatedAt: string;
}
