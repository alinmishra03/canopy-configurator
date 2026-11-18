import { createStore, type StoreApi } from 'zustand/vanilla';
import { useStore } from 'zustand';
import type {
  DesignElement,
  ImageElement,
  Product,
  ProductConfiguration,
  TextElement,
  UploadedAsset,
} from '@shared/types';
import { applySelection, createDefaultConfiguration, getPanel, getPanelColor } from '@shared/configuration';
import { clamp, isDarkColor, normalizeHex } from '@shared/utils/format';
import { createId } from '@shared/utils/id';
import { activeProduct } from '@/config/product';

/**
 * The ONE source of truth for the customer's configuration. The option controls,
 * Konva 2D editor, Three.js 3D preview, pricing, PDF and cart all read from here.
 *
 * Every mutation goes through `commit`, which maintains undo/redo history.
 * Continuous gestures (dragging, slider scrubbing) use `transient` updates that
 * collapse into a single undo step when the gesture ends.
 */

export const HISTORY_LIMIT = 100;
const COALESCE_WINDOW_MS = 700;

export interface UpdateOptions {
  /** Live update during a gesture; history is recorded when a non-transient update follows. */
  transient?: boolean;
  /** Consecutive commits with the same key within a short window form one undo step. */
  coalesceKey?: string;
}

export type NewTextInput = Partial<Pick<TextElement, 'text' | 'fontFamily' | 'fontWeight' | 'color' | 'x' | 'y'>>;

export interface ConfigurationState {
  product: Product;
  configuration: ProductConfiguration;
  past: ProductConfiguration[];
  future: ProductConfiguration[];
  /** Messages about automatic adjustments (e.g. conflicting options reset). */
  lastAdjustments: string[];

  selectVariant(sectionId: string, variantId: string): void;
  setQuantity(quantity: number): void;
  setBaseColor(hex: string, options?: UpdateOptions): void;
  setPanelColor(panelId: string, hex: string | null, options?: UpdateOptions): void;
  resetPanelColors(): void;

  addText(panelId: string, input?: NewTextInput): string;
  addImage(panelId: string, asset: UploadedAsset): string;
  updateElement(panelId: string, elementId: string, patch: Partial<DesignElement>, options?: UpdateOptions): void;
  removeElement(panelId: string, elementId: string): void;
  duplicateElement(panelId: string, elementId: string): string | null;
  moveElementLayer(panelId: string, elementId: string, direction: 'up' | 'down'): void;
  copyPanelDesign(fromPanelId: string, toPanelIds: string[]): void;
  clearPanel(panelId: string): void;

  undo(): void;
  redo(): void;
  loadConfiguration(configuration: ProductConfiguration): void;
  reset(): void;
}

type Mutator = (draft: ProductConfiguration) => ProductConfiguration;

/** Removes assets no element references any more. */
function pruneAssets(config: ProductConfiguration): ProductConfiguration {
  const used = new Set<string>();
  for (const list of Object.values(config.designs)) {
    for (const el of list) if (el.type === 'image') used.add(el.assetId);
  }
  const ids = Object.keys(config.assets);
  if (ids.every((id) => used.has(id))) return config;
  return {
    ...config,
    assets: Object.fromEntries(Object.entries(config.assets).filter(([id]) => used.has(id))),
  };
}

function withPanelElements(
  config: ProductConfiguration,
  panelId: string,
  update: (elements: DesignElement[]) => DesignElement[],
): ProductConfiguration {
  const next = update(config.designs[panelId] ?? []);
  const designs = { ...config.designs };
  if (next.length === 0) delete designs[panelId];
  else designs[panelId] = next;
  return { ...config, designs };
}

function sanitizePatch(el: DesignElement, patch: Partial<DesignElement>): DesignElement {
  const merged = { ...el, ...patch, id: el.id, type: el.type } as DesignElement;
  merged.x = clamp(merged.x, 0, 1);
  merged.y = clamp(merged.y, 0, 1);
  merged.rotation = ((merged.rotation % 360) + 360) % 360;
  if (merged.type === 'text') merged.fontSize = clamp(merged.fontSize, 0.02, 1.2);
  else merged.width = clamp(merged.width, 0.02, 2.5);
  return merged;
}

