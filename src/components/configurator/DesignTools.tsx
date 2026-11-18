import { Copy, Eraser, Image as ImageIcon, PenSquare, Type } from 'lucide-react';
import { formatMoney } from '@shared/utils/format';
import { useConfigurationStore } from '@/store/configurationStore';
import { useActivePanels, useAssets, usePanel, usePanelElements, useProduct } from '@/store/selectors';
import { useUiStore } from '@/store/uiStore';
import { useCommerceStore } from '@/store/commerceStore';
import { AddElementButtons } from '@/components/editor/AddElementButtons';
import { ElementInspector } from '@/components/editor/ElementInspector';
import { Button } from '@/components/common/Button';
import { cx } from '@/utils/cx';
import { PanelPicker } from './PanelPicker';

/** Sidebar design controls: panel choice, add elements, layer list and the inspector. */
export function DesignTools() {
  const panelId = useUiStore((s) => s.selectedPanelId);
  const selectedElementId = useUiStore((s) => s.selectedElementId);
  const selectElement = useUiStore((s) => s.selectElement);
  const viewMode = useUiStore((s) => s.viewMode);
  const setViewMode = useUiStore((s) => s.setViewMode);
  const notify = useUiStore((s) => s.notify);
  const panel = usePanel(panelId);
  const elements = usePanelElements(panelId);
  const assets = useAssets();
  const activePanels = useActivePanels();
  const copyPanelDesign = useConfigurationStore((s) => s.copyPanelDesign);
  const clearPanel = useConfigurationStore((s) => s.clearPanel);
  const artworkFee = useCommerceStore((s) => s.optionPrices?.customizations.artworkUpload);
  const maxUploadBytes = useProduct().limits.maxUploadBytes;

  const siblings = panel ? activePanels.filter((p) => p.group === panel.group && p.id !== panel.id) : [];

  return (
    <div className="space-y-4">
      {viewMode === '3d' && (
        <button
          type="button"
          onClick={() => setViewMode(window.matchMedia('(min-width: 1280px)').matches ? 'split' : '2d')}
          className="flex w-full items-center gap-3 rounded-xl border border-accent-100 bg-accent-50 px-3.5 py-3 text-left text-xs text-accent-700 hover:border-accent-500"
        >
          <PenSquare className="h-4 w-4 shrink-0" aria-hidden />
          <span>
            <span className="block font-semibold">Open the 2D design editor</span>
            Drag, resize and rotate artwork directly on each panel.
          </span>
        </button>
      )}

      <PanelPicker />

      <AddElementButtons />
      <p className="-mt-2 text-[11px] text-ink-500">
        PNG, JPG, WebP or SVG up to {Math.round(maxUploadBytes / 1048576)} MB. Text is free{artworkFee ? `; artwork setup ${formatMoney(artworkFee)} per file` : ''}.
      </p>

      {elements.length > 0 && panel && (
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <h3 className="text-xs font-semibold text-ink-800">Layers on {panel.label}</h3>
            <div className="flex gap-1">
              {siblings.length > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<Copy className="h-3.5 w-3.5" />}
                  onClick={() => {
                    copyPanelDesign(panel.id, siblings.map((p) => p.id));
                    notify(`Design copied to ${siblings.length} other ${siblings.length === 1 ? 'panel' : 'panels'}.`, 'success');
                  }}
                  title={`Copy this design to: ${siblings.map((p) => p.label).join(', ')}`}
                >
                  Copy to all
                </Button>
              )}
              <Button size="sm" variant="danger" icon={<Eraser className="h-3.5 w-3.5" />} onClick={() => clearPanel(panel.id)}>
                Clear
              </Button>
            </div>
          </div>
          <ul className="divide-y divide-ink-100 overflow-hidden rounded-xl border border-ink-200 bg-white">
            {[...elements].reverse().map((el) => {
              const active = el.id === selectedElementId;
              return (
                <li key={el.id}>
                  <button
                    type="button"
                    onClick={() => selectElement(panelId, el.id)}
                    aria-pressed={active}
                    className={cx(
                      'flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs transition-colors',
                      active ? 'bg-accent-50 text-accent-700' : 'text-ink-700 hover:bg-ink-50',
                    )}
                  >
                    {el.type === 'text' ? <Type className="h-3.5 w-3.5 shrink-0" aria-hidden /> : <ImageIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />}
                    <span className="truncate font-medium">
                      {el.type === 'text' ? el.text || '(empty text)' : assets[el.assetId]?.name ?? 'Image'}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <ElementInspector />
    </div>
  );
}
