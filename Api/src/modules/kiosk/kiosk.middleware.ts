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

  prisma.kioskDevice
    .findFirst({ where: { tokenHash: hashKioskToken(token), isActive: true } })
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
