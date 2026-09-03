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

// Top-level navigation tabs (matched against category names, case-insensitive).
// Everything else (Combo Dinners, Drinks, Sauces, Rubs, …) becomes a section
// header inside a tab instead of its own tab.
const TAB_FOOD = "jiggling food menu";
const TAB_SIDES = "sides";
const TAB_PRODUCTS = "jiggling pig products";

const norm = (s: string) => s.trim().toLowerCase();

interface MenuSection {
  title: string | null;
  products: KioskProduct[];
}

export default function MenuScreen({ menu, cart, onAdd, onSetQty, onCheckout, onStartOver }: Props) {
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [sidePicker, setSidePicker] = useState<KioskProduct | null>(null);
  const [chosenSides, setChosenSides] = useState<KioskSideChoice[]>([]);
  // Side pending confirmation because picking it again incurs an upcharge
  const [upchargeConfirm, setUpchargeConfirm] = useState<KioskProduct | null>(null);

  const catById = useMemo(
    () => new Map(menu.categories.map((c) => [c.id, c])),
    [menu.categories],
  );

  const tabs = useMemo(() => {
    const byName = (name: string) => menu.categories.find((c) => norm(c.name) === name);
    const found = [byName(TAB_FOOD), byName(TAB_SIDES), byName(TAB_PRODUCTS)].filter(
      (c): c is NonNullable<typeof c> => Boolean(c),
    );
    // Fallback: if any of the expected categories is missing, show all
    // categories as tabs so no products become unreachable.
    return found.length === 3 ? found : menu.categories;
  }, [menu.categories]);

  // Default to the first tab (Food Menu) instead of an "All" view. If the
  // selected tab disappears after a menu refresh, fall back to the first tab.
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
        { title: "Combo Items", products: combo },
        { title: "Sides", products: sides },
        { title: "Other Items", products: other },
        { title: "Drinks", products: drinks },
      ].filter((s) => s.products.length > 0);
    }

    if (tabName === TAB_SIDES) {
      return [{ title: null, products: all.filter((p) => hasCat(p, TAB_SIDES)) }];
    }

    if (tabName === TAB_PRODUCTS) {
      // Members: anything in the Products category, plus orphans that don't fit
      // in the food tab (e.g. a rub that was never added to the Products category).
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

    // Unknown tab (fallback mode): plain category filter.
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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="k-menu-logo" src="/kiosk-logo.png" alt="The Jiggling Pig" />
          <button className="k-btn k-btn-ghost k-start-over" onClick={onStartOver}>
            Start Over
          </button>
        </div>

        <div className="k-cats">
          {tabs.map((c) => (
            <button
              key={c.id}
              className={`k-cat ${activeCat === c.id ? "active" : ""}`}
              onClick={() => setSelectedCat(c.id)}
            >
              {c.name}
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
                      <button
                        className="k-card"
                        onClick={() => handleCardTap(p)}
                        style={{ width: "100%" }}
                      >
                        {p.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img className="k-card-img" src={p.imageUrl} alt={p.name} loading="lazy" />
                        ) : (
                          <div className="k-card-img-fallback">🍖</div>
                        )}
                        <div className="k-card-body">
                          <div className="k-card-name">{p.name}</div>
                          {p.description && <div className="k-card-desc">{p.description}</div>}
                          {p.comboSideCount > 0 && (
                            <div className="k-card-combo">
                              Includes {p.comboSideCount} side{p.comboSideCount > 1 ? "s" : ""}
                            </div>
                          )}
                          <div className="k-card-price">{formatMoney(item.price)}</div>
                        </div>
                      </button>
                      {inCart > 0 && <div className="k-card-qty">×{inCart}</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="k-cart">
        <div className="k-cart-header">Your Order {itemCount > 0 && `(${itemCount})`}</div>
        <div className="k-cart-lines">
          {cart.length === 0 && (
            <div className="k-cart-empty">
              Tap an item on the left to add it to your order.
            </div>
          )}
          {cart.map((l) => {
            const key = cartLineKey(l.item.id, l.sides);
            const unitPrice = l.item.price + sidesUpcharge(l.sides);
            return (
              <div className="k-line" key={key}>
                <div className="k-line-top">
                  <span>{l.product.name}</span>
                  <span className="k-line-price">{formatMoney(unitPrice * l.qty)}</span>
                </div>
                {l.sides && l.sides.length > 0 && (
                  <div className="k-line-sides">
                    Sides: {l.sides.map((s) => s.name).join(", ")}
                  </div>
                )}
                <div className="k-line-controls">
                  <button className="k-qty-btn" onClick={() => onSetQty(key, l.qty - 1)}>
                    −
                  </button>
                  <span className="k-line-qty">{l.qty}</span>
                  <button className="k-qty-btn" onClick={() => onSetQty(key, l.qty + 1)}>
                    +
                  </button>
                  <button
                    className="k-line-remove"
                    aria-label={`Remove ${l.product.name} from order`}
                    onClick={() => onSetQty(key, 0)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        <div className="k-cart-footer">
          <div className="k-total-row">
            <span>Subtotal</span>
            <span>{formatMoney(subtotal)}</span>
          </div>
          <button
            className="k-btn k-btn-primary k-checkout-btn"
            disabled={cart.length === 0}
            onClick={onCheckout}
          >
            Checkout
          </button>
        </div>
      </div>

      {sidePicker && (
        <div className="k-modal-overlay" onClick={() => setSidePicker(null)}>
          <div className="k-modal" onClick={(e) => e.stopPropagation()}>
            <div className="k-modal-title">
              Choose {sidePicker.comboSideCount} side{sidePicker.comboSideCount > 1 ? "s" : ""} for{" "}
              {sidePicker.name}
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
              <button className="k-btn k-btn-ghost" onClick={() => setSidePicker(null)}>
                Cancel
              </button>
              {chosenSides.length > 0 && (
                <button className="k-btn k-btn-ghost" onClick={() => setChosenSides([])}>
                  Clear
                </button>
              )}
              <button
                className="k-btn k-btn-primary"
                disabled={chosenSides.length !== sidePicker.comboSideCount}
                onClick={confirmSides}
              >
                Add to Order{pickerUpcharge > 0 && ` (+${formatMoney(pickerUpcharge)})`}
              </button>
            </div>

            {upchargeConfirm && (
              <div className="k-modal-overlay k-upcharge-overlay" onClick={() => setUpchargeConfirm(null)}>
                <div className="k-modal k-upcharge-modal" onClick={(e) => e.stopPropagation()}>
                  <div className="k-modal-title">Extra {upchargeConfirm.name}?</div>
                  <div className="k-modal-sub">
                    Adding another {upchargeConfirm.name} has a{" "}
                    <strong>{formatMoney(upchargeConfirm.duplicateSideUpcharge)} upcharge</strong>. Would
                    you like to proceed?
                  </div>
                  <div className="k-modal-actions">
                    <button className="k-btn k-btn-ghost" onClick={() => setUpchargeConfirm(null)}>
                      No, Go Back
                    </button>
                    <button
                      className="k-btn k-btn-primary"
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
