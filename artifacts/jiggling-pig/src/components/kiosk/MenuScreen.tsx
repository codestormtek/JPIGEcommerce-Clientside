"use client";

import { useMemo, useState } from "react";
import type { KioskMenu, KioskCartLine, KioskProduct, KioskSideChoice } from "@/lib/kiosk";
import { cartLineKey, cartSubtotal, formatMoney, sidesUpcharge } from "@/lib/kiosk";

interface Props {
  menu: KioskMenu;
  cart: KioskCartLine[];
  onAdd: (product: KioskProduct, sides?: KioskSideChoice[]) => void;
  onSetQty: (lineKey: string, qty: number) => void;
  onCheckout: () => void;
  onStartOver: () => void;
}

const TAB_FOOD = "jiggling food menu";
const TAB_SIDES = "sides";
const TAB_PRODUCTS = "jiggling pig products";
const PRODUCT_TABS = ["sauces", "rubs", "fry mixes", "teas", "drinks"] as const;

const norm = (s: string) => s.trim().toLowerCase();

interface MenuSection {
  title: string | null;
  products: KioskProduct[];
}

export default function MenuScreen({ menu, cart, onAdd, onSetQty, onCheckout, onStartOver }: Props) {
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [sidePicker, setSidePicker] = useState<KioskProduct | null>(null);
  const [chosenSides, setChosenSides] = useState<KioskSideChoice[]>([]);
  const [upchargeConfirm, setUpchargeConfirm] = useState<KioskProduct | null>(null);

  const catById = useMemo(
    () => new Map(menu.categories.map((c) => [c.id, c])),
    [menu.categories],
  );

  const tabs = useMemo(() => {
    const byName = (name: string) => menu.categories.find((c) => norm(c.name) === name);
    const found = [
      byName(TAB_FOOD),
      byName(TAB_SIDES),
      ...PRODUCT_TABS.map(byName),
    ].filter(
      (c): c is NonNullable<typeof c> => Boolean(c),
    );
    return found.length > 0 ? found : menu.categories;
  }, [menu.categories]);

  const activeCat =
    selectedCat && tabs.some((t) => t.id === selectedCat)
      ? selectedCat
      : tabs[0]?.id ?? null;

  const sections = useMemo<MenuSection[]>(() => {
    const all = menu.products;
    const hasCat = (p: KioskProduct, name: string) =>
      p.categoryIds.some((id) => {
        const c = catById.get(id);
        return c ? norm(c.name) === name : false;
      });

    const tab = tabs.find((t) => t.id === activeCat);
    if (!tab) return [{ title: null, products: all }];
    const tabName = norm(tab.name);

    if (tabName === TAB_FOOD) {
      const combo = all.filter((p) => hasCat(p, "combo dinners"));
      const comboIds = new Set(combo.map((p) => p.id));
      const sides = all.filter((p) => !comboIds.has(p.id) && hasCat(p, TAB_SIDES));
      const sideIds = new Set(sides.map((p) => p.id));
      const drinks = all.filter(
        (p) => !comboIds.has(p.id) && !sideIds.has(p.id) && hasCat(p, "drinks"),
      );
      const drinkIds = new Set(drinks.map((p) => p.id));
      const other = all.filter(
        (p) =>
          hasCat(p, TAB_FOOD) &&
          !comboIds.has(p.id) &&
          !sideIds.has(p.id) &&
          !drinkIds.has(p.id),
      );
      return [
        { title: "Plates", products: combo },
        { title: "Sides", products: sides },
        { title: "Other Items", products: other },
      ].filter((s) => s.products.length > 0);
    }

    if (tabName === TAB_SIDES) {
      return [{ title: null, products: all.filter((p) => hasCat(p, TAB_SIDES)) }];
    }

    if (tabName === TAB_PRODUCTS) {
      const inFoodTab = (p: KioskProduct) =>
        hasCat(p, TAB_FOOD) ||
        hasCat(p, "combo dinners") ||
        hasCat(p, TAB_SIDES) ||
        hasCat(p, "drinks");
      const members = all.filter((p) => hasCat(p, TAB_PRODUCTS) || !inFoodTab(p));

      const groups = new Map<string, KioskProduct[]>();
      members.forEach((p) => {
        const subId = p.categoryIds.find((id) => {
          const c = catById.get(id);
          if (!c) return false;
          const n = norm(c.name);
          return n !== TAB_PRODUCTS && n !== TAB_FOOD;
        });
        const title = subId ? catById.get(subId)!.name : "Other Items";
        const list = groups.get(title) ?? [];
        list.push(p);
        groups.set(title, list);
      });
      const titles = [...groups.keys()].sort((a, b) => {
        if (a === "Other Items") return 1;
        if (b === "Other Items") return -1;
        return a.localeCompare(b);
      });
      return titles.map((t) => ({ title: t, products: groups.get(t)! }));
    }

    return [{ title: null, products: all.filter((p) => p.categoryIds.includes(tab.id)) }];
  }, [menu.products, tabs, activeCat, catById]);

  const qtyByItem = useMemo(() => {
    const m = new Map<string, number>();
    cart.forEach((l) => m.set(l.item.id, (m.get(l.item.id) ?? 0) + l.qty));
    return m;
  }, [cart]);

  const sideOptions = useMemo(() => {
    if (!sidePicker?.comboSideCategoryId) return [];
    return menu.products.filter(
      (p) => p.id !== sidePicker.id && p.categoryIds.includes(sidePicker.comboSideCategoryId!),
    );
  }, [menu.products, sidePicker]);

  const handleCardTap = (p: KioskProduct) => {
    const needsSides = p.comboSideCount > 0 && p.comboSideCategoryId;
    if (needsSides) {
      setChosenSides([]);
      setUpchargeConfirm(null);
      setSidePicker(p);
    } else {
      onAdd(p);
    }
  };

  const addSide = (s: KioskProduct) => {
    setChosenSides((prev) => [...prev, { id: s.id, name: s.name, upcharge: s.duplicateSideUpcharge }]);
  };

  const handleSideTap = (s: KioskProduct) => {
    if (!sidePicker || chosenSides.length >= sidePicker.comboSideCount) return;
    const alreadyChosen = chosenSides.some((c) => c.id === s.id);
    if (alreadyChosen && s.duplicateSideUpcharge > 0) {
      setUpchargeConfirm(s);
      return;
    }
    addSide(s);
  };

  const confirmSides = () => {
    if (!sidePicker || chosenSides.length !== sidePicker.comboSideCount) return;
    onAdd(sidePicker, chosenSides);
    setSidePicker(null);
    setChosenSides([]);
    setUpchargeConfirm(null);
  };

  const pickerUpcharge = sidesUpcharge(chosenSides);
  const subtotal = cartSubtotal(cart);
  const itemCount = cart.reduce((s, l) => s + l.qty, 0);

  return (
    <div className="k-screen k-menu">
      <div className="k-menu-main">
        <div className="k-menu-header">
          <div className="k-menu-header-brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="k-menu-logo" src="/kiosk-logo.png" alt="Logo" />
            <div className="k-menu-header-text">
              <h2>THE JIGGLING PIG</h2>
              <span>Select your items below</span>
            </div>
          </div>
          <button className="k-btn k-btn-ghost k-start-over" onClick={onStartOver}>
            Start over
          </button>
        </div>

        <div className="k-cats">
          {tabs.map((c) => (
            <button
              key={c.id}
              className={`k-cat ${activeCat === c.id ? "active" : ""}`}
              onClick={() => setSelectedCat(c.id)}
            >
              {norm(c.name) === TAB_FOOD ? "BBQ Combos" : c.name}
            </button>
          ))}
        </div>

        <div className="k-menu-scroll">
          {sections.map((sec) => (
            <div className="k-section" key={sec.title ?? "__all"}>
              {sec.title && <div className="k-section-title">{sec.title}</div>}
              <div className="k-grid">
                {sec.products.map((p) => {
                  const item = p.items[0];
                  if (!item) return null;
                  const inCart = qtyByItem.get(item.id) ?? 0;
                  return (
                    <div className="k-card-wrap" key={p.id}>
                      <button className="k-card" onClick={() => handleCardTap(p)}>
                        <div className="k-card-content">
                          <div className="k-card-name">{p.name}</div>
                          {p.description && <div className="k-card-desc">{p.description}</div>}
                          {p.comboSideCount > 0 && (
                            <div className="k-card-combo">
                              Includes {p.comboSideCount} side{p.comboSideCount > 1 ? "s" : ""}
                            </div>
                          )}
                        </div>
                        <div className="k-card-bottom">
                          <div className="k-card-price">{formatMoney(item.price)}</div>
                          <div className="k-card-add-btn">+</div>
                        </div>
                      </button>
                      {inCart > 0 && (
                        <div className="k-card-qty" aria-label={`${inCart} in cart`}>
                          {inCart}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="k-cart">
        <div className="k-cart-header">
          <div className="k-cart-title">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
            YOUR ORDER
          </div>
          <div className="k-cart-count">{itemCount}</div>
        </div>
        <div className="k-cart-lines">
          {cart.length === 0 && (
            <div className="k-cart-empty">
              Tap anything on the menu to add it.
            </div>
          )}
          {cart.map((l) => {
            const key = cartLineKey(l.item.id, l.sides);
            const unitPrice = l.item.price + sidesUpcharge(l.sides);
            return (
              <div className="k-line" key={key}>
                <div className="k-line-top">
                  <span>{l.product.name}</span>
                </div>
                {l.sides && l.sides.length > 0 && (
                  <div className="k-line-sides">
                    {l.sides.map((s) => s.name).join(" + ")}
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div className="k-line-controls">
                    <button
                      className="k-qty-action"
                      aria-label={`Remove ${l.product.name} from order`}
                      title="Remove item"
                      onClick={() => onSetQty(key, 0)}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                      </svg>
                    </button>
                    {l.qty > 1 && (
                      <button
                        className="k-qty-action"
                        aria-label={`Decrease ${l.product.name} quantity`}
                        onClick={() => onSetQty(key, l.qty - 1)}
                      >
                        −
                      </button>
                    )}
                    <span className="k-line-qty">{l.qty}</span>
                    <button
                      className="k-qty-action"
                      aria-label={`Increase ${l.product.name} quantity`}
                      onClick={() => onSetQty(key, l.qty + 1)}
                    >
                      +
                    </button>
                  </div>
                  <div className="k-line-price">
                    {formatMoney(unitPrice * l.qty - (l.upsellQty ?? 0))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="k-cart-footer">
          <div className="k-total-row">
            <span>Total</span>
            <span className="k-total-amount">{formatMoney(subtotal)}</span>
          </div>
          <button
            className="k-btn k-btn-primary k-checkout-btn"
            disabled={cart.length === 0}
            onClick={onCheckout}
          >
            Pay at Terminal
          </button>
        </div>
      </div>

      {sidePicker && (
        <div className="k-modal-overlay" onClick={() => setSidePicker(null)}>
          <div className="k-modal" onClick={(e) => e.stopPropagation()}>
            <div className="k-modal-title">
              CHOOSE {sidePicker.comboSideCount} SIDE{sidePicker.comboSideCount > 1 ? "S" : ""} FOR{" "}
              {sidePicker.name.toUpperCase()}
            </div>
            <div className="k-modal-sub">
              {chosenSides.length} of {sidePicker.comboSideCount} chosen
              {chosenSides.length > 0 && ` — ${chosenSides.map((s) => s.name).join(", ")}`}
              {pickerUpcharge > 0 && (
                <span className="k-upcharge-note"> (+{formatMoney(pickerUpcharge)} upcharge)</span>
              )}
            </div>
            {sideOptions.length === 0 ? (
              <div className="k-modal-empty">No sides are available right now.</div>
            ) : (
              <div className="k-side-grid">
                {sideOptions.map((s) => {
                  const count = chosenSides.filter((c) => c.id === s.id).length;
                  return (
                    <button
                      key={s.id}
                      className={`k-side-card ${count > 0 ? "active" : ""}`}
                      onClick={() => handleSideTap(s)}
                    >
                      {s.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img className="k-side-img" src={s.imageUrl} alt={s.name} loading="lazy" />
                      ) : (
                        <div className="k-side-img-fallback">🥗</div>
                      )}
                      <div className="k-side-name">{s.name}</div>
                      {count > 0 && <div className="k-side-count">×{count}</div>}
                    </button>
                  );
                })}
              </div>
            )}
            <div className="k-modal-actions">
              <button className="k-btn k-btn-ghost k-btn-lg" onClick={() => setSidePicker(null)}>
                Cancel
              </button>
              {chosenSides.length > 0 && (
                <button className="k-btn k-btn-ghost k-btn-lg" onClick={() => setChosenSides([])}>
                  Clear
                </button>
              )}
              <button
                className="k-btn k-btn-primary k-btn-lg"
                disabled={chosenSides.length !== sidePicker.comboSideCount}
                onClick={confirmSides}
              >
                Add to Order{pickerUpcharge > 0 && ` (+${formatMoney(pickerUpcharge)})`}
              </button>
            </div>

            {upchargeConfirm && (
              <div className="k-modal-overlay k-upcharge-overlay" onClick={() => setUpchargeConfirm(null)}>
                <div className="k-modal k-upcharge-modal" onClick={(e) => e.stopPropagation()}>
                  <div className="k-modal-title">EXTRA {upchargeConfirm.name.toUpperCase()}?</div>
                  <div className="k-modal-sub">
                    Adding another {upchargeConfirm.name} has a{" "}
                    <strong>{formatMoney(upchargeConfirm.duplicateSideUpcharge)} upcharge</strong>. Would
                    you like to proceed?
                  </div>
                  <div className="k-modal-actions" style={{ marginTop: 24 }}>
                    <button className="k-btn k-btn-ghost k-btn-lg" onClick={() => setUpchargeConfirm(null)}>
                      No, Go Back
                    </button>
                    <button
                      className="k-btn k-btn-primary k-btn-lg"
                      onClick={() => {
                        addSide(upchargeConfirm);
                        setUpchargeConfirm(null);
                      }}
                    >
                      Yes, Add It (+{formatMoney(upchargeConfirm.duplicateSideUpcharge)})
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
