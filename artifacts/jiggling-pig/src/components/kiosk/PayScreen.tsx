"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { KioskCartLine, KioskConfig, KioskOrderResult } from "@/lib/kiosk";
import { cancelKioskPayment, cartSubtotal, fetchKioskPaymentStatus, formatMoney } from "@/lib/kiosk";

interface Props {
  cart: KioskCartLine[];
  customerName: string;
  config: KioskConfig;
  onBack: () => void;
  onPlaceOrder: (paymentMethod: "terminal" | "card", squareNonce: string | undefined, clientRequestId: string) => Promise<KioskOrderResult>;
  onPaid: (result: KioskOrderResult) => void;
}

type Mode = "choose" | "terminal-waiting" | "card-entry";

const POLL_INTERVAL_MS = 2000;
const TERMINAL_TIMEOUT_MS = 3 * 60_000;

interface SquareCard {
  attach: (selector: string) => Promise<void>;
  tokenize: () => Promise<{ status: string; token?: string; errors?: { message?: string }[] }>;
  destroy: () => Promise<void>;
}
interface SquarePayments {
  card: () => Promise<SquareCard>;
}

function getSquareGlobal(): { payments: (appId: string, locId: string) => Promise<SquarePayments> } | undefined {
  return (window as unknown as { Square?: { payments: (appId: string, locId: string) => Promise<SquarePayments> } }).Square;
}

function loadSquareSdk(environment: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (getSquareGlobal()) return resolve();
    const src =
      environment === "production"
        ? "https://web.squarecdn.com/v1/square.js"
        : "https://sandbox.web.squarecdn.com/v1/square.js";
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Could not load payment form")));
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Could not load payment form"));
    document.head.appendChild(s);
  });
}

