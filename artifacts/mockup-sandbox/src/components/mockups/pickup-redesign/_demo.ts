import { useEffect, useState } from "react";

/**
 * Demo-only dependency boundary for the pickup extraction.
 *
 * This file deliberately never calls fetch, never loads Square, and never
 * writes to the production app's local-storage keys. The extracted page can
 * therefore be clicked through on the canvas without creating an order,
 * reserving inventory, or attempting a charge.
 */

export interface KioskCategory {
  id: string;
  name: string;
  imageUrl: string | null;
}

export interface KioskMenuItem {
  id: string;
  sku: string;
  price: number;
}

export interface KioskProduct {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  categoryIds: string[];
  primaryCategoryId: string | null;
  comboSideCount: number;
  comboSideCategoryId: string | null;
  duplicateSideUpcharge: number;
  items: KioskMenuItem[];
}

export interface KioskSideChoice {
  id: string;
  name: string;
  upcharge?: number;
}

export interface KioskCartLine {
  product: KioskProduct;
  item: KioskMenuItem;
  qty: number;
  sides?: KioskSideChoice[];
}

export interface KioskMenu {
  categories: KioskCategory[];
  products: KioskProduct[];
}

type DemoPickupConfig = {
  isOrderingOpen: boolean;
  eventName: string;
  streetAddress: string;
  asapWaitMinutes: number;
  cardEnabled: boolean;
  applicationId: string | null;
  locationId: string | null;
  environment: string;
  menu: KioskMenu;
  taxRatePercent: number;
};

type DemoPickupResult = {
  orderNumber: string;
  capability: string;
  paymentStatus: "paid" | "pending" | "canceled";
  receiptUrl: string | null;
  status: string;
  grandTotal: number;
  currency: string;
  items: {
    name: string;
    qty: number;
    sides: string | null;
    lineTotal: number;
  }[];
  canReplay?: boolean;
};

const FIXTURE_IMAGE_ROOT = "/__mockup/images/pickup";
const DEMO_CATEGORIES: KioskCategory[] = [
  { id: "demo-food", name: "BBQ plates", imageUrl: null },
  { id: "demo-sides", name: "Sides", imageUrl: null },
];

/**
 * Product names/prices mirror the shape returned by the kiosk menu service.
 * IDs and images are intentionally local demo fixtures, not production rows.
 */
