"use client";

import { useMemo } from "react";
import type { KioskCartLine, KioskMenu, KioskProduct } from "@/lib/kiosk";
import { cartSubtotal, formatMoney } from "@/lib/kiosk";

interface Props {
  menu: KioskMenu;
  cart: KioskCartLine[];
  onAdd: (product: KioskProduct) => void;
  onBack: () => void;
  onContinue: () => void;
}

const OFFER_CATEGORIES = new Set(["teas", "drinks"]);

export default function UpsellScreen({ menu, cart, onAdd, onBack, onContinue }: Props) {
  const offers = useMemo(
    () =>
      menu.products.filter((product) => {
        const inOfferCategory = product.categoryIds.some((id) => {
          const category = menu.categories.find((candidate) => candidate.id === id);
          return category ? OFFER_CATEGORIES.has(category.name.trim().toLowerCase()) : false;
        });
        return inOfferCategory && product.items[0] && product.items[0].price > 1;
      }),
    [menu],
  );

  const addedCount = cart.reduce((sum, line) => sum + (line.upsellQty ?? 0), 0);

  return (
    <div className="k-screen k-upsell">
      <div className="k-upsell-panel">
        <div className="k-upsell-heading">
          <div className="k-upsell-kicker">ONE MORE THING</div>
          <h2>Thirsty?</h2>
          <p>Add any iced tea or drink now and save <strong>$1 on each one.</strong></p>
        </div>

        <div className="k-upsell-grid">
          {offers.map((product) => {
            const item = product.items[0];
            if (!item) return null;
            const discountedPrice = item.price - 1;
            const added = cart
              .filter((line) => line.item.id === item.id)
              .reduce((sum, line) => sum + (line.upsellQty ?? 0), 0);
            return (
              <button className="k-upsell-card" key={product.id} onClick={() => onAdd(product)}>
                <span className="k-upsell-name">{product.name}</span>
                <span className="k-upsell-prices">
                  <del>{formatMoney(item.price)}</del>
                  <strong>{formatMoney(discountedPrice)}</strong>
                </span>
                <span className="k-upsell-add">{added ? `${added} added · Add another` : "Add to order"}</span>
              </button>
            );
          })}
        </div>

        <div className="k-upsell-footer">
          <div>
            <span className="k-upsell-count">{addedCount ? `${addedCount} offer item${addedCount === 1 ? "" : "s"} added` : "No thanks"}</span>
            <strong>{formatMoney(cartSubtotal(cart))}</strong>
          </div>
          <div className="k-panel-actions">
            <button className="k-btn k-btn-ghost" onClick={onBack}>Back</button>
            <button className="k-btn k-btn-primary" onClick={onContinue}>
              {addedCount ? "Continue to checkout" : "No thanks, continue"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}