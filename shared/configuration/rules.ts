import type {
  ConfigurationRule,
  PanelDefinition,
  Product,
  ProductConfiguration,
  ProductSection,
  ProductVariant,
  VariantCondition,
} from '../types';

export type Selections = Record<string, string>;

export function matchesCondition(selections: Selections, condition: VariantCondition): boolean {
  const selected = selections[condition.sectionId];
  return selected !== undefined && condition.variantIds.includes(selected);
}

export function getSection(product: Product, sectionId: string): ProductSection | undefined {
  return product.sections.find((s) => s.id === sectionId);
}

export function getVariant(
  product: Product,
  sectionId: string,
  variantId: string | undefined,
): ProductVariant | undefined {
  if (!variantId) return undefined;
  return getSection(product, sectionId)?.variants.find((v) => v.id === variantId);
}

export function getSelectedVariant(
  product: Product,
  selections: Selections,
  sectionId: string,
): ProductVariant | undefined {
  return getVariant(product, sectionId, selections[sectionId]);
}

export function getDefaultSelections(product: Product): Selections {
  return Object.fromEntries(product.sections.map((s) => [s.id, s.defaultVariantId]));
}

export function isPanelActive(panel: PanelDefinition, selections: Selections): boolean {
  return (panel.requires ?? []).every((c) => matchesCondition(selections, c));
}

/** Panels that physically exist for the current selections. */
export function getActivePanels(product: Product, selections: Selections): PanelDefinition[] {
  return product.panels.filter((p) => isPanelActive(p, selections));
}

export function isPanelDoubleSided(panel: PanelDefinition, selections: Selections): boolean {
  return panel.doubleSidedWhen ? matchesCondition(selections, panel.doubleSidedWhen) : false;
}

export function getPanel(product: Product, panelId: string): PanelDefinition | undefined {
  return product.panels.find((p) => p.id === panelId);
}

/** Rules violated by the given selections. */
export function getViolatedRules(product: Product, selections: Selections): ConfigurationRule[] {
  return product.rules.filter(
    (rule) => matchesCondition(selections, rule.when) && matchesCondition(selections, rule.disallow),
  );
}

export interface SelectionChange {
  selections: Selections;
  /** Human-readable notes about sections that were automatically changed. */
  adjustments: string[];
}

/**
 * Applies a selection and resolves any rule it now violates by moving the
 * *other* section to the rule's `resolveTo` variant. The section the customer
 * just changed always wins.
 */
export function applySelection(
  product: Product,
  current: Selections,
  sectionId: string,
  variantId: string,
): SelectionChange {
  const next: Selections = { ...current, [sectionId]: variantId };
  const adjustments: string[] = [];

  for (const rule of product.rules) {
    if (rule.when.sectionId !== sectionId) continue;
    if (matchesCondition(next, rule.when) && matchesCondition(next, rule.disallow)) {
      const target = rule.disallow.sectionId;
      next[target] = rule.resolveTo;
      const section = getSection(product, target);
      const resolved = getVariant(product, target, rule.resolveTo);
      adjustments.push(`${section?.label ?? target} changed to "${resolved?.label ?? rule.resolveTo}". ${rule.message}`);
    }
  }

  return { selections: next, adjustments };
}

/** Variants in a section that would be auto-adjusted away by a rule (shown as hints). */
export function getConflictHint(
  product: Product,
  selections: Selections,
  sectionId: string,
  variantId: string,
): string | null {
  const { adjustments } = applySelection(product, selections, sectionId, variantId);
  return adjustments[0] ?? null;
}

/** Effective color of a panel (override or base). */
export function getPanelColor(config: ProductConfiguration, panelId: string): string {
  return config.colors.panels[panelId] ?? config.colors.base;
}
