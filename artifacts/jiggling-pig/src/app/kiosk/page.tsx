"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  KioskApiError,
  KioskCampaign,
  KioskCartLine,
  KioskConfig,
  KioskMenu,
  KioskOrderResult,
  KioskProduct,
  KioskSideChoice,
  cartLineKey,
  clearKioskToken,
  fetchKioskCampaigns,
  fetchKioskConfig,
  fetchKioskMenu,
  getKioskToken,
  placeKioskOrder,
  sendHeartbeat,
  setKioskToken,
} from "@/lib/kiosk";
import SetupScreen from "@/components/kiosk/SetupScreen";
import AttractScreen from "@/components/kiosk/AttractScreen";
import MenuScreen from "@/components/kiosk/MenuScreen";
import UpsellScreen from "@/components/kiosk/UpsellScreen";
import DetailsScreen from "@/components/kiosk/DetailsScreen";
import PayScreen from "@/components/kiosk/PayScreen";
import ConfirmScreen from "@/components/kiosk/ConfirmScreen";
import PostSaleAdScreen from "@/components/kiosk/PostSaleAdScreen";

type Screen = "loading" | "setup" | "attract" | "menu" | "upsell" | "details" | "pay" | "confirm" | "post_sale_ad";

const DEFAULT_IDLE_TIMEOUT_SECONDS = 120;
const DEFAULT_IDLE_PROMPT_SECONDS = 30;
const MENU_REFRESH_MS = 5 * 60_000;
const HEARTBEAT_MS = 60_000;

