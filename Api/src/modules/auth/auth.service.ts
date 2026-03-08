import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../../config';
import { ApiError } from '../../utils/apiError';
import { logger } from '../../utils/logger';
import { JwtPayload, UserRole } from '../../types';
import {
  RegisterInput,
  LoginInput,
  RefreshInput,
  LogoutInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  ChangePasswordInput,
} from './auth.schema';
import * as repo from './auth.repository';
import { AuditContext, AuditAction, logAudit } from '../../utils/auditLogger';
import { sendWelcomeEmail, sendAdminNewUserNotification } from '../../lib/registrationEmails';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Generates a cryptographically random opaque token and its SHA-256 hash. */
function generateOpaqueToken(): { raw: string; hash: string } {
  const raw = crypto.randomBytes(40).toString('hex');
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  return { raw, hash };
}

function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function signAccessToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.accessExpiresIn as jwt.SignOptions['expiresIn'],
  });
}

function refreshExpiryDate(): Date {
  // Parse "7d", "30d", "1h" etc. — default 7 days
  const raw = config.jwt.refreshExpiresIn;
  const match = /^(\d+)([smhd])$/.exec(raw);
  const ms = match
    ? parseInt(match[1]) *
      ({ s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 } as Record<string, number>)[match[2]]
    : 7 * 86_400_000;
  return new Date(Date.now() + ms);
}

// ─── Service Methods ──────────────────────────────────────────────────────────

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export async function register(
  input: RegisterInput,
  meta?: { userAgent?: string; ipAddress?: string },
): Promise<AuthTokens & { userId: string }> {
  const existing = await repo.findUserByEmail(input.emailAddress);
  if (existing) throw ApiError.conflict('An account with this email already exists');

  const passwordHash = await bcrypt.hash(input.password, config.bcrypt.saltRounds);
  const user = await repo.createUser({
    firstName: input.firstName,
    lastName: input.lastName,
    emailAddress: input.emailAddress,
    passwordHash,
    phoneNumber: input.phoneNumber,
  });

  const tokens = await _issueTokens(user.id, user.role as UserRole, meta);
  logger.info('User registered', { userId: user.id });
  logAudit({
    action: AuditAction.USER_REGISTERED,
    entityType: 'SiteUser',
    entityId: user.id,
    ctx: { actorId: user.id, ip: meta?.ipAddress, userAgent: meta?.userAgent },
  });

  const emailUser = {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    emailAddress: user.emailAddress,
    phoneNumber: (user as Record<string, unknown>).phoneNumber as string | null | undefined,
    createdAt: user.createdAt,
  };
  sendWelcomeEmail(emailUser).catch(() => {});
  sendAdminNewUserNotification(emailUser).catch(() => {});

  return { ...tokens, userId: user.id };
}

export async function login(
  input: LoginInput,
  meta?: { userAgent?: string; ipAddress?: string },
): Promise<AuthTokens & { userId: string }> {
  const user = await repo.findUserByEmail(input.emailAddress);
  if (!user || !user.isActive) throw ApiError.unauthorized('Invalid email or password');

  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) throw ApiError.unauthorized('Invalid email or password');

  const tokens = await _issueTokens(user.id, user.role as UserRole, meta);
  logger.info('User logged in', { userId: user.id });
  logAudit({
    action: AuditAction.USER_LOGGED_IN,
    entityType: 'SiteUser',
    entityId: user.id,
    ctx: { actorId: user.id, ip: meta?.ipAddress, userAgent: meta?.userAgent },
  });
  return { ...tokens, userId: user.id };
}

export async function refreshTokens(
  input: RefreshInput,
  meta?: { userAgent?: string; ipAddress?: string },
): Promise<AuthTokens> {
  const tokenHash = hashToken(input.refreshToken);
  const stored = await repo.findRefreshToken(tokenHash);

  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }

  // Revoke the used token (rotation — one-time use)
  await repo.revokeRefreshToken(tokenHash);

  return _issueTokens(stored.userId, stored.user.role as UserRole, meta);
}

