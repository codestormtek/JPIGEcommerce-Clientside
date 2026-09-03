const assert = require('node:assert/strict');
const { beforeEach, test } = require('node:test');

const prisma = {
  shopOrder: { findFirst: async () => null },
  kioskDevice: { findUnique: async () => ({ squareTerminalDeviceId: 'terminal-device-1' }) },
  siteUser: { findFirst: async () => ({ id: 'kiosk-user' }) },
  productCategory: { findFirst: async () => ({ id: 'sides-category' }) },
  productItem: { findMany: async () => [] },
  product: { findMany: async () => [] },
  payment: {
    create: async () => ({ id: 'payment-1' }),
    update: async () => ({}),
    updateMany: async () => ({ count: 1 }),
    findFirst: async () => null,
  },
};

const square = {
  orders: { create: async () => ({}) },
  terminal: {
    checkouts: {
      create: async () => ({}),
      search: async () => ({ checkouts: [] }),
      get: async () => ({}),
    },
  },
};

let checkoutCalls = [];
const checkout = async (_userId, input) => {
  checkoutCalls.push(input);
  return {
    id: 'local-order-1',
    kioskOrderNumber: 'K-007',
    grandTotal: 27.5,
    lines: [
      {
        productNameSnapshot: 'Jiggling Pig Combo',
        qty: 2,
        unitPriceSnapshot: 12.5,
        lineTotal: 25,
        sideSelectionsText: 'Mac & Cheese, Collard Greens',
      },
    ],
  };
};

function mockModule(relativePath, exports) {
  const id = require.resolve(relativePath);
  require.cache[id] = { id, filename: id, loaded: true, exports };
}

mockModule('../src/lib/prisma', { __esModule: true, default: prisma });
mockModule('../src/lib/square', { getSquareClient: () => square });
mockModule('../src/modules/orders/orders.service', { checkout });
mockModule('../src/modules/kiosk/kiosk.middleware', {
  hashKioskToken: (value) => value,
  invalidateKioskDeviceCache: () => {},
});
mockModule('../src/config', {
  config: {
    bcrypt: { saltRounds: 1 },
    square: { locationId: 'location-1' },
  },
});
mockModule('../src/utils/logger', {
  logger: { info: () => {}, warn: () => {}, error: () => {} },
});

const {
  cancelKioskPayment,
  createKioskOrder,
  getKioskPaymentStatus,
} = require('../src/modules/kiosk/kiosk.service');

const input = {
  paymentMethod: 'terminal',
  clientRequestId: 'client-attempt-1',
  customerName: 'Pat Customer',
  customerPhone: '(555) 123-4567',
  specialInstructions: 'Pickup at 6',
  lines: [{ productItemId: 'combo-item', qty: 2, sideProductIds: ['mac', 'greens'] }],
};

beforeEach(() => {
  checkoutCalls = [];
  prisma.shopOrder.findFirst = async () => null;
  prisma.productItem.findMany = async () => [{
    id: 'combo-item',
    product: {
      name: 'Jiggling Pig Combo',
      comboSideCount: 2,
      comboSideCategoryId: 'sides-category',
      categoryMaps: [],
    },
  }];
  prisma.product.findMany = async () => [
    { id: 'mac', name: 'Mac & Cheese', duplicateSideUpcharge: 0, categoryMaps: [{ categoryId: 'sides-category' }] },
    { id: 'greens', name: 'Collard Greens', duplicateSideUpcharge: 0, categoryMaps: [{ categoryId: 'sides-category' }] },
  ];
  prisma.payment.create = async () => ({ id: 'payment-1' });
  prisma.payment.update = async () => ({});
});

test('sends itemized pickup details and the exact local total to Square', async () => {
  let orderRequest;
  let terminalRequest;
  square.orders.create = async (request) => {
    orderRequest = request;
    return { order: { id: 'square-order-1', totalMoney: { amount: 2750n } } };
  };
  square.terminal.checkouts.create = async (request) => {
    terminalRequest = request;
    return { checkout: { id: 'terminal-checkout-1' } };
  };

  const result = await createKioskOrder('kiosk-device-1', input);

  assert.equal(checkoutCalls.length, 1);
  assert.deepEqual(checkoutCalls[0].lines, [{
    productItemId: 'combo-item',
    qty: 2,
    sidesText: 'Mac & Cheese, Collard Greens',
  }]);
  assert.equal(checkoutCalls[0].addresses[0].addressType, 'billing');
  assert.equal(checkoutCalls[0].addresses[0].fullName, 'Pat Customer');
  assert.equal(checkoutCalls[0].addresses[0].phone, '(555) 123-4567');
  assert.equal(checkoutCalls[0].addresses[0].addressLine1, 'In-Store Kiosk Order');
  assert.deepEqual(orderRequest.order.lineItems, [
    {
      name: 'Jiggling Pig Combo',
      quantity: '2',
      note: 'Mac & Cheese, Collard Greens',
      basePriceMoney: { amount: 1250n, currency: 'USD' },
    },
    {
      name: 'Tax and adjustments',
      quantity: '1',
      note: undefined,
      basePriceMoney: { amount: 250n, currency: 'USD' },
    },
  ]);
  assert.deepEqual(orderRequest.order.fulfillments[0].pickupDetails.recipient, {
    displayName: 'Pat Customer',
    phoneNumber: '+15551234567',
  });
  assert.equal(terminalRequest.checkout.amountMoney.amount, 2750n);
  assert.equal(terminalRequest.checkout.orderId, 'square-order-1');
  assert.equal(result.terminalCheckoutId, 'terminal-checkout-1');
});

