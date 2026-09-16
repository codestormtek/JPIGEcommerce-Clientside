"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiGet, apiPost, isMenuChangedError } from "@/lib/api";
import { cartLineKey, formatMoney, sidesUpcharge, type KioskCartLine, type KioskMenu, type KioskProduct, type KioskSideChoice } from "@/lib/kiosk";
import {
  getKioskMenuAllSections,
  getKioskMenuSections,
  getKioskMenuTabLabel,
  getKioskMenuTabs,
  reconcileKioskCart,
  reconcileKioskSidePicker,
} from "@/lib/menu";
import { useSquarePayments } from "@/lib/useSquarePayments";

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

const PENDING_KEY = "jpig_pickup_pending_v1";
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

function PigMark() {
  return <img className="jp-brand-logo" src="/kiosk-logo.png" alt="The Jiggling Pig" width={519} height={500} />;
}

function BackIcon() {
  return <span aria-hidden="true">‹</span>;
}

function ProductArt({ product }: { product: KioskProduct }) {
  if (product.imageUrl) {
    return <img src={product.imageUrl} alt={product.name} />;
  }

  return (
    <span className="jp-product-fallback" aria-hidden="true">
      <svg viewBox="0 0 160 100">
        <path d="M39 68c5-35 30-48 55-41 20 6 29 22 27 41H39Z" />
        <path d="M50 68c8-16 17-18 29-10s19-1 29-13" />
        <path d="M33 76h95" />
      </svg>
    </span>
  );
}