export default function KioskPage() {
  const [screen, setScreen] = useState<Screen>("loading");
  const [menu, setMenu] = useState<KioskMenu | null>(null);
  const [config, setConfig] = useState<KioskConfig>({
    applicationId: null,
    locationId: null,
    environment: "sandbox",
    terminalEnabled: false,
    cardEnabled: false,
    orderInactivityTimeoutSeconds: DEFAULT_IDLE_TIMEOUT_SECONDS,
    orderInactivityPromptSeconds: DEFAULT_IDLE_PROMPT_SECONDS,
  });
  const [campaigns, setCampaigns] = useState<KioskCampaign[]>([]);
  const [cart, setCart] = useState<KioskCartLine[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const idleWarningTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeoutWarningRef = useRef(false);
  const timeoutDialogRef = useRef<HTMLDivElement | null>(null);
  const kioskContentRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  const screenRef = useRef<Screen>("loading");
  screenRef.current = screen;

  const resetToAttract = useCallback(() => {
    setShowTimeoutWarning(false);
    timeoutWarningRef.current = false;
    setCart([]);
    setCustomerName("");
    setCustomerPhone("");
    setOrderNumber(null);
    setScreen("attract");
  }, []);

  const loadMenu = useCallback(async () => {
    const data = await fetchKioskMenu();
    setMenu(data);
    return data;
  }, []);

  const loadCampaigns = useCallback(async () => {
    try {
      setCampaigns(await fetchKioskCampaigns());
    } catch {
      // safe to ignore, will just not show campaigns
    }
  }, []);

  const loadConfig = useCallback(async () => {
    try {
      setConfig(await fetchKioskConfig());
    } catch {
      // keep defaults — payment options simply stay disabled
    }
  }, []);

  // ── Boot: check token, load menu ──
  useEffect(() => {
    (async () => {
      // Provisioning shortcut: /kiosk?token=ksk_... saves the token and cleans the URL
      const params = new URLSearchParams(window.location.search);
      const urlToken = params.get("token");
      if (urlToken) {
        setKioskToken(urlToken);
        window.history.replaceState({}, "", "/kiosk");
      }
      if (!getKioskToken()) {
        setScreen("setup");
        return;
      }
      try {
        await loadMenu();
        loadConfig();
        loadCampaigns();
        setScreen(params.get("start") === "menu" ? "menu" : "attract");
      } catch (e) {
        if (e instanceof KioskApiError && e.status === 401) {
          clearKioskToken();
          setScreen("setup");
        } else {
          setLoadError(e instanceof Error ? e.message : "Could not load the menu");
          setScreen("setup");
        }
      }
    })();
  }, [loadMenu, loadConfig]);

  // ── Heartbeat + periodic menu refresh ──
  useEffect(() => {
    if (screen === "setup" || screen === "loading") return;
    const hb = setInterval(() => {
      sendHeartbeat().catch(() => {});
    }, HEARTBEAT_MS);
    const mr = setInterval(() => {
      // Don't swap the menu mid-checkout
      if (screenRef.current === "attract" || screenRef.current === "menu") {
        loadMenu().catch(() => {});
        loadCampaigns().catch(() => {});
        loadConfig().catch(() => {});
      }
    }, MENU_REFRESH_MS);
    return () => {
      clearInterval(hb);
      clearInterval(mr);
    };
  }, [screen === "setup" || screen === "loading", loadMenu, loadCampaigns, loadConfig]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Idle reset ──
  useEffect(() => {
    const timeoutScreens: Screen[] = ["menu", "upsell", "details"];
    if (!timeoutScreens.includes(screen)) {
      setShowTimeoutWarning(false);
      timeoutWarningRef.current = false;
      return;
    }

    const timeoutMs = Math.max(60, config.orderInactivityTimeoutSeconds) * 1000;
    const promptMs = Math.min(
      timeoutMs - 10_000,
      Math.max(10, config.orderInactivityPromptSeconds) * 1000,
    );

    const bump = () => {
      if (timeoutWarningRef.current) return;
      if (idleWarningTimer.current) clearTimeout(idleWarningTimer.current);
      if (idleResetTimer.current) clearTimeout(idleResetTimer.current);
      idleWarningTimer.current = setTimeout(() => {
        timeoutWarningRef.current = true;
        setShowTimeoutWarning(true);
      }, timeoutMs - promptMs);
      idleResetTimer.current = setTimeout(resetToAttract, timeoutMs);
    };
    bump();
    const events = ["touchstart", "mousedown", "keydown"] as const;
    events.forEach((ev) => window.addEventListener(ev, bump));
    window.addEventListener("kiosk-extend-timeout", bump);
    return () => {
      if (idleWarningTimer.current) clearTimeout(idleWarningTimer.current);
      if (idleResetTimer.current) clearTimeout(idleResetTimer.current);
      events.forEach((ev) => window.removeEventListener(ev, bump));
      window.removeEventListener("kiosk-extend-timeout", bump);
    };
  }, [
    screen,
    config.orderInactivityTimeoutSeconds,
    config.orderInactivityPromptSeconds,
    resetToAttract,
  ]);

  useEffect(() => {
    const content = kioskContentRef.current;
    if (!showTimeoutWarning) {
      content?.removeAttribute("inert");
      return;
    }

    content?.setAttribute("inert", "");
    previouslyFocusedRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const dialog = timeoutDialogRef.current;
    const focusable = () =>
      Array.from(dialog?.querySelectorAll<HTMLElement>("button:not([disabled])") ?? []);
    focusable()[0]?.focus();

    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const controls = focusable();
      if (controls.length === 0) {
        event.preventDefault();
        return;
      }
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", trapFocus);
    return () => {
      content?.removeAttribute("inert");
      document.removeEventListener("keydown", trapFocus);
      if (previouslyFocusedRef.current?.isConnected) previouslyFocusedRef.current.focus();
    };
  }, [showTimeoutWarning]);

  // ── Handlers ──
  const handleSetupSave = async (token: string) => {
    setKioskToken(token);
    try {
      await loadMenu();
      loadConfig();
      loadCampaigns();
      setLoadError(null);
      setScreen("attract");
    } catch (e) {
      clearKioskToken();
      throw e;
    }
  };

  const handleStart = async () => {
    setScreen("menu");
    loadMenu().catch(() => {});
    loadCampaigns().catch(() => {});
  };

  const handleAdd = (product: KioskProduct, sides?: KioskSideChoice[]) => {
    const item = product.items[0];
    if (!item) return;
    const key = cartLineKey(item.id, sides);
    setCart((prev) => {
      const existing = prev.find((l) => cartLineKey(l.item.id, l.sides) === key);
      if (existing) {
        return prev.map((l) =>
          cartLineKey(l.item.id, l.sides) === key ? { ...l, qty: Math.min(l.qty + 1, 50) } : l,
        );
      }
      return [...prev, { product, item, qty: 1, sides }];
    });
  };

  const handleSetQty = (lineKey: string, qty: number) => {
    setCart((prev) =>
      qty <= 0
        ? prev.filter((l) => cartLineKey(l.item.id, l.sides) !== lineKey)
        : prev.map((l) =>
            cartLineKey(l.item.id, l.sides) === lineKey
              ? { ...l, qty: Math.min(qty, 50), upsellQty: Math.min(l.upsellQty ?? 0, qty) }
              : l,
          ),
    );
  };

  const handleUpdateSides = (lineKey: string, sides: KioskSideChoice[]): string | null => {
    const sourceIndex = cart.findIndex((line) => cartLineKey(line.item.id, line.sides) === lineKey);
    if (sourceIndex < 0) return "This item is no longer in the order.";
    const source = cart[sourceIndex];
    const destinationKey = cartLineKey(source.item.id, sides);
    const destination = cart.find(
      (line, index) =>
        index !== sourceIndex && cartLineKey(line.item.id, line.sides) === destinationKey,
    );
    if (destination) {
      if (
        destination.campaignId !== source.campaignId ||
        destination.campaignDiscountAmount !== source.campaignDiscountAmount
      ) {
        return "These items have different discounts and cannot be combined.";
      }
      if (destination.qty + source.qty > 50) {
        return "The updated side combination would exceed the 50-item limit. Reduce the quantity first.";
      }
    }

    setCart((prev) => {
      const currentSourceIndex = prev.findIndex((line) => cartLineKey(line.item.id, line.sides) === lineKey);
      if (currentSourceIndex < 0) return prev;

      const currentSource = prev[currentSourceIndex];
      const currentDestinationKey = cartLineKey(currentSource.item.id, sides);
      if (currentDestinationKey === lineKey) {
        return prev.map((line, index) => (index === currentSourceIndex ? { ...line, sides } : line));
      }

      const destinationIndex = prev.findIndex(
        (line, index) =>
          index !== currentSourceIndex && cartLineKey(line.item.id, line.sides) === currentDestinationKey,
      );
      if (destinationIndex < 0) {
        return prev.map((line, index) => (index === currentSourceIndex ? { ...line, sides } : line));
      }

      const currentDestination = prev[destinationIndex];
      return prev
        .filter((_, index) => index !== currentSourceIndex)
        .map((line) =>
          line === currentDestination
            ? {
                ...line,
                qty: line.qty + currentSource.qty,
                upsellQty: (line.upsellQty ?? 0) + (currentSource.upsellQty ?? 0) || undefined,
              }
            : line,
        );
    });
    return null;
  };

  const handleUpsellAdd = (product: KioskProduct, campaign: KioskCampaign) => {
    const item = product.items[0];
    if (!item) return;
    const discount = campaign.amountOff || 0;
    setCart((prev) => {
      const existing = prev.find((line) => line.item.id === item.id && !line.sides?.length && line.campaignId === campaign.id);
      if (existing) {
        if (existing.qty >= 50) return prev;
        return prev.map((line) =>
          line === existing
            ? {
                ...line,
                qty: Math.min(line.qty + 1, 50),
                upsellQty: Math.min((line.upsellQty ?? 0) + 1, 50),
              }
            : line,
        );
      }
      return [...prev, {
        product,
        item,
        qty: 1,
        upsellQty: 1,
        campaignId: campaign.id,
        campaignDiscountAmount: discount
      }];
    });
  };

  const handleDetailsContinue = (name: string, phone: string) => {
    setCustomerName(name);
    setCustomerPhone(phone);
    setScreen("pay");
  };

  const handlePlaceOrder = async (
    paymentMethod: "terminal" | "card",
    squareNonce?: string,
    clientRequestId?: string,
  ): Promise<KioskOrderResult> => {
    if (!clientRequestId) throw new Error("Payment request could not be initialized");
    return placeKioskOrder({
      clientRequestId,
      lines: cart.map((l) => ({
        productItemId: l.item.id,
        qty: l.qty,
        upsellQty: l.upsellQty || undefined,
        campaignId: l.campaignId,
        sideProductIds: l.sides?.length ? l.sides.map((s) => s.id) : undefined,
      })),
      customerName,
      customerPhone: customerPhone || undefined,
      paymentMethod,
      squareNonce,
    });
  };

  const handlePaid = (result: KioskOrderResult) => {
    setOrderNumber(result.kioskOrderNumber);
    setScreen("confirm");
    loadMenu().catch(() => {}); // refresh stock after sale
  };

  const handleConfirmDone = () => {
    const hasAds = campaigns.some(c => c.campaignType === 'post_sale_ad' && c.isActive);
    if (hasAds) {
      setScreen("post_sale_ad");
    } else {
      resetToAttract();
    }
  };

  // ── Render ──
  if (screen === "loading") {
    return (
      <div className="k-screen k-loading">
        <div className="k-spinner" />
        <div>Warming up the smoker…</div>
      </div>
    );
  }

  if (screen === "setup" || !menu) {
    return (
      <>
        {loadError && (
          <p className="k-error" style={{ position: "absolute", top: 20, left: 0, right: 0, textAlign: "center" }}>
            {loadError}
          </p>
        )}
        <SetupScreen onSave={handleSetupSave} />
      </>
    );
  }

  let screenContent;
  switch (screen) {
    case "attract":
      screenContent = <AttractScreen onStart={handleStart} />;
      break;
    case "menu":
      screenContent = (
        <MenuScreen
          menu={menu}
          cart={cart}
          onAdd={handleAdd}
          onSetQty={handleSetQty}
          onUpdateSides={handleUpdateSides}
          onCheckout={() => {
            const hasUpsells = campaigns.some(c => c.campaignType === 'upsell' && c.isActive);
            setScreen(hasUpsells ? "upsell" : "details");
          }}
          onStartOver={resetToAttract}
        />
      );
      break;
    case "upsell":
      screenContent = (
        <UpsellScreen
          campaigns={campaigns.filter(c => c.campaignType === 'upsell' && c.isActive)}
          cart={cart}
          onAdd={handleUpsellAdd}
          onBack={() => setScreen("menu")}
          onContinue={() => setScreen("details")}
        />
      );
      break;
    case "details":
      screenContent = (
        <DetailsScreen
          cart={cart}
          initialName={customerName}
          initialPhone={customerPhone}
          onBack={() => setScreen("upsell")}
          onContinue={handleDetailsContinue}
        />
      );
      break;
    case "pay":
      screenContent = (
        <PayScreen
          cart={cart}
          customerName={customerName}
          config={config}
          onBack={() => setScreen("details")}
          onPlaceOrder={handlePlaceOrder}
          onPaid={handlePaid}
        />
      );
      break;
    case "confirm":
      screenContent = <ConfirmScreen orderNumber={orderNumber} customerName={customerName} onDone={handleConfirmDone} />;
      break;
    case "post_sale_ad":
      screenContent = <PostSaleAdScreen campaigns={campaigns.filter(c => c.campaignType === 'post_sale_ad' && c.isActive)} onDone={resetToAttract} />;
      break;
    default:
      return null;
  }

  return (
    <>
      <div ref={kioskContentRef} aria-hidden={showTimeoutWarning || undefined}>
        {screenContent}
      </div>
      {showTimeoutWarning && (
        <div className="k-timeout-overlay" role="dialog" aria-modal="true" aria-labelledby="k-timeout-title">
          <div className="k-timeout-dialog" ref={timeoutDialogRef}>
            <h2 id="k-timeout-title">Still ordering?</h2>
            <p>Your order will be cleared soon to protect your privacy.</p>
            <div className="k-timeout-actions">
              <button className="k-btn k-btn-ghost k-btn-lg" onClick={resetToAttract}>
                Start over
              </button>
              <button
                className="k-btn k-btn-primary k-btn-lg"
                onClick={() => {
                  setShowTimeoutWarning(false);
                  timeoutWarningRef.current = false;
                  window.dispatchEvent(new Event("kiosk-extend-timeout"));
                }}
              >
                Extend time
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
