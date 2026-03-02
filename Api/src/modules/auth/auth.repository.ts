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
    },
  });
}

export async function updateUserPassword(userId: string, passwordHash: string): Promise<void> {
  await prisma.siteUser.update({
    where: { id: userId },
    data: { passwordHash, lastModifiedAt: new Date() },
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

