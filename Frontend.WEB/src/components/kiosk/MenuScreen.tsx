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

export default function MenuScreen({ menu, cart, onAdd, onSetQty, onCheckout, onStartOver }: Props) {
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [sidePicker, setSidePicker] = useState<KioskProduct | null>(null);
  const [chosenSides, setChosenSides] = useState<KioskSideChoice[]>([]);
  // Side pending confirmation because picking it again incurs an upcharge
  const [upchargeConfirm, setUpchargeConfirm] = useState<KioskProduct | null>(null);

  const products = useMemo(() => {
    if (!activeCat) return menu.products;
    return menu.products.filter((p) => p.categoryIds.includes(activeCat));
  }, [menu.products, activeCat]);

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
          <button
            className={`k-cat ${activeCat === null ? "active" : ""}`}
            onClick={() => setActiveCat(null)}
          >
            All
          </button>
          {menu.categories.map((c) => (
            <button
              key={c.id}
              className={`k-cat ${activeCat === c.id ? "active" : ""}`}
              onClick={() => setActiveCat(c.id)}
            >
              {c.name}
            </button>
          ))}
        </div>

        <div className="k-grid">
          {products.map((p) => {
            const item = p.items[0];
            if (!item) return null;
            const inCart = qtyByItem.get(item.id) ?? 0;
            return (
              <div className="k-card-wrap" key={p.id}>
                <button className="k-card" onClick={() => handleCardTap(p)} style={{ width: "100%" }}>
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
