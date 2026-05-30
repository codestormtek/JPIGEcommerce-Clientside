import * as repo from '../site-settings/site-settings.repository';
import { ApiError } from '../../utils/apiError';
import { logger } from '../../utils/logger';

export type GatewayName = 'stripe' | 'square';

export interface GatewayStatus {
  activeGateway: GatewayName;
  stripe: { configured: boolean; webhookConfigured: boolean };
  square: { configured: boolean; appIdSet: boolean; locationIdSet: boolean; accessTokenSet: boolean };
}

export async function getGatewayStatus(): Promise<GatewayStatus> {
  const setting = await repo.findByKey('active_payment_gateway');
  const activeGateway: GatewayName =
    setting?.settingValue === 'square' ? 'square' : 'stripe';

  const stripeConfigured = !!(process.env.STRIPE_SECRET_KEY);
  const stripeWebhook   = !!(process.env.STRIPE_WEBHOOK_SECRET);

  const squareAppId      = !!(process.env.SQUARE_APP_ID);
  const squareLocationId = !!(process.env.SQUARE_LOCATION_ID);
  const squareToken      = !!(process.env.SQUARE_ACCESS_TOKEN);

  return {
    activeGateway,
    stripe: { configured: stripeConfigured, webhookConfigured: stripeWebhook },
    square: {
      configured: squareAppId && squareLocationId && squareToken,
      appIdSet: squareAppId,
      locationIdSet: squareLocationId,
      accessTokenSet: squareToken,
    },
  };
}

export async function setActiveGateway(gateway: GatewayName): Promise<void> {
  const existing = await repo.findByKey('active_payment_gateway');
  if (existing) {
    await repo.update('active_payment_gateway', { settingValue: gateway });
  } else {
    await repo.create({
      settingKey: 'active_payment_gateway',
      settingValue: gateway,
      label: 'Active Payment Gateway',
      category: 'payments',
    });
  }
}

export interface SquareCredentials {
  appId?: string;
  locationId?: string;
  accessToken?: string;
}

export function applySquareCredentials(creds: SquareCredentials): void {
  if (creds.appId !== undefined)      process.env.SQUARE_APP_ID       = creds.appId;
  if (creds.locationId !== undefined) process.env.SQUARE_LOCATION_ID  = creds.locationId;
  if (creds.accessToken !== undefined) process.env.SQUARE_ACCESS_TOKEN = creds.accessToken;
  logger.info('Square credentials applied to process environment for current session');
}

export async function testSquareConnection(): Promise<{ ok: boolean; message: string }> {
  const appId    = process.env.SQUARE_APP_ID;
  const locId    = process.env.SQUARE_LOCATION_ID;
  const token    = process.env.SQUARE_ACCESS_TOKEN;

  if (!appId || !locId || !token) {
    return { ok: false, message: 'Square credentials are not fully configured. Please save Application ID, Location ID, and Access Token first.' };
  }

  try {
    const squareBase = token.startsWith('EAAAl') || token.startsWith('EAAAE')
      ? 'https://connect.squareup.com'
      : 'https://connect.squareupsandbox.com';

    const res = await fetch(`${squareBase}/v2/locations/${locId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Square-Version': '2024-01-18',
        'Content-Type': 'application/json',
      },
    });

    if (res.ok) {
      const data = await res.json() as { location?: { name?: string } };
      const name = data?.location?.name ?? 'Unknown';
      return { ok: true, message: `Connected successfully to Square location: ${name}` };
    }

    const err = await res.json() as { errors?: Array<{ detail?: string }> };
    const detail = err?.errors?.[0]?.detail ?? `HTTP ${res.status}`;
    return { ok: false, message: `Square connection failed: ${detail}` };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: `Square connection error: ${msg}` };
  }
}