const DEMO_PRODUCTS: KioskProduct[] = [
  {
    id: "demo-smokehouse-combo",
    name: "Smokehouse Combo",
    description: "Pulled pork, pit beans, slaw, and a warm side of cornbread.",
    imageUrl: `${FIXTURE_IMAGE_ROOT}/fixture-banner.jpg`,
    categoryIds: ["demo-food"],
    primaryCategoryId: "demo-food",
    comboSideCount: 2,
    comboSideCategoryId: "demo-sides",
    duplicateSideUpcharge: 0.75,
    items: [{ id: "demo-item-smokehouse-combo", sku: "DEMO-COMBO", price: 18.5 }],
  },
  {
    id: "demo-brisket-plate",
    name: "12-Hour Brisket Plate",
    description: "Pepper-crusted brisket with our house mop and two sides.",
    imageUrl: `${FIXTURE_IMAGE_ROOT}/fixture-produce.jpg`,
    categoryIds: ["demo-food"],
    primaryCategoryId: "demo-food",
    comboSideCount: 0,
    comboSideCategoryId: null,
    duplicateSideUpcharge: 0,
    items: [{ id: "demo-item-brisket-plate", sku: "DEMO-BRISKET", price: 21 }],
  },
  {
    id: "demo-pulled-pork",
    name: "Carolina Pulled Pork",
    description: "Low-and-slow pork shoulder with tangy Carolina sauce.",
    imageUrl: `${FIXTURE_IMAGE_ROOT}/kiosk-logo.png`,
    categoryIds: ["demo-food"],
    primaryCategoryId: "demo-food",
    comboSideCount: 0,
    comboSideCategoryId: null,
    duplicateSideUpcharge: 0,
    items: [{ id: "demo-item-pulled-pork", sku: "DEMO-PORK", price: 14.5 }],
  },
  {
    id: "demo-mac-cheese",
    name: "Mac & Cheese",
    description: "Creamy, baked, and finished with a toasted cheese crust.",
    imageUrl: `${FIXTURE_IMAGE_ROOT}/fixture-bread.jpg`,
    categoryIds: ["demo-sides"],
    primaryCategoryId: "demo-sides",
    comboSideCount: 0,
    comboSideCategoryId: null,
    duplicateSideUpcharge: 0,
    items: [{ id: "demo-item-mac-cheese", sku: "DEMO-MAC", price: 4.5 }],
  },
  {
    id: "demo-pit-beans",
    name: "Pit Beans",
    description: "Sweet and smoky beans from the pit.",
    imageUrl: `${FIXTURE_IMAGE_ROOT}/fixture-banner.jpg`,
    categoryIds: ["demo-sides"],
    primaryCategoryId: "demo-sides",
    comboSideCount: 0,
    comboSideCategoryId: "demo-sides",
    duplicateSideUpcharge: 0,
    items: [{ id: "demo-item-pit-beans", sku: "DEMO-BEANS", price: 4 }],
  },
  {
    id: "demo-tangy-slaw",
    name: "Tangy Slaw",
    description: "Fresh cabbage slaw with a bright vinegar finish.",
    imageUrl: `${FIXTURE_IMAGE_ROOT}/fixture-produce.jpg`,
    categoryIds: ["demo-sides"],
    primaryCategoryId: "demo-sides",
    comboSideCount: 0,
    comboSideCategoryId: "demo-sides",
    duplicateSideUpcharge: 0,
    items: [{ id: "demo-item-tangy-slaw", sku: "DEMO-SLAW", price: 3.75 }],
  },
];

export const DEMO_PICKUP_CONFIG: DemoPickupConfig = {
  isOrderingOpen: true,
  eventName: "Saturday Smokehouse · Canvas demo",
  streetAddress: "123 Demo Way, Columbia, SC",
  asapWaitMinutes: 20,
  // This only enables the local payment control. useSquarePayments below
  // returns a clearly fake nonce and never loads the Square SDK.
  cardEnabled: true,
  applicationId: "demo-no-charge-application",
  locationId: "demo-no-charge-location",
  environment: "demo",
  menu: { categories: DEMO_CATEGORIES, products: DEMO_PRODUCTS },
  taxRatePercent: 8.25,
};

export function sidesUpcharge(sides?: KioskSideChoice[]): number {
  if (!sides?.length) return 0;
  const seen = new Map<string, number>();
  let total = 0;
  sides.forEach((side) => {
    const count = (seen.get(side.id) ?? 0) + 1;
    seen.set(side.id, count);
    if (count > 1 && side.upcharge) total += side.upcharge;
  });
  return Math.round(total * 100) / 100;
}

export function cartLineKey(itemId: string, sides?: KioskSideChoice[]): string {
  const sideIds = (sides ?? []).map((side) => side.id).sort();
  return sideIds.length ? `${itemId}|${sideIds.join(",")}` : itemId;
}

export function formatMoney(value: number): string {
  return `$${value.toFixed(2)}`;
}

const productByItemId = new Map(
  DEMO_PRODUCTS.flatMap((product) =>
    product.items.map((item) => [item.id, product] as const),
  ),
);
let lastDemoRequestId: string | null = null;
let lastDemoResult: DemoPickupResult | null = null;

