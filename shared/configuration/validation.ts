import type { Product, ProductConfiguration, ValidationIssue } from '../types';
import { normalizeHex } from '../utils/format';
import { getActivePanels, getPanel, getSection, getViolatedRules } from './rules';

/** Unique asset ids that are placed on panels that will actually be printed. */
export function getPrintedAssetIds(product: Product, config: ProductConfiguration): string[] {
  const ids = new Set<string>();
  for (const panel of getActivePanels(product, config.selections)) {
    for (const el of config.designs[panel.id] ?? []) {
      if (el.type === 'image') ids.add(el.assetId);
    }
  }
  return [...ids];
}

/** Active panels whose color differs from the canopy base color. */
export function getColorOverridePanelIds(product: Product, config: ProductConfiguration): string[] {
  const base = normalizeHex(config.colors.base);
  return getActivePanels(product, config.selections)
    .filter((p) => {
      const override = config.colors.panels[p.id];
      return override !== undefined && normalizeHex(override) !== base;
    })
    .map((p) => p.id);
}

/**
 * Business-rule validation shared by the browser (for inline feedback) and the
 * server (authoritative, before pricing and cart creation).
 */
export function validateConfiguration(product: Product, config: ProductConfiguration): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const error = (code: string, message: string, path?: string) =>
    issues.push({ code, severity: 'error', message, path });
  const warn = (code: string, message: string, path?: string) =>
    issues.push({ code, severity: 'warning', message, path });

  if (config.productId !== product.id) {
    error('product_mismatch', `Configuration is for "${config.productId}", not "${product.id}".`, 'productId');
  }

  for (const section of product.sections) {
    const selected = config.selections[section.id];
    if (selected === undefined) {
      if (section.required) error('missing_selection', `Choose an option for ${section.label}.`, `selections.${section.id}`);
      continue;
    }
    if (!section.variants.some((v) => v.id === selected)) {
      error('unknown_variant', `"${selected}" is not a valid ${section.label} option.`, `selections.${section.id}`);
    }
  }
  for (const sectionId of Object.keys(config.selections)) {
    if (!getSection(product, sectionId)) {
      error('unknown_section', `Unknown option group "${sectionId}".`, `selections.${sectionId}`);
    }
  }

  for (const rule of getViolatedRules(product, config.selections)) {
    error('rule_violation', rule.message, `selections.${rule.disallow.sectionId}`);
  }

  const { min, max } = product.quantity;
  if (config.quantity < min || config.quantity > max) {
    error('quantity_range', `Quantity must be between ${min} and ${max}.`, 'quantity');
  }

  for (const panelId of Object.keys(config.colors.panels)) {
    if (!getPanel(product, panelId)) error('unknown_panel', `Unknown panel "${panelId}".`, `colors.panels.${panelId}`);
  }

  const activeIds = new Set(getActivePanels(product, config.selections).map((p) => p.id));
  const { limits } = product;

  if (Object.keys(config.assets).length > limits.maxAssets) {
    error('too_many_assets', `A maximum of ${limits.maxAssets} uploaded images is supported.`, 'assets');
  }
  for (const asset of Object.values(config.assets)) {
    if (!limits.acceptedMimeTypes.includes(asset.mimeType)) {
      error('asset_type', `"${asset.name}" is not a supported image type.`, `assets.${asset.id}`);
    }
  }

  for (const [panelId, elements] of Object.entries(config.designs)) {
    const panel = getPanel(product, panelId);
    if (!panel) {
      error('unknown_panel', `Unknown panel "${panelId}".`, `designs.${panelId}`);
      continue;
    }
    if (elements.length > limits.maxElementsPerPanel) {
      error('too_many_elements', `${panel.label} supports up to ${limits.maxElementsPerPanel} design elements.`, `designs.${panelId}`);
    }
    if (elements.length > 0 && !activeIds.has(panelId)) {
      warn('inactive_panel_design', `${panel.label} has artwork but is not part of the selected options, so it will not be printed.`, `designs.${panelId}`);
    }
    elements.forEach((el, i) => {
      const path = `designs.${panelId}[${i}]`;
      if (el.x < -0.5 || el.x > 1.5 || el.y < -0.5 || el.y > 1.5) {
        error('element_out_of_bounds', `An element on ${panel.label} is outside the printable area.`, path);
      }
      if (el.type === 'text') {
        if (el.text.trim().length === 0) warn('empty_text', `Empty text on ${panel.label} will be ignored.`, path);
        if (el.text.length > limits.maxTextLength) {
          error('text_too_long', `Text on ${panel.label} exceeds ${limits.maxTextLength} characters.`, path);
        }
        if (!product.fonts.includes(el.fontFamily)) error('unknown_font', `Font "${el.fontFamily}" is not available.`, path);
        if (el.fontSize <= 0 || el.fontSize > 1.5) error('font_size', `Text size on ${panel.label} is out of range.`, path);
      } else {
        if (!config.assets[el.assetId]) error('missing_asset', `An image on ${panel.label} references a missing upload.`, path);
        if (el.width <= 0 || el.width > 3) error('image_size', `Image size on ${panel.label} is out of range.`, path);
      }
    });
  }

  return issues;
}

export function hasBlockingIssues(issues: ValidationIssue[]): boolean {
  return issues.some((i) => i.severity === 'error');
}
