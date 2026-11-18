import { AlertCircle, Loader2, RefreshCw, ShieldCheck } from 'lucide-react';
import type { PriceCategory, Quote } from '@shared/types';
import { formatMoney } from '@shared/utils/format';
import { useCommerceStore } from '@/store/commerceStore';
import { refreshQuote } from '@/hooks/usePricing';
import { cx } from '@/utils/cx';

const CATEGORY_ORDER: PriceCategory[] = ['base', 'frame', 'sideWalls', 'halfWalls', 'printing', 'customization'];
const CATEGORY_LABELS: Record<PriceCategory, string> = {
  base: 'Base product',
  frame: 'Frame',
  sideWalls: 'Side walls',
  halfWalls: 'Half walls',
  printing: 'Printing',
  customization: 'Customization',
};

function groupLines(quote: Quote) {
  return CATEGORY_ORDER.map((category) => ({
    category,
    lines: quote.lines.filter((l) => l.category === category),
  })).filter((g) => g.lines.length > 0);
}

/** Itemized server quote with loading, error and validation states. */
export function PriceBreakdown() {
  const quote = useCommerceStore((s) => s.quote);
  const status = useCommerceStore((s) => s.quoteStatus);
  const error = useCommerceStore((s) => s.quoteError);

  if (!quote) {
    return status === 'error' ? (
      <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800" role="alert">
        <p className="font-semibold">Pricing unavailable</p>
        <p className="mt-0.5">{error}</p>
        <button type="button" onClick={() => void refreshQuote()} className="mt-2 inline-flex items-center gap-1 font-semibold underline">
          <RefreshCw className="h-3 w-3" aria-hidden /> Retry
        </button>
      </div>
    ) : (
      <div className="space-y-2" aria-busy="true" aria-label="Loading price">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-4 animate-pulse rounded bg-ink-100" />
        ))}
      </div>
    );
  }

  const errors = quote.issues.filter((i) => i.severity === 'error');
  const warnings = quote.issues.filter((i) => i.severity === 'warning');
  const updating = status === 'loading';

  return (
    <div className={cx('transition-opacity', updating && 'opacity-60')} aria-busy={updating}>
      <dl className="space-y-3">
        {groupLines(quote).map(({ category, lines }) => (
          <div key={category}>
            <dt className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-ink-400">{CATEGORY_LABELS[category]}</dt>
            {lines.map((line) => (
              <dd key={line.sku} className="flex items-start justify-between gap-3 py-0.5 text-xs">
                <span className="text-ink-700">
                  {line.label}
                  {line.quantity > 1 && <span className="text-ink-400"> × {line.quantity}</span>}
                </span>
                <span className="shrink-0 font-medium tabular-nums text-ink-900">{formatMoney(line.amount)}</span>
              </dd>
            ))}
          </div>
        ))}
      </dl>

      <div className="mt-4 space-y-1.5 border-t border-ink-100 pt-3 text-xs">
        <div className="flex justify-between text-ink-600">
          <span>Price per canopy</span>
          <span className="tabular-nums">{formatMoney(quote.unitPrice)}</span>
        </div>
        {quote.quantity > 1 && (
          <div className="flex justify-between text-ink-600">
            <span>Subtotal ({quote.quantity} units)</span>
            <span className="tabular-nums">{formatMoney(quote.subtotal)}</span>
          </div>
        )}
        {quote.discount && (
          <div className="flex justify-between text-emerald-700">
            <span>{quote.discount.label}</span>
            <span className="tabular-nums">−{formatMoney(quote.discount.amount)}</span>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-end justify-between">
        <span className="text-sm font-semibold text-ink-900">Total</span>
        <span className="flex items-center gap-2 text-2xl font-bold tracking-tight tabular-nums text-ink-900" aria-live="polite">
          {updating && <Loader2 className="h-4 w-4 animate-spin text-ink-400" aria-label="Updating price" />}
          {formatMoney(quote.total)}
        </span>
      </div>
      <p className="mt-1 flex items-center gap-1 text-[11px] text-ink-500">
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
        Server-verified · sample price book {quote.priceBookVersion} · tax & shipping at checkout
      </p>

      {status === 'error' && (
        <p className="mt-2 flex items-center gap-1 text-[11px] text-red-700" role="alert">
          <AlertCircle className="h-3.5 w-3.5" aria-hidden /> {error}{' '}
          <button type="button" className="font-semibold underline" onClick={() => void refreshQuote()}>
            Retry
          </button>
        </p>
      )}

      {(errors.length > 0 || warnings.length > 0) && (
        <ul className="mt-3 space-y-1.5">
          {[...errors, ...warnings].map((issue, i) => (
            <li
              key={`${issue.code}-${i}`}
              className={cx(
                'flex gap-1.5 rounded-lg px-2.5 py-2 text-[11px] leading-snug',
                issue.severity === 'error' ? 'bg-red-50 text-red-800' : 'bg-amber-50 text-amber-800',
              )}
            >
              <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
              {issue.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
