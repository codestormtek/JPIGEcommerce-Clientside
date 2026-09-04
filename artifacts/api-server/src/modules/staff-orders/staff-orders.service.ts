import prisma from '../../lib/prisma';
import { ApiError } from '../../utils/apiError';
import { AuditAction, AuditContext, logAudit } from '../../utils/auditLogger';
import { enqueueStaffOrderPush } from '../../services/expoPushNotifications';
import { logger } from '../../utils/logger';
import {
  RegisterPushTokenInput,
  StaffOrderListInput,
  UpdatePushTokenInput,
} from './staff-orders.schema';

const paidStatuses = ['captured', 'partially_refunded'];
const activeDatabaseStatuses = ['pending', 'confirmed', 'processing', 'ready_to_ship'];

const staffOrderInclude = {
  user: { select: { firstName: true, lastName: true, emailAddress: true } },
  orderStatus: { select: { status: true } },
  addresses: true,
  lines: {
    include: {
      options: { include: { variationOption: { select: { value: true } } } },
      menuOptions: { include: { menuOption: { select: { name: true } } } },
    },
  },
  payments: {
    where: { status: { in: paidStatuses } },
    orderBy: { capturedAt: 'desc' as const },
  },
  statusHistory: {
    include: { newStatus: true, changedByUser: { select: { firstName: true, lastName: true } } },
    orderBy: { changedAt: 'desc' as const },
  },
} as const;

function displayStatus(status: string): 'new' | 'processing' | 'ready' | 'picked_up' {
  if (status === 'processing') return 'processing';
  if (status === 'ready_to_ship') return 'ready';
  if (status === 'delivered') return 'picked_up';
  return 'new';
}

function databaseStatuses(status?: StaffOrderListInput['status']): string[] {
  if (status === 'new') return ['pending', 'confirmed'];
  if (status === 'processing') return ['processing'];
  if (status === 'ready') return ['ready_to_ship'];
  if (status === 'picked_up') return ['delivered'];
  return activeDatabaseStatuses;
}

function orderDto(order: any) {
  const billing = order.addresses.find((address: any) => address.addressType === 'billing');
  const payment = order.payments[0];
  if (!payment) throw ApiError.conflict('Order no longer has an actionable payment');
  const customerName = billing?.fullName
    ?? ([order.user.firstName, order.user.lastName].filter(Boolean).join(' ') || null);
  return {
    id: order.id,
    orderNumber: order.kioskOrderNumber,
    customerName,
    customerPhone: billing?.phone ?? null,
    customerEmail: billing?.email ?? order.user.emailAddress ?? null,
    status: displayStatus(order.orderStatus.status),
    databaseStatus: order.orderStatus.status,
    orderDate: order.orderDate,
    specialInstructions: order.specialInstructions,
    total: { amountCents: Math.round(Number(order.grandTotal) * 100), currency: order.currency },
    items: order.lines.map((line: any) => ({
      id: line.id,
      productName: line.productNameSnapshot,
      sku: line.skuSnapshot,
      quantity: line.qty,
      unitPrice: { amountCents: Math.round(Number(line.unitPriceSnapshot) * 100), currency: order.currency },
      lineTotal: { amountCents: Math.round(Number(line.lineTotal) * 100), currency: order.currency },
      selectedSides: line.sideSelectionsText,
      options: [
        ...line.options.map((option: any) => option.variationOption.value),
        ...line.menuOptions.map((option: any) => option.menuOption.name),
      ],
    })),
    payment: {
      id: payment.id,
      provider: payment.provider,
      status: payment.status,
      amount: { amountCents: Math.round(Number(payment.amount) * 100), currency: order.currency },
      capturedAt: payment.capturedAt,
    },
    history: order.statusHistory.map((history: any) => ({
      id: history.id,
      status: history.newStatus.status,
      displayStatus: displayStatus(history.newStatus.status),
      changedAt: history.changedAt,
      changedBy: history.changedByUser
        ? [history.changedByUser.firstName, history.changedByUser.lastName].filter(Boolean).join(' ') || null
        : null,
    })),
  };
}

const actionableWhere = {
  orderType: 'kiosk',
  payments: { some: { status: { in: paidStatuses } } },
};

export async function listStaffOrders(input: StaffOrderListInput) {
  const where = {
    ...actionableWhere,
    orderStatus: { status: { in: databaseStatuses(input.status) } },
    ...(input.search ? {
      OR: [
        { kioskOrderNumber: { contains: input.search, mode: 'insensitive' as const } },
        { addresses: { some: { fullName: { contains: input.search, mode: 'insensitive' as const } } } },
      ],
    } : {}),
  };
  const [orders, total] = await Promise.all([
    prisma.shopOrder.findMany({
      where,
      include: staffOrderInclude,
      orderBy: { orderDate: 'asc' },
      skip: (input.page - 1) * input.limit,
      take: input.limit,
    }),
    prisma.shopOrder.count({ where }),
  ]);
  return {
    data: orders.map(orderDto),
    total,
    page: input.page,
    limit: input.limit,
    totalPages: Math.ceil(total / input.limit),
  };
}

