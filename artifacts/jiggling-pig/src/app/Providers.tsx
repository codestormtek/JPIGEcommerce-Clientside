'use client';

import { CartProvider } from "../components/header/CartContext";
import { WishlistProvider } from "../components/header/WishlistContext";
import { CompareProvider } from "../components/header/CompareContext";
import { AuthProvider } from "../context/AuthContext";
import { SiteSettingsProvider } from "../context/SiteSettingsContext";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <SiteSettingsProvider>
        <CompareProvider>
          <WishlistProvider>
            <CartProvider>
              {children}
              <ToastContainer position="top-right" autoClose={3000} />
            </CartProvider>
          </WishlistProvider>
        </CompareProvider>
      </SiteSettingsProvider>
    </AuthProvider>
  );
}
