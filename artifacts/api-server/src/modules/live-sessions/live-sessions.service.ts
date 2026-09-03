import { ApiError } from '../../utils/apiError';
import { sendSms, sendTestSms } from '../../lib/telnyx';
import { logger } from '../../utils/logger';
import * as repo from './live-sessions.repository';
import {
  CreateLiveSessionInput,
  UpdateLiveSessionInput,
  ListLiveSessionsInput,
  SendAlertInput,
  AlertHistoryInput,
  PublicSubscribeInput,
} from './live-sessions.schema';

export async function listSessions(input: ListLiveSessionsInput) {
  return repo.findSessions(input);
}

export async function getSession(id: string) {
  const session = await repo.findSessionById(id);
  if (!session) throw ApiError.notFound('Live session');
  return session;
}

export async function createSession(input: CreateLiveSessionInput, userId?: string) {
  return repo.createSession(input, userId);
}

export async function updateSession(id: string, input: UpdateLiveSessionInput) {
  const existing = await repo.findSessionById(id);
  if (!existing) throw ApiError.notFound('Live session');
  return repo.updateSession(id, input);
}

export async function deleteSession(id: string) {
  const existing = await repo.findSessionById(id);
  if (!existing) throw ApiError.notFound('Live session');
  return repo.deleteSession(id);
}

export async function goLive(id: string, message?: string | null) {
  const session = await repo.findSessionById(id);
  if (!session) throw ApiError.notFound('Live session');

  const existingLive = await repo.findAnyLiveSession();
  if (existingLive && existingLive.id !== id) {
    throw ApiError.conflict('Another session is already live. Close it before going live with a new one.');
  }

  if (message !== undefined && message !== null) {
    await repo.updateSession(id, { message });
  }

  let mapUrl: string | null = null;
  if (session.lat && session.lng) {
    mapUrl = `https://www.google.com/maps/search/?api=1&query=${session.lat},${session.lng}`;
  }

  return repo.setSessionLive(id, mapUrl);
}

export async function closeSession(id: string) {
  const session = await repo.findSessionById(id);
  if (!session) throw ApiError.notFound('Live session');
  if (session.status !== 'LIVE') {
    throw ApiError.badRequest('Session is not currently live');
  }
  return repo.setSessionClosed(id);
}

export async function sendAlert(id: string, input: SendAlertInput, userId?: string) {
  const session = await repo.findSessionById(id);
  if (!session) throw ApiError.notFound('Live session');

  const subscribers = await repo.findSmsOptedInSubscribers();
  if (subscribers.length === 0) {
    throw ApiError.badRequest('No SMS subscribers to send to');
  }

  const results: {
    subscriberId: string | null;
    phone: string;
    success: boolean;
    messageId: string | null;
    error: string | null;
  }[] = [];

  for (const sub of subscribers) {
    if (!sub.phone) continue;
    const result = await sendSms(sub.phone, input.messageBody);
    results.push({
      subscriberId: sub.id,
      phone: sub.phone,
      success: result.success,
      messageId: result.messageId,
      error: result.error,
    });
  }

  const totalSent = results.filter(r => r.success).length;
  const totalFailed = results.filter(r => !r.success).length;

  const campaign = await repo.createCampaign({
    liveSessionId: id,
    messageBody: input.messageBody,
    audienceType: input.audienceType,
    totalRecipients: results.length,
    totalSent,
    totalFailed,
    sentAt: new Date(),
    createdByUserId: userId,
  });

  for (const r of results) {
    await repo.createAlertMessage({
      campaignId: campaign.id,
      subscriberId: r.subscriberId,
      phoneNumber: r.phone,
      messageBody: input.messageBody,
      providerMessageId: r.messageId,
      sendStatus: r.success ? 'sent' : 'failed',
      errorMessage: r.error,
      sentAt: r.success ? new Date() : null,
    });
  }

  logger.info('live-sessions: alert sent', {
    campaignId: campaign.id,
    sessionId: id,
    totalRecipients: results.length,
    totalSent,
    totalFailed,
  });

  return {
    campaignId: campaign.id,
    totalRecipients: results.length,
    totalSent,
    totalFailed,
  };
}

export async function sendTestSmsToAdmin(to: string, body?: string) {
  return sendTestSms(to, body);
}

export async function getSubscriberCount() {
  return repo.countSmsOptedInSubscribers();
}

export async function getCurrentLiveSession() {
  return repo.findCurrentLiveSession();
}

export async function getAlertHistory(input: AlertHistoryInput) {
  return repo.findAlertHistory(input);
}

export async function publicSubscribe(input: PublicSubscribeInput) {
  const existing = await repo.findSubscriberByPhone(input.phone);
  if (existing) {
    if (existing.optInSms) {
      return { alreadySubscribed: true, message: 'You are already subscribed to text alerts.' };
    }
    await repo.resubscribeByPhone(input.phone);
    return { alreadySubscribed: false, message: 'You have been re-subscribed to text alerts.' };
  }

  await repo.createSubscriber({
    phone: input.phone,
    optInSms: true,
    confirmedAt: new Date(),
  });

  return { alreadySubscribed: false, message: 'You have been subscribed to text alerts!' };
}

export async function publicUnsubscribe(phone: string) {
  const result = await repo.unsubscribeByPhone(phone);
  if (!result) {
    return { success: false, message: 'No subscription found for this phone number.' };
  }
  return { success: true, message: 'You have been unsubscribed from text alerts.' };
}
