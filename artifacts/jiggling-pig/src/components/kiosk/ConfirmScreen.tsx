"use client";

import { useEffect } from "react";

interface Props {
  orderNumber: string | null;
  customerName: string;
  onDone: () => void;
}

const AUTO_RESET_MS = 20_000;

export default function ConfirmScreen({ orderNumber, customerName, onDone }: Props) {
  useEffect(() => {
    const t = setTimeout(onDone, AUTO_RESET_MS);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="k-screen k-confirm">
      <div className="k-confirm-check">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </div>
      <h2>YOU&apos;RE ALL SET{customerName ? `, ${customerName.toUpperCase()}` : ""}!</h2>
      <p>
        We&apos;re firing up your order. Listen for your number at the window.
      </p>

      {orderNumber && (
        <div className="k-confirm-card">
          <div className="k-confirm-card-title">YOUR ORDER IS</div>
          <div className="k-order-number">#{orderNumber}</div>
        </div>
      )}

      <button className="k-btn k-btn-primary k-btn-lg" onClick={onDone} style={{ padding: "20px 80px" }}>
        DONE
      </button>
    </div>
  );
}
