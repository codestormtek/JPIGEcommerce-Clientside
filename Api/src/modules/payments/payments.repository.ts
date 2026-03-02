import prisma from '../../lib/prisma';
import { ListPaymentsInput } from './payments.schema';

// ─── Shared include ───────────────────────────────────────────────────────────

const paymentInclude = {
  order: { select: { id: true, orderNumber: true } },
  paymentMethodToken: {
    select: { id: true, brand: true, last4: true, provider: true },
  },
} as const;

// ─── Payments (admin) ─────────────────────────────────────────────────────────

export async function findPayments(input: ListPaymentsInput) {
  const { page, limit, orderId, status, provider, from, to, orderBy, order } = input;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (orderId) where['orderId'] = orderId;
  if (status) where['status'] = status;
  if (provider) where['provider'] = { contains: provider, mode: 'insensitive' };
  if (from || to) {
    where['createdAt'] = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    };
  }

  const [data, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: paymentInclude,
      orderBy: { [orderBy]: order },
      skip,
      take: limit,
    }),
    prisma.payment.count({ where }),
  ]);

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function findPaymentById(id: string) {
  return prisma.payment.findUnique({ where: { id }, include: paymentInclude });
}

export async function capturePayment(id: string) {
  return prisma.payment.update({
    where: { id },
    data: { status: 'captured', capturedAt: new Date() },
    include: paymentInclude,
  });
}

export async function refundPayment(id: string) {
  return prisma.payment.update({
    where: { id },
    data: { status: 'refunded' },
    include: paymentInclude,
  });
}

// ─── Payment creation / lookup (used by orders service + webhook handlers) ────

export async function createPayment(data: {
  orderId: string;
  paymentMethodTokenId?: string;
  provider: string;
  amount: number;
  status: string;
  providerTxnId?: string;
  authorizedAt?: Date;
}) {
  return prisma.payment.create({
    data: {
      orderId: data.orderId,
      paymentMethodTokenId: data.paymentMethodTokenId ?? null,
      provider: data.provider,
      amount: data.amount,
      status: data.status,
      providerTxnId: data.providerTxnId ?? null,
      authorizedAt: data.authorizedAt ?? null,
    },
    include: paymentInclude,
  });
}

export async function findPaymentByProviderTxnId(providerTxnId: string) {
  return prisma.payment.findFirst({ where: { providerTxnId }, include: paymentInclude });
}

export async function updatePaymentStatus(id: string, status: string, extra?: { capturedAt?: Date }) {
  return prisma.payment.update({
    where: { id },
    data: { status, ...(extra ?? {}) },
    include: paymentInclude,
  });
}

