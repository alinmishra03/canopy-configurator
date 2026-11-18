import { useEffect, useRef } from 'react';
import { ExternalLink, Info, X } from 'lucide-react';
import { formatMoney } from '@shared/utils/format';
import { useCommerceStore } from '@/store/commerceStore';
import { useUiStore } from '@/store/uiStore';
import { Button } from '@/components/common/Button';

/**
 * Shows the cart returned by the server. In mock mode it is explicit that no
 * live Shopify store is connected, and shows the Storefront request that would
 * be sent, instead of a fake checkout link.
 */
export function CartDrawer() {
  const open = useUiStore((s) => s.cartOpen);
  const setOpen = useUiStore((s) => s.setCartOpen);
  const cart = useCommerceStore((s) => s.cart);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, setOpen]);

  if (!open || !cart) return null;
  const isMock = cart.mode === 'mock';

  return (
    <div className="fixed inset-0 z-40 flex justify-end" role="dialog" aria-modal="true" aria-labelledby="cart-title">
      <button type="button" className="absolute inset-0 bg-ink-900/30 backdrop-blur-[1px]" aria-label="Close cart" onClick={() => setOpen(false)} />
      <aside className="drawer-enter relative flex h-full w-full max-w-md flex-col bg-white shadow-lift">
        <header className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
          <div>
            <h2 id="cart-title" className="text-base font-bold text-ink-900">
              Cart
            </h2>
            <p className="text-[11px] text-ink-500">
              {cart.totalQuantity} {cart.totalQuantity === 1 ? 'canopy' : 'canopies'}
            </p>
          </div>
          <button ref={closeRef} type="button" onClick={() => setOpen(false)} className="rounded-lg p-2 text-ink-500 hover:bg-ink-100" aria-label="Close cart">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {isMock && (
            <div className="flex gap-2 rounded-xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-900 ring-1 ring-amber-200">
              <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <p>
                <strong>Mock Shopify adapter.</strong> No live store is connected, so this cart exists only on the local server.
                Set <code>SHOPIFY_STORE_DOMAIN</code> and <code>SHOPIFY_STOREFRONT_TOKEN</code> on the server to create real Storefront carts.
              </p>
            </div>
          )}

          {cart.items.map((item) => (
            <article key={item.id} className="rounded-xl border border-ink-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-ink-900">{item.title}</h3>
                  <p className="font-mono text-[11px] text-ink-500">{item.configurationId}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold tabular-nums text-ink-900">{formatMoney(item.total)}</p>
                  <p className="text-[11px] text-ink-500">Qty {item.quantity}</p>
                </div>
              </div>
              <dl className="mt-3 space-y-1 text-[11px]">
                {item.summary.map((a) => (
                  <div key={a.key} className="flex justify-between gap-3">
                    <dt className="text-ink-500">{a.key}</dt>
                    <dd className="text-right text-ink-800">{a.value}</dd>
                  </div>
                ))}
              </dl>
              <details className="mt-3 text-[11px]">
                <summary className="cursor-pointer font-medium text-ink-600">{item.lines.length} Shopify cart lines</summary>
                <ul className="mt-2 space-y-1">
                  {item.lines.map((l) => (
                    <li key={l.sku} className="flex justify-between gap-2 font-mono text-[10px] text-ink-600">
                      <span className="truncate">{l.merchandiseId}</span>
                      <span>× {l.quantity}</span>
                    </li>
                  ))}
                </ul>
              </details>
            </article>
          ))}

          <details className="rounded-xl bg-ink-50 p-3 text-[11px]">
            <summary className="cursor-pointer font-semibold text-ink-700">
              Storefront API request {isMock ? '(would be sent)' : '(sent)'}
            </summary>
            <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-all font-mono text-[10px] leading-relaxed text-ink-700">
              {JSON.stringify(cart.storefrontRequest, null, 2)}
            </pre>
          </details>
        </div>

        <footer className="space-y-3 border-t border-ink-100 px-5 py-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-ink-700">Cart total</span>
            <span className="text-xl font-bold tabular-nums text-ink-900">{formatMoney(cart.total)}</span>
          </div>
          {cart.checkoutUrl ? (
            <a
              href={cart.checkoutUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-ink-900 text-[15px] font-semibold text-white hover:bg-ink-800"
            >
              Proceed to checkout <ExternalLink className="h-4 w-4" aria-hidden />
            </a>
          ) : (
            <>
              <Button variant="primary" size="lg" block disabled>
                Checkout unavailable in mock mode
              </Button>
              <p className="text-center text-[11px] text-ink-500">A live Shopify store returns a real checkout URL here.</p>
            </>
          )}
          <Button variant="ghost" block onClick={() => setOpen(false)}>
            Continue designing
          </Button>
        </footer>
      </aside>
    </div>
  );
}
