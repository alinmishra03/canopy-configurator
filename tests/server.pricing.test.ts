import { describe, expect, it } from 'vitest';
import { calculateQuote, getOptionPrices } from '../server/services/pricingEngine';
import { priceBook } from '../server/config/priceBook';
import { logoAsset, makeConfig, product } from './fixtures';

const quote = (overrides: Parameters<typeof makeConfig>[0] = {}) => calculateQuote(product, makeConfig(overrides), priceBook);

describe('pricing engine', () => {
  it.each([
    ['canopy-frame', 114800],
    ['canopy-only', 64900],
    ['light-up', 154800],
  ])('prices size variant %s', (variant, expected) => {
    const q = quote({ selections: { size: variant, sideWalls: 'none', halfWalls: 'none' } });
    expect(q.valid).toBe(true);
    expect(q.unitPrice).toBe(expected);
    expect(q.total).toBe(expected);
  });

  it('adds and removes side walls', () => {
    const base = quote().unitPrice;
    const one = quote({ selections: { size: 'canopy-frame', sideWalls: 'one-single', halfWalls: 'none' } });
    const threeDouble = quote({ selections: { size: 'canopy-frame', sideWalls: 'three-double', halfWalls: 'none' } });
    expect(one.unitPrice - base).toBe(24800);
    expect(threeDouble.unitPrice - base).toBe(101400);
    expect(threeDouble.lines.find((l) => l.sku === 'WALL-FULL-10')?.quantity).toBe(3);
    expect(threeDouble.lines.find((l) => l.sku === 'PRINT-WALL-DS')?.category).toBe('printing');
  });

  it('adds half walls', () => {
    const base = quote().unitPrice;
    const single = quote({ selections: { size: 'canopy-frame', sideWalls: 'none', halfWalls: 'set-single' } });
    const double = quote({ selections: { size: 'canopy-frame', sideWalls: 'none', halfWalls: 'set-double' } });
    expect(single.unitPrice - base).toBe(35600);
    expect(double.unitPrice - base).toBe(45600);
  });

  it('charges panel color overrides only on active panels that differ from base', () => {
    const config = makeConfig();
    const q = calculateQuote(
      product,
      {
        ...config,
        colors: {
          base: config.colors.base,
          panels: { 'roof-front': '#c8202f', 'roof-back': config.colors.base, 'wall-back': '#000000' },
        },
      },
      priceBook,
    );
    // roof-back equals base (free); wall-back is not active (no walls selected).
    expect(q.lines.find((l) => l.sku === 'CUSTOM-PANEL-COLOR')?.quantity).toBe(1);
  });

  it('charges artwork setup once per unique printed file', () => {
    const img = (id: string) => ({ id, type: 'image' as const, assetId: logoAsset.id, x: 0.5, y: 0.5, rotation: 0, width: 0.3 });
    const q = quote({
      assets: { [logoAsset.id]: logoAsset },
      designs: { 'roof-front': [img('a')], 'roof-back': [img('b')] },
    });
    expect(q.lines.find((l) => l.sku === 'CUSTOM-ARTWORK-SETUP')).toMatchObject({ quantity: 1, amount: 2500 });
  });

  it('applies volume discounts by quantity', () => {
    const unit = quote().unitPrice;
    expect(quote({ quantity: 2 }).discount).toBeNull();
    const three = quote({ quantity: 3 });
    expect(three.discount?.rate).toBe(0.05);
    expect(three.total).toBe(unit * 3 - Math.round(unit * 3 * 0.05));
    expect(quote({ quantity: 5 }).discount?.rate).toBe(0.1);
  });

  it('flags invalid configurations instead of pricing them silently', () => {
    const conflict = quote({ selections: { size: 'canopy-frame', sideWalls: 'three-single', halfWalls: 'set-single' } });
    expect(conflict.valid).toBe(false);
    expect(conflict.issues.some((i) => i.code === 'rule_violation')).toBe(true);

    const unknown = quote({ selections: { size: 'canopy-xl', sideWalls: 'none', halfWalls: 'none' } });
    expect(unknown.valid).toBe(false);
    expect(quote({ quantity: 0 }).valid).toBe(false);
  });

  it('exposes option prices for option cards', () => {
    const prices = getOptionPrices(product, priceBook);
    expect(prices.variants.sideWalls?.['one-single']).toBe(24800);
    expect(prices.variants.halfWalls?.none).toBe(0);
    expect(prices.customizations.artworkUpload).toBe(2500);
  });
});
