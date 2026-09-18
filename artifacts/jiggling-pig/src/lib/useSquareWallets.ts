"use client";

import { useEffect, useRef, useState } from "react";
import type { SquarePaymentsInstance } from "./useSquarePayments";
import {
  pickupWalletRequest,
  squareWalletToken,
  type SquareWalletInstance,
  type SquareWalletMethod,
} from "./square-wallets";

type WalletState = {
  applePay: boolean;
  googlePay: boolean;
  loading: boolean;
};
const unavailable: WalletState = { applePay: false, googlePay: false, loading: false };

export function useSquareWallets({
  enabled, payments, totalCents, googleSelector,
}: {
  enabled: boolean;
  payments: SquarePaymentsInstance | null;
  totalCents: number;
  googleSelector: string;
}) {
  const wallets = useRef<Partial<Record<SquareWalletMethod, SquareWalletInstance>>>({});
  const generation = useRef(0);
  const [state, setState] = useState<WalletState>(unavailable);

  useEffect(() => {
    setState(unavailable);
    if (!enabled || !payments || totalCents <= 0) return;
    let cancelled = false;
    const owned: SquareWalletInstance[] = [];
    const destroyed = new WeakSet<SquareWalletInstance>();
    const destroy = async (wallet: SquareWalletInstance) => {
      if (destroyed.has(wallet)) return;
      destroyed.add(wallet);
      await wallet.destroy().catch(() => {});
    };
    generation.current++;
    setState({ ...unavailable, loading: true });

    async function initialize(method: SquareWalletMethod) {
      try {
        // Each method owns its request so SDK event handlers cannot collide.
        const request = payments!.paymentRequest(pickupWalletRequest(totalCents));
        const wallet = method === "applePay"
          ? await payments!.applePay(request)
          : await payments!.googlePay(request);
        if (cancelled) {
          await destroy(wallet);
          return;
        }
        owned.push(wallet);
        if (method === "googlePay" && "attach" in wallet) {
          await (wallet as import("./square-wallets").SquareGooglePayInstance).attach(
            googleSelector, { buttonColor: "white", buttonType: "long" },
          );
        }
        if (cancelled) {
          await destroy(wallet);
          return;
        }
        wallets.current[method] = wallet;
        setState(previous => ({ ...previous, [method]: true }));
      } catch {
        // Unsupported wallets or unregistered domains must not break card
        // checkout. The UI explicitly describes availability to the buyer.
        if (!cancelled) setState(previous => ({ ...previous, [method]: false }));
      }
    }

    void Promise.all([initialize("applePay"), initialize("googlePay")]).finally(() => {
      if (!cancelled) setState(previous => ({ ...previous, loading: false }));
    });
    return () => {
      cancelled = true;
      generation.current++;
      wallets.current = {};
      for (const wallet of owned) void destroy(wallet);
    };
  }, [enabled, payments, totalCents, googleSelector]);

  const tokenize = async (method: SquareWalletMethod): Promise<string | null> => {
    const wallet = wallets.current[method];
    if (!wallet || !enabled) throw new Error("This wallet is not available. Please use another payment option.");
    const currentGeneration = generation.current;
    // Called directly from the buyer's click, before unrelated async work,
    // so browsers retain the user gesture required to open a wallet sheet.
    const result = await wallet.tokenize();
    if (currentGeneration !== generation.current) {
      throw new Error("Your order changed. Review the total and try again.");
    }
    return squareWalletToken(result);
  };

  return { ...state, tokenize };
}