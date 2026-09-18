export type SquareWalletMethod = "applePay" | "googlePay";
export type PickupPaymentMethod = "card" | SquareWalletMethod;

export interface SquareTokenResult {
  status: string;
  token?: string;
  errors?: Array<{ message: string }>;
}

export interface SquareWalletInstance {
  tokenize: () => Promise<SquareTokenResult>;
  destroy: () => Promise<void>;
}

export interface SquareGooglePayInstance extends SquareWalletInstance {
  attach: (selector: string, options?: { buttonColor?: "white" | "black" | "default"; buttonType?: "long" | "short" }) => Promise<void>;
}

/** The same integer cents are sent as expectedTotalCents to our API. */
export function pickupWalletRequest(totalCents: number) {
  if (!Number.isSafeInteger(totalCents) || totalCents <= 0) {
    throw new Error("Review your order total before paying.");
  }
  return {
    countryCode: "US",
    currencyCode: "USD",
    total: { amount: (totalCents / 100).toFixed(2), label: "The Jiggling Pig" },
    requestBillingContact: false,
    requestShippingContact: false,
  };
}

/** Canceling a wallet sheet does not create an order or a recovery lock. */
export function squareWalletToken(result: SquareTokenResult): string | null {
  if (["cancel", "canceled", "cancelled"].includes(result.status.toLowerCase())) return null;
  if (result.status !== "OK" || !result.token) {
    throw new Error(result.errors?.[0]?.message ?? "Wallet payment could not be authorized. Try again or use a card.");
  }
  return result.token;
}