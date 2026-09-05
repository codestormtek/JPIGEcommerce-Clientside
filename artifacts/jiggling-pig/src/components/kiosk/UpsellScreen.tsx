"use client";

import { useMemo } from "react";
import type { KioskCartLine, KioskCampaign, KioskProduct } from "@/lib/kiosk";
import { cartSubtotal, formatMoney } from "@/lib/kiosk";

interface Props {
  campaigns: KioskCampaign[];
  cart: KioskCartLine[];
  onAdd: (product: KioskProduct, campaign: KioskCampaign) => void;
  onBack: () => void;
  onContinue: () => void;
}

export default function UpsellScreen({ campaigns, cart, onAdd, onBack, onContinue }: Props) {
  // If there are multiple active upsell campaigns, we take the highest priority one.
  const activeCampaign = useMemo(() => {
    return campaigns.sort((a, b) => b.priority - a.priority)[0] || null;
  }, [campaigns]);

  const addedCount = cart.reduce((sum, line) => sum + (line.upsellQty ?? 0), 0);

  if (!activeCampaign) {
    // Failsafe, shouldn't reach here if handled correctly in router
    return null;
  }

  const { title, body, amountOff, products } = activeCampaign;

  return (
    <div className="k-screen k-upsell">
      <div className="k-upsell-panel">
        <div className="k-upsell-heading">
          <div className="k-upsell-kicker">ONE MORE THING</div>
          <h2>{title || "Wait! Don't miss this"}</h2>
          <p>{body || `Add an item now and save ${amountOff ? formatMoney(amountOff) : ''}.`}</p>
        </div>

        <div className="k-upsell-grid">
          {products.map((product) => {
            const item = product.items[0];
            if (!item) return null;
            const discountedPrice = Math.max(0, item.price - (amountOff || 0));
            const added = cart
              .filter((line) => line.item.id === item.id && line.campaignId === activeCampaign.id)
              .reduce((sum, line) => sum + (line.upsellQty ?? 0), 0);

            return (
              <button className="k-upsell-card" key={product.id} onClick={() => onAdd(product, activeCampaign)}>
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