import { CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { useUiStore } from '@/store/uiStore';
import { cx } from '@/utils/cx';

const icons = {
  info: <Info className="h-4 w-4 text-accent-500" aria-hidden />,
  success: <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden />,
  error: <XCircle className="h-4 w-4 text-red-600" aria-hidden />,
};

export function Toasts() {
  const toasts = useUiStore((s) => s.toasts);
  const dismiss = useUiStore((s) => s.dismissToast);
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex flex-col items-center gap-2 px-4 lg:bottom-6"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role={t.tone === 'error' ? 'alert' : 'status'}
          className={cx(
            'toast-enter pointer-events-auto flex w-full max-w-md items-start gap-2.5 rounded-xl border bg-white px-3.5 py-3 text-sm text-ink-800 shadow-lift',
            t.tone === 'error' ? 'border-red-200' : 'border-ink-200',
          )}
        >
          <span className="mt-0.5">{icons[t.tone]}</span>
          <p className="flex-1 break-words leading-snug">{t.message}</p>
          <button type="button" onClick={() => dismiss(t.id)} className="text-ink-400 hover:text-ink-700" aria-label="Dismiss notification">
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
