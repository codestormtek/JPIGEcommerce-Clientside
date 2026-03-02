import { Request } from 'express';
import prisma from '../lib/prisma';
import { logger } from './logger';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuditContext {
  actorId?: string;
  ip?: string;
  userAgent?: string;
}

export interface LogAuditInput {
  action: string;
  entityType?: string;
  entityId?: string;
  beforeJson?: object | null;
  afterJson?: object | null;
  ctx?: AuditContext;
}

// ─── Action constants ─────────────────────────────────────────────────────────

export const AuditAction = {
  // Auth
  USER_REGISTERED: 'USER_REGISTERED',
  USER_LOGGED_IN: 'USER_LOGGED_IN',
  USER_LOGGED_OUT: 'USER_LOGGED_OUT',
  USER_LOGGED_OUT_ALL: 'USER_LOGGED_OUT_ALL',
  PASSWORD_RESET: 'PASSWORD_RESET',
  PASSWORD_CHANGED: 'PASSWORD_CHANGED',

  // Users (admin)
  USER_UPDATED: 'USER_UPDATED',
  USER_DELETED: 'USER_DELETED',

  // Reviews (admin)
  REVIEW_APPROVED: 'REVIEW_APPROVED',
  REVIEW_DELETED: 'REVIEW_DELETED',

  // Orders
  ORDER_PLACED: 'ORDER_PLACED',
  ORDER_STATUS_CHANGED: 'ORDER_STATUS_CHANGED',

  // Products (admin)
  PRODUCT_CREATED: 'PRODUCT_CREATED',
  PRODUCT_UPDATED: 'PRODUCT_UPDATED',
  PRODUCT_DELETED: 'PRODUCT_DELETED',

  // Payments (admin)
  PAYMENT_CAPTURED: 'PAYMENT_CAPTURED',
  PAYMENT_REFUNDED: 'PAYMENT_REFUNDED',
  PAYMENT_FAILED: 'PAYMENT_FAILED',

  // Payment Method Tokens (user)
  PAYMENT_METHOD_ADDED: 'PAYMENT_METHOD_ADDED',
  PAYMENT_METHOD_REMOVED: 'PAYMENT_METHOD_REMOVED',

  // Shipments (admin)
  SHIPMENT_CREATED: 'SHIPMENT_CREATED',
  SHIPMENT_UPDATED: 'SHIPMENT_UPDATED',
  SHIPMENT_DELETED: 'SHIPMENT_DELETED',

  // Scheduled jobs (system)
  ORDER_AUTO_CANCELLED: 'ORDER_AUTO_CANCELLED',
  PRODUCT_ITEM_DISABLED: 'PRODUCT_ITEM_DISABLED',

  // Files
  FILE_UPLOADED: 'FILE_UPLOADED',
  FILE_DELETED: 'FILE_DELETED',

  // Exports
  EXPORT_REQUESTED: 'EXPORT_REQUESTED',
} as const;

// ─── Helper: build AuditContext from Express Request ─────────────────────────

export function ctxFromRequest(req: Request, actorId?: string): AuditContext {
  return {
    actorId,
    ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ?? req.ip,
    userAgent: req.headers['user-agent'],
  };
}

// ─── Fire-and-forget writer ───────────────────────────────────────────────────

/**
 * Writes an audit log entry. Never throws — a failure to log must never
 * break the primary request/response cycle.
 */
export function logAudit(input: LogAuditInput): void {
  const { action, entityType, entityId, beforeJson, afterJson, ctx } = input;

  prisma.auditLog
    .create({
      data: {
        action,
        entityType: entityType ?? null,
        entityId: entityId ?? null,
        beforeJson: beforeJson ? JSON.stringify(beforeJson) : null,
        afterJson: afterJson ? JSON.stringify(afterJson) : null,
        userId: ctx?.actorId ?? null,
        ip: ctx?.ip ?? null,
        userAgent: ctx?.userAgent ?? null,
      },
    })
    .catch((err: unknown) => {
      // Log to stderr but swallow — audit failure is non-fatal
      logger.error('Failed to write audit log', { action, entityType, entityId, err });
    });
}

