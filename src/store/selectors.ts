import { useMemo } from 'react';
import type { DesignElement, PanelDefinition, ProductVariant } from '@shared/types';
import {
  getActivePanels,
  getPanel,
  getPanelColor,
  getVariant,
  isPanelDoubleSided,
} from '@shared/configuration';
import { useConfigurationStore } from './configurationStore';

/**
 * Reusable selectors. Each subscribes to the narrowest slice of state so the
 * 3D scene, 2D editor and controls only re-render when their data changes.
 */

const EMPTY: DesignElement[] = [];

export const useProduct = () => useConfigurationStore((s) => s.product);
export const useConfiguration = () => useConfigurationStore((s) => s.configuration);
export const useSelections = () => useConfigurationStore((s) => s.configuration.selections);
export const useAssets = () => useConfigurationStore((s) => s.configuration.assets);
export const useBaseColor = () => useConfigurationStore((s) => s.configuration.colors.base);

export function useSelectedVariant(sectionId: string): ProductVariant | undefined {
  const product = useProduct();
  const variantId = useConfigurationStore((s) => s.configuration.selections[sectionId]);
  return useMemo(() => getVariant(product, sectionId, variantId), [product, sectionId, variantId]);
}

export function useActivePanels(): PanelDefinition[] {
  const product = useProduct();
  const selections = useSelections();
  return useMemo(() => getActivePanels(product, selections), [product, selections]);
}

export function usePanel(panelId: string | null): PanelDefinition | undefined {
  const product = useProduct();
  return panelId ? getPanel(product, panelId) : undefined;
}

export function usePanelElements(panelId: string | null): DesignElement[] {
  return useConfigurationStore((s) => (panelId ? s.configuration.designs[panelId] ?? EMPTY : EMPTY));
}

export function usePanelColor(panelId: string): string {
  return useConfigurationStore((s) => getPanelColor(s.configuration, panelId));
}

export function usePanelDoubleSided(panel: PanelDefinition): boolean {
  const selections = useSelections();
  return isPanelDoubleSided(panel, selections);
}

export function useElement(panelId: string | null, elementId: string | null): DesignElement | undefined {
  return useConfigurationStore((s) =>
    panelId && elementId ? s.configuration.designs[panelId]?.find((el) => el.id === elementId) : undefined,
  );
}

export const useCanUndo = () => useConfigurationStore((s) => s.past.length > 0);
export const useCanRedo = () => useConfigurationStore((s) => s.future.length > 0);
