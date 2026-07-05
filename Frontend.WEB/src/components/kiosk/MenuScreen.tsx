"use client";

import { useMemo, useState } from "react";
import type { KioskMenu, KioskCartLine, KioskProduct } from "@/lib/kiosk";
import { formatMoney } from "@/lib/kiosk";

interface Props {
  menu: KioskMenu;
  cart: KioskCartLine[];
  onAdd: (product: KioskProduct) => void;
  onSetQty: (productItemId: string, qty: number) => void;
  onCheckout: () => void;
  onStartOver: () => void;
}

export default function MenuScreen({ menu, cart, onAdd, onSetQty, onCheckout, onStartOver }: Props) {
  const [activeCat, setActiveCat] = useState<string | null>(null);

  const products = useMemo(() => {
    if (!activeCat) return menu.products;
    return menu.products.filter((p) => p.categoryIds.includes(activeCat));
  }, [menu.products, activeCat]);

  const qtyByItem = useMemo(() => {
    const m = new Map<string, number>();
    cart.forEach((l) => m.set(l.item.id, l.qty));
    return m;
  }, [cart]);

  const subtotal = cart.reduce((s, l) => s + l.item.price * l.qty, 0);
  const itemCount = cart.reduce((s, l) => s + l.qty, 0);

  return (
    <div className="k-screen k-menu">
      <div className="k-menu-main">
        <div className="k-menu-header">
          <h2>
            The Jiggling <span>Pig</span>
          </h2>
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
                <button className="k-card" onClick={() => onAdd(p)} style={{ width: "100%" }}>
                  {p.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="k-card-img" src={p.imageUrl} alt={p.name} loading="lazy" />
                  ) : (
                    <div className="k-card-img-fallback">🍖</div>
                  )}
                  <div className="k-card-body">
                    <div className="k-card-name">{p.name}</div>
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
          {cart.map((l) => (
            <div className="k-line" key={l.item.id}>
              <div className="k-line-top">
                <span>{l.product.name}</span>
                <span className="k-line-price">{formatMoney(l.item.price * l.qty)}</span>
              </div>
              <div className="k-line-controls">
                <button className="k-qty-btn" onClick={() => onSetQty(l.item.id, l.qty - 1)}>
                  −
                </button>
                <span className="k-line-qty">{l.qty}</span>
                <button className="k-qty-btn" onClick={() => onSetQty(l.item.id, l.qty + 1)}>
                  +
                </button>
              </div>
            </div>
          ))}
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
    </div>
  );
}