export default function PayScreen({ cart, customerName, config, onBack, onPlaceOrder, onPaid }: Props) {
  const [mode, setMode] = useState<Mode>("choose");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cardReady, setCardReady] = useState(false);

  const orderRef = useRef<KioskOrderResult | null>(null);
  const requestIdRef = useRef<string | null>(null);
  const cardRef = useRef<SquareCard | null>(null);
  const cancelledRef = useRef(false);

  const subtotal = cartSubtotal(cart);

  const startTerminal = async () => {
    setBusy(true);
    setError(null);
    try {
      requestIdRef.current ??= crypto.randomUUID();
      const result = await onPlaceOrder("terminal", undefined, requestIdRef.current);
      orderRef.current = result;
      cancelledRef.current = false;
      setMode("terminal-waiting");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start the card reader");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (mode !== "terminal-waiting" || !orderRef.current) return;
    const orderId = orderRef.current.orderId;
    const startedAt = Date.now();
    let stopped = false;

    const tick = async () => {
      if (stopped || cancelledRef.current) return;
      try {
        const st = await fetchKioskPaymentStatus(orderId);
        if (stopped) return;
        if (st.status === "paid") {
          onPaid(orderRef.current!);
          return;
        }
        if (st.status === "canceled") {
          requestIdRef.current = null;
          setMode("choose");
          setError("Payment was canceled on the reader. Please try again.");
          return;
        }
      } catch {
        // transient network/API error — keep polling
      }
      if (Date.now() - startedAt > TERMINAL_TIMEOUT_MS) {
        cancelKioskPayment(orderId).catch(() => {});
        setMode("choose");
        setError("The card reader timed out. Please try again.");
        return;
      }
      timer = setTimeout(tick, POLL_INTERVAL_MS);
    };

    let timer = setTimeout(tick, POLL_INTERVAL_MS);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [mode, onPaid]);

  const cancelTerminal = async () => {
    cancelledRef.current = true;
    const orderId = orderRef.current?.orderId;
    setMode("choose");
    setError(null);
    if (orderId) cancelKioskPayment(orderId).catch(() => {});
    orderRef.current = null;
    requestIdRef.current = null;
  };

  const startCardEntry = async () => {
    if (!config.applicationId || !config.locationId) return;
    setError(null);
    setMode("card-entry");
  };

  useEffect(() => {
    if (mode !== "card-entry" || !config.applicationId || !config.locationId) return;
    let disposed = false;
    setCardReady(false);

    (async () => {
      try {
        await loadSquareSdk(config.environment);
        const square = getSquareGlobal();
        if (disposed || !square) return;
        const payments = await square.payments(config.applicationId!, config.locationId!);
        const card = await payments.card();
        if (disposed) {
          card.destroy().catch(() => {});
          return;
        }
        await card.attach("#k-card-container");
        cardRef.current = card;
        setCardReady(true);
      } catch (e) {
        if (!disposed) {
          setMode("choose");
          setError(e instanceof Error ? e.message : "Could not load the payment form");
        }
      }
    })();

    return () => {
      disposed = true;
      if (cardRef.current) {
        cardRef.current.destroy().catch(() => {});
        cardRef.current = null;
      }
    };
  }, [mode, config]);

  const submitCard = async () => {
    if (!cardRef.current) return;
    setBusy(true);
    setError(null);
    try {
      const result = await cardRef.current.tokenize();
      if (result.status !== "OK" || !result.token) {
        throw new Error(result.errors?.[0]?.message || "Card was declined — please check the details");
      }
      requestIdRef.current ??= crypto.randomUUID();
      const order = await onPlaceOrder("card", result.token, requestIdRef.current);
      onPaid(order);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment failed — please try again");
    } finally {
      setBusy(false);
    }
  };

  const backToChoose = useCallback(() => {
    setMode("choose");
    setError(null);
  }, []);

  if (mode === "terminal-waiting") {
    return (
      <div className="k-screen k-center">
        <div className="k-panel" style={{ textAlign: "center", alignItems: "center" }}>
          <h2>Follow the card reader</h2>
          <div className="k-spinner" />
          <p style={{ color: "var(--k-muted)", fontSize: 19, margin: 0, lineHeight: 1.5 }}>
            Tap, insert, or swipe your card on the reader next to this screen.
            <br />
            Total: <strong style={{ color: "var(--k-accent)" }}>{formatMoney(subtotal)}</strong>
          </p>
          <button className="k-btn k-btn-ghost k-btn-lg" onClick={cancelTerminal}>
            Cancel Payment
          </button>
        </div>
      </div>
    );
  }

  if (mode === "card-entry") {
    return (
      <div className="k-screen k-center">
        <div className="k-panel">
          <h2>Enter your card</h2>
          <div className="k-summary">
            <div className="k-summary-row total">
              <span>Total</span>
              <span>{formatMoney(subtotal)}</span>
            </div>
          </div>
          <div id="k-card-container" style={{ minHeight: 90 }} />
          {!cardReady && (
            <p style={{ color: "var(--k-muted)", margin: 0, fontSize: 16 }}>Loading secure card form…</p>
          )}
          {error && <p className="k-error">{error}</p>}
          <div className="k-panel-actions">
            <button className="k-btn k-btn-ghost" onClick={backToChoose} disabled={busy}>
              Back
            </button>
            <button className="k-btn k-btn-primary" onClick={submitCard} disabled={!cardReady || busy}>
              {busy ? "Processing…" : `Pay ${formatMoney(subtotal)}`}
            </button>
          </div>
        </div>
      </div>
    );
  }

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
          <button className="k-pay-option" disabled={!config.terminalEnabled || busy} onClick={startTerminal}>
            <span className="k-pay-icon">💳</span>
            <span>
              Pay on the card reader
              <small>
                {config.terminalEnabled
                  ? "Tap, insert, or swipe on the reader next to this screen"
                  : "Card reader not connected yet"}
              </small>
            </span>
          </button>

          <button className="k-pay-option" disabled={!config.cardEnabled || busy} onClick={startCardEntry}>
            <span className="k-pay-icon">⌨️</span>
            <span>
              Enter card on screen
              <small>{config.cardEnabled ? "Type your card number here" : "Not available"}</small>
            </span>
          </button>
        </div>

        {error && <p className="k-error">{error}</p>}
        {busy && (
          <p style={{ color: "var(--k-muted)", margin: 0, fontSize: 17 }}>Starting payment…</p>
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
