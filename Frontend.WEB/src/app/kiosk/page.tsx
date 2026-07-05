"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  KioskApiError,
  KioskCartLine,
  KioskMenu,
  KioskProduct,
  clearKioskToken,
  fetchKioskMenu,
  getKioskToken,
  placeKioskOrder,
  sendHeartbeat,
  setKioskToken,
} from "@/lib/kiosk";
import SetupScreen from "@/components/kiosk/SetupScreen";
import AttractScreen from "@/components/kiosk/AttractScreen";
import MenuScreen from "@/components/kiosk/MenuScreen";
import DetailsScreen from "@/components/kiosk/DetailsScreen";
import PayScreen from "@/components/kiosk/PayScreen";
import ConfirmScreen from "@/components/kiosk/ConfirmScreen";

type Screen = "loading" | "setup" | "attract" | "menu" | "details" | "pay" | "confirm";

const IDLE_RESET_MS = 120_000; // return to attract after 2 min of inactivity
const MENU_REFRESH_MS = 5 * 60_000;
const HEARTBEAT_MS = 60_000;

export default function KioskPage() {
  const [screen, setScreen] = useState<Screen>("loading");
  const [menu, setMenu] = useState<KioskMenu | null>(null);
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
  }, [loadMenu]);

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
      }
    }, MENU_REFRESH_MS);
    return () => {
      clearInterval(hb);
      clearInterval(mr);
    };
  }, [screen === "setup" || screen === "loading", loadMenu]); // eslint-disable-line react-hooks/exhaustive-deps

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
  };

  const handleAdd = (product: KioskProduct) => {
    const item = product.items[0];
    if (!item) return;
    setCart((prev) => {
      const existing = prev.find((l) => l.item.id === item.id);
      if (existing) {
        return prev.map((l) => (l.item.id === item.id ? { ...l, qty: Math.min(l.qty + 1, 50) } : l));
      }
      return [...prev, { product, item, qty: 1 }];
    });
  };

  const handleSetQty = (productItemId: string, qty: number) => {
    setCart((prev) =>
      qty <= 0
        ? prev.filter((l) => l.item.id !== productItemId)
        : prev.map((l) => (l.item.id === productItemId ? { ...l, qty: Math.min(qty, 50) } : l)),
    );
  };

  const handleDetailsContinue = (name: string, phone: string) => {
    setCustomerName(name);
    setCustomerPhone(phone);
    setScreen("pay");
  };

  const handlePlaceOrder = async (squareNonce?: string) => {
    const result = await placeKioskOrder({
      lines: cart.map((l) => ({ productItemId: l.item.id, qty: l.qty })),
      customerName,
      customerPhone: customerPhone || undefined,
      squareNonce,
    });
    setOrderNumber(result.kioskOrderNumber);
    setScreen("confirm");
    loadMenu().catch(() => {}); // refresh stock after sale
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
          onCheckout={() => setScreen("details")}
          onStartOver={resetToAttract}
        />
      );
    case "details":
      return (
        <DetailsScreen
          cart={cart}
          initialName={customerName}
          initialPhone={customerPhone}
          onBack={() => setScreen("menu")}
          onContinue={handleDetailsContinue}
        />
      );
    case "pay":
      return (
        <PayScreen
          cart={cart}
          customerName={customerName}
          onBack={() => setScreen("details")}
          onPlaceOrder={handlePlaceOrder}
          terminalEnabled={false}
          cardEnabled={false}
        />
      );
    case "confirm":
      return <ConfirmScreen orderNumber={orderNumber} customerName={customerName} onDone={resetToAttract} />;
    default:
      return null;
  }
}
