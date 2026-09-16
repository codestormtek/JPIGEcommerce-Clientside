"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { KioskCartLine, KioskConfig, KioskOrderResult } from "@/lib/kiosk";
import {
  beginKioskPaymentAttempt,
  cancelKioskPayment,
  cartSubtotal,
  clearKioskPaymentAttempt,
  fetchKioskPaymentStatus,
  formatMoney,
  readKioskPaymentAttempt,
  recoverKioskPaymentAttempt,
  saveKioskPaymentAttemptOrder,
  KioskApiError,
} from "@/lib/kiosk";

interface Props {
  cart: KioskCartLine[];
  customerName: string;
  config: KioskConfig;
  terminalOnly?: boolean;
  onBack: () => void;
  onPlaceOrder: (paymentMethod: "terminal" | "card", squareNonce: string | undefined, clientRequestId: string) => Promise<KioskOrderResult>;
  onPaid: (result: KioskOrderResult) => boolean | void;
  onCheckoutStarted: (paymentMethod: "terminal" | "card") => boolean;
  onPaymentSafeToLeave?: () => boolean;
  onMenuChanged?: () => void;
  onCheckoutFailed: (
    paymentMethod: "terminal" | "card",
    failureCategory: "declined" | "cancelled" | "reader_unavailable" | "network" | "timeout" | "validation" | "unknown",
  ) => void;
}

type Mode = "choose" | "terminal-waiting" | "payment-waiting" | "card-entry" | "uncertain";

const POLL_INTERVAL_MS = 2000;
const TERMINAL_TIMEOUT_MS = 3 * 60_000;

function isMenuChangedError(error: unknown): boolean {
  return (
    error instanceof KioskApiError &&
    error.status === 409 &&
    (error.code === "MENU_CHANGED" || error.message.includes("MENU_CHANGED"))
  );
}

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

