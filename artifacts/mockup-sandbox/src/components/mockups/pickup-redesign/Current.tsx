"use client";

import "./_group.css";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  apiGet,
  apiPost,
  cartLineKey,
  formatMoney,
  sidesUpcharge,
  type KioskCartLine,
  type KioskMenu,
  type KioskProduct,
  type KioskSideChoice,
  useSearchParams,
  useSquarePayments,
} from "./_demo";

type PickupConfig = {
  isOrderingOpen: boolean; eventName: string; streetAddress: string; asapWaitMinutes: number;
  cardEnabled: boolean; applicationId: string | null; locationId: string | null; environment: string;
  menu: KioskMenu; taxRatePercent?: number;
};
type PickupResult = {
  orderNumber: string; capability: string; paymentStatus: "paid" | "pending" | "canceled";
  receiptUrl: string | null; status: string; grandTotal: number; currency: string;
  items: { name: string; qty: number; sides: string | null; lineTotal: number }[];
  canReplay?: boolean;
};
type Stage = "menu" | "review" | "payment" | "confirming" | "complete";

// Namespaced separately from production so a canvas interaction cannot
// interfere with a real pickup attempt in another app origin.
const PENDING_KEY = "jpig_pickup_mockup_pending_v1";
type PendingPickupAttempt = { requestId?: string; capability?: string };

function readPendingAttempt(): PendingPickupAttempt | null {
  if (typeof window === "undefined") return null;
  try {
    const value = JSON.parse(localStorage.getItem(PENDING_KEY) ?? "null") as PendingPickupAttempt | null;
    return value && (typeof value.requestId === "string" || typeof value.capability === "string") ? value : null;
  } catch {
    return null;
  }
}

function savePendingAttempt(attempt: PendingPickupAttempt): void {
  localStorage.setItem(PENDING_KEY, JSON.stringify(attempt));
  const saved = readPendingAttempt();
  if (!saved || saved.requestId !== attempt.requestId) {
    throw new Error("Payment recovery could not be saved in this browser.");
  }
}

function clearPendingAttempt(): void {
  localStorage.removeItem(PENDING_KEY);
}

function responseData<T>(response: T | { data: T }): T {
  return (response && typeof response === "object" && "data" in response ? response.data : response) as T;
}

/**
 * Exact pickup page extraction from
 * artifacts/jiggling-pig/src/app/pickup/page.tsx.
 *
 * Only the transport/payment edges are redirected to the local, no-charge
 * fixtures in _demo.ts. The component structure and interaction states remain
 * the production page's structure so this can be safely redesigned in place.
 */
