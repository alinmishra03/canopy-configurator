import { useCallback, useState } from 'react';
import type { Quote } from '@shared/types';
import { configurationStore } from '@/store/configurationStore';
import { useCommerceStore } from '@/store/commerceStore';
import { useUiStore } from '@/store/uiStore';
import { ApiError } from '@/services/apiClient';
import { addConfigurationToCart } from '@/services/shopifyService';
import { saveConfiguration } from '@/services/configurationService';
import { downloadConfigurationPdf } from '@/services/pdfService';
import { pricingKey } from '@/services/pricingService';
import { viewerBridge } from '@/components/preview/viewerBridge';
import { postToParent } from '@/utils/embed';
import { useQuoteIsCurrent } from './usePricing';

/** Add-to-cart, PDF and save/share actions shared by the summary panel and mobile bar. */
export function useCommerceActions() {
  const quote = useCommerceStore((s) => s.quote);
  const cartStatus = useCommerceStore((s) => s.cartStatus);
  const quoteIsCurrent = useQuoteIsCurrent();
  const [pdfBusy, setPdfBusy] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const notify = useUiStore((s) => s.notify);

  const canCheckout = Boolean(quote && quote.valid && quoteIsCurrent && cartStatus !== 'submitting');

  const addToCart = useCallback(async () => {
    const { configuration } = configurationStore.getState();
    const commerce = useCommerceStore.getState();
    const current = commerce.quote;
    if (!current || commerce.quotedKey !== pricingKey(configuration)) return;
    commerce.setCartStatus('submitting');
    try {
      const { cart } = await addConfigurationToCart(configuration, current.total);
      commerce.setCart(cart);
      commerce.setCartStatus('idle');
      useUiStore.getState().setCartOpen(true);
      postToParent({ type: 'canopy:cart', configurationId: configuration.id, cartId: cart.id, checkoutUrl: cart.checkoutUrl });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Could not add to cart.';
      commerce.setCartStatus('error', message);
      if (err instanceof ApiError && err.code === 'price_changed') {
        const fresh = (err.details as { quote?: Quote } | undefined)?.quote;
        if (fresh) commerce.setQuote(fresh, pricingKey(configuration));
      }
      notify(message, 'error');
    }
  }, [notify]);

  const downloadPdf = useCallback(async () => {
    const { configuration, product } = configurationStore.getState();
    const current = useCommerceStore.getState().quote;
    if (!current) return;
    setPdfBusy(true);
    try {
      await downloadConfigurationPdf({ product, configuration, quote: current, previewImage: viewerBridge.capture() });
      notify('PDF downloaded.', 'success');
    } catch (err) {
      console.error(err);
      notify('PDF generation failed. Please try again.', 'error');
    } finally {
      setPdfBusy(false);
    }
  }, [notify]);

  const saveAndShare = useCallback(async () => {
    setSaveBusy(true);
    try {
      const { url, id } = await saveConfiguration(configurationStore.getState().configuration);
      let copied = false;
      try {
        await navigator.clipboard.writeText(url);
        copied = true;
      } catch {
        /* clipboard blocked (e.g. iframe without permission) */
      }
      notify(copied ? `Design ${id} saved. Link copied to clipboard.` : `Design saved: ${url}`, 'success');
      return url;
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Could not save the design.', 'error');
      return null;
    } finally {
      setSaveBusy(false);
    }
  }, [notify]);

  return { quote, quoteIsCurrent, canCheckout, cartStatus, addToCart, downloadPdf, pdfBusy, saveAndShare, saveBusy };
}
