const assert = require('node:assert/strict');
const test = require('node:test');

const refund = {
  id: 'refund-1',
  paymentId: 'payment-1',
  provider: 'square',
  providerRefundId: null,
  providerStatus: 'PENDING',
  localFinalizedAt: null,
  amountCents: 1000,
  currency: 'USD',
  reason: 'Customer request',
  idempotencyRequestId: 'request-1',
  restoreInventory: false,
  actorAdminId: 'admin-1',
  payment: {
    id: 'payment-1',
    orderId: 'order-1',
    providerTxnId: 'square-payment-1',
    amount: 10,
    status: 'captured',
    order: { orderStatusId: 'captured-status' },
  },
};
let failLocalFinalization = true;
let squareRefundCalls = 0;

const prisma = {
  $transaction: async fn => fn(tx),
  paymentRefund: {
    findUnique: async () => refund,
    update: async ({ data }) => Object.assign(refund, data),
    aggregate: async () => ({ _sum: { amountCents: 1000 } }),
  },
};
const tx = {
  $executeRaw: async () => {},
  paymentRefund: prisma.paymentRefund,
  payment: {
    update: async ({ data }) => Object.assign(refund.payment, data),
  },
  orderStatus: {
    findFirst: async () => failLocalFinalization ? null : { id: 'refunded-status' },
  },
  shopOrder: { update: async () => ({}) },
  orderStatusHistory: { create: async () => ({}) },
  auditLog: { create: async () => ({}) },
  inventoryReconciliation: { findUnique: async () => null },
};

function mock(relativePath, exports) {
  const id = require.resolve(relativePath);
  require.cache[id] = { id, filename: id, loaded: true, exports };
}

mock('../dist/lib/prisma', { __esModule: true, default: prisma });
mock('../dist/utils/logger', { logger: { info() {}, warn() {}, error() {}, debug() {} } });
mock('../dist/utils/auditLogger', {
  AuditAction: {
    PAYMENT_CAPTURED: 'PAYMENT_CAPTURED',
    PAYMENT_REFUNDED: 'PAYMENT_REFUNDED',
    PAYMENT_REFUND_REQUESTED: 'PAYMENT_REFUND_REQUESTED',
    PAYMENT_CANCELED: 'PAYMENT_CANCELED',
  },
  logAudit() {},
});
mock('../dist/modules/payments/payments.repository', {});
mock('../dist/services/paymentGateway', {});
mock('../dist/lib/square', { getSquareClient: () => ({}) });
mock('../dist/services/squareService', {
  refundPayment: async () => {
    squareRefundCalls += 1;
    return { refundId: 'square-refund-1', status: 'COMPLETED' };
  },
  getRefund: async () => assert.fail('a provider-completed refund must be locally repaired without another Square read'),
});
mock('../dist/services/orderInventoryRestoration', { restoreOrderInventoryOnceTx: async () => false });
mock('../dist/services/kioskTerminalReconciliation', { reconcileCompletedKioskTerminalPayment: async () => {} });
mock('../dist/services/expoPushNotifications', { enqueueStaffOrderPush: async () => {} });

const { reconcilePendingSquareRefund } = require('../dist/modules/payments/payments.service');

test('a completed refund left unfinalized by a local failure is repaired without another Square request', async () => {
  await assert.rejects(
    () => reconcilePendingSquareRefund(refund.id),
    /refunded order status is not configured/i,
  );
  assert.equal(refund.providerStatus, 'COMPLETED');
  assert.equal(refund.providerRefundId, 'square-refund-1');
  assert.equal(refund.localFinalizedAt, null);
  assert.equal(squareRefundCalls, 1);

  failLocalFinalization = false;
  await reconcilePendingSquareRefund(refund.id);

  assert.equal(refund.payment.status, 'refunded');
  assert.ok(refund.localFinalizedAt instanceof Date);
  assert.equal(squareRefundCalls, 1, 'replay must finalize the durable provider result, not reissue it');
});