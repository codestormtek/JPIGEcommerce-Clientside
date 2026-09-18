"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ApiRequestError, apiGet, apiPost, isMenuChangedError } from "@/lib/api";
import {
  cartLineKey,
  formatMoney,
  isMenuItemAvailable,
  isMenuProductAvailable,
  preferredMenuItem,
  sidesUpcharge,
  type KioskCartLine,
  type KioskMenu,
  type KioskProduct,
  type KioskSideChoice,
} from "@/lib/kiosk";
import {
  getKioskMenuAllSections,
  getKioskMenuSections,
  getKioskMenuTabLabel,
  getKioskMenuTabs,
  reconcileKioskCart,
  reconcileKioskSidePicker,
} from "@/lib/menu";
import { getPickupSmsOptIn } from "@/lib/pickup-order";
import { useSquarePayments } from "@/lib/useSquarePayments";
import { useSquareWallets } from "@/lib/useSquareWallets";
import type { PickupPaymentMethod } from "@/lib/square-wallets";
import PickupDetails from "@/components/pickup/PickupDetails";
import PickupSuggestions from "@/components/pickup/PickupSuggestions";
import PickupStatus from "@/components/pickup/PickupStatus";
import {
  classifyPickupCapabilityError,
  isPickupStatusTerminal,
  type PickupStatusMode,
} from "@/lib/pickup-status";

type PickupConfig = {
  isOrderingOpen: boolean; eventName: string; streetAddress: string; asapWaitMinutes: number;
  pickupInstructions?: string | null;
  smsEnabled?: boolean | null;
  cardEnabled: boolean; applicationId: string | null; locationId: string | null; environment: string;
  menu: KioskMenu; taxRatePercent?: number;
  schedulingEnabled?: boolean;
  eventDate?: string; opensAt?: string; shutsDownAt?: string; timezone?: string;
  slotIntervalMinutes?: number; minimumPrepMinutes?: number; reminderLeadMinutes?: number;
  shutdownCutoffMinutes?: number;
  availablePickupSlots?: { value: string; label: string }[];
};
type PickupResult = {
  orderNumber: string; capability: string; paymentStatus: "paid" | "pending" | "canceled";
  receiptUrl: string | null; status: string; grandTotal: number; currency: string;
  items: { name: string; qty: number; sides: string | null; lineTotal: number }[];
  canReplay?: boolean;
  requestedFulfillmentAt?: string | null;
  requestedFulfillmentTimezone?: string | null;
};
type Stage = "menu" | "review" | "payment" | "confirming" | "complete";

const PENDING_KEY = "jpig_pickup_pending_v1";
const CONFIRMATION_KEY = "jpig_pickup_confirmation_v1";
type PendingPickupAttempt = { requestId?: string; capability?: string };
type PickupConfirmation = { capability: string };
type RecoveryKind = "payment" | "fulfillment" | null;

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

function readPickupConfirmation(): PickupConfirmation | null {
  if (typeof window === "undefined") return null;
  try {
    const value = JSON.parse(localStorage.getItem(CONFIRMATION_KEY) ?? "null") as PickupConfirmation | null;
    return value && typeof value.capability === "string" && value.capability.length > 0 ? value : null;
  } catch {
    return null;
  }
}

function savePickupConfirmation(capability: string): void {
  localStorage.setItem(CONFIRMATION_KEY, JSON.stringify({ capability }));
}

