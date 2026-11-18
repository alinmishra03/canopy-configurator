import { ShoppingBag } from 'lucide-react';
import { formatMoney } from '@shared/utils/format';
import { useCommerceActions } from '@/hooks/useCommerceActions';
import { useCommerceStore } from '@/store/commerceStore';
import { Button } from '@/components/common/Button';

/** Compact sticky price + add-to-cart bar on small screens. */
export function MobileCheckoutBar() {
  const { quote, canCheckout, cartStatus, addToCart } = useCommerceActions();
  const status = useCommerceStore((s) => s.quoteStatus);

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-200 bg-white/95 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 backdrop-blur lg:hidden">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] text-ink-500">Total{quote && quote.quantity > 1 ? ` · ${quote.quantity} units` : ''}</p>
          <p className="text-lg font-bold tabular-nums text-ink-900" aria-live="polite">
            {quote ? formatMoney(quote.total) : status === 'error' ? 'Unavailable' : '…'}
          </p>
        </div>
        <Button
          variant="primary"
          size="lg"
          icon={<ShoppingBag className="h-4 w-4" />}
          onClick={() => void addToCart()}
          disabled={!canCheckout}
          loading={cartStatus === 'submitting'}
        >
          Add to Cart
        </Button>
      </div>
    </div>
  );
}
