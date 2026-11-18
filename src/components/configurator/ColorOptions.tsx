import { RotateCcw } from 'lucide-react';
import { formatMoney } from '@shared/utils/format';
import { useConfigurationStore } from '@/store/configurationStore';
import { usePanel, useProduct } from '@/store/selectors';
import { useUiStore } from '@/store/uiStore';
import { useCommerceStore } from '@/store/commerceStore';
import { ColorPicker } from '@/components/common/ColorPicker';
import { Button } from '@/components/common/Button';
import { PanelPicker } from './PanelPicker';

/** Canopy base color and per-panel color overrides. */
export function ColorOptions() {
  const product = useProduct();
  const base = useConfigurationStore((s) => s.configuration.colors.base);
  const overrides = useConfigurationStore((s) => s.configuration.colors.panels);
  const setBaseColor = useConfigurationStore((s) => s.setBaseColor);
  const setPanelColor = useConfigurationStore((s) => s.setPanelColor);
  const resetPanelColors = useConfigurationStore((s) => s.resetPanelColors);
  const selectedPanelId = useUiStore((s) => s.selectedPanelId);
  const panel = usePanel(selectedPanelId);
  const panelFee = useCommerceStore((s) => s.optionPrices?.customizations.panelColor);
  const panelColor = overrides[selectedPanelId] ?? base;
  const overrideCount = Object.keys(overrides).length;

  return (
    <div className="space-y-5">
      <div>
        <div className="mb-2 flex items-baseline justify-between">
          <h3 className="text-xs font-semibold text-ink-800">Canopy color</h3>
          <span className="font-mono text-[11px] uppercase text-ink-500">{base}</span>
        </div>
        <ColorPicker
          label="Canopy color"
          value={base}
          palette={product.palette}
          onChange={(hex) => setBaseColor(hex)}
        />
      </div>

      <div className="rounded-xl border border-ink-100 bg-ink-50/60 p-3.5">
        <div className="mb-2.5 flex items-start justify-between gap-2">
          <div>
            <h3 className="text-xs font-semibold text-ink-800">Individual panel colors</h3>
            <p className="text-[11px] text-ink-500">
              Pick a panel, then a color{panelFee ? ` (+${formatMoney(panelFee)} per custom panel)` : ''}.
            </p>
          </div>
          {overrideCount > 0 && (
            <Button size="sm" variant="ghost" icon={<RotateCcw className="h-3.5 w-3.5" />} onClick={resetPanelColors}>
              Reset all
            </Button>
          )}
        </div>
        <PanelPicker />
        {panel && (
          <div className="mt-3.5 border-t border-ink-200/70 pt-3.5">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-ink-700">{panel.label}</span>
              {overrides[panel.id] && (
                <button
                  type="button"
                  onClick={() => setPanelColor(panel.id, null)}
                  className="text-[11px] font-medium text-accent-600 hover:underline"
                >
                  Use canopy color
                </button>
              )}
            </div>
            <ColorPicker
              size="sm"
              label={`${panel.label} color`}
              value={panelColor}
              palette={product.palette}
              onChange={(hex) => setPanelColor(panel.id, hex)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