export function Current() {
  const searchParams = useSearchParams();
  const [config, setConfig] = useState<PickupConfig | null>(null);
  const [cart, setCart] = useState<KioskCartLine[]>([]);
  const [stage, setStage] = useState<Stage>(() => readPendingAttempt() ? "confirming" : "menu");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [sideProduct, setSideProduct] = useState<KioskProduct | null>(null);
  const [chosenSides, setChosenSides] = useState<KioskSideChoice[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<PickupResult | null>(null);
  const [canReplay, setCanReplay] = useState(false);
  const requestId = useRef<string | null>(null);

  const square = useSquarePayments({
    enabled: stage === "payment" && Boolean(config?.cardEnabled),
    applicationId: config?.applicationId ?? "",
    locationId: config?.locationId ?? "",
    environment: config?.environment ?? "sandbox",
    containerSelector: "#pickup-square-card",
  });

  useEffect(() => {
    void (async () => {
      try {
        setConfig(responseData(await apiGet<PickupConfig | { data: PickupConfig }>("/pickup")));
        const pending = readPendingAttempt();
        if (pending) {
          if (pending.requestId) requestId.current = pending.requestId;
          if (pending.requestId) {
            // The browser may have reloaded after the POST reached the server
            // but before it received the response/capability. Observe only
            // the existing request ID; never make a fresh payment attempt.
            setStage("confirming");
            await recoverPersistedAttempt();
          } else if (pending.capability) {
            setStage("confirming");
            await poll(pending.capability);
          }
        }
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Could not load pickup ordering.");
      }
    })();
  // The first load deliberately owns recovery; poll is stable enough for this initial call.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const subtotal = useMemo(
    () => cart.reduce((sum, line) => sum + (line.item.price + sidesUpcharge(line.sides)) * line.qty, 0),
    [cart],
  );
  const tax = config?.taxRatePercent ? Math.round(subtotal * config.taxRatePercent) / 100 : 0;
  const displayTotal = subtotal + tax;

  const add = (product: KioskProduct, sides?: KioskSideChoice[]) => {
    const item = product.items[0];
    if (!item) return;
    const key = cartLineKey(item.id, sides);
    setCart(previous => {
      const existing = previous.find(line => cartLineKey(line.item.id, line.sides) === key);
      return existing
        ? previous.map(line => cartLineKey(line.item.id, line.sides) === key ? { ...line, qty: Math.min(50, line.qty + 1) } : line)
        : [...previous, { product, item, qty: 1, sides }];
    });
  };
  const setQty = (line: KioskCartLine, quantity: number) => {
    const key = cartLineKey(line.item.id, line.sides);
    setCart(previous => quantity <= 0
      ? previous.filter(entry => cartLineKey(entry.item.id, entry.sides) !== key)
      : previous.map(entry => cartLineKey(entry.item.id, entry.sides) === key ? { ...entry, qty: Math.min(50, quantity) } : entry));
  };
  const openProduct = (product: KioskProduct) => {
    if (product.comboSideCount && product.comboSideCategoryId) {
      setSideProduct(product);
      setChosenSides([]);
    } else add(product);
  };
  const sideOptions = useMemo(() => !sideProduct?.comboSideCategoryId || !config
    ? []
    : config.menu.products.filter(product => product.id !== sideProduct.id && product.categoryIds.includes(sideProduct.comboSideCategoryId!)),
  [config, sideProduct]);

  async function poll(capability: string): Promise<void> {
    try {
      const next = responseData(await apiGet<PickupResult | { data: PickupResult }>(`/pickup/orders/${encodeURIComponent(capability)}`));
      setResult(next);
      if (next.paymentStatus === "paid") {
        clearPendingAttempt();
        setStage("complete");
      } else if (next.paymentStatus === "canceled") {
        clearPendingAttempt();
        requestId.current = null;
        setStage("payment");
        setError("Square did not approve this payment. Please use another card.");
      } else {
        setStage("confirming");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We could not confirm payment yet.");
      setStage("confirming");
    }
  }

  async function recoverPersistedAttempt(): Promise<void> {
    const persisted = readPendingAttempt();
    const persistedRequestId = persisted?.requestId ?? requestId.current;
    if (!persistedRequestId) {
      if (persisted?.capability) await poll(persisted.capability);
      return;
    }
    try {
      const recovered = responseData(await apiGet<
        ({ found: false; canReplay: boolean } | ({ found: true } & PickupResult))
        | { data: { found: false; canReplay: boolean } | ({ found: true } & PickupResult) }
      >(`/pickup/orders/attempt/${encodeURIComponent(persistedRequestId)}`));
      if (!recovered.found) {
        // No committed order means our server never reached Square (the
        // provider call is after the atomic local reservation), so only this
        // same request ID may safely be replayed with a fresh card nonce.
        setCanReplay(recovered.canReplay);
        setError("No payment attempt was created yet. You may safely retry this same checkout.");
        return;
      }
      const { found: _found, ...recoveredOrder } = recovered;
      setResult(recoveredOrder);
      setCanReplay(recoveredOrder.canReplay === true);
      savePendingAttempt({ requestId: persistedRequestId, capability: recoveredOrder.capability });
      if (recoveredOrder.paymentStatus === "paid") {
        clearPendingAttempt();
        setCanReplay(false);
        setStage("complete");
      } else if (recoveredOrder.paymentStatus === "canceled") {
        clearPendingAttempt();
        requestId.current = null;
        setCanReplay(false);
        setStage("payment");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We could not confirm payment yet.");
    }
  }

  useEffect(() => {
    if (stage !== "confirming") return;
    // Keep observing the durable request ID even when the original POST lost
    // its response and no capability has yet reached this browser.
    void recoverPersistedAttempt();
    const timer = window.setInterval(() => void recoverPersistedAttempt(), 2500);
    return () => window.clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  const continueToPayment = (event: FormEvent) => {
    event.preventDefault();
    if (!cart.length) return;
    setError("");
    setStage("payment");
  };

  const submit = async () => {
    if (!config || !square.ready || busy) return;
    setBusy(true);
    setError("");
    try {
      const squareNonce = await square.tokenize();
      if (!requestId.current) {
        const nextRequestId = crypto.randomUUID();
        // This durable lock is intentionally written before the POST. It
        // contains no card data and survives a reload/lost HTTP response.
        savePendingAttempt({ requestId: nextRequestId });
        requestId.current = nextRequestId;
      }
      const placed = responseData(await apiPost<PickupResult | { data: PickupResult }>("/pickup/orders", {
        clientRequestId: requestId.current,
        lines: cart.map(line => ({
          productItemId: line.item.id,
          qty: line.qty,
          sideProductIds: line.sides?.map(side => side.id),
        })),
        customerName: name,
        customerPhone: phone,
        squareNonce,
        source: searchParams.get("pickupSource") === "event_qr" ? "event_qr" : "remote",
        sourceLinkSlug: searchParams.get("pickupSourceLink") ?? undefined,
        sourceToken: searchParams.get("pickupSourceToken") ?? undefined,
      }));
      setResult(placed);
      savePendingAttempt({ requestId: requestId.current, capability: placed.capability });
      if (placed.paymentStatus === "paid") {
        clearPendingAttempt();
        setStage("complete");
      } else if (placed.paymentStatus === "canceled") {
        clearPendingAttempt();
        requestId.current = null;
        setError("Square did not approve this payment. Please use another card.");
      } else {
        setStage("confirming");
      }
    } catch (cause) {
      // Keep exactly the same request ID and preserve the durable recovery
      // lock. It must not be replaced by a fresh card attempt.
      setError(cause instanceof Error ? cause.message : "Payment is being confirmed. Do not start a new order.");
      // Once the request ID was durably recorded, fail closed. A lost POST
      // response cannot be distinguished from an accepted charge in-browser.
      if (requestId.current) setStage("confirming");
    } finally {
      setBusy(false);
    }
  };

  if (!config) return <main className="mx-auto max-w-xl p-6 text-center">{error || "Loading pickup ordering…"}</main>;

  if (stage === "complete" && result) {
    return <main className="mx-auto max-w-xl p-6"><section className="rounded-xl border bg-card p-6 shadow-sm">
      <p className="font-semibold text-green-700">Payment confirmed</p><h1 className="mt-2 text-3xl font-bold">Order {result.orderNumber}</h1>
      <p className="mt-3">We&apos;ll have your order ready in about <strong>{config.asapWaitMinutes} minutes</strong>.</p>
      <p className="mt-2 text-sm text-muted-foreground">Pick up at {config.eventName}, {config.streetAddress}.</p>
      <div className="my-5 border-y py-3">{result.items.map((item, index) => <div key={index} className="flex justify-between py-1"><span>{item.qty}× {item.name}{item.sides ? <small className="block text-muted-foreground">{item.sides}</small> : null}</span><span>{formatMoney(item.lineTotal)}</span></div>)}</div>
      <div className="flex justify-between text-lg font-bold"><span>Total paid</span><span>{formatMoney(result.grandTotal)}</span></div>
      {result.receiptUrl && <a className="mt-5 inline-block text-primary underline" href={result.receiptUrl} target="_blank" rel="noreferrer">View Square receipt</a>}
    </section></main>;
  }

  if (stage === "confirming") return <main className="mx-auto max-w-xl p-6"><section className="rounded-xl border bg-card p-6 text-center"><h1 className="text-2xl font-bold">Confirming your payment</h1><p className="mt-3 text-muted-foreground">Please do not submit another order. We are checking Square for the existing payment.</p>{result && <p className="mt-3 font-medium">Order {result.orderNumber}</p>}{error && <p role="alert" className="mt-4 text-destructive">{error}</p>}<button className="mt-5 rounded-md border px-4 py-2 font-medium" onClick={() => void recoverPersistedAttempt()}>Check payment now</button>{canReplay && <button className="mt-3 w-full rounded-md bg-primary px-4 py-3 font-semibold text-primary-foreground" onClick={() => { setError(""); setStage("payment"); }}>Retry this same checkout</button>}</section></main>;
  if (!config.isOrderingOpen) return <main className="mx-auto max-w-xl p-6"><h1 className="text-3xl font-bold">ASAP pickup is closed</h1><p className="mt-3 text-muted-foreground">Please check back when this event is accepting orders.</p></main>;

  return <main className="mx-auto max-w-5xl p-4 pb-28 sm:p-6">
    <header className="mb-6"><p className="font-semibold text-primary">ASAP PICKUP</p><h1 className="text-3xl font-bold">{config.eventName}</h1><p className="mt-1 text-muted-foreground">{config.streetAddress} · Ready in about {config.asapWaitMinutes} minutes</p></header>
    {error && <p role="alert" className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
    {stage === "payment" ? <section className="mx-auto max-w-lg rounded-xl border bg-card p-5"><button className="mb-4 text-sm underline" disabled={busy} onClick={() => setStage("review")}>← Back to review</button><h2 className="text-2xl font-bold">Secure card payment</h2><p className="mt-1 text-sm text-muted-foreground">Your final total is calculated by our server.</p><div className="my-5 flex justify-between border-y py-3 text-lg font-bold"><span>Total</span><span>{formatMoney(displayTotal)}</span></div><div id="pickup-square-card" className="min-h-24" />{square.error && <p role="alert" className="mt-3 text-sm text-destructive">{square.error}</p>}<button className="mt-5 w-full rounded-md bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:opacity-50" disabled={!square.ready || busy} onClick={() => void submit()}>{busy ? "Processing securely…" : `Pay ${formatMoney(displayTotal)}`}</button>{error && requestId.current && <button className="mt-3 w-full rounded-md border px-4 py-3 font-medium" disabled={busy} onClick={() => void submit()}>Safely check this payment again</button>}</section> :
      <><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{config.menu.products.map(product => <button key={product.id} onClick={() => openProduct(product)} className="overflow-hidden rounded-xl border bg-card text-left shadow-sm transition hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary"><div className="aspect-[16/8] bg-muted">{product.imageUrl && <img src={product.imageUrl} alt="" className="h-full w-full object-cover" />}</div><div className="p-4"><div className="font-bold">{product.name}</div>{product.description && <p className="mt-1 text-sm text-muted-foreground">{product.description}</p>}<div className="mt-3 flex justify-between font-semibold"><span>{product.comboSideCount ? `Includes ${product.comboSideCount} sides` : "Add to order"}</span><span>{formatMoney(product.items[0]?.price ?? 0)}</span></div></div></button>)}</div>
      <form onSubmit={continueToPayment} className="mt-7 rounded-xl border bg-card p-5"><h2 className="text-xl font-bold">Your order</h2>{cart.length === 0 ? <p className="mt-3 text-muted-foreground">Choose items from the menu to begin.</p> : <div className="mt-3 space-y-3">{cart.map(line => <div key={cartLineKey(line.item.id, line.sides)} className="flex items-start justify-between gap-3 border-b pb-3"><div><strong>{line.product.name}</strong>{line.sides?.length ? <small className="block text-muted-foreground">{line.sides.map(side => side.name).join(", ")}</small> : null}<div className="mt-2 flex items-center gap-2"><button type="button" className="rounded border px-2" onClick={() => setQty(line, line.qty - 1)} aria-label={`Decrease ${line.product.name}`}>−</button><span>{line.qty}</span><button type="button" className="rounded border px-2" onClick={() => setQty(line, line.qty + 1)} aria-label={`Increase ${line.product.name}`}>+</button></div></div><strong>{formatMoney((line.item.price + sidesUpcharge(line.sides)) * line.qty)}</strong></div>)}</div>}
        {cart.length > 0 && <><div className="mt-4 space-y-1 text-sm"><div className="flex justify-between"><span>Subtotal</span><span>{formatMoney(subtotal)}</span></div><div className="flex justify-between"><span>Estimated tax</span><span>{formatMoney(tax)}</span></div><div className="flex justify-between text-lg font-bold"><span>Estimated total</span><span>{formatMoney(displayTotal)}</span></div></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><label className="text-sm font-medium">Name<input required maxLength={100} value={name} onChange={e => setName(e.target.value)} className="mt-1 w-full rounded-md border bg-background p-3" autoComplete="name" /></label><label className="text-sm font-medium">Mobile phone<input required maxLength={30} value={phone} onChange={e => setPhone(e.target.value)} className="mt-1 w-full rounded-md border bg-background p-3" inputMode="tel" autoComplete="tel" /></label></div><button className="mt-5 w-full rounded-md bg-primary px-4 py-3 font-semibold text-primary-foreground">Review & pay</button></>}</form></>}
    {sideProduct && <div className="fixed inset-0 z-50 flex items-end bg-black/50 p-3 sm:items-center sm:justify-center" role="dialog" aria-modal="true" aria-labelledby="side-title"><section className="w-full max-w-lg rounded-xl bg-background p-5"><h2 id="side-title" className="text-xl font-bold">Choose {sideProduct.comboSideCount} sides</h2><p className="mt-1 text-sm text-muted-foreground">{chosenSides.length} of {sideProduct.comboSideCount} selected</p><div className="mt-4 grid grid-cols-2 gap-2">{sideOptions.map(side => <button key={side.id} className={`rounded-md border p-3 text-left ${chosenSides.some(s => s.id === side.id) ? "border-primary bg-primary/10" : ""}`} disabled={chosenSides.length >= sideProduct.comboSideCount} onClick={() => setChosenSides(value => [...value, { id: side.id, name: side.name, upcharge: side.duplicateSideUpcharge }])}>{side.name}{side.duplicateSideUpcharge > 0 && <small className="block text-muted-foreground">Extra duplicate: {formatMoney(side.duplicateSideUpcharge)}</small>}</button>)}</div><div className="mt-5 flex gap-3"><button className="flex-1 rounded-md border py-3" onClick={() => setSideProduct(null)}>Cancel</button><button className="flex-1 rounded-md border py-3" onClick={() => setChosenSides([])}>Clear</button><button className="flex-1 rounded-md bg-primary py-3 font-semibold text-primary-foreground disabled:opacity-50" disabled={chosenSides.length !== sideProduct.comboSideCount} onClick={() => { add(sideProduct, chosenSides); setSideProduct(null); }}>Add</button></div></section></div>}
  </main>;
}