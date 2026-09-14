const assert = require('node:assert/strict');
const test = require('node:test');

// This test executes the compiled service with every provider/database edge
// mocked. It is deliberately a no-network test: a "charge" is counted only
// by the idempotent provider double below.
const prisma = {
  shopOrder: { findFirst: async () => null },
  kioskDevice: { findUnique: async () => ({ squareTerminalDeviceId: 'reader-1' }) },
  siteUser: { findFirst: async () => ({ id: 'kiosk-user' }) },
  productCategory: { findFirst: async () => ({ id: 'sides' }) },
  productItem: { findMany: async () => [] },
  product: { findMany: async () => [] },
  payment: { update: async () => ({}), updateMany: async () => ({ count: 1 }) },
};
const gateway = {
  getActiveGateway: async () => 'square',
  createPayment: async () => { throw new Error('test did not configure provider'); },
  capturePayment: async () => ({ gateway: 'square', paymentId: 'unused', status: 'captured' }),
  getPayment: async () => ({ gateway: 'square', paymentId: 'unused', status: 'pending' }),
};

function mock(relativePath, exports) {
  const id = require.resolve(relativePath);
  require.cache[id] = { id, filename: id, loaded: true, exports };
}

mock('../dist/lib/prisma', { __esModule: true, default: prisma });
mock('../dist/lib/square', { getSquareClient: () => ({}) });
mock('../dist/config', { config: { bcrypt: { saltRounds: 1 }, square: { locationId: 'location-1' } } });
mock('../dist/utils/logger', { logger: { info() {}, warn() {}, error() {}, debug() {} } });
mock('../dist/services/paymentGateway', gateway);
mock('../dist/services/expoPushNotifications', { enqueueStaffOrderPush: async () => {} });
mock('../dist/modules/cloudprnt/cloudprnt.service', { enqueueCapturedOrderKitchenTickets: async () => {} });
mock('../dist/modules/kiosk/kiosk.middleware', { hashKioskToken: value => value, invalidateKioskDeviceCache() {} });
mock('../dist/modules/orders/orders.service', {
  checkout: async () => { throw new Error('checkout must not run for an existing request'); },
});

const { createKioskOrder } = require('../dist/modules/kiosk/kiosk.service');

test('lost card response retries the same durable attempt without another charge', async () => {
  const payment = { id: 'payment-1', provider: 'square', status: 'pending', providerTxnId: null };
  prisma.shopOrder.findFirst = async () => ({
    id: 'order-1',
    userId: 'kiosk-user',
    kioskOrderNumber: 'K-101',
    grandTotal: 14,
    currency: 'USD',
    orderStatus: { status: 'pending' },
    payments: [payment],
  });
  let providerRequests = 0;
  let charges = 0;
  const responses = new Map();
  gateway.createPayment = async request => {
    providerRequests += 1;
    if (!responses.has(request.idempotencyKey)) {
      charges += 1;
      responses.set(request.idempotencyKey, { gateway: 'square', paymentId: 'payment-at-square', status: 'captured' });
    }
    return responses.get(request.idempotencyKey);
  };
  prisma.payment.update = async ({ data }) => Object.assign(payment, data);

  const input = {
    paymentMethod: 'card',
    squareNonce: 'single-use-card-token',
    clientRequestId: 'ec9b5a30-0e7d-4e94-a35d-1a63f246bfca',
    customerName: 'Customer',
    lines: [{ productItemId: 'main', qty: 1 }],
  };
  const [first, second] = await Promise.all([
    createKioskOrder('kiosk-1', input),
    createKioskOrder('kiosk-1', input),
  ]);

  assert.equal(first.paymentStatus, 'paid');
  assert.equal(second.paymentStatus, 'paid');
  assert.equal(charges, 1, 'provider idempotency permits exactly one charge');
  assert.equal(providerRequests, 2, 'both lost-response retries used the same provider attempt');
});