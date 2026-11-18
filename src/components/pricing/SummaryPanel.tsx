import { FileDown, Link2, ShoppingBag } from 'lucide-react';
import { describePanels, describeSelections } from '@shared/configuration';
import { useConfiguration, useProduct } from '@/store/selectors';
import { useCommerceActions } from '@/hooks/useCommerceActions';
import { Button } from '@/components/common/Button';
import { PriceBreakdown } from './PriceBreakdown';
import { QuantityStepper } from './QuantityStepper';

/** Right column: configuration summary, itemized pricing and purchase actions. */
export function SummaryPanel() {
  const product = useProduct();
  const configuration = useConfiguration();
  const { quote, canCheckout, cartStatus, addToCart, downloadPdf, pdfBusy, saveAndShare, saveBusy } = useCommerceActions();

  const selections = describeSelections(product, configuration);
  const customized = describePanels(product, configuration).filter(
    (p) => p.colorOverridden || p.texts.length > 0 || p.imageNames.length > 0,
  );

  return (
    <div className="flex flex-col gap-5 p-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">Your configuration</p>
        <h2 className="mt-0.5 text-base font-bold text-ink-900">{product.name}</h2>
        <p className="font-mono text-[11px] text-ink-500">ID {configuration.id}</p>
      </div>

      <dl className="space-y-2 rounded-xl bg-ink-50 p-3.5 text-xs">
        {selections.map((row) => (
          <div key={row.key} className="flex justify-between gap-3">
            <dt className="shrink-0 text-ink-500">{row.label}</dt>
            <dd className="text-right font-medium text-ink-900">{row.value}</dd>
          </div>
        ))}
        <div className="flex items-center justify-between gap-3">
          <dt className="text-ink-500">Canopy color</dt>
          <dd className="flex items-center gap-1.5 font-mono font-medium uppercase text-ink-900">
            <span className="h-3 w-3 rounded-full border border-black/10" style={{ backgroundColor: configuration.colors.base }} aria-hidden />
            {configuration.colors.base}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="shrink-0 text-ink-500">Customized panels</dt>
          <dd className="text-right font-medium text-ink-900">
            {customized.length === 0 ? 'None' : customized.map((p) => p.label.replace(' - ', ' ')).join(', ')}
          </dd>
        </div>
      </dl>

      <QuantityStepper />

      <PriceBreakdown />

      <div className="space-y-2">
        <Button
          variant="primary"
          size="lg"
          block
          icon={<ShoppingBag className="h-4 w-4" />}
          onClick={() => void addToCart()}
          disabled={!canCheckout}
          loading={cartStatus === 'submitting'}
        >
          Add to Cart
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button icon={<FileDown className="h-4 w-4" />} onClick={() => void downloadPdf()} loading={pdfBusy} disabled={!quote}>
            PDF
          </Button>
          <Button icon={<Link2 className="h-4 w-4" />} onClick={() => void saveAndShare()} loading={saveBusy}>
            Save link
          </Button>
        </div>
        {quote && !quote.valid && <p className="text-center text-[11px] text-red-700">Resolve the issues above to add to cart.</p>}
      </div>
    </div>
  );
}
