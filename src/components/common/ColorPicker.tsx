import { useId } from 'react';
import { Check, Pipette } from 'lucide-react';
import type { ColorSwatch } from '@shared/types';
import { isDarkColor } from '@shared/utils/format';
import { cx } from '@/utils/cx';

interface ColorPickerProps {
  value: string;
  palette: ColorSwatch[];
  label: string;
  /** Rapid changes (dragging the native picker) are coalesced into one undo step by the store. */
  onChange(hex: string): void;
  size?: 'sm' | 'md';
}

/** Curated swatches plus a native picker for any custom color. */
export function ColorPicker({ value, palette, label, onChange, size = 'md' }: ColorPickerProps) {
  const id = useId();
  const dim = size === 'sm' ? 'h-7 w-7' : 'h-8 w-8';
  const isCustom = !palette.some((s) => s.hex.toLowerCase() === value.toLowerCase());

  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap items-center gap-2">
      {palette.map((swatch) => {
        const active = swatch.hex.toLowerCase() === value.toLowerCase();
        return (
          <button
            key={swatch.hex}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={swatch.name}
            title={swatch.name}
            onClick={() => onChange(swatch.hex)}
            className={cx(
              dim,
              'relative rounded-full border border-black/10 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2',
              active && 'ring-2 ring-ink-900 ring-offset-2',
            )}
            style={{ backgroundColor: swatch.hex }}
          >
            {active && (
              <Check className={cx('absolute inset-0 m-auto h-3.5 w-3.5', isDarkColor(swatch.hex) ? 'text-white' : 'text-ink-900')} aria-hidden />
            )}
          </button>
        );
      })}
      <label
        htmlFor={id}
        title="Custom color"
        className={cx(
          dim,
          'relative flex cursor-pointer items-center justify-center overflow-hidden rounded-full border border-dashed border-ink-300 bg-white text-ink-500 hover:border-ink-500 focus-within:ring-2 focus-within:ring-accent-500',
          isCustom && 'border-solid ring-2 ring-ink-900 ring-offset-2',
        )}
        style={isCustom ? { backgroundColor: value } : undefined}
      >
        <Pipette className={cx('h-3.5 w-3.5', isCustom && (isDarkColor(value) ? 'text-white' : 'text-ink-900'))} aria-hidden />
        <span className="sr-only">Custom color for {label}</span>
        <input
          id={id}
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </label>
    </div>
  );
}
