const assert = require('node:assert/strict');
const test = require('node:test');

const order = {
  id: 'pickup-order-1',
  grandTotal: 12,
  currency: 'USD',
  kioskOrderNumber: 'P-101',
  orderStatus: { status: 'pending' },
  lines: [{ productNameSnapshot: 'Plate', qty: 1, lineTotal: 12, sideSelectionsText: null }],
  payments: [{ id: 'pickup-payment-1', status: 'pending', providerTxnId: null, createdAt: new Date(), capturedAt: null }],
};
let restoreCalls = 0;
let squareCreate;
const prisma = {
  siteUser: { findFirst: async () => ({ id: 'pickup-user' }) },
  shopOrder: {
    findUnique: async ({ where }) => where.remotePickupRequestId ? null : order,
  },
  payment: {
    update: async () => ({}),
    updateMany: async ({ where, data }) => {
      if (where.status && order.payments[0].status !== where.status) return { count: 0 };
      Object.assign(order.payments[0], data);
      return { count: 1 };
    },
  },
  $transaction: async fn => fn({
    $executeRaw: async () => {},
    shopOrder: { findUnique: async () => order, update: async () => ({}) },
    payment: {
      updateMany: async ({ where, data }) => {
        if (where.status && order.payments[0].status !== where.status) return { count: 0 };
        Object.assign(order.payments[0], data);
        return { count: 1 };
      },
    },
    orderStatus: { findFirst: async () => ({ id: 'cancelled-status' }) },
    orderStatusHistory: { create: async () => ({}) },
  }),
};

function mock(relativePath, exports) {
  const id = require.resolve(relativePath);
  require.cache[id] = { id, filename: id, loaded: true, exports };
}

mock('../dist/lib/prisma', { __esModule: true, default: prisma });
mock('../dist/config', {
  config: {
    bcrypt: { saltRounds: 1 },
    jwt: { secret: 'test-secret' },
    square: { accessToken: 'token', applicationId: 'app', locationId: 'location', environment: 'sandbox' },
  },
});
mock('../dist/utils/logger', { logger: { info() {}, warn() {}, error() {}, debug() {} } });
mock('../dist/lib/phone', { normalizePhone: value => value });
mock('../dist/lib/square', { getSquareClient: () => ({ payments: { list: async () => ({ payments: [] }) } }) });
mock('../dist/services/squareService', {
  createPayment: (...args) => squareCreate(...args),
  getPayment: async () => ({ status: 'PENDING' }),
});
mock('../dist/services/orderInventoryRestoration', {
  restoreOrderInventoryOnceTx: async () => { restoreCalls += 1; return restoreCalls === 1; },
});
mock('../dist/services/expoPushNotifications', { enqueueStaffOrderPush: async () => {} });
mock('../dist/modules/cloudprnt/cloudprnt.service', { enqueueCapturedOrderKitchenTickets: async () => {} });
mock('../dist/modules/kiosk/kiosk.service', {
  getKioskMenu: async () => ({
    categories: [], products: [{ id: 'plate', items: [{ id: 'item-1' }], categoryIds: [] }],
  }),
  resolveComboSides: async lines => lines,
});
mock('../dist/modules/site-settings/site-settings.repository', {
  findByKey: async () => ({ settingValue: JSON.stringify({
    isOrderingOpen: true, eventName: 'Event', streetAddress: '1 Main',
    asapWaitMinutes: 20, menuProductIds: ['plate'], taxRatePercent: 0,
  }) }),
});
mock('../dist/modules/orders/orders.repository', {
  placeOrder: async () => order,
});

const { createPickupOrder, recoverPickupOrderAttempt } = require('../dist/modules/pickup/pickup.service');
delete require.cache[require.resolve('../dist/services/orderInventoryRestoration')];
const { restoreOrderInventoryOnceTx } = require('../dist/services/orderInventoryRestoration');
const input = {
  clientRequestId: '8083c231-4181-4f4b-8b23-1e92fa6d4800',
  customerName: 'Customer', customerPhone: '5555550100', squareNonce: 'fresh-nonce',
  source: 'remote', lines: [{ productItemId: 'item-1', qty: 1 }],
};

test('public Square definitive decline terminally restores the durable reservation once', async () => {
  restoreCalls = 0;
  order.payments[0] = { id: 'pickup-payment-1', status: 'pending', providerTxnId: null, createdAt: new Date(), capturedAt: null };
  squareCreate = async () => ({ paymentId: 'square-declined', status: 'FAILED' });

  const result = await createPickupOrder(input);

  assert.equal(result.paymentStatus, 'canceled');
  assert.equal(order.payments[0].status, 'failed');
  assert.equal(restoreCalls, 1);
});

test('a thrown definitive Square decline is failed/restocked, unlike a transport error', async () => {
  restoreCalls = 0;
  order.payments[0] = { id: 'pickup-payment-1', status: 'pending', providerTxnId: null, createdAt: new Date(), capturedAt: null };
  squareCreate = async () => {
    const error = new Error('card declined');
    error.code = 'CARD_DECLINED';
    throw error;
  };

  const result = await createPickupOrder(input);

  assert.equal(result.paymentStatus, 'canceled');
  assert.equal(order.payments[0].status, 'failed');
  assert.equal(restoreCalls, 1);
});

test('public lost response remains recoverable and only enables same-ID fresh-nonce replay after definitive empty lookup', async () => {
  order.payments[0] = { id: 'pickup-payment-1', status: 'pending', providerTxnId: null, createdAt: new Date(), capturedAt: null };
  prisma.shopOrder.findUnique = async () => order;

  const first = await recoverPickupOrderAttempt(input.clientRequestId);
  const second = await recoverPickupOrderAttempt(input.clientRequestId);

  assert.equal(first.found, true);
  assert.equal(first.canReplay, true);
  assert.equal(second.canReplay, true, 'subsequent browser polling observes the same persisted attempt');
});

test('durable reservation ledger restores main and combo-side SKU quantities exactly once', async () => {
  const increments = [];
  const tx = {
    $executeRaw: async () => {},
    inventoryRestoration: {
      findUnique: async () => null,
      create: async () => ({}),
    },
    shopOrder: {
      findUnique: async () => ({
        inventoryReservationJson: [
          { productItemId: 'main-sku', qty: 1 },
          { productItemId: 'combo-side-sku', qty: 2 },
        ],
      }),
    },
    orderLine: { findMany: async () => assert.fail('ledger-backed orders must not infer side stock from lines') },
    productItem: { update: async ({ where, data }) => increments.push([where.id, data.qtyInStock.increment]) },
  };
  const restored = await restoreOrderInventoryOnceTx(tx, 'pickup-order-1', { trigger: 'kiosk_void' });

  assert.equal(restored, true);
  assert.deepEqual(increments, [['main-sku', 1], ['combo-side-sku', 2]]);
});