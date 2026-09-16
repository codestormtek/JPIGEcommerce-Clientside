"use client";

import "./_group.css";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { apiGet, apiPost, cartLineKey, formatMoney, sidesUpcharge, type KioskCartLine, type KioskMenu, type KioskProduct, type KioskSideChoice, useSearchParams, useSquarePayments } from "./_demo";

type PickupConfig = { isOrderingOpen: boolean; eventName: string; streetAddress: string; asapWaitMinutes: number; cardEnabled: boolean; applicationId: string | null; locationId: string | null; environment: string; menu: KioskMenu; taxRatePercent?: number };
type PickupResult = { orderNumber: string; capability: string; paymentStatus: "paid" | "pending" | "canceled"; receiptUrl: string | null; status: string; grandTotal: number; currency: string; items: { name: string; qty: number; sides: string | null; lineTotal: number }[]; canReplay?: boolean };
type Stage = "menu" | "review" | "payment" | "confirming" | "complete";
const PENDING_KEY = "jpig_pickup_mockup_pending_v1";
type Pending = { requestId?: string; capability?: string };
const readPending = (): Pending | null => { try { return JSON.parse(localStorage.getItem(PENDING_KEY) ?? "null"); } catch { return null; } };
const responseData = <T,>(response: T | { data: T }) => (response && typeof response === "object" && "data" in response ? response.data : response) as T;

