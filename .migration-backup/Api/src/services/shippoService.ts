import { config } from '../config';
import { logger } from '../utils/logger';

// ─── Default dimensions when product has none ─────────────────────────────────

const SHIPPING_CLASS_DEFAULTS: Record<string, { weightLb: number; length: number; width: number; height: number }> = {
  SAUCE_BOTTLE: { weightLb: 1.25, length: 2.5, width: 2.5, height: 8 },
  RUB_BOTTLE:   { weightLb: 0.5,  length: 2.5, width: 2.5, height: 5 },
  MERCH:        { weightLb: 0.75, length: 10,  width: 8,   height: 2 },
};

const FALLBACK_DEFAULTS = { weightLb: 1.0, length: 6, width: 4, height: 4 };

// ─── Box sizes ─────────────────────────────────────────────────────────────────

const BOXES = [
  { name: 'Small',  maxWeightLb: 3,  length: 8,  width: 6,  height: 4 },
  { name: 'Medium', maxWeightLb: 6,  length: 10, width: 8,  height: 6 },
  { name: 'Large',  maxWeightLb: 10, length: 12, width: 10, height: 8 },
  { name: 'XLarge', maxWeightLb: 20, length: 16, width: 12, height: 10 },
];

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CartItemDimensions {
  productItemId: string;
  qty: number;
  weightOz?: number | null;    // stored as oz in DB
  length?: number | null;
  width?: number | null;
  height?: number | null;
  shippingClass?: string | null;
}

export interface ShippoAddress {
  name: string;
  street1: string;
  street2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone?: string;
  email?: string;
}

export interface ShippoRate {
  rateId: string;
  provider: string;
  providerImage?: string;
  servicelevel: string;
  amount: string;
  currency: string;
  estimatedDays: number | null;
  durationTerms?: string;
}

export interface ShippoTransaction {
  transactionId: string;
  trackingNumber: string;
  carrier: string;
  labelUrl: string;
  labelPdf: string;
  eta?: string;
}

// ─── Package calculation ───────────────────────────────────────────────────────

/**
 * Returns true if the item (with dims sorted largest-first) can fit inside the
 * box (also sorted largest-first) in at least one orientation.
 */
function itemFitsInBox(
  itemDims: [number, number, number],
  boxDims: [number, number, number],
): boolean {
  // Both arrays are sorted descending; largest item dim must fit in largest box dim, etc.
  return itemDims[0] <= boxDims[0] && itemDims[1] <= boxDims[1] && itemDims[2] <= boxDims[2];
}

export function calculateParcel(items: CartItemDimensions[]) {
  let totalWeightLb = 0;

  // Track the required minimum box dims needed to fit every item's largest face.
  let reqLength = 0;
  let reqWidth  = 0;
  let reqHeight = 0;

  for (const item of items) {
    const defaults = (item.shippingClass && SHIPPING_CLASS_DEFAULTS[item.shippingClass])
      ? SHIPPING_CLASS_DEFAULTS[item.shippingClass]
      : FALLBACK_DEFAULTS;

    // ── Weight (oz → lbs) ──────────────────────────────────────────────────
    const itemWeightLb = item.weightOz != null
      ? (Number(item.weightOz) / 16) * item.qty
      : defaults.weightLb * item.qty;

    totalWeightLb += itemWeightLb;

    // ── Dimensions ─────────────────────────────────────────────────────────
    // Use stored dims if available, fall back to shipping-class / generic defaults.
    const l = item.length  ?? defaults.length;
    const w = item.width   ?? defaults.width;
    const h = item.height  ?? defaults.height;

    // Sort item dims descending so we compare biggest-to-biggest with the box.
    const [d0, d1, d2] = [l, w, h].sort((a, b) => b - a) as [number, number, number];

    // Each box dimension must be at least as large as the corresponding
    // sorted item dimension across all items.
    reqLength = Math.max(reqLength, d0);
    reqWidth  = Math.max(reqWidth,  d1);
    reqHeight = Math.max(reqHeight, d2);
  }

  // ── Box selection ─────────────────────────────────────────────────────────
  // Pre-sort each box's dims descending once for the fit check.
  const boxesSorted = BOXES.map((b) => ({
    ...b,
    dims: [b.length, b.width, b.height].sort((a, c) => c - a) as [number, number, number],
  }));

  const itemDimsRequired: [number, number, number] = [reqLength, reqWidth, reqHeight];

  // Pick the smallest box that satisfies BOTH weight AND dimension constraints.
  const box = boxesSorted.find(
    (b) => b.maxWeightLb >= totalWeightLb && itemFitsInBox(itemDimsRequired, b.dims),
  ) ?? boxesSorted[boxesSorted.length - 1];

  return {
    length: String(box.length),
    width: String(box.width),
    height: String(box.height),
    distance_unit: 'in',
    weight: totalWeightLb.toFixed(2),
    mass_unit: 'lb',
    boxName: box.name,
  };
}