export default function PickupPage() {
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
  const [menuRefreshError, setMenuRefreshError] = useState("");
  const [menuRefreshing, setMenuRefreshing] = useState(false);
  const [cartReviewRequired, setCartReviewRequired] = useState(false);
  const [invalidCartLineKeys, setInvalidCartLineKeys] = useState<string[]>([]);
  const [result, setResult] = useState<PickupResult | null>(null);
  const [canReplay, setCanReplay] = useState(false);
  const [activeCategory, setActiveCategory] = useState("all");
  const requestId = useRef<string | null>(null);
  const stageRef = useRef<Stage>(stage);
  const cartRef = useRef<KioskCartLine[]>(cart);
  const configRef = useRef<PickupConfig | null>(config);
  const configRequestRef = useRef<Promise<PickupConfig> | null>(null);
  const forceConfigApplyRef = useRef(false);
  stageRef.current = stage;
  cartRef.current = cart;
  configRef.current = config;

  useEffect(() => {
    setInvalidCartLineKeys((previous) =>
      previous.filter((lineKey) =>
        cart.some((line) => cartLineKey(line.item.id, line.sides) === lineKey),
      ),
    );
  }, [cart]);

  const square = useSquarePayments({
    enabled: stage === "payment" && Boolean(config?.cardEnabled),
    applicationId: config?.applicationId ?? "",
    locationId: config?.locationId ?? "",
    environment: config?.environment ?? "sandbox",
    containerSelector: "#pickup-square-card",
  });

  const loadPickupConfig = useCallback(async (
    isRefresh = false,
    forceApply = false,
  ): Promise<PickupConfig> => {
    if (forceApply) forceConfigApplyRef.current = true;
    if (
      isRefresh &&
      !forceApply &&
      (typeof document !== "undefined" &&
        (document.visibilityState !== "visible" || stageRef.current !== "menu"))
    ) {
      return configRef.current as PickupConfig;
    }
    if (configRequestRef.current) return configRequestRef.current;
    const request = apiGet<PickupConfig | { data: PickupConfig }>("/pickup").then(responseData);
    configRequestRef.current = request;
    setMenuRefreshing(true);
    try {
      const next = await request;
      if (!isRefresh || forceConfigApplyRef.current || stageRef.current === "menu") {
        const reconciliation = reconcileKioskCart(cartRef.current, next.menu);
        if (reconciliation.changed) {
          setCart(reconciliation.cart);
          setCartReviewRequired(true);
          setInvalidCartLineKeys(reconciliation.invalidCartLineKeys);
        }
        configRef.current = next;
        setConfig(next);
      }
      return next;
    } finally {
      if (configRequestRef.current === request) configRequestRef.current = null;
      forceConfigApplyRef.current = false;
      setMenuRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        await loadPickupConfig();
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

  const refreshPickupMenu = useCallback(async () => {
    if (!configRef.current || stageRef.current !== "menu" || document.visibilityState !== "visible") {
      return;
    }
    try {
      await loadPickupConfig(true);
      setMenuRefreshError("");
    } catch (cause) {
      // Keep the last known-good menu, cart, modal, and checkout state.
      setMenuRefreshError(
        cause instanceof Error
          ? cause.message
          : "Menu refresh failed. We are showing the last known menu.",
      );
    }
  }, [loadPickupConfig]);

  useEffect(() => {
    if (stage !== "menu" || !config) return;
    const timer = window.setInterval(() => void refreshPickupMenu(), 30_000);
    const refreshWhenVisible = () => void refreshPickupMenu();
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [stage, config, refreshPickupMenu]);

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
  const removeInvalidCartLines = () => {
    setCart(previous =>
      previous.filter(
        line => !invalidCartLineKeys.includes(cartLineKey(line.item.id, line.sides)),
      ),
    );
    setInvalidCartLineKeys([]);
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

  // Rebase only when the catalog snapshot changes; picker/selection updates
  // themselves should not retrigger this reconciliation.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!config?.menu) return;
    const rebased = reconcileKioskSidePicker(sideProduct, chosenSides, config.menu);
    if (rebased.shouldClose) {
      setSideProduct(null);
      setChosenSides([]);
      setError("This combo changed while you were choosing sides. Please select it again.");
      return;
    }
    if (rebased.changed && rebased.product) {
      setSideProduct(rebased.product);
      setChosenSides(rebased.chosenSides);
    }
  }, [config?.menu]);

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
    if (menuRefreshing) return;
    if (invalidCartLineKeys.length) {
      setError("A menu item or side choice changed. Remove that line before checkout.");
      return;
    }
    if (cartReviewRequired) setCartReviewRequired(false);
    setError("");
    setStage("review");
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
        expectedTotalCents: Math.round(displayTotal * 100),
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
      if (isMenuChangedError(cause)) {
        // MENU_CHANGED is explicitly pre-payment: discard only this
        // unsubmitted attempt, then rehydrate the catalog before showing the
        // order again. Never enter payment recovery for this response.
        clearPendingAttempt();
        requestId.current = null;
        setBusy(false);
        setCartReviewRequired(true);
        setMenuRefreshError("The menu changed while checking out. Review your updated order.");
        setStage("menu");
        void loadPickupConfig(true, true)
          .then(() => setMenuRefreshError(""))
          .catch((refreshCause) => {
            setMenuRefreshError(
              refreshCause instanceof Error
                ? refreshCause.message
                : "Menu refresh failed. We are showing the last known menu.",
            );
          });
        return;
      }
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

  if (!config) {
    return (
      <main className="jp-shell jp-center">
        <PigMark />
        <p className="jp-kicker">Jiggling Pig / Roadside pickup</p>
        <div className="jp-loading" aria-hidden="true"><span /><span /><span /></div>
        <p role={error ? "alert" : undefined}>{error || "Warming up the pit…"}</p>
      </main>
    );
  }

  if (stage === "complete" && result) {
    return (
      <main className="jp-shell jp-center">
        <PigMark />
        <p className="jp-kicker">Payment received</p>
        <h1>See you<br /><em>soon.</em></h1>
        <section className="jp-receipt">
          <p>ORDER NUMBER</p>
          <strong>{result.orderNumber}</strong>
          <hr />
          {result.items.map((item, index) => (
            <div key={index}>
              <span>{item.qty} × {item.name}{item.sides ? <small>{item.sides}</small> : null}</span>
              <b>{formatMoney(item.lineTotal)}</b>
            </div>
          ))}
          <hr />
          <div className="jp-total"><span>TOTAL PAID</span><b>{formatMoney(result.grandTotal)}</b></div>
        </section>
        <p className="jp-note">Ready in about {config.asapWaitMinutes} minutes at {config.eventName}.</p>
        {result.receiptUrl && <a className="jp-link" href={result.receiptUrl} target="_blank" rel="noreferrer">View Square receipt</a>}
      </main>
    );
  }

  if (stage === "confirming") {
    return (
      <main className="jp-shell jp-center">
        <PigMark />
        <p className="jp-kicker">One moment</p>
        <h1>Checking<br /><em>the coals.</em></h1>
        <div className="jp-wait">
          <div className="jp-loading" aria-hidden="true"><span /><span /><span /></div>
          <p>We&apos;re confirming your existing payment with Square. Please don&apos;t place another order.</p>
          {result && <p>Order {result.orderNumber}</p>}
          {error && <p role="alert" className="jp-alert">{error}</p>}
          <button className="jp-ghost" onClick={() => void recoverPersistedAttempt()}>Check payment now</button>
          {canReplay && <button className="jp-primary" onClick={() => { setError(""); setStage("payment"); }}>Retry this checkout</button>}
        </div>
      </main>
    );
  }

  if (!config.isOrderingOpen) {
    return (
      <main className="jp-shell jp-center jp-closed">
        <PigMark />
        <p className="jp-kicker">The Jiggling Pig</p>
        <h1>The pit is<br /><em>resting.</em></h1>
        <div className="jp-closed-card">
          <strong>ASAP PICKUP IS CLOSED</strong>
          <p>We&apos;re not taking roadside orders right now. Check back when smoke is in the air.</p>
        </div>
        <small>{config.eventName} · {config.streetAddress}</small>
      </main>
    );
  }

  const cartCount = cart.reduce((count, line) => count + line.qty, 0);
  const menuTabs = getKioskMenuTabs(config.menu);
  const selectedCategory =
    activeCategory === "all" || menuTabs.some((tab) => tab.id === activeCategory)
      ? activeCategory
      : "all";
  const visibleGroups = selectedCategory === "all"
    ? getKioskMenuAllSections(config.menu).map((section, index) => ({
        id: `all-${index}`,
        name: section.title ?? "Other Items",
        products: section.products,
      }))
    : getKioskMenuSections(config.menu, selectedCategory).map((section, index) => ({
        id: `${selectedCategory}-${index}`,
        name: section.title ??
          getKioskMenuTabLabel(menuTabs.find((tab) => tab.id === selectedCategory) ?? { name: "Menu" }),
        products: section.products,
      }));

  const productCard = (product: KioskProduct) => {
    const price = product.items[0]?.price ?? 0;
    return (
      <button key={product.id} type="button" className="jp-product" onClick={() => openProduct(product)}>
        <div className="jp-product-img">
          <ProductArt product={product} />
          {product.comboSideCount ? <span>{product.comboSideCount} sides</span> : null}
        </div>
        <div>
          <h2>{product.name}</h2>
          <p>{product.description || (product.comboSideCount ? "Pick your favorite sides" : "Straight from the Jiggling Pig pit")}</p>
          <footer><b>{formatMoney(price)}</b><i aria-hidden="true">+</i></footer>
        </div>
      </button>
    );
  };

  const menu = (
    <section className="jp-menu">
      <div className="jp-menu-heading">
        <div>
          <p className="jp-kicker">Roadside pickup</p>
          <h1>What&apos;s<br /><em>smoking?</em></h1>
        </div>
        <p>{config.eventName} <span>·</span> about {config.asapWaitMinutes} min</p>
      </div>
      <nav className="jp-category-nav" aria-label="Menu sections">
        <button
          type="button"
          className={selectedCategory === "all" ? "active" : ""}
          aria-pressed={selectedCategory === "all"}
          onClick={() => setActiveCategory("all")}
        >
          All
        </button>
        {menuTabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            className={selectedCategory === tab.id ? "active" : ""}
            aria-pressed={selectedCategory === tab.id}
            onClick={() => setActiveCategory(tab.id)}
          >
            {getKioskMenuTabLabel(tab)}
          </button>
        ))}
      </nav>
      <div className="jp-category-groups">
        {visibleGroups.map(({ id, name, products }) => (
          <section
            className="jp-category-section"
            id={`pickup-category-${id}`}
            key={id}
            aria-labelledby={`pickup-category-title-${id}`}
          >
            <div className="jp-category-title">
              <h2 id={`pickup-category-title-${id}`}>{name}</h2>
              <span>{products.length} item{products.length === 1 ? "" : "s"}</span>
            </div>
            <div className="jp-grid">{products.map(productCard)}</div>
          </section>
        ))}
        {!visibleGroups.length && (
          <div className="jp-empty jp-menu-empty">
            <span>00</span>
            <p>Nothing is listed in this section yet.</p>
          </div>
        )}
      </div>
    </section>
  );

  const cartPanel = (
    <aside className="jp-cart">
      <header>
        <div>
          <p className="jp-kicker">Your order</p>
          <h2>{cartCount ? `${cartCount} item${cartCount === 1 ? "" : "s"}` : "Hungry yet?"}</h2>
        </div>
        <PigMark />
      </header>
      {cart.length ? (
        <form onSubmit={continueToPayment} className="jp-cart-filled">
          <div className="jp-lines">
            {cart.map(line => (
              <div className="jp-line" key={cartLineKey(line.item.id, line.sides)}>
                <div>
                  <b>{line.product.name}</b>
                  {line.sides?.length ? <small>{line.sides.map(side => side.name).join(" · ")}</small> : null}
                  <div className="jp-qty">
                    <button type="button" aria-label={`Decrease ${line.product.name}`} onClick={() => setQty(line, line.qty - 1)}>−</button>
                    <span>{line.qty}</span>
                    <button type="button" aria-label={`Increase ${line.product.name}`} onClick={() => setQty(line, line.qty + 1)}>+</button>
                  </div>
                </div>
                <strong>{formatMoney((line.item.price + sidesUpcharge(line.sides)) * line.qty)}</strong>
              </div>
            ))}
          </div>
          <div className="jp-cost">
            <span>Subtotal <b>{formatMoney(subtotal)}</b></span>
            <span>Estimated tax <b>{formatMoney(tax)}</b></span>
            <strong>Total <b>{formatMoney(displayTotal)}</b></strong>
          </div>
          {(menuRefreshing || cartReviewRequired || invalidCartLineKeys.length > 0) && (
            <p role="status" className="jp-cart-notice">
              {menuRefreshing
                ? "Checking for menu updates before checkout."
                : invalidCartLineKeys.length > 0
                ? "A menu item or side choice changed. Remove that line before checkout."
                : "The menu changed. Review your updated order before checkout."}
            </p>
          )}
          {invalidCartLineKeys.length > 0 && (
            <button type="button" className="jp-ghost jp-remove-invalid" onClick={removeInvalidCartLines}>
              Remove changed items
            </button>
          )}
          <button
            className="jp-primary"
            disabled={menuRefreshing || invalidCartLineKeys.length > 0}
          >
            {menuRefreshing
              ? "Updating menu…"
              : invalidCartLineKeys.length > 0
                ? "Remove changed item"
                : "Review order"}{" "}
            {!menuRefreshing && invalidCartLineKeys.length === 0 && <span>{formatMoney(displayTotal)}</span>}
          </button>
        </form>
      ) : (
        <div className="jp-empty"><span>01</span><p>Tap a plate to start your order.</p></div>
      )}
    </aside>
  );

  const checkout = stage === "menu" ? (
    <main className="jp-shell jp-order">
      <header className="jp-top">
        <div><PigMark /><span>THE JIGGLING PIG</span></div>
        <span>BBQ / ROADSIDE</span>
      </header>
      {menuRefreshError && <p role="alert" className="jp-alert jp-refresh-alert">{menuRefreshError}</p>}
      {error && <p role="alert" className="jp-alert">{error}</p>}
      <div className="jp-order-body">{menu}{cartPanel}</div>
    </main>
  ) : (
    <main className="jp-shell jp-checkout">
      <button className="jp-back" disabled={busy} onClick={() => setStage(stage === "payment" ? "review" : "menu")}><BackIcon /> Back to {stage === "payment" ? "review" : "menu"}</button>
      <section className="jp-check-panel">
        <PigMark />
        <p className="jp-kicker">{stage === "review" ? "Almost there" : "Secure payment"}</p>
        <h1>{stage === "review" ? <>Make it<br /><em>yours.</em></> : <>Pay for<br /><em>the good stuff.</em></>}</h1>
        {error && <p className="jp-alert" role="alert">{error}</p>}
        {stage === "review" ? (
          <form onSubmit={event => { event.preventDefault(); setStage("payment"); }}>
            <div className="jp-order-summary">
              <span>{cartCount} item{cartCount === 1 ? "" : "s"} <b>{formatMoney(displayTotal)}</b></span>
              <small>Final total is confirmed securely at payment.</small>
            </div>
            <label>Name<input required maxLength={100} value={name} onChange={event => setName(event.target.value)} autoComplete="name" placeholder="Your name" /></label>
            <label>Mobile phone<input required maxLength={30} value={phone} onChange={event => setPhone(event.target.value)} inputMode="tel" autoComplete="tel" placeholder="For pickup updates" /></label>
            <button className="jp-primary">Continue to payment</button>
          </form>
        ) : (
          <>
            <div className="jp-order-summary"><span>Order total <b>{formatMoney(displayTotal)}</b></span></div>
            <div id="pickup-square-card" className="jp-square" />
            {square.error && <p className="jp-alert" role="alert">{square.error}</p>}
            <button disabled={!square.ready || busy} className="jp-primary" onClick={() => void submit()}>{busy ? "Confirming securely…" : `Pay ${formatMoney(displayTotal)}`}</button>
            {error && requestId.current && <button disabled={busy} className="jp-ghost" onClick={() => void submit()}>Safely check this payment again</button>}
            <p className="jp-safe">Payments are processed by Square. Card details never touch our grill.</p>
          </>
        )}
      </section>
    </main>
  );

  return (
    <>
      {checkout}
      {sideProduct && (
        <div className="jp-modal" role="dialog" aria-modal="true" aria-labelledby="side-title">
          <section>
            <button className="jp-close" aria-label="Close sides" onClick={() => setSideProduct(null)}>×</button>
            <p className="jp-kicker">Build your plate</p>
            <h2 id="side-title">Pick {sideProduct.comboSideCount} side{sideProduct.comboSideCount === 1 ? "" : "s"}</h2>
            <p className="jp-selected">{chosenSides.length} of {sideProduct.comboSideCount} selected</p>
            <div className="jp-sides">
              {sideOptions.map(side => {
                const selected = chosenSides.some(choice => choice.id === side.id);
                return (
                  <button
                    key={side.id}
                    className={selected ? "selected" : ""}
                    disabled={!selected && chosenSides.length >= sideProduct.comboSideCount}
                    onClick={() => setChosenSides(old => selected
                      ? old.filter(choice => choice.id !== side.id)
                      : [...old, { id: side.id, name: side.name, upcharge: side.duplicateSideUpcharge }])}
                  >
                    <b>{side.name}</b>
                    {side.duplicateSideUpcharge > 0 && <small>Extra serving {formatMoney(side.duplicateSideUpcharge)}</small>}
                  </button>
                );
              })}
            </div>
            <div className="jp-modal-actions">
              <button className="jp-ghost" onClick={() => setChosenSides([])}>Clear</button>
              <button className="jp-primary" disabled={chosenSides.length !== sideProduct.comboSideCount} onClick={() => { add(sideProduct, chosenSides); setSideProduct(null); }}>Add to order</button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}