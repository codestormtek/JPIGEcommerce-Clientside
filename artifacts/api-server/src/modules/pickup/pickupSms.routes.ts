import express, { Request, Response } from 'express';
import { handlePickupSmsWebhook } from './pickupSms';

/**
 * Telnyx webhooks must retain the exact bytes signed by Ed25519. This router
 * is mounted before the application's JSON parser in app.ts.
 */
export const pickupSmsWebhookRouter = express.Router();

pickupSmsWebhookRouter.post(
  '/',
  express.raw({ type: 'application/json', limit: '1mb' }),
  async (req: Request, res: Response) => {
    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from('');
    try {
      const result = await handlePickupSmsWebhook({
        rawBody,
        signature: req.header('telnyx-signature-ed25519') ?? '',
        timestamp: req.header('telnyx-timestamp') ?? '',
      });
      res.status(200).json({ ok: true, ...result });
    } catch (error) {
      // Do not acknowledge malformed/unverified events: Telnyx can retry them
      // after the operator corrects the webhook configuration.
      res.status(401).json({ error: 'Invalid webhook signature or payload' });
    }
  },
);