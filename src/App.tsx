import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { activeProduct } from '@/config/product';
import { useCommerceStore } from '@/store/commerceStore';
import { useUiStore } from '@/store/uiStore';
import { usePersistence } from '@/hooks/usePersistence';
import { usePricingSync } from '@/hooks/usePricing';
import { useAdjustmentNotices, useFontLoading, useKeyboardShortcuts, useSelectionGuards } from '@/hooks/useAppEffects';
import { fetchOptionPrices } from '@/services/pricingService';
import { fetchCart } from '@/services/shopifyService';
import { postToParent } from '@/utils/embed';
import { AppHeader } from '@/components/common/AppHeader';
import { Toasts } from '@/components/common/Toasts';
import { ConfiguratorSidebar } from '@/components/configurator/ConfiguratorSidebar';
import { PreviewStage } from '@/components/preview/PreviewStage';
import { SummaryPanel } from '@/components/pricing/SummaryPanel';
import { CartDrawer } from '@/components/pricing/CartDrawer';
import { MobileCheckoutBar } from '@/components/pricing/MobileCheckoutBar';

function useBootstrap() {
  useEffect(() => {
    const loadOptionPrices = () =>
      fetchOptionPrices(activeProduct.id)
        .then((prices) => useCommerceStore.getState().setOptionPrices(prices))
        .catch(() => {
          /* option cards omit prices until the API is reachable; the quote shows the error */
        });
    void loadOptionPrices();
    // If the API was unreachable at startup, load option prices once a quote succeeds.
    const unsubscribePrices = useCommerceStore.subscribe((state, prev) => {
      if (!state.optionPrices && state.quoteStatus === 'ready' && prev.quoteStatus !== 'ready') void loadOptionPrices();
    });
    fetchCart().then((cart) => cart && useCommerceStore.getState().setCart(cart));
    postToParent({ type: 'canopy:ready', productId: activeProduct.id });

    // Split view needs a wide screen; fall back to the 2D editor when narrowed.
    const wide = window.matchMedia('(min-width: 1280px)');
    const onChange = () => {
      if (!wide.matches && useUiStore.getState().viewMode === 'split') useUiStore.getState().setViewMode('2d');
    };
    wide.addEventListener('change', onChange);
    return () => {
      wide.removeEventListener('change', onChange);
      unsubscribePrices();
    };
  }, []);
}

export default function App() {
  const ready = usePersistence();
  usePricingSync();
  useBootstrap();
  useFontLoading(activeProduct.fonts);
  useSelectionGuards();
  useAdjustmentNotices();
  useKeyboardShortcuts();

  if (!ready) {
    return (
      <div className="flex h-dvh items-center justify-center gap-2 bg-ink-50 text-sm text-ink-500">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading your design…
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-ink-50 text-ink-900 lg:h-dvh lg:min-h-0">
      <AppHeader />
      <main className="flex flex-1 flex-col pb-24 lg:grid lg:min-h-0 lg:grid-cols-[320px_minmax(0,1fr)_320px] lg:pb-0 xl:grid-cols-[360px_minmax(0,1fr)_350px]">
        <section
          aria-label="Product preview"
          className="order-1 h-[62vh] min-h-[380px] border-b border-ink-200 bg-white lg:order-2 lg:h-auto lg:min-h-0 lg:border-b-0"
        >
          <PreviewStage />
        </section>
        <aside
          aria-label="Customize your canopy"
          className="order-2 border-ink-200 bg-white lg:order-1 lg:min-h-0 lg:overflow-y-auto lg:border-r"
        >
          <ConfiguratorSidebar />
        </aside>
        <aside
          aria-label="Configuration summary and price"
          className="order-3 mt-2 border-t border-ink-200 bg-white lg:mt-0 lg:min-h-0 lg:overflow-y-auto lg:border-l lg:border-t-0"
        >
          <SummaryPanel />
        </aside>
      </main>
      <MobileCheckoutBar />
      <CartDrawer />
      <Toasts />
    </div>
  );
}
