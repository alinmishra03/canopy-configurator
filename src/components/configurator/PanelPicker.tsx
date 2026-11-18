import { useMemo } from 'react';
import type { PanelDefinition } from '@shared/types';
import { PANEL_GROUP_LABELS } from '@/config/product';
import { useConfigurationStore } from '@/store/configurationStore';
import { useActivePanels } from '@/store/selectors';
import { useUiStore } from '@/store/uiStore';
import { cx } from '@/utils/cx';

function shortLabel(panel: PanelDefinition): string {
  return panel.label.split(' - ').pop() ?? panel.label;
}

interface PanelPickerProps {
  /** compact = single scrollable row, used above the 2D canvas. */
  layout?: 'grouped' | 'compact';
}

/** Chooses the panel being designed. Shared selection with the 3D view (click a panel there). */
export function PanelPicker({ layout = 'grouped' }: PanelPickerProps) {
  const panels = useActivePanels();
  const selectedPanelId = useUiStore((s) => s.selectedPanelId);
  const selectPanel = useUiStore((s) => s.selectPanel);
  const designs = useConfigurationStore((s) => s.configuration.designs);
  const panelColors = useConfigurationStore((s) => s.configuration.colors.panels);
  const baseColor = useConfigurationStore((s) => s.configuration.colors.base);

  const groups = useMemo(() => {
    const map = new Map<string, PanelDefinition[]>();
    for (const p of panels) map.set(p.group, [...(map.get(p.group) ?? []), p]);
    return [...map.entries()];
  }, [panels]);

  const chip = (panel: PanelDefinition, label: string) => {
    const active = panel.id === selectedPanelId;
    const count = designs[panel.id]?.length ?? 0;
    return (
      <button
        key={panel.id}
        type="button"
        role="radio"
        aria-checked={active}
        onClick={() => selectPanel(panel.id)}
        title={panel.label}
        className={cx(
          'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500',
          active ? 'border-ink-900 bg-ink-900 text-white' : 'border-ink-200 bg-white text-ink-700 hover:border-ink-400',
        )}
      >
        <span
          className="h-3 w-3 rounded-full border border-black/10"
          style={{ backgroundColor: panelColors[panel.id] ?? baseColor }}
          aria-hidden
        />
        {label}
        {count > 0 && (
          <span className={cx('rounded px-1 text-[10px] font-semibold', active ? 'bg-white/20' : 'bg-ink-100 text-ink-600')}>
            {count}
          </span>
        )}
      </button>
    );
  };

  if (layout === 'compact') {
    return (
      <div role="radiogroup" aria-label="Panel to edit" className="scrollbar-none flex gap-1.5 overflow-x-auto">
        {panels.map((p) => chip(p, p.label.replace(' - ', ' ')))}
      </div>
    );
  }

  return (
    <div role="radiogroup" aria-label="Panel to edit" className="space-y-2.5">
      {groups.map(([group, list]) => (
        <div key={group}>
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-ink-400">{PANEL_GROUP_LABELS[group] ?? group}</div>
          <div className="flex flex-wrap gap-1.5">{list.map((p) => chip(p, shortLabel(p)))}</div>
        </div>
      ))}
    </div>
  );
}
