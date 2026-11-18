import type { PriceBook } from '@shared/types';

/**
 * MOCK PRICE BOOK - sample prices for the assessment, not real MVP Visuals prices.
 * All amounts are integer cents. In production this would be loaded by the server
 * from Shopify / an ERP; the browser never decides a price.
 *
 * Example totals per canopy:
 *   Canopy with Frame ............ $389 top + $260 print + $499 frame = $1,148
 *   Canopy Only .................. $389 + $260                       =   $649
 *   Canopy with Light Up Frame ... $389 + $260 + $899                 = $1,548
 *   One wall, single sided ....... $149 + $99                         =   $248
 *   Three walls, double sided .... 3 x ($149 + $189)                  = $1,014
 *   Half walls, single sided ..... 2 x ($119 + $59)                   =   $356
 *   Half walls, double sided ..... 2 x ($119 + $109)                  =   $456
 *   Panel color override ......... $15 per panel that differs from the base color
 *   Artwork setup ................ $25 per unique uploaded file that is printed
 *   Volume discount .............. 5% from 3 units, 10% from 5 units
 */
export const priceBook: PriceBook = {
  version: 'mock-2026.11',
  currency: 'USD',
  options: {
    'CAN-TOP-10': { sku: 'CAN-TOP-10', label: '10x10 canopy top with 4 valances', category: 'base', unitPrice: 38900 },
    'PRINT-TOP-10': { sku: 'PRINT-TOP-10', label: 'Full-color dye-sublimation print (roof + valances)', category: 'printing', unitPrice: 26000 },
    'FRAME-HEX-10': { sku: 'FRAME-HEX-10', label: 'Commercial aluminum hex frame', category: 'frame', unitPrice: 49900 },
    'FRAME-LED-10': { sku: 'FRAME-LED-10', label: 'Light up LED aluminum frame', category: 'frame', unitPrice: 89900 },
    'WALL-FULL-10': { sku: 'WALL-FULL-10', label: '10ft full side wall', category: 'sideWalls', unitPrice: 14900 },
    'PRINT-WALL-SS': { sku: 'PRINT-WALL-SS', label: 'Side wall print - single sided', category: 'printing', unitPrice: 9900 },
    'PRINT-WALL-DS': { sku: 'PRINT-WALL-DS', label: 'Side wall print - double sided', category: 'printing', unitPrice: 18900 },
    'WALL-HALF-10': { sku: 'WALL-HALF-10', label: '10ft half wall with rail', category: 'halfWalls', unitPrice: 11900 },
    'PRINT-HALF-SS': { sku: 'PRINT-HALF-SS', label: 'Half wall print - single sided', category: 'printing', unitPrice: 5900 },
    'PRINT-HALF-DS': { sku: 'PRINT-HALF-DS', label: 'Half wall print - double sided', category: 'printing', unitPrice: 10900 },
    'CUSTOM-PANEL-COLOR': { sku: 'CUSTOM-PANEL-COLOR', label: 'Individual panel color', category: 'customization', unitPrice: 1500 },
    'CUSTOM-ARTWORK-SETUP': { sku: 'CUSTOM-ARTWORK-SETUP', label: 'Artwork setup & prepress check', category: 'customization', unitPrice: 2500 },
  },
  volumeDiscounts: [
    { minQuantity: 5, rate: 0.1, label: 'Volume discount (5+ units)' },
    { minQuantity: 3, rate: 0.05, label: 'Volume discount (3+ units)' },
  ],
};
