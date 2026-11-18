import { Trash2 } from 'lucide-react';
import { useConfigurationStore } from '@/store/configurationStore';
import { usePanel, usePanelDoubleSided } from '@/store/selectors';
import { useUiStore } from '@/store/uiStore';
import { useElementSize } from '@/hooks/useElementSize';
import { PanelPicker } from '@/components/configurator/PanelPicker';
import { IconButton } from '@/components/common/Button';
import type { PanelDefinition } from '@shared/types';
import { DesignCanvas } from './DesignCanvas';
import { AddElementButtons } from './AddElementButtons';

function PanelMeta({ panel }: { panel: PanelDefinition }) {
  const doubleSided = usePanelDoubleSided(panel);
  const feet = (inches: number) => `${Math.round((inches / 12) * 10) / 10} ft`;
  return (
    <span>
      {panel.label} · {feet(panel.widthIn)} × {feet(panel.heightIn)}
      {panel.group === 'sideWall' || panel.group === 'halfWall' ? (doubleSided ? ' · double-sided print' : ' · single-sided print') : ''}
    </span>
  );
}

/** The 2D design surface: panel tabs, Konva canvas and quick actions. */
export function DesignEditor2D() {
  const [containerRef, size] = useElementSize<HTMLDivElement>();
  const panelId = useUiStore((s) => s.selectedPanelId);
  const selectedElementId = useUiStore((s) => s.selectedElementId);
  const clearSelection = useUiStore((s) => s.clearElementSelection);
  const removeElement = useConfigurationStore((s) => s.removeElement);
  const panel = usePanel(panelId);

  return (
    <div className="flex h-full min-h-0 flex-col bg-[radial-gradient(circle_at_center,#ffffff_0%,#f3f2ef_100%)]">
      <div className="flex flex-col gap-2 border-b border-ink-100 bg-white/80 px-3 py-2.5 backdrop-blur sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <PanelPicker layout="compact" />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="w-60">
            <AddElementButtons size="sm" />
          </div>
          <IconButton
            size="sm"
            label="Delete selected element"
            disabled={!selectedElementId}
            onClick={() => {
              if (selectedElementId) {
                removeElement(panelId, selectedElementId);
                clearSelection();
              }
            }}
          >
            <Trash2 className="h-4 w-4" />
          </IconButton>
        </div>
      </div>
      <div ref={containerRef} className="relative min-h-0 flex-1 touch-none" aria-label="2D panel design canvas">
        {panel && size.width > 0 && size.height > 0 && <DesignCanvas panel={panel} width={size.width} height={size.height} />}
      </div>
      {panel && (
        <div className="flex items-center justify-between gap-2 border-t border-ink-100 bg-white/70 px-3 py-2 text-[11px] text-ink-500">
          <PanelMeta panel={panel} />
          <span className="hidden sm:inline">Drag to move · corners to resize · Del to remove</span>
        </div>
      )}
    </div>
  );
}
