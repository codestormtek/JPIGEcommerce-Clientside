import { Request, Response, NextFunction } from 'express';
import { createHash } from 'crypto';
import prisma from '../../lib/prisma';
import { ApiError } from '../../utils/apiError';
import { logger } from '../../utils/logger';

export interface KioskRequest extends Request {
  kioskDevice?: { id: string; name: string };
}

export function hashKioskToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// Short-lived token→device cache so the rate limiter's validity check and the
// auth middleware don't each hit the DB per request. Negative results are
// cached too (blunts DB load from token-guessing). TTL means a revoked device
// keeps working for up to 30s — acceptable for a self-order kiosk.
const CACHE_TTL_MS = 30_000;
const MAX_CACHE_ENTRIES = 1_000;
const deviceCache = new Map<string, { device: { id: string; name: string } | null; exp: number }>();

export async function lookupKioskDevice(token: string): Promise<{ id: string; name: string } | null> {
  const hash = hashKioskToken(token);
  const now = Date.now();
  const hit = deviceCache.get(hash);
  if (hit && hit.exp > now) return hit.device;

  const device = await prisma.kioskDevice.findFirst({
    where: { tokenHash: hash, isActive: true },
    select: { id: true, name: true },
  });

  if (deviceCache.size >= MAX_CACHE_ENTRIES) {
    for (const [k, v] of deviceCache) {
      if (v.exp <= now) deviceCache.delete(k);
    }
    if (deviceCache.size >= MAX_CACHE_ENTRIES) deviceCache.clear();
  }
  deviceCache.set(hash, { device, exp: now + CACHE_TTL_MS });
  return device;
}

/** Evict a token's cache entry immediately (used on revoke so it takes effect at once). */
export function invalidateKioskDeviceCache(): void {
  deviceCache.clear();
}

/**
 * Authenticates a kiosk device via the X-Kiosk-Token header.
 * Tokens are stored hashed; a revoked (isActive=false) device is rejected.
 * Updates lastSeenAt fire-and-forget so every request doubles as a heartbeat.
 */
export function authenticateKiosk(req: KioskRequest, _res: Response, next: NextFunction): void {
  const token = req.header('x-kiosk-token');
  if (!token) {
    next(ApiError.unauthorized('Kiosk token required'));
    return;
  }

  lookupKioskDevice(token)
    .then((device) => {
      if (!device) {
        next(ApiError.unauthorized('Invalid or revoked kiosk token'));
        return;
      }
      req.kioskDevice = { id: device.id, name: device.name };
      prisma.kioskDevice
        .update({ where: { id: device.id }, data: { lastSeenAt: new Date() } })
        .catch((err) => logger.warn(`Failed to update kiosk lastSeenAt: ${err}`));
      next();
    })
    .catch(next);
}
