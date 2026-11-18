import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  ArrowDown,
  ArrowUp,
  Bold,
  Copy,
  Image as ImageIcon,
  Trash2,
  Type,
} from 'lucide-react';
import type { DesignElement, PanelDefinition } from '@shared/types';
import { useConfigurationStore } from '@/store/configurationStore';
import { useAssets, useElement, usePanel, useProduct } from '@/store/selectors';
import { useUiStore } from '@/store/uiStore';
import { ColorPicker } from '@/components/common/ColorPicker';
import { IconButton } from '@/components/common/Button';
import { Slider } from '@/components/common/Slider';

const TEXT_SWATCHES = [
  { name: 'White', hex: '#ffffff' },
  { name: 'Black', hex: '#1b1a18' },
  { name: 'Red', hex: '#c8202f' },
  { name: 'Blue', hex: '#1f4fbf' },
  { name: 'Yellow', hex: '#f2b705' },
  { name: 'Green', hex: '#1f6b45' },
];

const inches = (v: number) => `${v.toFixed(1)}"`;
const percent = (v: number) => `${Math.round(v * 100)}%`;

/** Precise, accessible controls for the selected text or image element. */
export function ElementInspector() {
  const product = useProduct();
  const panelId = useUiStore((s) => s.selectedPanelId);
  const elementId = useUiStore((s) => s.selectedElementId);
  const panel = usePanel(panelId);
  const element = useElement(panelId, elementId);

  if (!panel || !element) {
    return (
      <p className="rounded-xl border border-dashed border-ink-200 px-3 py-4 text-center text-xs leading-relaxed text-ink-500">
        Select text or an image on the canvas to edit it, or add a new element above.
      </p>
    );
  }
  return <InspectorBody key={element.id} panel={panel} element={element} fonts={product.fonts} maxText={product.limits.maxTextLength} />;
}

interface BodyProps {
  panel: PanelDefinition;
  element: DesignElement;
  fonts: string[];
  maxText: number;
}