function clearPickupConfirmation(): void {
  localStorage.removeItem(CONFIRMATION_KEY);
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
  const [stage, setStage] = useState<Stage>(() => readPendingAttempt() || readPickupConfirmation() ? "confirming" : "menu");
  const [recoveryKind, setRecoveryKind] = useState<RecoveryKind>(() =>
    readPendingAttempt() ? "payment" : readPickupConfirmation() ? "fulfillment" : null,
  );
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pickupAt, setPickupAt] = useState("");
  const [smsOptIn, setSmsOptIn] = useState(false);
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
  const [confirmationCapability, setConfirmationCapability] = useState<string | null>(
    () => readPickupConfirmation()?.capability ?? null,
  );
  const [statusMode, setStatusMode] = useState<PickupStatusMode>("current");
  const [trackingUnavailable, setTrackingUnavailable] = useState(false);
  const [fulfillmentError, setFulfillmentError] = useState("");
  const [fulfillmentRefreshing, setFulfillmentRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState("all");
  const fulfillmentPollInFlight = useRef(false);
  const requestId = useRef<string | null>(null);
  const paymentInFlight = useRef(false);
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

  useEffect(() => {
    if (config?.smsEnabled !== true) setSmsOptIn(false);
  }, [config?.smsEnabled]);

  useEffect(() => {
    if (!config?.schedulingEnabled) {
      setPickupAt("");
      return;
    }
    if (pickupAt && !(config.availablePickupSlots ?? []).some((slot) => slot.value === pickupAt)) {
      setPickupAt("");
    }
  }, [config?.schedulingEnabled, config?.availablePickupSlots, pickupAt]);

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
        }
        setInvalidCartLineKeys(reconciliation.invalidCartLineKeys);
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
          setRecoveryKind("payment");
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
        } else {
          const confirmation = readPickupConfirmation();
          if (confirmation) {
            setConfirmationCapability(confirmation.capability);
            setRecoveryKind("fulfillment");
            setStage("confirming");
            await poll(confirmation.capability, "fulfillment");
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
  const totalCents = Math.round(displayTotal * 100);
  const wallets = useSquareWallets({
    enabled: stage === "payment" && Boolean(config?.cardEnabled),
    payments: square.payments,
    totalCents,
    googleSelector: "#pickup-google-pay",
  });

  const add = (product: KioskProduct, sides?: KioskSideChoice[]) => {
    const item = preferredMenuItem(product);
    if (!item || !isMenuProductAvailable(product) || !isMenuItemAvailable(item)) return;
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
    if (!isMenuProductAvailable(product) || !isMenuItemAvailable(preferredMenuItem(product))) return;
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

  function handlePermanentFulfillmentFailure(cause: unknown): boolean {
    const statusCode = cause instanceof ApiRequestError ? cause.status : undefined;
    if (classifyPickupCapabilityError(statusCode) !== "permanent") return false;
    clearPickupConfirmation();
    setConfirmationCapability(null);
    setStatusMode("unavailable");
    setTrackingUnavailable(true);
    setFulfillmentError("Pickup tracking has expired or is unavailable. We won’t show this order as ready.");
    setFulfillmentRefreshing(false);
    setRecoveryKind(null);
    setError("");
    // Keep the loader on screen until the unavailable state renders, rather
    // than falling through to payment recovery or another order attempt.
    setStage("confirming");
    return true;
  }

  async function poll(capability: string, purpose: "payment" | "fulfillment" = "payment"): Promise<void> {
    try {
      const next = responseData(await apiGet<PickupResult | { data: PickupResult }>(`/pickup/orders/${encodeURIComponent(capability)}`));
      setResult(next);
      if (next.paymentStatus === "paid") {
        savePickupConfirmation(next.capability || capability);
        setConfirmationCapability(next.capability || capability);
        clearPendingAttempt();
        setStatusMode("current");
        setTrackingUnavailable(false);
        setFulfillmentError("");
        setRecoveryKind(null);
        setError("");
        setStage("complete");
      } else if (next.paymentStatus === "canceled") {
        if (purpose === "fulfillment") {
          setStatusMode("unavailable");
          setFulfillmentError("We could not verify the payment for this order. Try again or contact us for help.");
          setStage("confirming");
          return;
        }
        clearPendingAttempt();
        requestId.current = null;
        setRecoveryKind(null);
        setStage("payment");
        setError("Square did not approve this payment. Please use another card.");
      } else {
        if (purpose === "fulfillment") {
          setStatusMode("unavailable");
          setFulfillmentError("We’re still confirming this order. We’ll keep checking and will not show it as ready yet.");
        }
        setStage("confirming");
      }
    } catch (cause) {
      if (purpose === "fulfillment") {
        if (handlePermanentFulfillmentFailure(cause)) return;
        setFulfillmentError(cause instanceof Error ? cause.message : "We could not load your pickup status.");
        setStatusMode((previous) => previous === "unavailable" ? previous : "stale");
      } else {
        setError(cause instanceof Error ? cause.message : "We could not confirm payment yet.");
      }
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
        savePickupConfirmation(recoveredOrder.capability);
        setConfirmationCapability(recoveredOrder.capability);
        clearPendingAttempt();
        setStatusMode("current");
        setTrackingUnavailable(false);
        setCanReplay(false);
        setRecoveryKind(null);
        setError("");
        setStage("complete");
      } else if (recoveredOrder.paymentStatus === "canceled") {
        clearPendingAttempt();
        requestId.current = null;
        setCanReplay(false);
        setRecoveryKind(null);
        setStage("payment");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We could not confirm payment yet.");
    }
  }

  async function pollFulfillmentStatus(capability: string): Promise<void> {
    if (fulfillmentPollInFlight.current) return;
    fulfillmentPollInFlight.current = true;
    setFulfillmentRefreshing(true);
    try {
      const next = responseData(await apiGet<PickupResult | { data: PickupResult }>(`/pickup/orders/${encodeURIComponent(capability)}`));
      if (next.paymentStatus !== "paid") {
        setStatusMode("unavailable");
        setFulfillmentError(
          next.paymentStatus === "canceled"
            ? "We could not verify the payment for this order. Try again or contact us for help."
            : "We’re still confirming this order. We’ll keep checking and will not show it as ready yet.",
        );
        return;
      }
      const nextCapability = next.capability || capability;
      savePickupConfirmation(nextCapability);
      setConfirmationCapability(nextCapability);
      setResult(next);
      setStatusMode("current");
      setTrackingUnavailable(false);
      setFulfillmentError("");
    } catch (cause) {
      if (handlePermanentFulfillmentFailure(cause)) return;
      setStatusMode((previous) => previous === "unavailable" ? previous : "stale");
      setFulfillmentError(cause instanceof Error ? cause.message : "We could not load your pickup status.");
    } finally {
      fulfillmentPollInFlight.current = false;
      setFulfillmentRefreshing(false);
    }
  }

  useEffect(() => {
    if (stage !== "confirming" || recoveryKind !== "payment") return;
    // Keep observing the durable request ID even when the original POST lost
    // its response and no capability has yet reached this browser.
    void recoverPersistedAttempt();
    const timer = window.setInterval(() => void recoverPersistedAttempt(), 2500);
    return () => window.clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, recoveryKind]);

  useEffect(() => {
    if (
      stage !== "complete" ||
      trackingUnavailable ||
      !result ||
      result.paymentStatus !== "paid" ||
      isPickupStatusTerminal(result.status)
    ) {
      return;
    }
    const capability = confirmationCapability || result.capability;
    if (!capability) return;

    const pollWhenVisible = () => {
      if (document.visibilityState === "visible") void pollFulfillmentStatus(capability);
    };
    pollWhenVisible();
    const timer = window.setInterval(pollWhenVisible, 15_000);
    window.addEventListener("focus", pollWhenVisible);
    document.addEventListener("visibilitychange", pollWhenVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", pollWhenVisible);
      document.removeEventListener("visibilitychange", pollWhenVisible);
    };
  // The capability and status are the only values that should restart polling.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, trackingUnavailable, result?.paymentStatus, result?.capability, result?.status, confirmationCapability]);

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

  const submit = async (method: PickupPaymentMethod = "card") => {
    const ready = method === "card" ? square.ready : wallets[method];
    if (!config || stage !== "payment" || !ready || busy || paymentInFlight.current) return;
    if (config.schedulingEnabled && !(config.availablePickupSlots ?? []).some((slot) => slot.value === pickupAt)) {
      setError("Choose an available pickup time before paying.");
      setStage("review");
      return;
    }
    if (requestId.current && !canReplay) {
      setRecoveryKind("payment");
      setStage("confirming");
      return;
    }
    // A synchronous guard prevents card/wallet clicks in the same render
    // from producing concurrent tokens or submissions.
    paymentInFlight.current = true;
    setBusy(true);
    setError("");
    try {
      const latestConfig = await loadPickupConfig(true, true);
      if (!latestConfig.isOrderingOpen) {
        setError("Pickup ordering is now closed. No payment was attempted.");
        setStage("menu");
        return;
      }
      if (latestConfig.schedulingEnabled) {
        if (!latestConfig.isOrderingOpen || !(latestConfig.availablePickupSlots ?? []).some(slot => slot.value === pickupAt)) {
          setPickupAt("");
          setError("That pickup time is no longer available. Choose another time before paying.");
          setStage("review");
          return;
        }
      }
      const squareNonce = method === "card" ? await square.tokenize() : await wallets.tokenize(method);
      if (!squareNonce) return; // Buyer closed the wallet; no server attempt.
      if (!requestId.current) {
        const nextRequestId = crypto.randomUUID();
        // This durable lock is intentionally written before the POST. It
        // contains no card data and survives a reload/lost HTTP response.
        savePendingAttempt({ requestId: nextRequestId });
        requestId.current = nextRequestId;
      }
      setCanReplay(false);
      const placed = responseData(await apiPost<PickupResult | { data: PickupResult }>("/pickup/orders", {
        clientRequestId: requestId.current,
        expectedTotalCents: totalCents,
        lines: cart.map(line => ({
          productItemId: line.item.id,
          qty: line.qty,
          sideProductIds: line.sides?.map(side => side.id),
        })),
        customerName: name,
        customerPhone: phone,
        smsOptIn: getPickupSmsOptIn(latestConfig.smsEnabled, smsOptIn),
        pickupAt: latestConfig.schedulingEnabled ? pickupAt : undefined,
        squareNonce,
        source: searchParams.get("pickupSource") === "event_qr" ? "event_qr" : "remote",
        sourceLinkSlug: searchParams.get("pickupSourceLink") ?? undefined,
        sourceToken: searchParams.get("pickupSourceToken") ?? undefined,
      }));
      setResult(placed);
      savePendingAttempt({ requestId: requestId.current, capability: placed.capability });
      if (placed.paymentStatus === "paid") {
        savePickupConfirmation(placed.capability);
        setConfirmationCapability(placed.capability);
        clearPendingAttempt();
        setStatusMode("current");
        setTrackingUnavailable(false);
        setRecoveryKind(null);
        setFulfillmentError("");
        setStage("complete");
      } else if (placed.paymentStatus === "canceled") {
        clearPendingAttempt();
        requestId.current = null;
        setRecoveryKind(null);
        setError("Square did not approve this payment. Please try another payment method.");
      } else {
        setRecoveryKind("payment");
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
      if (requestId.current) {
        setRecoveryKind("payment");
        setStage("confirming");
      }
    } finally {
      paymentInFlight.current = false;
      setBusy(false);
    }
  };

  const startNewOrder = () => {
    clearPendingAttempt();
    clearPickupConfirmation();
    requestId.current = null;
    setConfirmationCapability(null);
    setStatusMode("current");
    setTrackingUnavailable(false);
    setRecoveryKind(null);
    setResult(null);
    setCanReplay(false);
    setFulfillmentError("");
    setFulfillmentRefreshing(false);
    setError("");
    setName("");
    setPhone("");
    setPickupAt("");
    setSmsOptIn(false);
    setCart([]);
    setSideProduct(null);
    setChosenSides([]);
    setStage("menu");
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

  if (trackingUnavailable) {
    return (
      <main className="jp-shell jp-center">
        <PigMark />
        <p className="jp-kicker">Pickup status</p>
        <h1>Tracking<br /><em>unavailable.</em></h1>
        <PickupStatus
          status={result?.status}
          mode="unavailable"
          error={fulfillmentError}
        />
        <button type="button" className="jp-primary jp-new-order" onClick={startNewOrder} data-testid="button-new-pickup-order">
          Start a new order
        </button>
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
          {result.requestedFulfillmentAt && (
            <div className="jp-total">
              <span>PICKUP TIME</span>
              <b>{new Intl.DateTimeFormat("en-US", {
                timeZone: result.requestedFulfillmentTimezone || config.timezone,
                weekday: "short", month: "short", day: "numeric",
                hour: "numeric", minute: "2-digit", timeZoneName: "short",
              }).format(new Date(result.requestedFulfillmentAt))}</b>
            </div>
          )}
        </section>
        <PickupDetails
          eventName={config.eventName}
          streetAddress={config.streetAddress}
          asapWaitMinutes={config.asapWaitMinutes}
          pickupInstructions={config.pickupInstructions}
          scheduled={config.schedulingEnabled}
          selectedPickupLabel={result.requestedFulfillmentAt
            ? new Intl.DateTimeFormat("en-US", {
              timeZone: result.requestedFulfillmentTimezone || config.timezone,
              weekday: "short", month: "short", day: "numeric",
              hour: "numeric", minute: "2-digit", timeZoneName: "short",
            }).format(new Date(result.requestedFulfillmentAt))
            : null}
        />
        <PickupStatus
          status={result.status}
          mode={statusMode}
          error={fulfillmentError}
          refreshing={fulfillmentRefreshing}
          onRetry={
            isPickupStatusTerminal(result.status)
              ? undefined
              : () => void pollFulfillmentStatus(confirmationCapability || result.capability)
          }
        />
        {result.receiptUrl && <a className="jp-link" href={result.receiptUrl} target="_blank" rel="noreferrer">View Square receipt</a>}
        <button type="button" className="jp-primary jp-new-order" onClick={startNewOrder} data-testid="button-new-pickup-order">
          Start a new order
        </button>
      </main>
    );
  }

  if (stage === "confirming") {
    const isFulfillmentRecovery = recoveryKind === "fulfillment";
    const savedCapability = confirmationCapability || result?.capability || readPickupConfirmation()?.capability;
    return (
      <main className="jp-shell jp-center">
        <PigMark />
        <p className="jp-kicker">{isFulfillmentRecovery ? "Pickup status" : "One moment"}</p>
        <h1>{isFulfillmentRecovery ? <>Checking<br /><em>your order.</em></> : <>Checking<br /><em>the coals.</em></>}</h1>
        <div className="jp-wait">
          <div className="jp-loading" aria-hidden="true"><span /><span /><span /></div>
          <p>
            {isFulfillmentRecovery
              ? "We’re loading your pickup status. We won’t show your order as ready until the kitchen confirms it."
              : "We're confirming your existing payment with Square. Please don't place another order."}
          </p>
          {result && <p>Order {result.orderNumber}</p>}
          {(isFulfillmentRecovery ? fulfillmentError : error) && (
            <p role="alert" className="jp-alert">{isFulfillmentRecovery ? fulfillmentError : error}</p>
          )}
          <button
            className="jp-ghost"
            onClick={() => isFulfillmentRecovery && savedCapability
              ? void poll(savedCapability, "fulfillment")
              : void recoverPersistedAttempt()}
          >
            {isFulfillmentRecovery ? "Check status now" : "Check payment now"}
          </button>
          {!isFulfillmentRecovery && canReplay && (
            <button className="jp-primary" onClick={() => { setError(""); setStage("payment"); }}>
              Retry this checkout
            </button>
          )}
          {isFulfillmentRecovery && (
            <button type="button" className="jp-primary" onClick={startNewOrder} data-testid="button-new-pickup-order">
              Start a new order
            </button>
          )}
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
          <strong>{config.schedulingEnabled ? "SCHEDULED PICKUP IS CLOSED" : "ASAP PICKUP IS CLOSED"}</strong>
          <p>{config.schedulingEnabled
            ? "There are no pickup times remaining for this event."
            : "We’re not taking roadside orders right now. Check back when smoke is in the air."}</p>
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
    const item = preferredMenuItem(product);
    const available = isMenuProductAvailable(product) && isMenuItemAvailable(item);
    const price = item?.price ?? 0;
    return (
      <button
        key={product.id}
        type="button"
        className={`jp-product ${!available ? "sold-out" : ""}`}
        disabled={!available}
        onClick={() => openProduct(product)}
        aria-label={`${product.name}${available ? "" : " — Sold out"}`}
      >
        <div className="jp-product-img">
          <ProductArt product={product} />
          {product.comboSideCount ? <span>{product.comboSideCount} sides</span> : null}
        </div>
        <div>
          <h2>{product.name}</h2>
          <p>{product.description || (product.comboSideCount ? "Pick your favorite sides" : "Straight from the Jiggling Pig pit")}</p>
          <footer>
            <b>{available ? formatMoney(price) : "Sold out"}</b>
            <i aria-hidden="true">{available ? "+" : "Sold out"}</i>
          </footer>
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
      </div>
      <PickupDetails
        eventName={config.eventName}
        streetAddress={config.streetAddress}
        asapWaitMinutes={config.asapWaitMinutes}
        pickupInstructions={config.pickupInstructions}
        scheduled={config.schedulingEnabled}
      />
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
          <div className="jp-cart-content" tabIndex={0} role="region" aria-label="Items in your order">
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
          <PickupSuggestions
            menu={config.menu}
            cart={cart}
            onSelect={openProduct}
          />
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

  const orderItems = (
    <ul className="jp-summary-items" aria-label="Ordered items">
      {cart.map(line => (
        <li key={cartLineKey(line.item.id, line.sides)}>
          <div>
            <strong>{line.qty} × {line.product.name}</strong>
            {line.sides?.length ? <small>{line.sides.map(side => side.name).join(" · ")}</small> : null}
          </div>
          <strong>{formatMoney((line.item.price + sidesUpcharge(line.sides)) * line.qty)}</strong>
        </li>
      ))}
    </ul>
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
            <PickupDetails
              eventName={config.eventName}
              streetAddress={config.streetAddress}
              asapWaitMinutes={config.asapWaitMinutes}
              pickupInstructions={config.pickupInstructions}
              scheduled={config.schedulingEnabled}
            />
            {config.schedulingEnabled && (
              <label>
                Pickup time
                <select
                  required
                  value={pickupAt}
                  onChange={event => setPickupAt(event.target.value)}
                  data-testid="select-pickup-time"
                >
                  <option value="">Choose a pickup time</option>
                  {(config.availablePickupSlots ?? []).map(slot => (
                    <option key={slot.value} value={slot.value}>{slot.label}</option>
                  ))}
                </select>
                <small>Available times include preparation time and end 30 minutes before shutdown.</small>
              </label>
            )}
            <div className="jp-order-summary">
              {orderItems}
              <span>{cartCount} item{cartCount === 1 ? "" : "s"} <b>{formatMoney(displayTotal)}</b></span>
              <small>Final total is confirmed securely at payment.</small>
            </div>
            <label>Name<input required maxLength={100} value={name} onChange={event => setName(event.target.value)} autoComplete="name" placeholder="Your name" /></label>
            <label>Mobile phone<input required maxLength={30} value={phone} onChange={event => setPhone(event.target.value)} inputMode="tel" autoComplete="tel" placeholder="Mobile number" /></label>
            {config.smsEnabled === true && (
              <label className="jp-sms-optin">
                <input
                  type="checkbox"
                  checked={smsOptIn}
                  onChange={event => setSmsOptIn(event.target.checked)}
                  aria-describedby="pickup-sms-optin-details"
                  data-testid="checkbox-sms-opt-in"
                />
                <span className="jp-sms-optin-copy">
                  <strong>Optional SMS order updates</strong>
                  <span id="pickup-sms-optin-details">
                    Send only transactional SMS for your order confirmation and when it&apos;s ready. No purchase required to opt in.
                    Up to 2 messages per order; message and data rates may apply, and frequency varies. Reply STOP to opt out or HELP for help.{" "}
                    <a href="/privacy-policy">Privacy Policy</a> and <a href="/terms-condition">Terms &amp; Conditions</a>.
                  </span>
                </span>
              </label>
            )}
            <button className="jp-primary">Continue to payment</button>
          </form>
        ) : (
          <>
            <div className="jp-order-summary">{orderItems}<span>Order total <b>{formatMoney(displayTotal)}</b></span></div>
            {pickupAt && (
              <p className="jp-pickup-time-review">
                <strong>Pickup:</strong>{" "}
                {(config.availablePickupSlots ?? []).find(slot => slot.value === pickupAt)?.label}
              </p>
            )}
            <fieldset className="jp-wallets" disabled={busy} aria-busy={busy}>
              <legend>Express payment</legend>
              {wallets.applePay && (
                <button
                  type="button"
                  className="jp-apple-pay"
                  aria-label={`Pay ${formatMoney(displayTotal)} with Apple Pay`}
                  onClick={() => void submit("applePay")}
                />
              )}
              <div
                id="pickup-google-pay"
                className="jp-google-pay"
                hidden={!wallets.googlePay}
                onClick={() => void submit("googlePay")}
              />
              <p className="jp-wallet-note" role="status">
                {busy ? "Confirming securely. Please do not start another payment."
                  : wallets.loading ? "Checking available wallets…"
                  : wallets.applePay || wallets.googlePay
                    ? "Use a wallet above, or pay by card below."
                    : "Apple Pay and Google Pay are not available here. You can pay by card below."}
              </p>
            </fieldset>
            <h2 className="jp-card-heading">Pay by card</h2>
            <div id="pickup-square-card" className="jp-square" />
            {square.error && <p className="jp-alert" role="alert">{square.error}</p>}
            <button disabled={!square.ready || busy} className="jp-primary" onClick={() => void submit()}>{busy ? "Confirming securely…" : `Pay ${formatMoney(displayTotal)}`}</button>
            {error && requestId.current && <button disabled={busy} className="jp-ghost" onClick={() => void recoverPersistedAttempt()}>Safely check this payment again</button>}
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
        <div className="jp-shell jp-modal" role="dialog" aria-modal="true" aria-labelledby="side-title">
          <section>
            <button className="jp-close" aria-label="Close sides" onClick={() => setSideProduct(null)}>×</button>
            <p className="jp-kicker">Build your plate</p>
            <h2 id="side-title">Pick {sideProduct.comboSideCount} side{sideProduct.comboSideCount === 1 ? "" : "s"}</h2>
            <p className="jp-selected">{chosenSides.length} of {sideProduct.comboSideCount} selected</p>
            <div className="jp-sides">
              {sideOptions.map(side => {
                const count = chosenSides.filter(choice => choice.id === side.id).length;
                const available = isMenuProductAvailable(side)
                  && isMenuItemAvailable(preferredMenuItem(side));
                return (
                  <div className="jp-side-option" key={side.id}>
                  <button
                    type="button"
                    className={`jp-side-add${count ? " selected" : ""}${!available ? " sold-out" : ""}`}
                    aria-label={`Add ${side.name}${count ? ` — ${count} selected` : ""}`}
                    disabled={!available || chosenSides.length >= sideProduct.comboSideCount}
                    onClick={() => setChosenSides(old => old.length >= sideProduct.comboSideCount
                      ? old
                      : [...old, { id: side.id, name: side.name, upcharge: side.duplicateSideUpcharge }])}
                  >
                    <span className="jp-side-art"><ProductArt product={side} /></span>
                    <span className="jp-side-copy">
                      <b>{side.name}</b>
                      <small>{!available ? "Sold out" : count ? `${count} selected` : "Tap to add"}</small>
                    </span>
                  </button>
                  {count > 0 && (
                    <button
                      type="button"
                      className="jp-side-remove"
                      aria-label={`Remove one ${side.name}`}
                      onClick={() => setChosenSides(old => {
                        const index = old.findIndex(choice => choice.id === side.id);
                        return old.filter((_, choiceIndex) => choiceIndex !== index);
                      })}
                    >− Remove one</button>
                  )}
                  </div>
                );
              })}
            </div>
            <div className="jp-side-charge" role="status" aria-live="polite">
              {sideOptions.map(side => {
                const choices = chosenSides.filter(choice => choice.id === side.id);
                const charge = sidesUpcharge(choices);
                return charge > 0 ? (
                  <p key={side.id}>
                    {formatMoney(charge)} extra for selecting {side.name} {choices.length === 2 ? "twice" : `${choices.length} times`}.
                  </p>
                ) : null;
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