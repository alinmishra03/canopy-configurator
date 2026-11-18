import { useId, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cx } from '@/utils/cx';

interface CollapsibleSectionProps {
  step?: number;
  title: string;
  summary?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

/** Accordion section used for each group of customization controls. */
export function CollapsibleSection({ step, title, summary, defaultOpen = true, children }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const contentId = useId();
  return (
    <section className="border-b border-ink-100 last:border-b-0">
      <h2>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={contentId}
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center gap-3 px-5 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-500"
        >
          {step !== undefined && (
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink-900 text-[11px] font-bold text-white">
              {step}
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-ink-900">{title}</span>
            {summary && !open && <span className="block truncate text-xs text-ink-500">{summary}</span>}
          </span>
          <ChevronDown className={cx('h-4 w-4 text-ink-400 transition-transform', open && 'rotate-180')} aria-hidden />
        </button>
      </h2>
      <div id={contentId} hidden={!open} className="px-5 pb-5">
        {children}
      </div>
    </section>
  );
}
