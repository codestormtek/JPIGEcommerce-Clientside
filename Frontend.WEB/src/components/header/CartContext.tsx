'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

interface CartItem {
  id: number;
  productItemId?: string;
  image: string;
  title: string;
  price: number;
  quantity: number;
  active: boolean; // true = cart, false = wishlist
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

const CartContext = createContext<CartContextProps | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
};

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartLoaded, setIsCartLoaded] = useState(false);

  // Load from localStorage once on mount (client only)
  useEffect(() => {
    setCartItems(readCartFromStorage());
    setIsCartLoaded(true);
  }, []);

  // Helper: compute next state, persist immediately, then update React state
  const mutate = (updater: (prev: CartItem[]) => CartItem[]) => {
    setCartItems((prev) => {
      const next = updater(prev);
      writeCartToStorage(next);
      return next;
    });
  };

  const addToCart = (item: CartItem) => {
    mutate((prev) => {
      const existing = prev.find(
        (i) => i.productItemId
          ? i.productItemId === item.productItemId && i.active === true
          : i.id === item.id && i.active === true
      );
      if (existing) {
        return prev.map((i) =>
          (i.productItemId
            ? i.productItemId === item.productItemId
            : i.id === item.id) && i.active === true
            ? { ...i, quantity: i.quantity + item.quantity }
            : i
        );
      }
      return [...prev, item];
    });
  };

  const addToWishlist = (item: CartItem) => {
    mutate((prev) => {
      const existing = prev.find(
        (i) => i.productItemId
          ? i.productItemId === item.productItemId && i.active === false
          : i.id === item.id && i.active === false
      );
      if (existing) {
        return prev.map((i) =>
          (i.productItemId
            ? i.productItemId === item.productItemId
            : i.id === item.id) && i.active === false
            ? { ...i, quantity: i.quantity + item.quantity }
            : i
        );
      }
      return [...prev, item];
    });
  };

  const removeFromCart = (id: number) => {
    mutate((prev) => prev.filter((item) => item.id !== id));
  };

  const updateItemQuantity = (id: number, quantity: number) => {
    mutate((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, quantity: Math.max(1, quantity) } : item
      )
    );
  };

  const clearCart = () => {
    if (typeof window !== 'undefined') localStorage.removeItem(CART_KEY);
    setCartItems([]);
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        addToWishlist,
        removeFromCart,
        updateItemQuantity,
        clearCart,
        isCartLoaded,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