function demoResultFromBody(body: unknown): DemoPickupResult {
  const input = (body ?? {}) as {
    clientRequestId?: unknown;
    lines?: unknown;
  };
  if (typeof input.clientRequestId !== "string" || !input.clientRequestId) {
    throw new Error("Demo checkout requires a request ID.");
  }
  const rawLines = Array.isArray(input.lines) ? input.lines : [];
  const items = rawLines.flatMap((line) => {
    const candidate = line as {
      productItemId?: unknown;
      qty?: unknown;
      sideProductIds?: unknown;
    };
    const product =
      typeof candidate.productItemId === "string"
        ? productByItemId.get(candidate.productItemId)
        : undefined;
    if (!product) return [];

    const qty =
      typeof candidate.qty === "number" && Number.isFinite(candidate.qty)
        ? Math.max(1, Math.min(50, Math.floor(candidate.qty)))
        : 1;
    const sideIds = Array.isArray(candidate.sideProductIds)
      ? candidate.sideProductIds.filter((id): id is string => typeof id === "string")
      : [];
    const sides = sideIds.flatMap((sideId) => {
      const side = DEMO_PRODUCTS.find((entry) => entry.id === sideId);
      return side
        ? [{ id: side.id, name: side.name, upcharge: side.duplicateSideUpcharge }]
        : [];
    });
    const lineTotal = (product.items[0].price + sidesUpcharge(sides)) * qty;
    return [
      {
        name: product.name,
        qty,
        sides: sides.length ? sides.map((side) => side.name).join(", ") : null,
        lineTotal: Math.round(lineTotal * 100) / 100,
      },
    ];
  });
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const grandTotal =
    Math.round((subtotal * (1 + DEMO_PICKUP_CONFIG.taxRatePercent / 100)) * 100) / 100;
  return {
    orderNumber: "DEMO-042",
    capability: "demo-capability-no-charge",
    paymentStatus: "paid",
    receiptUrl: null,
    status: "pending",
    grandTotal,
    currency: "USD",
    items,
  };
}

/**
 * Shape-compatible replacement for the production apiGet helper.
 * It serves only deterministic fixture data from this module.
 */
export async function apiGet<T>(path: string): Promise<T> {
  if (path === "/pickup") return DEMO_PICKUP_CONFIG as T;
  if (path.startsWith("/pickup/orders/attempt/")) {
    const requestId = decodeURIComponent(path.slice(path.lastIndexOf("/") + 1));
    if (lastDemoResult && requestId === lastDemoRequestId) {
      return ({ found: true, ...lastDemoResult } as unknown) as T;
    }
    return ({ found: false, canReplay: true } as unknown) as T;
  }
  if (path.startsWith("/pickup/orders/")) {
    return (
      lastDemoResult ?? {
        orderNumber: "DEMO-042",
        capability: "demo-capability-no-charge",
        paymentStatus: "pending",
        receiptUrl: null,
        status: "pending",
        grandTotal: 0,
        currency: "USD",
        items: [],
      }
    ) as T;
  }
  throw new Error(`Demo fixture does not implement GET ${path}`);
}

/**
 * Shape-compatible replacement for the production apiPost helper.
 * A checkout is converted into a local paid fixture only; no external
 * request, provider token, order row, or inventory mutation is possible.
 */
export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  if (path !== "/pickup/orders") {
    throw new Error(`Demo fixture does not implement POST ${path}`);
  }
  const requestId = (body as { clientRequestId?: unknown } | null)?.clientRequestId;
  lastDemoRequestId = typeof requestId === "string" ? requestId : null;
  lastDemoResult = demoResultFromBody(body);
  return lastDemoResult as T;
}

/**
 * Minimal local replacement for next/navigation's useSearchParams.
 * Pickup source query parameters are intentionally absent in the sandbox.
 */
export function useSearchParams(): URLSearchParams {
  return new URLSearchParams(
    typeof window === "undefined" ? "" : window.location.search,
  );
}

/**
 * Safe no-network replacement for useSquarePayments. It exposes the same
 * ready/tokenize contract so the extracted payment stage remains clickable.
 */
export function useSquarePayments(opts: {
  enabled: boolean;
  applicationId: string;
  locationId: string;
  environment: string;
  containerSelector: string;
}): {
  ready: boolean;
  error: string;
  tokenize: () => Promise<string>;
} {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(opts.enabled);
  }, [opts.enabled]);

  return {
    ready,
    error: "",
    tokenize: async () => "demo-source-id-no-charge",
  };
}