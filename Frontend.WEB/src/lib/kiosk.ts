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
  items: KioskMenuItem[];
}

export interface KioskMenu {
  categories: KioskCategory[];
  products: KioskProduct[];
}

export interface KioskCartLine {
  product: KioskProduct;
  item: KioskMenuItem;
  qty: number;
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
  lines: { productItemId: string; qty: number }[];
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

export function formatMoney(n: number): string {
  return `$${n.toFixed(2)}`;
}
