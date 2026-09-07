"use client";

import { useRef, useState } from "react";
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
  const [showNameRequired, setShowNameRequired] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const subtotal = cartSubtotal(cart);
  const closeNameRequired = () => {
    setShowNameRequired(false);
    window.requestAnimationFrame(() => nameInputRef.current?.focus());
  };
  const handleContinue = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setShowNameRequired(true);
      return;
    }
    onContinue(trimmedName, phone.trim());
  };

  return (
    <div className="k-screen k-center">
      <div className="k-panel">
        <h2>Who&apos;s this order for?</h2>

        <label>
          Name (we&apos;ll call it out)
          <input
            ref={nameInputRef}
            className="k-input"
            type="text"
            placeholder="First name"
            value={name}
            maxLength={100}
            onChange={(e) => setName(e.target.value)}
            autoCapitalize="words"
            autoCorrect="off"
            aria-invalid={showNameRequired}
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
                {!!l.upsellQty && <span className="k-upsell-tag"> ${l.upsellQty} off</span>}
                {l.sides && l.sides.length > 0 && (
                  <span className="k-summary-sides"> ({l.sides.map((s) => s.name).join(", ")})</span>
                )}
              </span>
              <span>
                {formatMoney(
                  (l.item.price + sidesUpcharge(l.sides)) * l.qty - (l.upsellQty ?? 0),
                )}
              </span>
            </div>
          ))}
          <div className="k-summary-row total">
            <span>Total</span>
            <span>{formatMoney(subtotal)}</span>
          </div>
        </div>

        <div className="k-panel-actions">
          <button className="k-btn k-btn-ghost" onClick={onBack}>
            Back
          </button>
          <button
            className="k-btn k-btn-primary"
            onClick={handleContinue}
          >
            Continue
          </button>
        </div>
      </div>

      {showNameRequired && (
        <div className="k-modal-overlay" onClick={closeNameRequired}>
          <div
            className="k-modal k-name-required-modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="k-name-required-title"
            aria-describedby="k-name-required-message"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="k-modal-title" id="k-name-required-title">
              PLEASE ENTER YOUR NAME
            </div>
            <div className="k-modal-sub" id="k-name-required-message">
              We need a name so our team knows who to call when the order is ready.
            </div>
            <div className="k-modal-actions">
              <button className="k-btn k-btn-primary" onClick={closeNameRequired} autoFocus>
                Enter name
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
