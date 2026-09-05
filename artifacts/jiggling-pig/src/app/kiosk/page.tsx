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

const IDLE_RESET_MS = 120_000; // return to attract after 2 min of inactivity
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
  });
  const [campaigns, setCampaigns] = useState<KioskCampaign[]>([]);
  const [cart, setCart] = useState<KioskCartLine[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const screenRef = useRef<Screen>("loading");
  screenRef.current = screen;

  const resetToAttract = useCallback(() => {
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
      }
    }, MENU_REFRESH_MS);
    return () => {
      clearInterval(hb);
      clearInterval(mr);
    };
  }, [screen === "setup" || screen === "loading", loadMenu, loadCampaigns]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Idle reset ──
  useEffect(() => {
    if (screen === "setup" || screen === "loading" || screen === "attract") return;

    const bump = () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(() => {
        if (screenRef.current !== "confirm") resetToAttract();
      }, IDLE_RESET_MS);
    };
    bump();
    const events = ["touchstart", "mousedown", "keydown"] as const;
    events.forEach((ev) => window.addEventListener(ev, bump));
    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      events.forEach((ev) => window.removeEventListener(ev, bump));
    };
  }, [screen, resetToAttract]);

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

  switch (screen) {
    case "attract":
      return <AttractScreen onStart={handleStart} />;
    case "menu":
      return (
        <MenuScreen
          menu={menu}
          cart={cart}
          onAdd={handleAdd}
          onSetQty={handleSetQty}
          onCheckout={() => {
            const hasUpsells = campaigns.some(c => c.campaignType === 'upsell' && c.isActive);
            setScreen(hasUpsells ? "upsell" : "details");
          }}
          onStartOver={resetToAttract}
        />
      );
    case "upsell":
      return (
        <UpsellScreen
          campaigns={campaigns.filter(c => c.campaignType === 'upsell' && c.isActive)}
          cart={cart}
          onAdd={handleUpsellAdd}
          onBack={() => setScreen("menu")}
          onContinue={() => setScreen("details")}
        />
      );
    case "details":
      return (
        <DetailsScreen
          cart={cart}
          initialName={customerName}
          initialPhone={customerPhone}
          onBack={() => setScreen("upsell")}
          onContinue={handleDetailsContinue}
        />
      );
    case "pay":
      return (
        <PayScreen
          cart={cart}
          customerName={customerName}
          config={config}
          onBack={() => setScreen("details")}
          onPlaceOrder={handlePlaceOrder}
          onPaid={handlePaid}
        />
      );
    case "confirm":
      return <ConfirmScreen orderNumber={orderNumber} customerName={customerName} onDone={handleConfirmDone} />;
    case "post_sale_ad":
      return <PostSaleAdScreen campaigns={campaigns.filter(c => c.campaignType === 'post_sale_ad' && c.isActive)} onDone={resetToAttract} />;
    default:
      return null;
  }
}
