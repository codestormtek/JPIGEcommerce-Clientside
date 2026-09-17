import prisma from './prisma';
import { normalizePhone } from './phone';
import { logger } from '../utils/logger';

/**
 * Shared guard for every outbound SMS path. A missing additive table must not
 * take down legacy email/order flows during a rolling deploy; once the
 * migration is installed, STOP is enforced for all senders using this helper.
 */
export async function isSmsSuppressed(phoneInput: string): Promise<boolean> {
  const phone = normalizePhone(phoneInput);
  if (!phone) return false;
  try {
    const row = await prisma.pickupSmsSuppression.findUnique({
      where: { phoneNumber: phone },
      select: { id: true },
    });
    return Boolean(row);
  } catch (error) {
    // A STOP must never be bypassed because the suppression lookup is
    // unavailable. Migration is additive and applied before enabling SMS;
    // fail closed during any transient database/schema error.
    logger.error('smsSuppression: lookup unavailable; blocking SMS send', { error });
    return true;
  }
}