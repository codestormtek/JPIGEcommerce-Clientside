"use client";

import type { KioskCartLine, KioskMenu, KioskProduct } from "@/lib/kiosk";
import { formatMoney, preferredMenuItem } from "@/lib/kiosk";
import { selectPickupSuggestions } from "@/lib/pickup-suggestions";

interface PickupSuggestionsProps {
  menu: KioskMenu;
  cart: KioskCartLine[];
  onSelect: (product: KioskProduct) => void;
}

export default function PickupSuggestions({
  menu,
  cart,
  onSelect,
}: PickupSuggestionsProps) {
  const suggestions = selectPickupSuggestions(menu, cart);
  if (suggestions.length === 0) return null;

  return (
    <section className="jp-suggestions" aria-labelledby="pickup-suggestions-title">
      <div className="jp-suggestions-heading">
        <strong id="pickup-suggestions-title">Round it out?</strong>
        <span>Optional</span>
      </div>
      <div className="jp-suggestion-list">
        {suggestions.map((product) => {
          const item = preferredMenuItem(product);
          if (!item) return null;
          return (
            <button
              key={product.id}
              type="button"
              className="jp-suggestion"
              onClick={() => onSelect(product)}
              aria-label={`Add ${product.name} for ${formatMoney(item.price)}`}
            >
              <span>{product.name}</span>
              <strong>{formatMoney(item.price)}</strong>
            </button>
          );
        })}
      </div>
    </section>
  );
}