function InspectorBody({ panel, element, fonts, maxText }: BodyProps) {
  const assets = useAssets();
  const updateElement = useConfigurationStore((s) => s.updateElement);
  const removeElement = useConfigurationStore((s) => s.removeElement);
  const duplicateElement = useConfigurationStore((s) => s.duplicateElement);
  const moveElementLayer = useConfigurationStore((s) => s.moveElementLayer);
  const elementCount = useConfigurationStore((s) => s.configuration.designs[panel.id]?.length ?? 0);
  const elementIndex = useConfigurationStore((s) => s.configuration.designs[panel.id]?.findIndex((e) => e.id === element.id) ?? 0);
  const selectElement = useUiStore((s) => s.selectElement);
  const clearSelection = useUiStore((s) => s.clearElementSelection);

  const update = (patch: Partial<DesignElement>, transient = false) => updateElement(panel.id, element.id, patch, { transient });

  return (
    <div className="space-y-4 rounded-xl border border-ink-200 bg-white p-3.5">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-800">
          {element.type === 'text' ? <Type className="h-3.5 w-3.5" aria-hidden /> : <ImageIcon className="h-3.5 w-3.5" aria-hidden />}
          {element.type === 'text' ? 'Text' : assets[element.assetId]?.name ?? 'Image'}
        </span>
        <div className="flex items-center">
          <IconButton size="sm" label="Bring forward" disabled={elementIndex >= elementCount - 1} onClick={() => moveElementLayer(panel.id, element.id, 'up')}>
            <ArrowUp className="h-4 w-4" />
          </IconButton>
          <IconButton size="sm" label="Send backward" disabled={elementIndex <= 0} onClick={() => moveElementLayer(panel.id, element.id, 'down')}>
            <ArrowDown className="h-4 w-4" />
          </IconButton>
          <IconButton
            size="sm"
            label="Duplicate"
            onClick={() => {
              const id = duplicateElement(panel.id, element.id);
              if (id) selectElement(panel.id, id);
            }}
          >
            <Copy className="h-4 w-4" />
          </IconButton>
          <IconButton
            size="sm"
            label="Delete element"
            className="hover:bg-red-50 hover:text-red-700"
            onClick={() => {
              removeElement(panel.id, element.id);
              clearSelection();
            }}
          >
            <Trash2 className="h-4 w-4" />
          </IconButton>
        </div>
      </div>

      {element.type === 'text' && (
        <>
          <div>
            <label htmlFor="element-text-input" className="mb-1.5 block text-xs font-medium text-ink-600">
              Text
            </label>
            <textarea
              id="element-text-input"
              rows={2}
              maxLength={maxText}
              value={element.text}
              onChange={(e) => update({ text: e.target.value })}
              className="w-full resize-y rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-900 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20"
            />
          </div>
          <div className="flex gap-2">
            <label className="sr-only" htmlFor="element-font">
              Font
            </label>
            <select
              id="element-font"
              value={element.fontFamily}
              onChange={(e) => update({ fontFamily: e.target.value })}
              className="h-9 min-w-0 flex-1 rounded-lg border border-ink-200 bg-white px-2.5 text-sm focus:border-accent-500 focus:outline-none"
              style={{ fontFamily: element.fontFamily }}
            >
              {fonts.map((f) => (
                <option key={f} value={f} style={{ fontFamily: f }}>
                  {f}
                </option>
              ))}
            </select>
            <IconButton
              label="Bold"
              active={element.fontWeight === 700}
              onClick={() => update({ fontWeight: element.fontWeight === 700 ? 400 : 700 })}
              className="border border-ink-200"
            >
              <Bold className="h-4 w-4" />
            </IconButton>
          </div>
          <Slider
            label="Text size (cap height approx.)"
            value={element.fontSize * panel.heightIn}
            min={1}
            max={Math.min(40, panel.heightIn)}
            step={0.5}
            format={inches}
            onChange={(v, transient) => update({ fontSize: v / panel.heightIn }, transient)}
          />
          <div>
            <span className="mb-1.5 block text-xs font-medium text-ink-600">Text color</span>
            <ColorPicker size="sm" label="Text color" value={element.color} palette={TEXT_SWATCHES} onChange={(hex) => update({ color: hex })} />
          </div>
        </>
      )}

      {element.type === 'image' && (
        <Slider
          label="Image width"
          value={element.width * panel.widthIn}
          min={4}
          max={panel.widthIn * 1.2}
          step={0.5}
          format={inches}
          onChange={(v, transient) => update({ width: v / panel.widthIn }, transient)}
        />
      )}

      <Slider
        label="Rotation"
        value={element.rotation > 180 ? element.rotation - 360 : element.rotation}
        min={-180}
        max={180}
        format={(v) => `${Math.round(v)}°`}
        onChange={(v, transient) => update({ rotation: v }, transient)}
      />
      <div className="grid grid-cols-2 gap-3">
        <Slider label="Horizontal" value={element.x} min={0} max={1} step={0.005} format={percent} onChange={(v, t) => update({ x: v }, t)} />
        <Slider label="Vertical" value={element.y} min={0} max={1} step={0.005} format={percent} onChange={(v, t) => update({ y: v }, t)} />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => update({ x: 0.5 })}
          className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg border border-ink-200 text-xs font-medium text-ink-700 hover:bg-ink-50"
        >
          <AlignCenterVertical className="h-3.5 w-3.5" aria-hidden /> Center horizontally
        </button>
        <button
          type="button"
          onClick={() => update({ y: panel.shape === 'triangle' ? 0.66 : 0.5 })}
          className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg border border-ink-200 text-xs font-medium text-ink-700 hover:bg-ink-50"
        >
          <AlignCenterHorizontal className="h-3.5 w-3.5" aria-hidden /> Center vertically
        </button>
      </div>
    </div>
  );
}
