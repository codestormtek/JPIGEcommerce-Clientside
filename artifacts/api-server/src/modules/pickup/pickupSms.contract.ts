import crypto from 'crypto';

export type FinalizedDeliveryStatus = 'delivered' | 'delivery_failed' | 'sent' | 'ignored';

export function pickupSmsWorkerEnabled(environment: string, featureEnabled: boolean): boolean {
  return environment === 'production' && featureEnabled;
}

export function finalizedDeliveryStatus(input: {
  eventType: string;
  statuses?: string[];
  hasErrors?: boolean;
}): FinalizedDeliveryStatus {
  const statuses = input.statuses ?? [];
  if (statuses.includes('delivered')) return 'delivered';
  if (statuses.includes('delivery_failed') || input.hasErrors || input.eventType === 'message.failed') return 'delivery_failed';
  if (input.eventType === 'message.sent' || input.eventType === 'message.finalized') return 'sent';
  return 'ignored';
}

function publicKeyObject(publicKey: string): crypto.KeyObject {
  const normalized = publicKey.replace(/\\n/g, '\n').trim();
  if (normalized.includes('BEGIN PUBLIC KEY')) return crypto.createPublicKey(normalized);
  const decoded = Buffer.from(normalized, 'base64');
  return crypto.createPublicKey({
    key: decoded.length === 32
      ? Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), decoded])
      : decoded,
    format: 'der',
    type: 'spki',
  });
}

/** Telnyx signs the exact `${timestamp}|${rawBody}` byte sequence. */
export function verifyTelnyxSignature(
  rawBody: Buffer,
  timestamp: string,
  signature: string,
  publicKey: string,
  nowMs = Date.now(),
): boolean {
  if (!publicKey || !signature || !timestamp) return false;
  if (!/^\d+$/.test(timestamp)) return false;
  const timestampSeconds = Number(timestamp);
  if (!Number.isSafeInteger(timestampSeconds)) return false;
  const timestampMs = timestampSeconds * 1000;
  if (Math.abs(nowMs - timestampMs) > 5 * 60_000) return false;
  try {
    const signed = Buffer.from(`${timestamp}|${rawBody.toString('utf8')}`);
    if (signature.length === 0 || signature.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(signature)) return false;
    const bytes = Buffer.from(signature, 'base64');
    if (bytes.length !== 64) return false;
    return crypto.verify(null, signed, publicKeyObject(publicKey), bytes);
  } catch {
    return false;
  }
}