export async function logout(input: LogoutInput, ctx?: AuditContext): Promise<void> {
  const tokenHash = hashToken(input.refreshToken);
  await repo.revokeRefreshToken(tokenHash);
  logAudit({ action: AuditAction.USER_LOGGED_OUT, entityType: 'SiteUser', ctx });
}

export async function logoutAll(userId: string, ctx?: AuditContext): Promise<void> {
  await repo.revokeAllUserRefreshTokens(userId);
  logAudit({
    action: AuditAction.USER_LOGGED_OUT_ALL,
    entityType: 'SiteUser',
    entityId: userId,
    ctx: { ...ctx, actorId: userId },
  });
}

export async function forgotPassword(input: ForgotPasswordInput): Promise<{ resetToken: string }> {
  const user = await repo.findUserByEmail(input.emailAddress);
  // Always respond the same way to prevent email enumeration
  if (!user || !user.isActive) {
    return { resetToken: '' };
  }

  const { raw, hash } = generateOpaqueToken();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await repo.createPasswordResetToken({ userId: user.id, tokenHash: hash, expiresAt });

  // TODO: replace with real email service call
  logger.info('Password reset token generated', { userId: user.id, expiresAt });

  return { resetToken: raw }; // In production this would be emailed, not returned
}

export async function resetPassword(input: ResetPasswordInput, ctx?: AuditContext): Promise<void> {
  const tokenHash = hashToken(input.token);
  const stored = await repo.findPasswordResetToken(tokenHash);

  if (!stored || stored.usedAt || stored.expiresAt < new Date()) {
    throw ApiError.badRequest('Invalid or expired reset token');
  }

  const passwordHash = await bcrypt.hash(input.password, config.bcrypt.saltRounds);
  await repo.updateUserPassword(stored.userId, passwordHash);
  await repo.markPasswordResetTokenUsed(stored.id);
  // Revoke all active sessions after password change
  await repo.revokeAllUserRefreshTokens(stored.userId);

  logger.info('Password reset successful', { userId: stored.userId });
  logAudit({
    action: AuditAction.PASSWORD_RESET,
    entityType: 'SiteUser',
    entityId: stored.userId,
    ctx: { ...ctx, actorId: stored.userId },
  });
}

export async function changePassword(
  userId: string,
  input: ChangePasswordInput,
  ctx?: AuditContext,
): Promise<void> {
  const user = await repo.findUserById(userId);
  if (!user) throw ApiError.notFound('User');

  const valid = await bcrypt.compare(input.currentPassword, user.passwordHash);
  if (!valid) throw ApiError.badRequest('Current password is incorrect');

  const passwordHash = await bcrypt.hash(input.newPassword, config.bcrypt.saltRounds);
  await repo.updateUserPassword(userId, passwordHash);
  await repo.revokeAllUserRefreshTokens(userId);

  logger.info('Password changed', { userId });
  logAudit({
    action: AuditAction.PASSWORD_CHANGED,
    entityType: 'SiteUser',
    entityId: userId,
    ctx: { ...ctx, actorId: userId },
  });
}

export async function getProfile(userId: string) {
  const user = await repo.findUserById(userId);
  if (!user) throw ApiError.notFound('User');
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    emailAddress: user.emailAddress,
    phoneNumber: (user as Record<string, unknown>).phoneNumber as string | null,
    avatarUrl: (user as Record<string, unknown>).avatarUrl as string | null,
    role: user.role,
  };
}

// ─── Private ──────────────────────────────────────────────────────────────────

async function _issueTokens(
  userId: string,
  role: UserRole,
  meta?: { userAgent?: string; ipAddress?: string },
): Promise<AuthTokens> {
  // We need the email for the JWT — fetch minimal user
  const user = await repo.findUserById(userId);
  if (!user) throw ApiError.internal('User not found during token issuance');

  const payload: JwtPayload = { sub: userId, email: user.emailAddress, role };
  const accessToken = signAccessToken(payload);

  const { raw, hash } = generateOpaqueToken();
  await repo.createRefreshToken({
    userId,
    tokenHash: hash,
    expiresAt: refreshExpiryDate(),
    userAgent: meta?.userAgent,
    ipAddress: meta?.ipAddress,
  });

  return { accessToken, refreshToken: raw };
}

