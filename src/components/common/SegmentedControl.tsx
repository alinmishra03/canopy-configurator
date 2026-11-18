import type { ReactNode } from 'react';
import { cx } from '@/utils/cx';

interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
  className?: string;
}

interface SegmentedControlProps<T extends string> {
  value: T;
  options: SegmentedOption<T>[];
  onChange(value: T): void;
  label: string;
}

export function SegmentedControl<T extends string>({ value, options, onChange, label }: SegmentedControlProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-xl bg-ink-100 p-1">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={cx(
              'inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500',
              active ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-800',
              opt.className,
            )}
          >
            {opt.icon}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
