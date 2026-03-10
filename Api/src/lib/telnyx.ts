import { config } from '../config';
import { logger } from '../utils/logger';

export interface SmsResult {
  success: boolean;
  messageId: string | null;
  error: string | null;
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

  try {
    const response = await fetch('https://api.telnyx.com/v2/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.telnyx.apiKey}`,
      },
      body: JSON.stringify({
        from: config.telnyx.fromNumber,
        to,
        text: body,
      }),
    });

    const data: any = await response.json();

    if (!response.ok) {
      const errorMessage = data?.errors?.[0]?.detail ?? data?.errors?.[0]?.title ?? `HTTP ${response.status}`;
      logger.error('telnyx: SMS send failed', { to, status: response.status, error: errorMessage });
      return { success: false, messageId: null, error: errorMessage };
    }

    const messageId = data?.data?.id ?? null;
    logger.info('telnyx: SMS sent', { messageId, to });
    return { success: true, messageId, error: null };
  } catch (err: any) {
    const errorMessage = err.message ?? 'Unknown error';
    logger.error('telnyx: SMS send exception', { to, error: errorMessage });
    return { success: false, messageId: null, error: errorMessage };
  }
}

export async function sendTestSms(to: string, body?: string): Promise<SmsResult> {
  const testBody = body ?? `[TEST] The Jiggling Pig — SMS integration is working! 🐷🔥`;
  return sendSms(to, testBody);
}