export async function getStaffOrder(orderId: string) {
  const order = await prisma.shopOrder.findFirst({
    where: { id: orderId, ...actionableWhere },
    include: staffOrderInclude,
  });
  if (!order) throw ApiError.notFound('Paid kiosk order');
  return orderDto(order);
}

export async function getStaffOrderDashboard() {
  const counts = await prisma.shopOrder.groupBy({
    by: ['orderStatusId'],
    where: { ...actionableWhere, orderStatus: { status: { in: activeDatabaseStatuses } } },
    _count: { _all: true },
  });
  const statuses = await prisma.orderStatus.findMany({
    where: { id: { in: counts.map((count) => count.orderStatusId) } },
    select: { id: true, status: true },
  });
  const countByStatus = new Map(counts.map((count) => [count.orderStatusId, count._count._all]));
  const get = (...names: string[]) => statuses
    .filter((status) => names.includes(status.status))
    .reduce((sum, status) => sum + (countByStatus.get(status.id) ?? 0), 0);
  const newCount = get('pending', 'confirmed');
  const processingCount = get('processing');
  const readyCount = get('ready_to_ship');
  return { newCount, processingCount, readyCount, activeCount: newCount + processingCount + readyCount };
}

const transitions = {
  processing: { allowed: ['pending', 'confirmed'], eventType: null },
  ready_to_ship: { allowed: ['processing'], eventType: 'kiosk_order_ready' as const },
  delivered: { allowed: ['ready_to_ship'], eventType: null },
};

export async function transitionStaffOrder(
  orderId: string,
  target: keyof typeof transitions,
  adminId: string,
  ctx?: AuditContext,
) {
  const result = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`staff_order:${orderId}`}))`;
    const order = await tx.shopOrder.findUnique({
      where: { id: orderId },
      include: { orderStatus: true },
    });
    if (!order || order.orderType !== 'kiosk') throw ApiError.notFound('Kiosk order');
    const paid = await tx.payment.findFirst({
      where: { orderId, status: { in: paidStatuses } },
      select: { id: true },
    });
    if (!paid) throw ApiError.conflict('Only captured or partially refunded orders are actionable');
    if (order.orderStatus.status === target) return { changed: false, previous: target };
    if (!transitions[target].allowed.includes(order.orderStatus.status)) {
      throw ApiError.conflict(`Cannot move order from "${order.orderStatus.status}" to "${target}"`);
    }
    const targetStatus = await tx.orderStatus.findUnique({ where: { status: target } });
    if (!targetStatus) throw ApiError.internal(`Order status "${target}" is not configured`);
    const updated = await tx.shopOrder.updateMany({
      where: { id: orderId, orderStatusId: order.orderStatusId },
      data: { orderStatusId: targetStatus.id },
    });
    if (updated.count !== 1) throw ApiError.conflict('Order status changed concurrently; refresh and retry');
    await tx.orderStatusHistory.create({
      data: {
        orderId,
        oldStatusId: order.orderStatusId,
        newStatusId: targetStatus.id,
        changedAt: new Date(),
        changedByUserId: adminId,
      },
    });
    return { changed: true, previous: order.orderStatus.status };
  });

  if (result.changed) {
    logAudit({
      action: AuditAction.ORDER_STATUS_CHANGED,
      entityType: 'Order',
      entityId: orderId,
      beforeJson: { status: result.previous },
      afterJson: { status: target },
      ctx: { ...ctx, actorId: adminId },
    });
  }
  const eventType = transitions[target].eventType;
  if (eventType) {
    enqueueStaffOrderPush(orderId, eventType).catch((error) =>
      logger.warn('Failed to enqueue staff order push', { orderId, eventType, error }),
    );
  }
  return getStaffOrder(orderId);
}

export async function registerPushToken(adminId: string, input: RegisterPushTokenInput) {
  return prisma.expoPushToken.upsert({
    where: { token: input.token },
    create: { userId: adminId, ...input },
    update: { userId: adminId, rolePreference: input.rolePreference, enabled: input.enabled },
  });
}

export async function updatePushToken(adminId: string, tokenId: string, input: UpdatePushTokenInput) {
  const result = await prisma.expoPushToken.updateMany({
    where: { id: tokenId, userId: adminId },
    data: input,
  });
  if (!result.count) throw ApiError.notFound('Push token');
  return prisma.expoPushToken.findUniqueOrThrow({ where: { id: tokenId } });
}

export async function deletePushToken(adminId: string, tokenId: string) {
  const result = await prisma.expoPushToken.deleteMany({ where: { id: tokenId, userId: adminId } });
  if (!result.count) throw ApiError.notFound('Push token');
}