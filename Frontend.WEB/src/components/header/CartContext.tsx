'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiAuthGet, apiAuthPost, apiAuthPatch, apiAuthDelete } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CartItem {
  id: number;
  cartItemId?: string;     // server-side ShoppingCartItem UUID
  productItemId?: string;
  image: string;
  title: string;
  price: number;
  quantity: number;
  active: boolean;         // true = cart, false = wishlist
}

interface ApiCartItem {
  id: string;
  productItemId: string;
  qty: number;
  unitPriceSnapshot: string;
  productItem: {
    id: string;
    product: {
      name: string;
      productMedia?: Array<{
        mediaAsset: { url: string };
      }>;
    };
  };
}

interface CartContextProps {
  cartItems: CartItem[];
  addToCart: (item: CartItem) => void;
  addToWishlist: (item: CartItem) => void;
  removeFromCart: (id: number) => void;
  updateItemQuantity: (id: number, quantity: number) => void;
  clearCart: () => void;
  isCartLoaded: boolean;
}

// ─── localStorage helpers (guests + wishlist) ─────────────────────────────────

const CART_KEY = 'cart';

function readCartFromStorage(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    localStorage.removeItem(CART_KEY);
    return [];
  }
}

function writeCartToStorage(items: CartItem[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CART_KEY, JSON.stringify(items));
}

function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('jpig_access_token');
}

// ─── Map API response item → CartItem ─────────────────────────────────────────

let _counter = Date.now();

function mapApiItem(apiItem: ApiCartItem): CartItem {
  const image = apiItem.productItem?.product?.productMedia?.[0]?.mediaAsset?.url ?? '';
  return {
    id: ++_counter,
    cartItemId: apiItem.id,
    productItemId: apiItem.productItemId,
    image,
    title: apiItem.productItem?.product?.name ?? '',
    price: Number(apiItem.unitPriceSnapshot),
    quantity: apiItem.qty,
    active: true,
  };
}

async function fetchServerCart(): Promise<CartItem[]> {
  const res = await apiAuthGet<{ data: { items: ApiCartItem[] } }>('/cart');
  return (res.data?.items ?? []).map(mapApiItem);
}

// ─── Context ──────────────────────────────────────────────────────────────────

const CartContext = createContext<CartContextProps | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
};

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartLoaded, setIsCartLoaded] = useState(false);

  // Load cart on mount
  useEffect(() => {
    async function loadCart() {
      if (getAccessToken()) {
        try {
          const serverItems = await fetchServerCart();
          // Keep any local wishlist items (server has no wishlist)
          const localWishlist = readCartFromStorage().filter(i => !i.active);
          setCartItems([...serverItems, ...localWishlist]);
        } catch {
          // Fallback to localStorage if API is unreachable
          setCartItems(readCartFromStorage());
        }
      } else {
        setCartItems(readCartFromStorage());
      }
      setIsCartLoaded(true);
    }
    loadCart();
  }, []);

  // Keep wishlist items persisted to localStorage
  useEffect(() => {
    if (!isCartLoaded) return;
    const wishlist = cartItems.filter(i => !i.active);
    if (getAccessToken()) {
      writeCartToStorage(wishlist);
    } else {
      writeCartToStorage(cartItems);
    }
  }, [cartItems, isCartLoaded]);

  // ─── Add to cart ────────────────────────────────────────────────────────────

  const addToCart = (item: CartItem) => {
    if (getAccessToken() && item.productItemId) {
      // Optimistic update
      setCartItems(prev => {
        const existing = prev.find(i => i.productItemId === item.productItemId && i.active);
        if (existing) {
          return prev.map(i =>
            i.productItemId === item.productItemId && i.active
              ? { ...i, quantity: i.quantity + item.quantity }
              : i
          );
        }
        return [...prev, item];
      });
      // Sync to server, then refresh to get real cartItemId
      apiAuthPost('/cart/items', { productItemId: item.productItemId, qty: item.quantity })
        .then(() => fetchServerCart())
        .then(serverItems => {
          setCartItems(prev => {
            const wishlist = prev.filter(i => !i.active);
            return [...serverItems, ...wishlist];
          });
        })
        .catch(err => console.error('Cart sync failed:', err));
    } else {
      // Guest: localStorage only
      setCartItems(prev => {
        const existing = prev.find(i => i.id === item.id && i.active);
        const next = existing
          ? prev.map(i => i.id === item.id && i.active ? { ...i, quantity: i.quantity + item.quantity } : i)
          : [...prev, item];
        writeCartToStorage(next);
        return next;
      });
    }
  };

  // ─── Add to wishlist (localStorage only) ────────────────────────────────────

  const addToWishlist = (item: CartItem) => {
    setCartItems(prev => {
      const key = item.productItemId;
      const existing = prev.find(i =>
        (key ? i.productItemId === key : i.id === item.id) && !i.active
      );
      const next = existing
        ? prev.map(i =>
            (key ? i.productItemId === key : i.id === item.id) && !i.active
              ? { ...i, quantity: i.quantity + item.quantity }
              : i
          )
        : [...prev, item];
      writeCartToStorage(next.filter(i => !i.active));
      return next;
    });
  };

  // ─── Remove from cart ────────────────────────────────────────────────────────

  const removeFromCart = (id: number) => {
    const item = cartItems.find(i => i.id === id);
    // Optimistic remove
    setCartItems(prev => prev.filter(i => i.id !== id));
    if (item?.cartItemId && getAccessToken()) {
      apiAuthDelete(`/cart/items/${item.cartItemId}`)
        .catch(err => {
          console.error('Failed to remove cart item:', err);
          // Revert on failure
          setCartItems(prev => [...prev, item]);
        });
    }
  };

  // ─── Update quantity ─────────────────────────────────────────────────────────

  const updateItemQuantity = (id: number, quantity: number) => {
    const item = cartItems.find(i => i.id === id);
    const newQty = Math.max(1, quantity);
    setCartItems(prev => prev.map(i => i.id === id ? { ...i, quantity: newQty } : i));
    if (item?.cartItemId && getAccessToken()) {
      apiAuthPatch(`/cart/items/${item.cartItemId}`, { qty: newQty })
        .catch(err => {
          console.error('Failed to update cart item qty:', err);
          // Revert
          setCartItems(prev => prev.map(i => i.id === id ? { ...i, quantity: item.quantity } : i));
        });
    }
  };

  // ─── Clear cart ──────────────────────────────────────────────────────────────

  const clearCart = () => {
    const wishlist = cartItems.filter(i => !i.active);
    setCartItems(wishlist);
    writeCartToStorage(wishlist);
    if (getAccessToken()) {
      apiAuthDelete('/cart').catch(err => console.error('Failed to clear server cart:', err));
    }
  };

  return (
    <CartContext.Provider
      value={{ cartItems, addToCart, addToWishlist, removeFromCart, updateItemQuantity, clearCart, isCartLoaded }}
    >
      {children}
    </CartContext.Provider>
  );
};
