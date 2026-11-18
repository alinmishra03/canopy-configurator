import type { PanelDefinition, Product } from '../types';

/**
 * 10x10 Custom Canopy Tent.
 *
 * Panel sizes are print areas in inches. Roof faces are triangles whose base is
 * the 10ft (120in) frame edge and whose height is the slant height to the peak.
 */

const THREE_WALLS = ['three-single', 'three-double'];
const ANY_WALL = ['one-single', 'three-single', 'one-double', 'three-double'];
const DOUBLE_WALLS = ['one-double', 'three-double'];
const ANY_HALF_WALL = ['set-single', 'set-double'];

const roof = (side: 'front' | 'right' | 'back' | 'left', label: string): PanelDefinition => ({
  id: `roof-${side}`,
  label,
  group: 'roof',
  shape: 'triangle',
  widthIn: 120,
  heightIn: 67,
});

const valance = (side: 'front' | 'right' | 'back' | 'left', label: string): PanelDefinition => ({
  id: `valance-${side}`,
  label,
  group: 'valance',
  shape: 'rect',
  widthIn: 120,
  heightIn: 12,
});

export const canopy10x10: Product = {
  id: 'canopy-10x10',
  handle: '10x10-custom-canopy-tent',
  name: '10x10 Custom Canopy Tent',
  description:
    'Full-color dye-sublimated 10x10 canopy with optional frame, printed side walls and half walls.',
  sections: [
    {
      id: 'size',
      label: 'Size & Frame',
      description: 'Every option includes a fully printed 10x10 canopy top with four valances.',
      required: true,
      defaultVariantId: 'canopy-frame',
      variants: [
        {
          id: 'canopy-frame',
          label: '10x10 Canopy with Frame',
          shortLabel: 'With Frame',
          description: 'Printed canopy top on a commercial aluminum hex frame.',
          pricing: [
            { sku: 'CAN-TOP-10', quantity: 1 },
            { sku: 'PRINT-TOP-10', quantity: 1 },
            { sku: 'FRAME-HEX-10', quantity: 1 },
          ],
          attributes: { frame: 'standard' },
        },
        {
          id: 'canopy-only',
          label: '10x10 Canopy Only (No Frame)',
          shortLabel: 'Canopy Only',
          description: 'Replacement printed top that fits standard 10x10 frames.',
          pricing: [
            { sku: 'CAN-TOP-10', quantity: 1 },
            { sku: 'PRINT-TOP-10', quantity: 1 },
          ],
          attributes: { frame: 'none' },
        },
        {
          id: 'light-up',
          label: '10x10 Canopy with Light Up Frame',
          shortLabel: 'Light Up Frame',
          description: 'Printed canopy top on an LED-integrated frame for evening events.',
          pricing: [
            { sku: 'CAN-TOP-10', quantity: 1 },
            { sku: 'PRINT-TOP-10', quantity: 1 },
            { sku: 'FRAME-LED-10', quantity: 1 },
          ],
          attributes: { frame: 'light-up' },
        },
      ],
    },
    {
      id: 'sideWalls',
      label: 'Side Walls',
      description: 'Full-height 10ft walls. One wall mounts at the back; three walls enclose back, left and right.',
      required: true,
      defaultVariantId: 'none',
      variants: [
        { id: 'none', label: 'None', shortLabel: 'None', pricing: [], attributes: { count: 0, sides: 1 } },
        {
          id: 'one-single',
          label: 'One 10ft Side Wall - Single Sided Print',
          shortLabel: '1 Wall, Single Sided',
          pricing: [
            { sku: 'WALL-FULL-10', quantity: 1 },
            { sku: 'PRINT-WALL-SS', quantity: 1 },
          ],
          attributes: { count: 1, sides: 1 },
        },
        {
          id: 'three-single',
          label: 'Three 10ft Side Walls - Single Sided Print',
          shortLabel: '3 Walls, Single Sided',
          pricing: [
            { sku: 'WALL-FULL-10', quantity: 3 },
            { sku: 'PRINT-WALL-SS', quantity: 3 },
          ],
          attributes: { count: 3, sides: 1 },
        },
        {
          id: 'one-double',
          label: 'One 10ft Side Wall - Double Sided Print',
          shortLabel: '1 Wall, Double Sided',
          pricing: [
            { sku: 'WALL-FULL-10', quantity: 1 },
            { sku: 'PRINT-WALL-DS', quantity: 1 },
          ],
          attributes: { count: 1, sides: 2 },
        },
        {
          id: 'three-double',
          label: 'Three 10ft Side Walls - Double Sided Print',
          shortLabel: '3 Walls, Double Sided',
          pricing: [
            { sku: 'WALL-FULL-10', quantity: 3 },
            { sku: 'PRINT-WALL-DS', quantity: 3 },
          ],
          attributes: { count: 3, sides: 2 },
        },
      ],
    },
    {
      id: 'halfWalls',
      label: 'Half Walls',
      description: '3ft-high rail walls mounted on the left and right sides.',
      required: true,
      defaultVariantId: 'none',
      variants: [
        { id: 'none', label: 'None', shortLabel: 'None', pricing: [], attributes: { count: 0, sides: 1 } },
        {
          id: 'set-single',
          label: 'Half Walls (Set of 2) - Single Sided Print',
          shortLabel: 'Set of 2, Single Sided',
          pricing: [
            { sku: 'WALL-HALF-10', quantity: 2 },
            { sku: 'PRINT-HALF-SS', quantity: 2 },
          ],
          attributes: { count: 2, sides: 1 },
        },
        {
          id: 'set-double',
          label: 'Half Walls (Set of 2) - Double Sided Print',
          shortLabel: 'Set of 2, Double Sided',
          pricing: [
            { sku: 'WALL-HALF-10', quantity: 2 },
            { sku: 'PRINT-HALF-DS', quantity: 2 },
          ],
          attributes: { count: 2, sides: 2 },
        },
      ],
    },
  ],
  panels: [
    roof('front', 'Roof - Front'),
    roof('right', 'Roof - Right'),
    roof('back', 'Roof - Back'),
    roof('left', 'Roof - Left'),
    valance('front', 'Valance - Front'),
    valance('right', 'Valance - Right'),
    valance('back', 'Valance - Back'),
    valance('left', 'Valance - Left'),
    {
      id: 'wall-back',
      label: 'Side Wall - Back',
      group: 'sideWall',
      shape: 'rect',
      widthIn: 120,
      heightIn: 84,
      requires: [{ sectionId: 'sideWalls', variantIds: ANY_WALL }],
      doubleSidedWhen: { sectionId: 'sideWalls', variantIds: DOUBLE_WALLS },
    },
    {
      id: 'wall-left',
      label: 'Side Wall - Left',
      group: 'sideWall',
      shape: 'rect',
      widthIn: 120,
      heightIn: 84,
      requires: [{ sectionId: 'sideWalls', variantIds: THREE_WALLS }],
      doubleSidedWhen: { sectionId: 'sideWalls', variantIds: DOUBLE_WALLS },
    },
    {
      id: 'wall-right',
      label: 'Side Wall - Right',
      group: 'sideWall',
      shape: 'rect',
      widthIn: 120,
      heightIn: 84,
      requires: [{ sectionId: 'sideWalls', variantIds: THREE_WALLS }],
      doubleSidedWhen: { sectionId: 'sideWalls', variantIds: DOUBLE_WALLS },
    },
    {
      id: 'halfwall-left',
      label: 'Half Wall - Left',
      group: 'halfWall',
      shape: 'rect',
      widthIn: 120,
      heightIn: 36,
      requires: [{ sectionId: 'halfWalls', variantIds: ANY_HALF_WALL }],
      doubleSidedWhen: { sectionId: 'halfWalls', variantIds: ['set-double'] },
    },
    {
      id: 'halfwall-right',
      label: 'Half Wall - Right',
      group: 'halfWall',
      shape: 'rect',
      widthIn: 120,
      heightIn: 36,
      requires: [{ sectionId: 'halfWalls', variantIds: ANY_HALF_WALL }],
      doubleSidedWhen: { sectionId: 'halfWalls', variantIds: ['set-double'] },
    },
  ],
  rules: [
    {
      id: 'half-walls-need-open-sides',
      when: { sectionId: 'sideWalls', variantIds: THREE_WALLS },
      disallow: { sectionId: 'halfWalls', variantIds: ANY_HALF_WALL },
      resolveTo: 'none',
      message:
        'Half walls mount on the left and right sides, which three full side walls already cover.',
    },
    {
      id: 'three-walls-need-open-sides',
      when: { sectionId: 'halfWalls', variantIds: ANY_HALF_WALL },
      disallow: { sectionId: 'sideWalls', variantIds: THREE_WALLS },
      resolveTo: 'none',
      message: 'Three full side walls cover the left and right sides used by half walls.',
    },
  ],
  customizations: [
    {
      kind: 'panelColor',
      label: 'Individual panel color',
      description: 'Any panel can be dyed a different color from the canopy base color.',
      pricingSku: 'CUSTOM-PANEL-COLOR',
    },
    {
      kind: 'artworkUpload',
      label: 'Logo & artwork',
      description: 'Upload PNG, JPG, WebP or SVG artwork. Includes prepress check per unique file.',
      pricingSku: 'CUSTOM-ARTWORK-SETUP',
    },
    {
      kind: 'text',
      label: 'Custom text',
      description: 'Typeset text is included at no extra cost.',
    },
  ],
  palette: [
    { name: 'Arctic White', hex: '#f8f8f6' },
    { name: 'Carbon Black', hex: '#1d1d1f' },
    { name: 'Signal Red', hex: '#c8202f' },
    { name: 'Royal Blue', hex: '#1f4fbf' },
    { name: 'Navy', hex: '#14213d' },
    { name: 'Forest Green', hex: '#1f6b45' },
    { name: 'Sunflower', hex: '#f2b705' },
    { name: 'Tangerine', hex: '#f26b1d' },
    { name: 'Sky', hex: '#5fb3e4' },
    { name: 'Slate Grey', hex: '#6b7280' },
    { name: 'Plum', hex: '#6d2e74' },
    { name: 'Sand', hex: '#d9c7a3' },
  ],
  fonts: ['Inter', 'Montserrat', 'Oswald', 'Playfair Display'],
  defaultColor: '#1f4fbf',
  quantity: { min: 1, max: 50 },
  limits: {
    maxElementsPerPanel: 12,
    maxTextLength: 120,
    maxUploadBytes: 15 * 1024 * 1024,
    maxAssets: 12,
    acceptedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'],
  },
};
