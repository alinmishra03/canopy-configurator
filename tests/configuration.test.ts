import { describe, expect, it } from 'vitest';
import {
  applySelection,
  deserializeConfiguration,
  getActivePanels,
  isPanelDoubleSided,
  serializeConfiguration,
  stripAssetData,
  validateConfiguration,
} from '@shared/configuration';
import { logoAsset, makeConfig, product } from './fixtures';

const ids = (selections: Record<string, string>) => getActivePanels(product, selections).map((p) => p.id);

describe('panel availability', () => {
  it('always has 4 roof panels and 4 valances', () => {
    const panels = ids({ size: 'canopy-frame', sideWalls: 'none', halfWalls: 'none' });
    expect(panels).toHaveLength(8);
  });

  it('adds the back wall for one wall and three walls for three', () => {
    expect(ids({ size: 'canopy-frame', sideWalls: 'one-single', halfWalls: 'none' })).toContain('wall-back');
    expect(ids({ size: 'canopy-frame', sideWalls: 'one-single', halfWalls: 'none' })).not.toContain('wall-left');
    const three = ids({ size: 'canopy-frame', sideWalls: 'three-double', halfWalls: 'none' });
    expect(three).toEqual(expect.arrayContaining(['wall-back', 'wall-left', 'wall-right']));
  });

  it('adds two half walls and reports double-sided printing', () => {
    const selections = { size: 'canopy-frame', sideWalls: 'none', halfWalls: 'set-double' };
    expect(ids(selections)).toEqual(expect.arrayContaining(['halfwall-left', 'halfwall-right']));
    const half = product.panels.find((p) => p.id === 'halfwall-left');
    expect(half && isPanelDoubleSided(half, selections)).toBe(true);
  });
});

describe('option rules', () => {
  it('resets half walls when three side walls are chosen', () => {
    const { selections, adjustments } = applySelection(
      product,
      { size: 'canopy-frame', sideWalls: 'none', halfWalls: 'set-single' },
      'sideWalls',
      'three-single',
    );
    expect(selections.halfWalls).toBe('none');
    expect(adjustments).toHaveLength(1);
  });

  it('resets three side walls when half walls are chosen', () => {
    const { selections } = applySelection(
      product,
      { size: 'canopy-frame', sideWalls: 'three-double', halfWalls: 'none' },
      'halfWalls',
      'set-double',
    );
    expect(selections.sideWalls).toBe('none');
  });

  it('allows one side wall with half walls', () => {
    const { selections, adjustments } = applySelection(
      product,
      { size: 'canopy-frame', sideWalls: 'one-double', halfWalls: 'none' },
      'halfWalls',
      'set-single',
    );
    expect(selections).toMatchObject({ sideWalls: 'one-double', halfWalls: 'set-single' });
    expect(adjustments).toHaveLength(0);
  });
});

describe('serialization', () => {
  const config = makeConfig({
    assets: { [logoAsset.id]: logoAsset },
    designs: {
      'roof-front': [
        { id: 't1', type: 'text', text: 'ACME', fontFamily: 'Inter', fontWeight: 700, fontSize: 0.15, color: '#ffffff', x: 0.5, y: 0.6, rotation: 0 },
        { id: 'i1', type: 'image', assetId: logoAsset.id, x: 0.4, y: 0.7, rotation: 15, width: 0.3 },
      ],
    },
  });

  it('round-trips a configuration losslessly', () => {
    const result = deserializeConfiguration(serializeConfiguration(config));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.configuration).toEqual(config);
  });

  it('strips artwork pixels for pricing payloads but keeps metadata', () => {
    const stripped = stripAssetData(config);
    expect(stripped.assets[logoAsset.id]?.dataUrl).toBeUndefined();
    expect(stripped.assets[logoAsset.id]?.width).toBe(400);
    expect(config.assets[logoAsset.id]?.dataUrl).toBeDefined();
  });

  it('rejects malformed input with useful errors', () => {
    expect(deserializeConfiguration('{not json').ok).toBe(false);
    const bad = deserializeConfiguration({ ...config, colors: { base: 'red', panels: {} } });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.errors.join(' ')).toMatch(/colors/);
    const badEl = deserializeConfiguration({ ...config, designs: { 'roof-front': [{ id: 'x', type: 'video', x: 0, y: 0, rotation: 0 }] } });
    expect(badEl.ok).toBe(false);
    const badAsset = deserializeConfiguration({ ...config, assets: { a: { ...logoAsset, dataUrl: 'javascript:alert(1)' } } });
    expect(badAsset.ok).toBe(false);
  });
});

describe('validation', () => {
  it('accepts the default configuration', () => {
    expect(validateConfiguration(product, makeConfig())).toEqual([]);
  });

  it('reports missing assets, unknown fonts and inactive panel artwork', () => {
    const issues = validateConfiguration(
      product,
      makeConfig({
        designs: {
          'roof-front': [{ id: 'i', type: 'image', assetId: 'missing', x: 0.5, y: 0.5, rotation: 0, width: 0.2 }],
          'wall-left': [{ id: 't', type: 'text', text: 'Hi', fontFamily: 'Comic Sans', fontWeight: 400, fontSize: 0.1, color: '#000000', x: 0.5, y: 0.5, rotation: 0 }],
        },
      }),
    );
    const codes = issues.map((i) => i.code);
    expect(codes).toEqual(expect.arrayContaining(['missing_asset', 'unknown_font', 'inactive_panel_design']));
  });
});