function PigMark() { return <span className="jp-mark" aria-hidden="true"><i /><i /><b /></span>; }
function BackIcon() { return <span aria-hidden="true">‹</span>; }
function ProductArt({ name }: { name: string }) {
  const key = name.toLowerCase();
  const isDrink = /tea|drink|lemonade|soda/.test(key);
  const isSide = /mac|bean|slaw|potato|side|fry/.test(key);
  return <div aria-label={`Illustrated demo art for ${name}`} role="img" style={{ color: "#e9a626", width: "100%", height: "100%", display: "grid", placeItems: "center", position: "relative" }}>
    <svg viewBox="0 0 160 100" aria-hidden="true" style={{ width: "116px", height: "78px", display: "block" }}>
      {isDrink ? <><path d="M62 19h40l-5 63H67Z" fill="none" stroke="currentColor" strokeWidth="6" /><path d="m80 11 18 22" stroke="currentColor" strokeWidth="6" strokeLinecap="round" /><path d="M68 55h28" stroke="currentColor" strokeWidth="5" /></> :
        isSide ? <><path d="M40 52h80l-9 27H49Z" fill="none" stroke="currentColor" strokeWidth="6" /><path d="M48 52c4-24 60-24 64 0" fill="none" stroke="currentColor" strokeWidth="6" /><path d="M64 38c4-9 10 8 15-3s12 6 18-5" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" /></> :
          <><path d="M39 68c5-35 30-48 55-41 20 6 29 22 27 41H39Z" fill="none" stroke="currentColor" strokeWidth="6" /><path d="M50 68c8-16 17-18 29-10s19-1 29-13" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" /><path d="M33 76h95" stroke="currentColor" strokeWidth="6" strokeLinecap="round" /></>}
    </svg>
    <small style={{ position: "absolute", bottom: "9px", right: "10px", color: "#f7eedf", fontSize: "8px", fontWeight: 800, letterSpacing: ".12em" }}>DEMO ART</small>
  </div>;
}

export function Working() {
  const searchParams = useSearchParams();
  const [config, setConfig] = useState<PickupConfig | null>(null);
  const [cart, setCart] = useState<KioskCartLine[]>([]);
  const [stage, setStage] = useState<Stage>(() => readPending() ? "confirming" : "menu");
  const [name, setName] = useState(""); const [phone, setPhone] = useState("");
  const [sideProduct, setSideProduct] = useState<KioskProduct | null>(null);
  const [chosenSides, setChosenSides] = useState<KioskSideChoice[]>([]);
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<PickupResult | null>(null); const [canReplay, setCanReplay] = useState(false);
  const requestId = useRef<string | null>(null);
  const square = useSquarePayments({ enabled: stage === "payment" && Boolean(config?.cardEnabled), applicationId: config?.applicationId ?? "", locationId: config?.locationId ?? "", environment: config?.environment ?? "sandbox", containerSelector: "#pickup-square-card" });

  async function poll(capability: string) {
    try {
      const next = responseData(await apiGet<PickupResult | { data: PickupResult }>(`/pickup/orders/${encodeURIComponent(capability)}`));
      setResult(next);
      if (next.paymentStatus === "paid") { localStorage.removeItem(PENDING_KEY); setStage("complete"); }
      else if (next.paymentStatus === "canceled") { localStorage.removeItem(PENDING_KEY); requestId.current = null; setStage("payment"); setError("Square did not approve this payment. Please use another card."); }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "We could not confirm payment yet."); }
  }
  async function recover() {
    const pending = readPending(); const id = pending?.requestId ?? requestId.current;
    if (!id) { if (pending?.capability) await poll(pending.capability); return; }
    try {
      const found = responseData(await apiGet<({ found: false; canReplay: boolean } | ({ found: true } & PickupResult)) | { data: ({ found: false; canReplay: boolean } | ({ found: true } & PickupResult)) }>(`/pickup/orders/attempt/${encodeURIComponent(id)}`));
      if (!found.found) { setCanReplay(found.canReplay); setError("No payment attempt was created yet. You may safely retry this same checkout."); return; }
      const { found: _found, ...order } = found; setResult(order); setCanReplay(order.canReplay === true);
      localStorage.setItem(PENDING_KEY, JSON.stringify({ requestId: id, capability: order.capability }));
      if (order.paymentStatus === "paid") { localStorage.removeItem(PENDING_KEY); setStage("complete"); }
      if (order.paymentStatus === "canceled") { localStorage.removeItem(PENDING_KEY); requestId.current = null; setStage("payment"); }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "We could not confirm payment yet."); }
  }
  useEffect(() => { void (async () => { try { setConfig(responseData(await apiGet<PickupConfig | { data: PickupConfig }>("/pickup"))); if (readPending()) { setStage("confirming"); await recover(); } } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load roadside ordering."); } })(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { if (stage !== "confirming") return; const timer = window.setInterval(() => void recover(), 2500); return () => window.clearInterval(timer); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  const subtotal = useMemo(() => cart.reduce((sum, line) => sum + (line.item.price + sidesUpcharge(line.sides)) * line.qty, 0), [cart]);
  const tax = config?.taxRatePercent ? Math.round(subtotal * config.taxRatePercent) / 100 : 0; const total = subtotal + tax;
  const cartCount = cart.reduce((n, line) => n + line.qty, 0);
  const add = (product: KioskProduct, sides?: KioskSideChoice[]) => { const item = product.items[0]; if (!item) return; const key = cartLineKey(item.id, sides); setCart(old => { const exists = old.find(l => cartLineKey(l.item.id, l.sides) === key); return exists ? old.map(l => cartLineKey(l.item.id, l.sides) === key ? { ...l, qty: Math.min(50, l.qty + 1) } : l) : [...old, { product, item, qty: 1, sides }]; }); };
  const setQty = (line: KioskCartLine, qty: number) => { const key = cartLineKey(line.item.id, line.sides); setCart(old => qty <= 0 ? old.filter(l => cartLineKey(l.item.id, l.sides) !== key) : old.map(l => cartLineKey(l.item.id, l.sides) === key ? { ...l, qty: Math.min(50, qty) } : l)); };
  const openProduct = (product: KioskProduct) => product.comboSideCount && product.comboSideCategoryId ? (setSideProduct(product), setChosenSides([])) : add(product);
  const sideOptions = useMemo(() => !sideProduct?.comboSideCategoryId || !config ? [] : config.menu.products.filter(p => p.id !== sideProduct.id && p.categoryIds.includes(sideProduct.comboSideCategoryId!)), [config, sideProduct]);
  const toReview = (event: FormEvent) => { event.preventDefault(); if (cart.length) { setError(""); setStage("review"); } };
  const pay = async () => { if (!config || !square.ready || busy) return; setBusy(true); setError(""); try { const squareNonce = await square.tokenize(); if (!requestId.current) { requestId.current = crypto.randomUUID(); localStorage.setItem(PENDING_KEY, JSON.stringify({ requestId: requestId.current })); } const placed = responseData(await apiPost<PickupResult | { data: PickupResult }>("/pickup/orders", { clientRequestId: requestId.current, lines: cart.map(l => ({ productItemId: l.item.id, qty: l.qty, sideProductIds: l.sides?.map(s => s.id) })), customerName: name, customerPhone: phone, squareNonce, source: searchParams.get("pickupSource") === "event_qr" ? "event_qr" : "remote", sourceLinkSlug: searchParams.get("pickupSourceLink") ?? undefined, sourceToken: searchParams.get("pickupSourceToken") ?? undefined })); setResult(placed); localStorage.setItem(PENDING_KEY, JSON.stringify({ requestId: requestId.current, capability: placed.capability })); if (placed.paymentStatus === "paid") { localStorage.removeItem(PENDING_KEY); setStage("complete"); } else if (placed.paymentStatus === "canceled") { localStorage.removeItem(PENDING_KEY); requestId.current = null; setError("Square did not approve this payment. Please use another card."); } else setStage("confirming"); } catch (cause) { setError(cause instanceof Error ? cause.message : "Payment is being confirmed. Do not start a new order."); if (requestId.current) setStage("confirming"); } finally { setBusy(false); } };

  if (!config) return <main className="jp-shell jp-center"><PigMark /><p className="jp-kicker">Jiggling Pig / Roadside pickup</p><div className="jp-loading"><span /><span /><span /></div><p role={error ? "alert" : undefined}>{error || "Warming up the pit…"}</p></main>;
  const isClosed = !config.isOrderingOpen || searchParams.get("state") === "closed";
  if (isClosed) return <main className="jp-shell jp-center jp-closed"><PigMark /><p className="jp-kicker">The Jiggling Pig</p><h1>The pit is<br /><em>resting.</em></h1><div className="jp-closed-card"><strong>ASAP PICKUP IS CLOSED</strong><p>We’re not taking roadside orders right now. Check back when smoke is in the air.</p></div><small>{config.eventName} · {config.streetAddress}</small></main>;
  if (stage === "complete" && result) return <main className="jp-shell jp-center"><PigMark /><p className="jp-kicker">Payment received</p><h1>See you<br /><em>soon.</em></h1><section className="jp-receipt"><p>ORDER NUMBER</p><strong>{result.orderNumber}</strong><hr />{result.items.map((item, i) => <div key={i}><span>{item.qty} × {item.name}<small>{item.sides}</small></span><b>{formatMoney(item.lineTotal)}</b></div>)}<hr /><div className="jp-total"><span>TOTAL PAID</span><b>{formatMoney(result.grandTotal)}</b></div></section><p className="jp-note">Ready in about {config.asapWaitMinutes} minutes at {config.eventName}.</p>{result.receiptUrl && <a className="jp-link" href={result.receiptUrl} target="_blank" rel="noreferrer">View Square receipt</a>}</main>;
  if (stage === "confirming") return <main className="jp-shell jp-center"><PigMark /><p className="jp-kicker">One moment</p><h1>Checking<br /><em>the coals.</em></h1><div className="jp-wait"><div className="jp-loading"><span /><span /><span /></div><p>We’re confirming your existing payment with Square. Please don’t place another order.</p>{error && <p role="alert" className="jp-alert">{error}</p>}<button className="jp-ghost" onClick={() => void recover()}>Check payment now</button>{canReplay && <button className="jp-primary" onClick={() => { setError(""); setStage("payment"); }}>Retry this checkout</button>}</div></main>;

  const menu = <section className="jp-menu"><div className="jp-menu-heading"><p className="jp-kicker">Roadside pickup</p><h1>What’s<br /><em>smoking?</em></h1><p>{config.eventName} <span>·</span> about {config.asapWaitMinutes} min</p></div><div className="jp-grid">{config.menu.products.map(product => { const price = product.items[0]?.price ?? 0; return <button key={product.id} className="jp-product" onClick={() => openProduct(product)}><div className="jp-product-img"><ProductArt name={product.name} />{product.comboSideCount ? <span>{product.comboSideCount} sides</span> : null}</div><div><h2>{product.name}</h2><p>{product.description || (product.comboSideCount ? "Pick your favorite sides" : "Straight from the Jiggling Pig pit")}</p><footer><b>{formatMoney(price)}</b><i aria-hidden="true">+</i></footer></div></button>; })}</div></section>;
  const cartPanel = <aside className="jp-cart"><header><div><p className="jp-kicker">Your order</p><h2>{cartCount ? `${cartCount} item${cartCount === 1 ? "" : "s"}` : "Hungry yet?"}</h2></div><PigMark /></header>{cart.length ? <form onSubmit={toReview} className="jp-cart-filled"><div className="jp-lines">{cart.map(line => <div className="jp-line" key={cartLineKey(line.item.id, line.sides)}><div><b>{line.product.name}</b>{line.sides?.length ? <small>{line.sides.map(s => s.name).join(" · ")}</small> : null}<div className="jp-qty"><button type="button" aria-label={`Decrease ${line.product.name}`} onClick={() => setQty(line, line.qty - 1)}>−</button><span>{line.qty}</span><button type="button" aria-label={`Increase ${line.product.name}`} onClick={() => setQty(line, line.qty + 1)}>+</button></div></div><strong>{formatMoney((line.item.price + sidesUpcharge(line.sides)) * line.qty)}</strong></div>)}</div><div className="jp-cost"><span>Subtotal <b>{formatMoney(subtotal)}</b></span><span>Estimated tax <b>{formatMoney(tax)}</b></span><strong>Total <b>{formatMoney(total)}</b></strong></div><button className="jp-primary">Review order <span>{formatMoney(total)}</span></button></form> : <div className="jp-empty"><span>01</span><p>Tap a plate to start your order.</p></div>}</aside>;
  const checkout = stage === "menu" ? <main className="jp-shell jp-order"><header className="jp-top"><div><PigMark /><span>THE JIGGLING PIG</span></div><span>BBQ / ROADSIDE</span></header>{error && <p role="alert" className="jp-alert">{error}</p>}<div className="jp-order-body">{menu}{cartPanel}</div></main> : <main className="jp-shell jp-checkout"><button className="jp-back" disabled={busy} onClick={() => setStage(stage === "payment" ? "review" : "menu")}><BackIcon /> Back to menu</button><section className="jp-check-panel"><PigMark /><p className="jp-kicker">{stage === "review" ? "Almost there" : "Secure payment"}</p><h1>{stage === "review" ? <>Make it<br /><em>yours.</em></> : <>Pay for<br /><em>the good stuff.</em></>}</h1>{stage === "review" ? <form onSubmit={e => { e.preventDefault(); setStage("payment"); }}><div className="jp-order-summary"><span>{cartCount} items <b>{formatMoney(total)}</b></span><small>Final total is confirmed securely at payment.</small></div><label>Name<input required maxLength={100} value={name} onChange={e => setName(e.target.value)} autoComplete="name" placeholder="Your name" /></label><label>Mobile phone<input required maxLength={30} value={phone} onChange={e => setPhone(e.target.value)} inputMode="tel" autoComplete="tel" placeholder="For pickup updates" /></label><button className="jp-primary">Continue to payment</button></form> : <><div className="jp-order-summary"><span>Order total <b>{formatMoney(total)}</b></span></div><div id="pickup-square-card" className="jp-square" />{square.error && <p className="jp-alert" role="alert">{square.error}</p>}<button disabled={!square.ready || busy} className="jp-primary" onClick={() => void pay()}>{busy ? "Confirming securely…" : `Pay ${formatMoney(total)}`}</button>{error && requestId.current && <button disabled={busy} className="jp-ghost" onClick={() => void pay()}>Safely check this payment again</button>}<p className="jp-safe">Payments are processed by Square. Card details never touch our grill.</p></>}</section></main>;
  return <>{checkout}{sideProduct && <div className="jp-modal" role="dialog" aria-modal="true" aria-labelledby="side-title"><section><button className="jp-close" aria-label="Close sides" onClick={() => setSideProduct(null)}>×</button><p className="jp-kicker">Build your plate</p><h2 id="side-title">Pick {sideProduct.comboSideCount} side{sideProduct.comboSideCount === 1 ? "" : "s"}</h2><p className="jp-selected">{chosenSides.length} of {sideProduct.comboSideCount} selected</p><div className="jp-sides">{sideOptions.map(side => { const selected = chosenSides.some(s => s.id === side.id); return <button key={side.id} className={selected ? "selected" : ""} disabled={!selected && chosenSides.length >= sideProduct.comboSideCount} onClick={() => setChosenSides(old => selected ? old.filter(s => s.id !== side.id) : [...old, { id: side.id, name: side.name, upcharge: side.duplicateSideUpcharge }])}><b>{side.name}</b>{side.duplicateSideUpcharge > 0 && <small>Extra serving {formatMoney(side.duplicateSideUpcharge)}</small>}</button>; })}</div><div className="jp-modal-actions"><button className="jp-ghost" onClick={() => setChosenSides([])}>Clear</button><button className="jp-primary" disabled={chosenSides.length !== sideProduct.comboSideCount} onClick={() => { add(sideProduct, chosenSides); setSideProduct(null); }}>Add to order</button></div></section></div>}</>;
}