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
      <div className="k-confirm-check">✓</div>
      <h2>Thanks{customerName ? `, ${customerName}` : ""}!</h2>
      {orderNumber && <div className="k-order-number">{orderNumber}</div>}
      <p>
        Your order is in. We&apos;ll call your number when it&apos;s ready —
        keep an eye on the pickup counter.
      </p>
      <button className="k-btn k-btn-primary k-btn-lg" onClick={onDone}>
        Done
      </button>
    </div>
  );
}
