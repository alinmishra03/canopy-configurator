import { Minus, Plus } from 'lucide-react';
import { useConfigurationStore } from '@/store/configurationStore';
import { useProduct } from '@/store/selectors';
import { useCommerceStore } from '@/store/commerceStore';

export function QuantityStepper() {
  const product = useProduct();
  const quantity = useConfigurationStore((s) => s.configuration.quantity);
  const setQuantity = useConfigurationStore((s) => s.setQuantity);
  const discounts = useCommerceStore((s) => s.optionPrices?.volumeDiscounts);
  const { min, max } = product.quantity;

  return (
    <div className="flex items-center justify-between">
      <label htmlFor="quantity-input" className="text-xs font-semibold text-ink-800">
        Quantity
        {discounts && discounts.length > 0 && (
          <span className="block text-[11px] font-normal text-ink-500">
            {discounts.map((d) => `${Math.round(d.rate * 100)}% off ${d.minQuantity}+`).join(', ')}
          </span>
        )}
      </label>
      <div className="inline-flex h-9 items-center rounded-xl border border-ink-200 bg-white">
        <button
          type="button"
          aria-label="Decrease quantity"
          disabled={quantity <= min}
          onClick={() => setQuantity(quantity - 1)}
          className="flex h-full w-9 items-center justify-center text-ink-600 hover:text-ink-900 disabled:text-ink-300"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <input
          id="quantity-input"
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={quantity}
          onChange={(e) => {
            const value = Number(e.target.value);
            if (Number.isFinite(value) && value > 0) setQuantity(value);
          }}
          className="h-full w-10 border-x border-ink-200 text-center text-sm font-semibold tabular-nums focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
        />
        <button
          type="button"
          aria-label="Increase quantity"
          disabled={quantity >= max}
          onClick={() => setQuantity(quantity + 1)}
          className="flex h-full w-9 items-center justify-center text-ink-600 hover:text-ink-900 disabled:text-ink-300"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
