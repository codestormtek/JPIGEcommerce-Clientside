"use client";

import { useState } from "react";
import type { KioskCartLine } from "@/lib/kiosk";
import { cartLineKey, cartSubtotal, formatMoney, sidesUpcharge } from "@/lib/kiosk";

interface Props {
  cart: KioskCartLine[];
  initialName: string;
  initialPhone: string;
  onBack: () => void;
  onContinue: (name: string, phone: string) => void;
}

export default function DetailsScreen({ cart, initialName, initialPhone, onBack, onContinue }: Props) {
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);

  const subtotal = cartSubtotal(cart);

  return (
    <div className="k-screen k-center">
      <div className="k-panel">
        <h2>Who&apos;s this order for?</h2>

        <label>
          Name (we&apos;ll call it out)
          <input
            className="k-input"
            type="text"
            placeholder="First name"
            value={name}
            maxLength={100}
            onChange={(e) => setName(e.target.value)}
            autoCapitalize="words"
            autoCorrect="off"
          />
        </label>

        <label>
          Phone (optional — text me when it&apos;s ready)
          <input
            className="k-input"
            type="tel"
            inputMode="tel"
            placeholder="(555) 555-5555"
            value={phone}
            maxLength={30}
            onChange={(e) => setPhone(e.target.value)}
          />
        </label>

        <div className="k-summary">
          {cart.map((l) => (
            <div className="k-summary-row" key={cartLineKey(l.item.id, l.sides)}>
              <span>
                {l.qty}× {l.product.name}
                {l.sides && l.sides.length > 0 && (
                  <span className="k-summary-sides"> ({l.sides.map((s) => s.name).join(", ")})</span>
                )}
              </span>
              <span>{formatMoney((l.item.price + sidesUpcharge(l.sides)) * l.qty)}</span>
            </div>
          ))}
          <div className="k-summary-row total">
            <span>Subtotal</span>
            <span>{formatMoney(subtotal)}</span>
          </div>
        </div>

        <div className="k-panel-actions">
          <button className="k-btn k-btn-ghost" onClick={onBack}>
            Back
          </button>
          <button
            className="k-btn k-btn-primary"
            disabled={!name.trim()}
            onClick={() => onContinue(name.trim(), phone.trim())}
          >
            Continue to Payment
          </button>
        </div>
      </div>
    </div>
  );
}
