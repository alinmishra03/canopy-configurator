import { useId } from 'react';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  format?: (value: number) => string;
  /** `transient` is true while dragging; false on release / keyboard. */
  onChange(value: number, transient: boolean): void;
}

export function Slider({ label, value, min, max, step = 1, format, onChange }: SliderProps) {
  const id = useId();
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label htmlFor={id} className="text-xs font-medium text-ink-600">
          {label}
        </label>
        <span className="font-mono text-[11px] tabular-nums text-ink-500">{format ? format(value) : value}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value), true)}
        onPointerUp={(e) => onChange(Number((e.target as HTMLInputElement).value), false)}
        onKeyUp={(e) => onChange(Number((e.target as HTMLInputElement).value), false)}
        className="range-input w-full"
      />
    </div>
  );
}
