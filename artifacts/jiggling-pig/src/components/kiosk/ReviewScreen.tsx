"use client";

import type { KioskCartLine } from "@/lib/kiosk";
import { cartLineKey, cartSubtotal, formatMoney, sidesUpcharge } from "@/lib/kiosk";

interface Props {
  cart: KioskCartLine[];
  customerName: string;
  customerPhone: string;
  onBack: () => void;
  onConfirm: () => void;
}

export default function ReviewScreen({
  cart,
  customerName,
  customerPhone,
  onBack,
  onConfirm,
}: Props) {
  const subtotal = cartSubtotal(cart);

  return (
    <div className="k-screen k-center">
      <div className="k-panel k-review-panel">
        <h2>Review your order</h2>

        <div className="k-review-customer">
          <div>
            <span>Order for</span>
            <strong>{customerName}</strong>
          </div>
          {customerPhone && (
            <div>
              <span>Phone</span>
              <strong>{customerPhone}</strong>
            </div>
          )}
        </div>

        <div className="k-summary" aria-label="Order summary">
          {cart.map((line) => {
            const key = cartLineKey(line.item.id, line.sides);
            const lineTotal =
              (line.item.price + sidesUpcharge(line.sides)) * line.qty -
              (line.upsellQty ?? 0) * (line.campaignDiscountAmount ?? 1);
            return (
              <div className="k-review-line" key={key}>
                <div className="k-summary-row">
                  <strong>
                    {line.qty}× {line.product.name}
                  </strong>
                  <span>{formatMoney(lineTotal)}</span>
                </div>
                {!!line.sides?.length && (
                  <div className="k-review-sides">
                    Sides: {line.sides.map((side) => side.name).join(", ")}
                  </div>
                )}
              </div>
            );
          })}

          <div className="k-review-totals">
            <div className="k-summary-row">
              <span>Subtotal</span>
              <span>{formatMoney(subtotal)}</span>
            </div>
            <div className="k-summary-row">
              <span>Tax</span>
              <span>{formatMoney(0)}</span>
            </div>
            <div className="k-summary-row total">
              <span>Total</span>
              <span>{formatMoney(subtotal)}</span>
            </div>
          </div>
        </div>

        <p className="k-review-tax-note">
          Your final amount is verified by the server before your card is charged.
        </p>

        <div className="k-panel-actions">
          <button className="k-btn k-btn-ghost" onClick={onBack}>
            Back
          </button>
          <button className="k-btn k-btn-primary" onClick={onConfirm}>
            Confirm &amp; Pay
          </button>
        </div>
      </div>
    </div>
  );
}