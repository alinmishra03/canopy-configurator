import { beforeEach, describe, expect, it } from 'vitest';
import { getPanelColor } from '@shared/configuration';
import { createConfigurationStore } from '@/store/configurationStore';
import { logoAsset, product } from './fixtures';

let store: ReturnType<typeof createConfigurationStore>;
const state = () => store.getState();

beforeEach(() => {
  store = createConfigurationStore(product);
});

describe('configuration store', () => {
  it('selects variants and auto-resolves conflicts with a notice', () => {
    state().selectVariant('halfWalls', 'set-single');
    state().selectVariant('sideWalls', 'three-double');
    expect(state().configuration.selections).toMatchObject({ sideWalls: 'three-double', halfWalls: 'none' });
    expect(state().lastAdjustments[0]).toMatch(/Half Walls/);
  });

  it('changes canopy and individual panel colors', () => {
    state().setBaseColor('#C8202F');
    expect(state().configuration.colors.base).toBe('#c8202f');
    state().setPanelColor('roof-front', '#1f6b45');
    expect(getPanelColor(state().configuration, 'roof-front')).toBe('#1f6b45');
    expect(getPanelColor(state().configuration, 'roof-back')).toBe('#c8202f');
    // Setting a panel back to the base color removes the override.
    state().setPanelColor('roof-front', '#c8202f');
    expect(state().configuration.colors.panels).toEqual({});
  });

  it('adds, moves and edits text; a drag gesture is a single undo step', () => {
    const id = state().addText('roof-front', { text: 'ACME' });
    const historyAfterAdd = state().past.length;

    // Live drag (transient) followed by drop (commit).
    state().updateElement('roof-front', id, { x: 0.3 }, { transient: true });
    state().updateElement('roof-front', id, { x: 0.25 }, { transient: true });
    expect(state().past.length).toBe(historyAfterAdd);
    state().updateElement('roof-front', id, { x: 0.2, y: 0.7 });
    expect(state().past.length).toBe(historyAfterAdd + 1);

    const el = state().configuration.designs['roof-front']?.[0];
    expect(el).toMatchObject({ x: 0.2, y: 0.7, text: 'ACME' });

    state().undo();
    expect(state().configuration.designs['roof-front']?.[0]).toMatchObject({ x: 0.5 });
    state().redo();
    expect(state().configuration.designs['roof-front']?.[0]).toMatchObject({ x: 0.2 });
  });

  it('clamps element positions to the panel', () => {
    const id = state().addText('valance-front');
    state().updateElement('valance-front', id, { x: 4, y: -2 });
    expect(state().configuration.designs['valance-front']?.[0]).toMatchObject({ x: 1, y: 0 });
  });

  it('uploads images to a panel and prunes unused assets on delete', () => {
    const id = state().addImage('wall-back', logoAsset);
    expect(state().configuration.assets[logoAsset.id]).toBeDefined();
    const el = state().configuration.designs['wall-back']?.[0];
    expect(el?.type).toBe('image');

    state().updateElement('wall-back', id, { width: 0.5, rotation: 370 });
    expect(state().configuration.designs['wall-back']?.[0]).toMatchObject({ width: 0.5, rotation: 10 });

    state().removeElement('wall-back', id);
    expect(state().configuration.designs['wall-back']).toBeUndefined();
    expect(state().configuration.assets).toEqual({});
  });

  it('copies a panel design to sibling panels with fresh ids', () => {
    state().addText('roof-front', { text: 'BRAND' });
    state().copyPanelDesign('roof-front', ['roof-back', 'roof-left']);
    const designs = state().configuration.designs;
    expect(designs['roof-back']?.[0]).toMatchObject({ type: 'text', text: 'BRAND' });
    expect(designs['roof-back']?.[0]?.id).not.toBe(designs['roof-front']?.[0]?.id);
  });

  it('keeps one shared configuration: every view reads the same object', () => {
    // The 2D editor and 3D textures both read configuration.designs[panelId];
    // there is no second copy to drift out of sync.
    const id = state().addText('roof-left', { text: 'SYNC' });
    state().updateElement('roof-left', id, { x: 0.33 });
    const forEditor = store.getState().configuration.designs['roof-left'];
    const forTexture = store.getState().configuration.designs['roof-left'];
    expect(forEditor).toBe(forTexture);
    expect(forEditor?.[0]).toMatchObject({ x: 0.33 });
  });

  it('loads a saved configuration and resets history', () => {
    state().addText('roof-front');
    const saved = structuredClone(state().configuration);
    state().reset();
    state().loadConfiguration(saved);
    expect(state().configuration).toEqual(saved);
    expect(state().past).toHaveLength(0);
  });

  it('clamps quantity to the product range', () => {
    state().setQuantity(500);
    expect(state().configuration.quantity).toBe(product.quantity.max);
    state().setQuantity(0);
    expect(state().configuration.quantity).toBe(product.quantity.min);
  });
});
