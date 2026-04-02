import { Request, Response } from 'express';
import { sendSuccess, sendNoContent } from '../../utils/apiResponse';
import { AuthRequest } from '../../types';
import { ctxFromRequest } from '../../utils/auditLogger';
import * as service from './auth.service';
import {
  RegisterInput,
  LoginInput,
  RefreshInput,
  LogoutInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  ChangePasswordInput,
} from './auth.schema';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function requestMeta(req: Request) {
  return {
    userAgent: req.headers['user-agent'],
    ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ?? req.ip,
  };
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

export async function register(req: Request, res: Response): Promise<void> {
  const input = req.body as RegisterInput;
  const result = await service.register(input, requestMeta(req));
  sendSuccess(
    res,
    { userId: result.userId, pending: true },
    'Account created successfully. Your account is pending admin approval — you will receive an email once it is activated.',
    201,
  );
}

export async function login(req: Request, res: Response): Promise<void> {
  const input = req.body as LoginInput;
  const result = await service.login(input, requestMeta(req));
  sendSuccess(res, {
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    userId: result.userId,
  });
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const input = req.body as RefreshInput;
  const tokens = await service.refreshTokens(input, requestMeta(req));
  sendSuccess(res, tokens);
}

export async function logout(req: Request, res: Response): Promise<void> {
  const input = req.body as LogoutInput;
  await service.logout(input, ctxFromRequest(req));
  sendNoContent(res);
}

export async function logoutAll(req: AuthRequest, res: Response): Promise<void> {
  await service.logoutAll(req.user!.sub, ctxFromRequest(req, req.user!.sub));
  sendNoContent(res);
}

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  const input = req.body as ForgotPasswordInput;
  const result = await service.forgotPassword(input);

  // In production the token is emailed — never expose it in the response.
  // During development we return it for convenience.
  const data =
    process.env.NODE_ENV !== 'production' && result.resetToken
      ? { message: 'Reset link sent (dev: token included)', resetToken: result.resetToken }
      : { message: 'If that email exists, a reset link has been sent' };

  sendSuccess(res, data);
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  const input = req.body as ResetPasswordInput;
  await service.resetPassword(input, ctxFromRequest(req));
  sendSuccess(res, null, 'Password has been reset. Please log in again.');
}

export async function changePassword(req: AuthRequest, res: Response): Promise<void> {
  const input = req.body as ChangePasswordInput;
  await service.changePassword(req.user!.sub, input, ctxFromRequest(req, req.user!.sub));
  sendNoContent(res);
}

export async function me(req: AuthRequest, res: Response): Promise<void> {
  const user = await service.getProfile(req.user!.sub);
  sendSuccess(res, user);
}