export function createConfigurationStore(
  product: Product,
  initial?: ProductConfiguration,
): StoreApi<ConfigurationState> {
  let lastCommit = { key: '', at: 0 };
  /** Snapshot taken at the start of a transient gesture. */
  let gestureBase: ProductConfiguration | null = null;

  return createStore<ConfigurationState>()((set, get) => {
    function commit(mutate: Mutator, options: UpdateOptions = {}, adjustments: string[] = []) {
      const { configuration, past } = get();
      const mutated = mutate(configuration);
      if (mutated === configuration) return;
      const next = { ...mutated, updatedAt: new Date().toISOString() };

      if (options.transient) {
        gestureBase ??= configuration;
        set({ configuration: next });
        return;
      }

      const base = gestureBase ?? configuration;
      gestureBase = null;
      const now = Date.now();
      const coalesce =
        options.coalesceKey !== undefined &&
        options.coalesceKey === lastCommit.key &&
        now - lastCommit.at < COALESCE_WINDOW_MS;
      lastCommit = { key: options.coalesceKey ?? '', at: now };

      set({
        configuration: next,
        past: coalesce ? past : [...past, base].slice(-HISTORY_LIMIT),
        future: [],
        lastAdjustments: adjustments,
      });
    }

    function defaultTextColor(config: ProductConfiguration, panelId: string): string {
      return isDarkColor(getPanelColor(config, panelId)) ? '#ffffff' : '#1b1a18';
    }

    return {
      product,
      configuration: initial ?? createDefaultConfiguration(product),
      past: [],
      future: [],
      lastAdjustments: [],

      selectVariant(sectionId, variantId) {
        const { configuration } = get();
        if (configuration.selections[sectionId] === variantId) return;
        const { selections, adjustments } = applySelection(product, configuration.selections, sectionId, variantId);
        commit((c) => ({ ...c, selections }), {}, adjustments);
      },

      setQuantity(quantity) {
        const q = clamp(Math.round(quantity), product.quantity.min, product.quantity.max);
        commit((c) => (c.quantity === q ? c : { ...c, quantity: q }), { coalesceKey: 'quantity' });
      },

      setBaseColor(hex, options) {
        const color = normalizeHex(hex);
        commit((c) => (c.colors.base === color ? c : { ...c, colors: { ...c.colors, base: color } }), {
          coalesceKey: 'base-color',
          ...options,
        });
      },

      setPanelColor(panelId, hex, options) {
        commit(
          (c) => {
            const panels = { ...c.colors.panels };
            if (hex === null || normalizeHex(hex) === c.colors.base) delete panels[panelId];
            else panels[panelId] = normalizeHex(hex);
            return { ...c, colors: { ...c.colors, panels } };
          },
          { coalesceKey: `panel-color:${panelId}`, ...options },
        );
      },

      resetPanelColors() {
        commit((c) =>
          Object.keys(c.colors.panels).length === 0 ? c : { ...c, colors: { ...c.colors, panels: {} } },
        );
      },

      addText(panelId, input = {}) {
        const panel = getPanel(product, panelId);
        const id = createId('el');
        commit((c) => {
          const el: TextElement = {
            id,
            type: 'text',
            text: input.text ?? 'Your Text',
            fontFamily: input.fontFamily ?? product.fonts[0] ?? 'Inter',
            fontWeight: input.fontWeight ?? 700,
            fontSize: panel ? Math.min(0.6, 10 / panel.heightIn) : 0.12,
            color: input.color ?? defaultTextColor(c, panelId),
            x: input.x ?? 0.5,
            y: input.y ?? (panel?.shape === 'triangle' ? 0.68 : 0.5),
            rotation: 0,
          };
          return withPanelElements(c, panelId, (els) => [...els, el]);
        });
        return id;
      },

      addImage(panelId, asset) {
        const panel = getPanel(product, panelId);
        const id = createId('el');
        commit((c) => {
          const assetRatio = asset.width > 0 && asset.height > 0 ? asset.width / asset.height : 1;
          const panelRatio = panel ? panel.heightIn / panel.widthIn : 1;
          // Fit within 45% of the panel width and 55% of its height.
          const width = Math.min(0.45, 0.55 * panelRatio * assetRatio);
          const el: ImageElement = {
            id,
            type: 'image',
            assetId: asset.id,
            width,
            x: 0.5,
            y: panel?.shape === 'triangle' ? 0.64 : 0.5,
            rotation: 0,
          };
          const withAsset = { ...c, assets: { ...c.assets, [asset.id]: asset } };
          return withPanelElements(withAsset, panelId, (els) => [...els, el]);
        });
        return id;
      },

      updateElement(panelId, elementId, patch, options) {
        commit(
          (c) =>
            withPanelElements(c, panelId, (els) =>
              els.map((el) => (el.id === elementId ? sanitizePatch(el, patch) : el)),
            ),
          { coalesceKey: `element:${elementId}:${Object.keys(patch).sort().join(',')}`, ...options },
        );
      },

      removeElement(panelId, elementId) {
        commit((c) => pruneAssets(withPanelElements(c, panelId, (els) => els.filter((el) => el.id !== elementId))));
      },

      duplicateElement(panelId, elementId) {
        const source = get().configuration.designs[panelId]?.find((el) => el.id === elementId);
        if (!source) return null;
        const id = createId('el');
        const copy = sanitizePatch({ ...source, id }, { x: source.x + 0.04, y: source.y + 0.04 });
        commit((c) => withPanelElements(c, panelId, (els) => [...els, copy]));
        return id;
      },

      moveElementLayer(panelId, elementId, direction) {
        commit((c) =>
          withPanelElements(c, panelId, (els) => {
            const i = els.findIndex((el) => el.id === elementId);
            const j = direction === 'up' ? i + 1 : i - 1;
            if (i < 0 || j < 0 || j >= els.length) return els;
            const next = [...els];
            [next[i], next[j]] = [next[j] as DesignElement, next[i] as DesignElement];
            return next;
          }),
        );
      },

      copyPanelDesign(fromPanelId, toPanelIds) {
        commit((c) => {
          const source = c.designs[fromPanelId] ?? [];
          let next = c;
          for (const target of toPanelIds) {
            if (target === fromPanelId) continue;
            next = withPanelElements(next, target, () => source.map((el) => ({ ...el, id: createId('el') })));
            const color = c.colors.panels[fromPanelId];
            const panels = { ...next.colors.panels };
            if (color) panels[target] = color;
            else delete panels[target];
            next = { ...next, colors: { ...next.colors, panels } };
          }
          return pruneAssets(next);
        });
      },

      clearPanel(panelId) {
        commit((c) => (c.designs[panelId] ? pruneAssets(withPanelElements(c, panelId, () => [])) : c));
      },

      undo() {
        const { past, future, configuration } = get();
        const previous = past[past.length - 1];
        if (!previous) return;
        gestureBase = null;
        lastCommit = { key: '', at: 0 };
        set({ configuration: previous, past: past.slice(0, -1), future: [configuration, ...future], lastAdjustments: [] });
      },

      redo() {
        const { past, future, configuration } = get();
        const next = future[0];
        if (!next) return;
        gestureBase = null;
        lastCommit = { key: '', at: 0 };
        set({ configuration: next, past: [...past, configuration], future: future.slice(1), lastAdjustments: [] });
      },

      loadConfiguration(configuration) {
        gestureBase = null;
        set({ configuration, past: [], future: [], lastAdjustments: [] });
      },

      reset() {
        commit(() => createDefaultConfiguration(product));
      },
    };
  });
}

/** Application-wide store instance. */
export const configurationStore = createConfigurationStore(activeProduct);

export function useConfigurationStore<T>(selector: (state: ConfigurationState) => T): T {
  return useStore(configurationStore, selector);
}
