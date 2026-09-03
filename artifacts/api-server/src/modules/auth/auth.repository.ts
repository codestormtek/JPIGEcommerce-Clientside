import prisma from '../../lib/prisma';
import { SiteUser } from '@prisma/client';

// ─── Users ────────────────────────────────────────────────────────────────────

export async function findUserByEmail(email: string): Promise<SiteUser | null> {
  return prisma.siteUser.findFirst({
    where: { emailAddress: email, isDeleted: false },
  });
}

export async function findUserById(id: string): Promise<SiteUser | null> {
  return prisma.siteUser.findFirst({
    where: { id, isDeleted: false },
  });
}

export async function createUser(data: {
  firstName?: string;
  lastName?: string;
  emailAddress: string;
  passwordHash: string;
  phoneNumber?: string;
}): Promise<SiteUser> {
  return prisma.siteUser.create({
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      emailAddress: data.emailAddress,
      passwordHash: data.passwordHash,
      phoneNumber: data.phoneNumber,
      role: 'user',
      isActive: false, // pending admin approval
    },
  });
}

/** Enables SMS (and keeps email default) on the user's contact preference for order texts. */
export async function upsertSmsContactPreference(userId: string, smsPhone: string): Promise<void> {
  await prisma.userContactPreference.upsert({
    where: { userId },
    create: { userId, optInSms: true, smsPhone },
    update: { optInSms: true, smsPhone },
  });
}

/**
 * Idempotently records a marketing SMS opt-in (events & live-location alerts).
 * Reuses the Subscriber model that the roadside live-session broadcaster sends to.
 * Looks up an existing subscriber by canonical phone first so re-registration or a
 * prior newsletter signup never creates a duplicate row (= duplicate outbound SMS).
 */
export async function upsertMarketingSmsSubscriber(data: {
  userId: string;
  phone: string; // already normalized to E.164 by the caller
  email?: string;
}): Promise<void> {
  const existing = await prisma.subscriber.findFirst({
    where: { phone: data.phone, isDeleted: false },
  });

  const subscriber = existing
    ? await prisma.subscriber.update({
        where: { id: existing.id },
        data: {
          optInSms: true,
          confirmedAt: existing.confirmedAt ?? new Date(),
          userId: existing.userId ?? data.userId,
          email: existing.email ?? data.email,
        },
      })
    : await prisma.subscriber.create({
        data: {
          userId: data.userId,
          phone: data.phone,
          email: data.email,
          optInSms: true,
          confirmedAt: new Date(),
        },
      });

  // Live-location / truck-schedule topic drives roadside BBQ alerts — ensure one exists
  const sub = await prisma.subscriberSubscription.findFirst({
    where: { subscriberId: subscriber.id, subscriptionType: 'truck_schedule', isDeleted: false },
  });
  if (sub) {
    if (!sub.isEnabled) {
      await prisma.subscriberSubscription.update({ where: { id: sub.id }, data: { isEnabled: true } });
    }
  } else {
    await prisma.subscriberSubscription.create({
      data: { subscriberId: subscriber.id, subscriptionType: 'truck_schedule', isEnabled: true },
    });
  }
}

export async function updateUserPassword(userId: string, passwordHash: string): Promise<void> {
  await prisma.siteUser.update({
    where: { id: userId },
    data: { passwordHash, lastModifiedAt: new Date() },
  });
}

/** Loads an order plus its owning user — used to verify guest-account claims. */
export async function findOrderOwner(orderId: string) {
  return prisma.shopOrder.findUnique({
    where: { id: orderId },
    include: { user: true },
  });
}

/** Converts a guest shell account into a real, active account with a password. */
export async function claimGuestAccount(userId: string, passwordHash: string): Promise<void> {
  await prisma.siteUser.update({
    where: { id: userId },
    data: { passwordHash, isActive: true, isGuest: false, lastModifiedAt: new Date() },
  });
}

// ─── Refresh Tokens ───────────────────────────────────────────────────────────

export async function createRefreshToken(data: {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  userAgent?: string;
  ipAddress?: string;
}): Promise<void> {
  await prisma.refreshToken.create({ data });
}

export async function findRefreshToken(tokenHash: string) {
  return prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });
}

export async function revokeRefreshToken(tokenHash: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllUserRefreshTokens(userId: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

// ─── Password Reset Tokens ────────────────────────────────────────────────────

export async function createPasswordResetToken(data: {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}): Promise<void> {
  // Invalidate any existing unused reset tokens for this user
  await prisma.passwordResetToken.updateMany({
    where: { userId: data.userId, usedAt: null },
    data: { usedAt: new Date() },
  });
  await prisma.passwordResetToken.create({ data });
}

export async function findPasswordResetToken(tokenHash: string) {
  return prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });
}

export async function markPasswordResetTokenUsed(id: string): Promise<void> {
  await prisma.passwordResetToken.update({
    where: { id },
    data: { usedAt: new Date() },
  });
}