test('reuses an existing local and Square attempt for a duplicate client request ID', async () => {
  prisma.shopOrder.findFirst = async (query) => {
    assert.deepEqual(query.where, {
      kioskDeviceId: 'kiosk-device-1',
      kioskRequestId: 'client-attempt-1',
    });
    return {
      id: 'existing-order',
      kioskOrderNumber: 'K-006',
      grandTotal: 18,
      payments: [{ status: 'pending', providerTxnId: 'checkout:existing-checkout' }],
    };
  };
  square.orders.create = async () => assert.fail('Square order must not be recreated');
  square.terminal.checkouts.create = async () => assert.fail('Terminal checkout must not be recreated');

  const result = await createKioskOrder('kiosk-device-1', input);

  assert.equal(checkoutCalls.length, 0);
  assert.deepEqual(result, {
    orderId: 'existing-order',
    kioskOrderNumber: 'K-006',
    grandTotal: 18,
    paymentStatus: 'pending',
    terminalCheckoutId: 'existing-checkout',
  });
});

test('retries a lost Terminal response with the same durable Square request ID', async () => {
  square.orders.create = async () => ({
    order: { id: 'square-order-1', totalMoney: { amount: 2750n } },
  });
  const requests = [];
  square.terminal.checkouts.create = async (request) => {
    requests.push(request);
    if (requests.length === 1) throw new Error('connection reset after send');
    return { checkout: { id: 'recovered-checkout' } };
  };

  const result = await createKioskOrder('kiosk-device-1', input);

  assert.equal(requests.length, 2);
  assert.equal(requests[0].idempotencyKey, 'sqc-local-order-1');
  assert.equal(requests[1].idempotencyKey, requests[0].idempotencyKey);
  assert.equal(result.terminalCheckoutId, 'recovered-checkout');
});

test('recovers a Terminal checkout by Square order after both create responses are lost', async () => {
  const createdAt = new Date('2026-09-03T12:00:00.000Z');
  prisma.shopOrder.findFirst = async () => ({ id: 'local-order-1' });
  prisma.payment.findFirst = async () => ({
    id: 'payment-1',
    status: 'pending',
    providerTxnId: 'order:square-order-1',
    createdAt,
  });
  let persisted;
  prisma.payment.update = async (request) => {
    persisted = request;
    return {};
  };
  square.terminal.checkouts.search = async (request) => {
    assert.equal(request.query.filter.deviceId, 'terminal-device-1');
    assert.notEqual(request.query.filter.deviceId, 'kiosk-device-1');
    assert.equal(request.query.filter.createdAt.startAt, '2026-09-03T11:55:00.000Z');
    return { checkouts: [{ id: 'found-checkout', orderId: 'square-order-1' }] };
  };
  square.terminal.checkouts.get = async ({ checkoutId }) => {
    assert.equal(checkoutId, 'found-checkout');
    return { checkout: { status: 'IN_PROGRESS' } };
  };

  const status = await getKioskPaymentStatus('kiosk-device-1', 'local-order-1');

  assert.deepEqual(persisted, {
    where: { id: 'payment-1' },
    data: { providerTxnId: 'checkout:found-checkout' },
  });
  assert.deepEqual(status, { status: 'pending', terminalStatus: 'IN_PROGRESS' });
});

test('uses the paired Square Terminal device when recovering a checkout to cancel', async () => {
  prisma.shopOrder.findFirst = async () => ({ id: 'local-order-1' });
  prisma.payment.findFirst = async () => ({
    id: 'payment-1',
    status: 'pending',
    providerTxnId: 'order:square-order-1',
    createdAt: new Date('2026-09-03T12:00:00.000Z'),
  });
  prisma.payment.updateMany = async () => ({ count: 0 });
  square.terminal.checkouts.search = async (request) => {
    assert.equal(request.query.filter.deviceId, 'terminal-device-1');
    assert.notEqual(request.query.filter.deviceId, 'kiosk-device-1');
    return { checkouts: [{ id: 'found-checkout', orderId: 'square-order-1' }] };
  };
  let canceledCheckoutId;
  square.terminal.checkouts.cancel = async ({ checkoutId }) => {
    canceledCheckoutId = checkoutId;
  };

  const result = await cancelKioskPayment('kiosk-device-1', 'local-order-1');

  assert.equal(canceledCheckoutId, 'found-checkout');
  assert.deepEqual(result, { canceled: true });
});