import { ApiError } from '../../utils/apiError';
import { sendSms } from '../../lib/telnyx';
import { logger } from '../../utils/logger';
import prisma from '../../lib/prisma';
import * as repo from './sms-broadcasts.repository';
import {
  ListBroadcastsInput,
  PreviewAudienceInput,
  SendBroadcastInput,
  SUBSCRIPTION_TOPICS,
} from './sms-broadcasts.schema';

export function getTopics() {
  return SUBSCRIPTION_TOPICS.map((value) => ({ value }));
}

interface AudienceTarget {
  id: string;
  phone: string;
}

/**
 * Dedupes subscribers down to the exact list that will be texted, by trimmed
 * phone. Shared by previewAudience + sendBroadcast so the preview count always
 * matches what is actually sent.
 */
function resolveTargets(
  subscribers: { id: string; phone: string | null }[],
): AudienceTarget[] {
  const seen = new Set<string>();
  const targets: AudienceTarget[] = [];
  for (const s of subscribers) {
    const phone = (s.phone || '').trim();
    if (!phone) continue;
    if (seen.has(phone)) continue;
    seen.add(phone);
    targets.push({ id: s.id, phone });
  }
  return targets;
}

export async function previewAudience(input: PreviewAudienceInput) {
  const subscribers = await repo.findAudienceSubscribers(input);
  const targets = resolveTargets(subscribers);
  return {
    audienceType: input.audienceType,
    audienceTopic: input.audienceTopic ?? null,
    recipientCount: targets.length,
  };
}

export async function sendBroadcast(input: SendBroadcastInput, userId?: string) {
  const subscribers = await repo.findAudienceSubscribers(input);
  const targets = resolveTargets(subscribers);

  if (targets.length === 0) {
    throw ApiError.badRequest('No SMS subscribers match this audience.');
  }

  // Persist the broadcast up-front (status "sending") so that, even if the
  // process is interrupted mid-send, history reflects what was actually texted
  // instead of losing the record entirely.
  const broadcast = await repo.createBroadcast({
    title: input.title ?? null,
    messageBody: input.messageBody,
    audienceType: input.audienceType,
    audienceTopic: input.audienceTopic ?? null,
    status: 'sending',
    totalRecipients: targets.length,
    totalSent: 0,
    totalFailed: 0,
    sentAt: new Date(),
    createdByUserId: userId ?? null,
  });

  let totalSent = 0;
  let totalFailed = 0;

  for (const target of targets) {
    const result = await sendSms(target.phone, input.messageBody);
    if (result.success) totalSent += 1;
    else totalFailed += 1;

    // Record each recipient immediately so the audit trail survives a crash.
    await repo.createBroadcastRecipient({
      broadcastId: broadcast.id,
      subscriberId: target.id,
      phoneNumber: target.phone,
      providerMessageId: result.messageId,
      sendStatus: result.success ? 'sent' : 'failed',
      errorMessage: result.error,
      sentAt: result.success ? new Date() : null,
    });

    if (result.success) {
      await prisma.messageOutbox
        .create({
          data: {
            channel: 'sms',
            toAddress: target.phone,
            templateKey: 'sms_broadcast',
            bodyText: input.messageBody,
            payloadJson: JSON.stringify({ broadcastId: broadcast.id }),
            status: 'sent',
            provider: 'telnyx',
            providerMessageId: result.messageId,
            sentAt: new Date(),
          },
        })
        .catch((err) => logger.warn('sms-broadcast: outbox log failed', { err }));
    }
  }

  const status = totalFailed === 0 ? 'sent' : totalSent === 0 ? 'failed' : 'partial';
  await repo.updateBroadcast(broadcast.id, { status, totalSent, totalFailed });

  logger.info('sms-broadcast: sent', {
    broadcastId: broadcast.id,
    totalRecipients: targets.length,
    totalSent,
    totalFailed,
  });

  return {
    broadcastId: broadcast.id,
    status,
    totalRecipients: targets.length,
    totalSent,
    totalFailed,
  };
}

export async function listBroadcasts(input: ListBroadcastsInput) {
  return repo.findBroadcasts(input);
}

export async function getBroadcast(id: string) {
  const broadcast = await repo.findBroadcastById(id);
  if (!broadcast) throw ApiError.notFound('Broadcast');
  return broadcast;
}
