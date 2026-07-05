"use client";

import { useState } from "react";
import type { KioskCartLine } from "@/lib/kiosk";
import { formatMoney } from "@/lib/kiosk";

interface Props {
  cart: KioskCartLine[];
  customerName: string;
  onBack: () => void;
  /** Places the order. squareNonce comes from the card entry flow (wired in the payments task). */
  onPlaceOrder: (squareNonce?: string) => Promise<void>;
  terminalEnabled: boolean;
  cardEnabled: boolean;
}

export default function PayScreen({ cart, customerName, onBack, onPlaceOrder, terminalEnabled, cardEnabled }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const subtotal = cart.reduce((s, l) => s + l.item.price * l.qty, 0);

  const handleTerminal = async () => {
    setBusy(true);
    setError(null);
    try {
      await onPlaceOrder();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment failed — please try again");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="k-screen k-center">
      <div className="k-panel">
        <h2>Payment</h2>

        <div className="k-summary">
          <div className="k-summary-row">
            <span>Order for</span>
            <span>{customerName}</span>
          </div>
          <div className="k-summary-row total">
            <span>Total</span>
            <span>{formatMoney(subtotal)}</span>
          </div>
        </div>

        <div className="k-pay-options">
          <button className="k-pay-option" disabled={!terminalEnabled || busy} onClick={handleTerminal}>
            <span className="k-pay-icon">💳</span>
            <span>
              Pay on the card reader
              <small>
                {terminalEnabled
                  ? "Tap, insert, or swipe on the reader next to this screen"
                  : "Card reader not connected yet"}
              </small>
            </span>
          </button>

          <button className="k-pay-option" disabled={!cardEnabled || busy}>
            <span className="k-pay-icon">⌨️</span>
            <span>
              Enter card on screen
              <small>{cardEnabled ? "Type your card number here" : "Coming soon"}</small>
            </span>
          </button>
        </div>

        {error && <p className="k-error">{error}</p>}
        {busy && (
          <p style={{ color: "var(--k-muted)", margin: 0, fontSize: 17 }}>
            Processing payment…
          </p>
        )}

        <div className="k-panel-actions">
          <button className="k-btn k-btn-ghost" onClick={onBack} disabled={busy}>
            Back
          </button>
        </div>
      </div>
    </div>
  );
}
