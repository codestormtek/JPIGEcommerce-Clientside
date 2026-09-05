// Kiosk device API client — authenticates with X-Kiosk-Token (stored on-device).

const TOKEN_KEY = "kiosk_device_token";

export function getKioskToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setKioskToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token.trim());
}

export function clearKioskToken() {
  localStorage.removeItem(TOKEN_KEY);
}

// ─── Types ────────────────────────────────────────────────────────────────────

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
  /** Number of free sides included with this combo meal (0 = not a combo) */
  comboSideCount: number;
  /** Category the combo's sides are chosen from */
  comboSideCategoryId: string | null;
  /** When picked as a side more than once, each extra pick adds this amount */
  duplicateSideUpcharge: number;
  items: KioskMenuItem[];
}

export interface KioskSideChoice {
  id: string;
  name: string;
  /** Per-duplicate upcharge for this side (0 = none) — display only, server recomputes */
  upcharge?: number;
}

/** Display-only cart subtotal including duplicate-side upcharges (server recomputes authoritatively). */
export function cartSubtotal(cart: KioskCartLine[]): number {
  return cart.reduce(
    (s, l) => s + (l.item.price + sidesUpcharge(l.sides)) * l.qty - ((l.upsellQty ?? 0) * (l.campaignDiscountAmount ?? 1)),
    0,
  );
}

/**
 * Total upcharge for a combo's chosen sides: each duplicate pick of the same
 * side beyond the first adds that side's upcharge amount. Mirrors the server's
 * authoritative calculation (display only).
 */
export function sidesUpcharge(sides?: KioskSideChoice[]): number {
  if (!sides?.length) return 0;
  const seen = new Map<string, number>();
  let total = 0;
  for (const s of sides) {
    const count = (seen.get(s.id) ?? 0) + 1;
    seen.set(s.id, count);
    if (count > 1 && s.upcharge) total += s.upcharge;
  }
  return Math.round(total * 100) / 100;
}

export interface KioskMenu {
  categories: KioskCategory[];
  products: KioskProduct[];
}

export interface KioskCartLine {
  product: KioskProduct;
  item: KioskMenuItem;
  qty: number;
  /** Quantity added from the checkout drink offer at $1 off each. */
  upsellQty?: number;
  /** Associated campaign ID if this line was added via an upsell campaign. */
  campaignId?: string;
  /** Associated campaign discount if added via an upsell campaign. */
  campaignDiscountAmount?: number;
  /** Chosen combo sides (empty for non-combo items) */
  sides?: KioskSideChoice[];
}

/** Cart lines are unique per item + side combination. */
export function cartLineKey(itemId: string, sides?: KioskSideChoice[]): string {
  const sideIds = (sides ?? []).map((s) => s.id).sort();
  return sideIds.length ? `${itemId}|${sideIds.join(",")}` : itemId;
}

export interface KioskOrderResult {
  orderId: string;
  kioskOrderNumber: string | null;
  grandTotal: number;
  paymentStatus: "pending" | "paid";
  terminalCheckoutId: string | null;
}

export interface KioskConfig {
  applicationId: string | null;
  locationId: string | null;
  environment: string;
  terminalEnabled: boolean;
  cardEnabled: boolean;
}

export interface KioskPaymentStatus {
  status: "pending" | "paid" | "canceled";
  terminalStatus?: string;
}

// ─── Fetch helper ─────────────────────────────────────────────────────────────

export class KioskApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function kioskFetch<T>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = getKioskToken();
  if (!token) throw new KioskApiError("Device is not set up", 401);

  const res = await fetch(`/api/v1/kiosk${path}`, {
    method: opts.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      "X-Kiosk-Token": token,
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new KioskApiError(json.message || json.error || `Request failed (${res.status})`, res.status);
  }
  return (json.data ?? json) as T;
}

// ─── API calls ────────────────────────────────────────────────────────────────

export function fetchKioskMenu(): Promise<KioskMenu> {
  return kioskFetch<KioskMenu>("/menu");
}

export function sendHeartbeat(): Promise<{ ok: boolean }> {
  return kioskFetch<{ ok: boolean }>("/heartbeat", { method: "POST" });
}

export function fetchKioskConfig(): Promise<KioskConfig> {
  return kioskFetch<KioskConfig>("/config");
}

export function placeKioskOrder(input: {
  clientRequestId: string;
  lines: { productItemId: string; qty: number; upsellQty?: number; sideProductIds?: string[] }[];
  customerName: string;
  customerPhone?: string;
  specialInstructions?: string;
  paymentMethod: "terminal" | "card";
  squareNonce?: string;
}): Promise<KioskOrderResult> {
  return kioskFetch<KioskOrderResult>("/orders", { method: "POST", body: input });
}

export function fetchKioskPaymentStatus(orderId: string): Promise<KioskPaymentStatus> {
  return kioskFetch<KioskPaymentStatus>(`/orders/${orderId}/payment`);
}

export function cancelKioskPayment(orderId: string): Promise<{ canceled: boolean }> {
  return kioskFetch<{ canceled: boolean }>(`/orders/${orderId}/cancel-payment`, { method: "POST" });
}

export function fetchKioskOrderStatus(orderId: string): Promise<{ status: string }> {
  return kioskFetch<{ status: string }>(`/orders/${orderId}/status`);
}

export interface KioskCampaign {
  id: string;
  name: string;
  description: string | null;
  title: string | null;
  body: string | null;
  campaignType: "upsell" | "post_sale_ad";
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  priority: number;
  amountOff: number | null;
  mediaAssetId: string | null;
  durationSeconds: number;
  allKiosks: boolean;
  productIds: string[];
  imageUrl: string | null;
  products: KioskProduct[];
}

export function fetchKioskCampaigns(): Promise<KioskCampaign[]> {
  return kioskFetch<KioskCampaign[]>("/campaigns");
}

export function formatMoney(n: number): string {
  return `$${n.toFixed(2)}`;
}
