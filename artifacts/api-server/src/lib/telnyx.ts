import { config } from '../config';
import { logger } from '../utils/logger';

export interface SmsResult {
  success: boolean;
  messageId: string | null;
  error: string | null;
}

function toE164(number: string): string {
  const digits = number.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return number.startsWith('+') ? number : `+${digits}`;
}

export async function sendSms(to: string, body: string): Promise<SmsResult> {
  if (!config.telnyx.apiKey) {
    logger.warn('telnyx: TELNYX_API_KEY not set — SMS skipped');
    return { success: false, messageId: null, error: 'TELNYX_API_KEY not configured' };
  }

  if (!config.telnyx.fromNumber) {
    logger.warn('telnyx: TELNYX_FROM_NUMBER not set — SMS skipped');
    return { success: false, messageId: null, error: 'TELNYX_FROM_NUMBER not configured' };
  }

  const fromE164 = toE164(config.telnyx.fromNumber);
  const toE164Num = toE164(to);

  try {
    const response = await fetch('https://api.telnyx.com/v2/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.telnyx.apiKey}`,
      },
      body: JSON.stringify({
        from: fromE164,
        to: toE164Num,
        text: body,
      }),
    });

    const data: any = await response.json();

    if (!response.ok) {
      const errorMessage = data?.errors?.[0]?.detail ?? data?.errors?.[0]?.title ?? `HTTP ${response.status}`;
      logger.error('telnyx: SMS send failed', { to: toE164Num, from: fromE164, status: response.status, error: errorMessage });
      return { success: false, messageId: null, error: errorMessage };
    }

    const messageId = data?.data?.id ?? null;
    logger.info('telnyx: SMS sent', { messageId, to: toE164Num, from: fromE164 });
    return { success: true, messageId, error: null };
  } catch (err: any) {
    const errorMessage = err.message ?? 'Unknown error';
    logger.error('telnyx: SMS send exception', { to: toE164Num, error: errorMessage });
    return { success: false, messageId: null, error: errorMessage };
  }
}

export async function sendTestSms(to: string, body?: string): Promise<SmsResult> {
  const testBody = body ?? `[TEST] The Jiggling Pig — SMS integration is working! 🐷🔥`;
  return sendSms(to, testBody);
}
