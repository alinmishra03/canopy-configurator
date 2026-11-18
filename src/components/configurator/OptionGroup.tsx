import { AlertTriangle, Check } from 'lucide-react';
import type { ProductSection } from '@shared/types';
import { getConflictHint } from '@shared/configuration';
import { formatMoney } from '@shared/utils/format';
import { useConfigurationStore } from '@/store/configurationStore';
import { useProduct, useSelections } from '@/store/selectors';
import { useCommerceStore } from '@/store/commerceStore';
import { cx } from '@/utils/cx';

interface OptionGroupProps {
  section: ProductSection;
}

/** Single-choice option cards for one product section (Size, Side Walls, Half Walls). */
export function OptionGroup({ section }: OptionGroupProps) {
  const product = useProduct();
  const selections = useSelections();
  const selectVariant = useConfigurationStore((s) => s.selectVariant);
  const prices = useCommerceStore((s) => s.optionPrices?.variants[section.id]);
  const selected = selections[section.id];

  return (
    <div>
      {section.description && <p className="mb-3 text-xs leading-relaxed text-ink-500">{section.description}</p>}
      <div role="radiogroup" aria-label={section.label} className="grid gap-2">
        {section.variants.map((variant) => {
          const active = variant.id === selected;
          const conflict = active ? null : getConflictHint(product, selections, section.id, variant.id);
          const price = prices?.[variant.id];
          return (
            <button
              key={variant.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => selectVariant(section.id, variant.id)}
              className={cx(
                'group relative flex w-full items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500',
                active
                  ? 'border-ink-900 bg-white shadow-panel ring-1 ring-ink-900'
                  : 'border-ink-200 bg-white hover:border-ink-400',
              )}
            >
              <span
                className={cx(
                  'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors',
                  active ? 'border-ink-900 bg-ink-900' : 'border-ink-300 bg-white group-hover:border-ink-500',
                )}
                aria-hidden
              >
                {active && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-semibold leading-snug text-ink-900">{variant.label}</span>
                {variant.description && <span className="mt-0.5 block text-xs leading-snug text-ink-500">{variant.description}</span>}
                {conflict && (
                  <span className="mt-1.5 flex items-start gap-1 text-[11px] leading-snug text-amber-700">
                    <AlertTriangle className="mt-px h-3 w-3 shrink-0" aria-hidden />
                    {conflict.split('.')[0]}
                  </span>
                )}
              </span>
              <span className="shrink-0 text-xs font-semibold tabular-nums text-ink-700">
                {price === undefined ? '' : price === 0 ? 'Included' : section.id === 'size' ? formatMoney(price) : `+${formatMoney(price)}`}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
