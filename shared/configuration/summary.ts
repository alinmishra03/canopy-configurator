import type { Product, ProductConfiguration } from '../types';
import { getActivePanels, getPanelColor, getSelectedVariant } from './rules';

export interface SummaryRow {
  key: string;
  label: string;
  value: string;
}

export interface PanelSummary {
  panelId: string;
  label: string;
  color: string;
  colorOverridden: boolean;
  texts: string[];
  imageNames: string[];
}

/** Human-readable option rows shared by the summary panel, PDF and cart attributes. */
export function describeSelections(product: Product, config: ProductConfiguration): SummaryRow[] {
  return product.sections.map((section) => ({
    key: section.id,
    label: section.label,
    value: getSelectedVariant(product, config.selections, section.id)?.label ?? 'Not selected',
  }));
}

export function describePanels(product: Product, config: ProductConfiguration): PanelSummary[] {
  return getActivePanels(product, config.selections).map((panel) => {
    const elements = config.designs[panel.id] ?? [];
    return {
      panelId: panel.id,
      label: panel.label,
      color: getPanelColor(config, panel.id),
      colorOverridden: config.colors.panels[panel.id] !== undefined,
      texts: elements.flatMap((el) => (el.type === 'text' && el.text.trim() ? [el.text.trim()] : [])),
      imageNames: elements.flatMap((el) =>
        el.type === 'image' ? [config.assets[el.assetId]?.name ?? 'Uploaded image'] : [],
      ),
    };
  });
}