export default function PayScreen({
  cart,
  customerName,
  config,
  terminalOnly = false,
  onBack,
  onPlaceOrder,
  onPaid,
  onCheckoutStarted,
  onPaymentSafeToLeave,
  onMenuChanged,
  onCheckoutFailed,
}: Props) {
  // Start fail-closed so there is no one-render window in which a reloaded
  // kiosk can tap a new payment button before recovery useEffect runs.
  const [mode, setMode] = useState<Mode>(() =>
    typeof window !== "undefined" && readKioskPaymentAttempt() ? "uncertain" : "choose",
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cardReady, setCardReady] = useState(false);

  const orderRef = useRef<KioskOrderResult | null>(null);
  const requestIdRef = useRef<string | null>(null);
  const cardRef = useRef<SquareCard | null>(null);
  const cardTokenRef = useRef<string | null>(null);
  const cancelledRef = useRef(false);
  const restoredAttemptRef = useRef(false);

  const subtotal = cartSubtotal(cart);

  const clearAttemptAfterAuthoritativeOutcome = useCallback(() => {
    if (onPaymentSafeToLeave?.() === false) {
      setMode("uncertain");
      setError("The payment is resolved, but this kiosk could not safely clear its recovery lock. Please ask a staff member for help.");
      return false;
    }
    clearKioskPaymentAttempt();
    requestIdRef.current = null;
    return true;
  }, [onPaymentSafeToLeave]);

  const completePaidAttempt = useCallback((order: KioskOrderResult) => {
    if (onPaid(order) === false) {
      setMode("uncertain");
      setError("Payment is confirmed, but this kiosk could not clear its recovery lock. Please ask a staff member for help.");
      return false;
    }
    return true;
  }, [onPaid]);

  const returnToMenuAfterMenuChange = useCallback(() => {
    if (!clearAttemptAfterAuthoritativeOutcome()) return false;
    cardTokenRef.current = null;
    orderRef.current = null;
    cancelledRef.current = true;
    setError(null);
    setMode("choose");
    onMenuChanged?.();
    return true;
  }, [clearAttemptAfterAuthoritativeOutcome, onMenuChanged]);

  // A reload must continue the existing attempt, not expose a fresh payment
  // button. If the POST response was lost before its order ID arrived, use the
  // device-authenticated, lookup-only recovery endpoint.
  useEffect(() => {
    if (restoredAttemptRef.current) return;
    restoredAttemptRef.current = true;
    const attempt = readKioskPaymentAttempt();
    if (!attempt) return;
    requestIdRef.current = attempt.clientRequestId;
    cancelledRef.current = false;

    const resume = async () => {
      let order: KioskOrderResult | null = attempt.orderId
        ? {
            orderId: attempt.orderId,
            kioskOrderNumber: null,
            grandTotal: attempt.grandTotal ?? subtotal,
            paymentStatus: "pending",
            terminalCheckoutId: null,
          }
        : null;
      if (!order) {
        try {
          const recovered = await recoverKioskPaymentAttempt(attempt.clientRequestId);
          if (recovered.found) {
            order = recovered;
            saveKioskPaymentAttemptOrder(recovered);
          }
        } catch {
          // Fail closed: an unavailable recovery API cannot prove no payment
          // exists, so the lock remains and no new payment is offered.
        }
      }
      if (!order) {
        setMode("uncertain");
        setError("The previous payment request is still being confirmed. Do not take another payment; please ask staff for help.");
        return;
      }
      orderRef.current = order;
      if (order.paymentStatus === "paid") {
        completePaidAttempt(order);
        return;
      }
      if (order.paymentStatus === "canceled") {
        if (clearAttemptAfterAuthoritativeOutcome()) {
          setMode("choose");
          setError("Payment was canceled. Please try again.");
        }
        return;
      }
      setMode(attempt.paymentMethod === "terminal" ? "terminal-waiting" : "payment-waiting");
    };
    void resume();
  // Recovery runs only once for this mounted checkout screen.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startTerminal = async () => {
    setBusy(true);
    setError(null);
    try {
      if (!requestIdRef.current) {
        requestIdRef.current = beginKioskPaymentAttempt("terminal").clientRequestId;
      }
      if (!onCheckoutStarted("terminal")) {
        onCheckoutFailed("terminal", "unknown");
        setMode("uncertain");
        setError(
          "The kiosk could not secure payment recovery. Do not retry; please ask a staff member for help.",
        );
        return;
      }
      const result = await onPlaceOrder("terminal", undefined, requestIdRef.current);
      saveKioskPaymentAttemptOrder(result);
      orderRef.current = result;
      cancelledRef.current = false;
      setMode("terminal-waiting");
    } catch (e) {
      if (isMenuChangedError(e)) {
        onCheckoutFailed("terminal", "validation");
        if (returnToMenuAfterMenuChange()) return;
      }
      // The POST may have reached the order controller even when the browser
      // observed an HTTP error (including 422) or a network failure. Preserve
      // the idempotency key and fail closed until staff reconcile the outcome.
      onCheckoutFailed("terminal", "unknown");
      setError(e instanceof Error ? e.message : "The payment result could not be confirmed");
      setMode("uncertain");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if ((mode !== "terminal-waiting" && mode !== "payment-waiting") || !orderRef.current) return;
    const orderId = orderRef.current.orderId;
    const startedAt = Date.now();
    let stopped = false;

    const tick = async () => {
      if (stopped || cancelledRef.current) return;
      try {
        const st = await fetchKioskPaymentStatus(orderId);
        if (stopped) return;
        if (st.status === "paid") {
          completePaidAttempt(orderRef.current!);
          return;
        }
        if (st.status === "canceled") {
          onCheckoutFailed(mode === "terminal-waiting" ? "terminal" : "card", "cancelled");
          if (clearAttemptAfterAuthoritativeOutcome()) {
            setMode("choose");
            setError("Payment was canceled on the reader. Please try again.");
          }
          return;
        }
      } catch {
        // transient network/API error — keep polling
      }
      if (Date.now() - startedAt > TERMINAL_TIMEOUT_MS) {
        if (mode === "terminal-waiting") {
          onCheckoutFailed("terminal", "timeout");
          try {
            const result = await cancelKioskPayment(orderId);
            if (!result.canceled) {
              const status = await fetchKioskPaymentStatus(orderId);
              if (status.status === "paid") {
                completePaidAttempt(orderRef.current!);
                return;
              }
              if (status.status !== "canceled") throw new Error("Cancellation was not confirmed");
            }
            cancelledRef.current = true;
            orderRef.current = null;
            if (clearAttemptAfterAuthoritativeOutcome()) {
              setMode("choose");
              setError("The card reader timed out. Please try again.");
            }
          } catch {
            setError("The payment result could not be confirmed. Please ask a staff member for help before trying again.");
          }
        } else {
          onCheckoutFailed("card", "timeout");
          setError("Payment is taking longer than expected. Please ask a staff member for help.");
        }
        return;
      }
      timer = setTimeout(tick, POLL_INTERVAL_MS);
    };

    let timer = setTimeout(tick, POLL_INTERVAL_MS);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [mode, onCheckoutFailed, clearAttemptAfterAuthoritativeOutcome, completePaidAttempt]);

  const cancelTerminal = async () => {
    const orderId = orderRef.current?.orderId;
    if (!orderId) {
      setMode("uncertain");
      setError("The payment result could not be confirmed. Please ask a staff member for help.");
      return;
    }
    setBusy(true);
    onCheckoutFailed("terminal", "cancelled");
    try {
      const result = await cancelKioskPayment(orderId);
      if (!result.canceled) {
        const status = await fetchKioskPaymentStatus(orderId);
        if (status.status === "paid") {
          completePaidAttempt(orderRef.current!);
          return;
        }
        if (status.status !== "canceled") throw new Error("Cancellation was not confirmed");
      }
      cancelledRef.current = true;
      orderRef.current = null;
      if (clearAttemptAfterAuthoritativeOutcome()) {
        setMode("choose");
        setError(null);
      }
    } catch {
      cancelledRef.current = false;
      setError("The payment could not be canceled safely. Please ask a staff member for help.");
    } finally {
      setBusy(false);
    }
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
          onCheckoutFailed("card", "network");
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
      if (!cardTokenRef.current) {
        const result = await cardRef.current.tokenize();
        if (result.status !== "OK" || !result.token) {
          throw new Error(result.errors?.[0]?.message || "Card was declined — please check the details");
        }
        cardTokenRef.current = result.token;
      }
      if (!requestIdRef.current) {
        requestIdRef.current = beginKioskPaymentAttempt("card").clientRequestId;
      }
      if (!onCheckoutStarted("card")) {
        throw new Error("Payment recovery could not be initialized");
      }
      const order = await onPlaceOrder("card", cardTokenRef.current, requestIdRef.current);
      saveKioskPaymentAttemptOrder(order);
      if (order.paymentStatus === "paid") {
        completePaidAttempt(order);
      } else {
        orderRef.current = order;
        setMode("payment-waiting");
      }
    } catch (e) {
      if (isMenuChangedError(e)) {
        onCheckoutFailed("card", "validation");
        if (returnToMenuAfterMenuChange()) return;
      }
      onCheckoutFailed("card", "declined");
      setError(e instanceof Error ? e.message : "Payment failed — please try again");
    } finally {
      setBusy(false);
    }
  };

  const backToChoose = useCallback(() => {
    setMode("choose");
    setError(null);
  }, []);

  if (mode === "terminal-waiting" || mode === "payment-waiting") {
    const terminalWaiting = mode === "terminal-waiting";
    return (
      <div className="k-screen k-center">
        <div className="k-panel" style={{ textAlign: "center", alignItems: "center" }}>
          <h2>{terminalWaiting ? "Follow the card reader" : "Confirming payment"}</h2>
          <div className="k-spinner" />
          <p style={{ color: "var(--k-muted)", fontSize: 19, margin: 0, lineHeight: 1.5 }}>
            {terminalWaiting
              ? "Tap, insert, or swipe your card on the reader next to this screen."
              : "Please wait while we confirm your payment."}
            <br />
            Total: <strong style={{ color: "var(--k-accent)" }}>{formatMoney(subtotal)}</strong>
          </p>
          {error && <p className="k-error">{error}</p>}
          {terminalWaiting && (
            <button className="k-btn k-btn-ghost k-btn-lg" onClick={cancelTerminal}>
              Cancel Payment
            </button>
          )}
        </div>
      </div>
    );
  }

  if (mode === "uncertain") {
    return (
      <div className="k-screen k-center">
        <div className="k-panel" style={{ textAlign: "center", alignItems: "center" }}>
          <h2>Ask a staff member for help</h2>
          <p style={{ color: "var(--k-muted)", fontSize: 19, margin: 0, lineHeight: 1.5 }}>
            The payment result could not be confirmed. Do not retry or take another payment until staff verify the order and reader status.
          </p>
          {error && <p className="k-error">{error}</p>}
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

          {!terminalOnly && (
            <button className="k-pay-option" disabled={!config.cardEnabled || busy} onClick={startCardEntry}>
              <span className="k-pay-icon">⌨️</span>
              <span>
                Enter card on screen
                <small>{config.cardEnabled ? "Type your card number here" : "Not available"}</small>
              </span>
            </button>
          )}
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