// ─── Shippo API helpers ────────────────────────────────────────────────────────

async function shippoPost<T>(path: string, body: unknown): Promise<T> {
  const apiKey = config.shippo.apiKey;
  if (!apiKey) throw new Error('Shippo API key is not configured');

  const res = await fetch(`https://api.goshippo.com${path}`, {
    method: 'POST',
    headers: {
      Authorization: `ShippoToken ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await res.json() as T & { messages?: { code: string; text: string }[] };

  if (!res.ok) {
    logger.error('Shippo API error', { path, status: res.status, data });
    throw new Error(`Shippo error: ${JSON.stringify((data as Record<string, unknown>).detail ?? data)}`);
  }

  return data;
}

async function shippoGet<T>(path: string): Promise<T> {
  const apiKey = config.shippo.apiKey;
  if (!apiKey) throw new Error('Shippo API key is not configured');

  const res = await fetch(`https://api.goshippo.com${path}`, {
    headers: { Authorization: `ShippoToken ${apiKey}` },
  });

  const data = await res.json() as T;

  if (!res.ok) {
    logger.error('Shippo GET error', { path, status: res.status });
    throw new Error(`Shippo error: ${JSON.stringify(data)}`);
  }

  return data;
}

// ─── Public API ────────────────────────────────────────────────────────────────

export async function getRates(
  items: CartItemDimensions[],
  toAddress: ShippoAddress,
): Promise<ShippoRate[]> {
  const parcel = calculateParcel(items);
  const fromAddress = config.store.address;

  type ShipmentResp = {
    object_id: string;
    rates: Array<{
      object_id: string;
      provider: string;
      provider_image_75?: string;
      servicelevel: { name: string };
      amount: string;
      currency: string;
      estimated_days: number | null;
      duration_terms?: string;
    }>;
  };

  const shipment = await shippoPost<ShipmentResp>('/shipments/', {
    address_from: {
      name: fromAddress.name,
      street1: fromAddress.street1,
      city: fromAddress.city,
      state: fromAddress.state,
      zip: fromAddress.zip,
      country: fromAddress.country,
      phone: fromAddress.phone,
      email: fromAddress.email,
    },
    address_to: toAddress,
    parcels: [parcel],
    async: false,
  });

  return (shipment.rates ?? [])
    .filter((r) => r.amount && Number(r.amount) > 0)
    .sort((a, b) => Number(a.amount) - Number(b.amount))
    .map((r) => ({
      rateId: r.object_id,
      provider: r.provider,
      providerImage: r.provider_image_75,
      servicelevel: r.servicelevel.name,
      amount: r.amount,
      currency: r.currency,
      estimatedDays: r.estimated_days ?? null,
      durationTerms: r.duration_terms,
    }));
}

export async function purchaseLabel(rateId: string): Promise<ShippoTransaction> {
  type TxResp = {
    object_id: string;
    object_state: string;
    tracking_number: string;
    label_url: string;
    label_url_pdf?: string;
    metadata?: string;
    eta?: string;
    rate: { provider: string };
    messages?: { code: string; text: string }[];
  };

  const tx = await shippoPost<TxResp>('/transactions/', {
    rate: rateId,
    label_file_type: 'PDF',
    async: false,
  });

  if (tx.object_state !== 'VALID') {
    const msgs = (tx.messages ?? []).map((m) => m.text).join('; ');
    throw new Error(`Shippo label purchase failed: ${msgs || tx.object_state}`);
  }

  return {
    transactionId: tx.object_id,
    trackingNumber: tx.tracking_number,
    carrier: tx.rate?.provider ?? '',
    labelUrl: tx.label_url,
    labelPdf: tx.label_url_pdf ?? tx.label_url,
    eta: tx.eta,
  };
}

export async function getTracking(carrier: string, trackingNumber: string) {
  type TrackingResp = {
    carrier: string;
    tracking_number: string;
    tracking_status: { status: string; status_details: string; status_date: string } | null;
    tracking_history: Array<{ status: string; status_details: string; location: { city?: string; state?: string; country?: string }; status_date: string }>;
    eta: string | null;
  };

  return shippoGet<TrackingResp>(`/tracks/${carrier}/${trackingNumber}`);
}
