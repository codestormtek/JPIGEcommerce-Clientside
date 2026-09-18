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
let placedInput;
let storedPickupConfig = {
  isOrderingOpen: true,
  eventName: 'Event',
  streetAddress: '1 Main',
  pickupInstructions: 'Collect orders at the counter.',
  asapWaitMinutes: 20,
  taxRatePercent: 0,
};
const kioskMenu = {
  categories: [],
  products: [
    { id: 'plate', items: [{ id: 'item-1' }], categoryIds: [] },
    { id: 'new-kiosk-product', items: [{ id: 'new-kiosk-item' }], categoryIds: [] },
  ],
};
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
mock('../dist/services/staffOrderNotifications', { enqueuePaidStaffOrderNotificationsTx: async () => {} });
mock('../dist/modules/cloudprnt/cloudprnt.service', { enqueueCapturedOrderKitchenTickets: async () => {} });
mock('../dist/modules/kiosk/kiosk.service', {
  getKioskMenu: async () => kioskMenu,
  assertKioskMenuLineEligibility: (menu, lines) => {
    const itemIds = new Set(menu.products.flatMap(product => product.items.map(item => item.id)));
    const productIds = new Set(menu.products.map(product => product.id));
    if (
      lines.some(line => !itemIds.has(line.productItemId))
      || lines.flatMap(line => line.sideProductIds || []).some(id => !productIds.has(id))
    ) {
      throw new Error('MENU_CHANGED');
    }
  },
  resolveComboSides: async lines => lines,
});
mock('../dist/modules/site-settings/site-settings.repository', {
  findByKey: async () => ({ settingValue: JSON.stringify(storedPickupConfig) }),
  update: async (_key, data) => {
    storedPickupConfig = JSON.parse(data.settingValue);
    return { settingValue: data.settingValue };
  },
  create: async data => {
    storedPickupConfig = JSON.parse(data.settingValue);
    return { settingValue: data.settingValue };
  },
});
mock('../dist/modules/orders/orders.repository', {
  placeOrder: async (_userId, input) => {
    placedInput = input;
    return order;
  },
});

const {
  createPickupOrder,
  getAdminPickupConfig,
  getPublicPickupConfig,
  recoverPickupOrderAttempt,
  updatePickupConfig,
} = require('../dist/modules/pickup/pickup.service');
delete require.cache[require.resolve('../dist/services/orderInventoryRestoration')];
const { restoreOrderInventoryOnceTx } = require('../dist/services/orderInventoryRestoration');
const input = {
  clientRequestId: '8083c231-4181-4f4b-8b23-1e92fa6d4800',
  customerName: 'Customer', customerPhone: '5555550100', squareNonce: 'fresh-nonce',
  source: 'remote', lines: [{ productItemId: 'item-1', qty: 1 }],
};

test('pickup public menu mirrors the full kiosk menu despite a legacy stored allowlist', async () => {
  const result = await getPublicPickupConfig();

  assert.equal(result.pickupInstructions, 'Collect orders at the counter.');
  assert.deepEqual(
    result.menu.products.map(product => product.id),
    kioskMenu.products.map(product => product.id),
  );
});

test('pickup instructions persist through the existing site setting and return to admin/public config', async () => {
  const updated = await updatePickupConfig({
    ...storedPickupConfig,
    pickupInstructions: '  Collect orders at the marked pickup table.  ',
  });

  assert.equal(storedPickupConfig.pickupInstructions, 'Collect orders at the marked pickup table.');
  assert.equal(updated.pickupInstructions, 'Collect orders at the marked pickup table.');
  const publicConfig = await getPublicPickupConfig();
  assert.equal(publicConfig.pickupInstructions, 'Collect orders at the marked pickup table.');
  assert.equal((await getAdminPickupConfig()).pickupInstructions, 'Collect orders at the marked pickup table.');
});

test('scheduled checkout rejects a stale/nonexistent slot before order reservation or Square', async () => {
  const previous = storedPickupConfig;
  storedPickupConfig = {
    ...previous,
    schedulingEnabled: true,
    eventDate: '2030-06-12',
    opensAt: '10:00',
    shutsDownAt: '12:00',
    timezone: 'America/New_York',
    slotIntervalMinutes: 15,
    minimumPrepMinutes: 15,
    reminderLeadMinutes: 20,
  };
  placedInput = null;
  let squareCalls = 0;
  squareCreate = async () => {
    squareCalls += 1;
    return { paymentId: 'must-not-run', status: 'FAILED' };
  };
  await assert.rejects(
    () => createPickupOrder({
      ...input,
      clientRequestId: '8083c231-4181-4f4b-8b23-1e92fa6d4899',
      pickupAt: '2030-06-12T15:45:00.000Z',
    }),
    /no longer available/,
  );
  assert.equal(placedInput, null);
  assert.equal(squareCalls, 0);
  storedPickupConfig = previous;
});

test('pickup order eligibility follows the kiosk menu, not a legacy stored allowlist', async () => {
  restoreCalls = 0;
  placedInput = null;
  order.payments[0] = { id: 'pickup-payment-1', status: 'pending', providerTxnId: null, createdAt: new Date(), capturedAt: null };
  squareCreate = async () => ({ paymentId: 'square-declined-new-product', status: 'FAILED' });

  const accepted = await createPickupOrder({
    ...input,
    clientRequestId: '8083c231-4181-4f4b-8b23-1e92fa6d4811',
    expectedTotalCents: 1200,
    lines: [{ productItemId: 'new-kiosk-item', qty: 1 }],
  });
  assert.equal(accepted.paymentStatus, 'canceled', 'the kiosk-visible product reached payment validation');
  assert.equal(placedInput.expectedTotalCents, 1200);

  await assert.rejects(
    () => createPickupOrder({
      ...input,
      clientRequestId: '8083c231-4181-4f4b-8b23-1e92fa6d4812',
      lines: [{ productItemId: 'not-in-kiosk-menu', qty: 1 }],
    }),
    /MENU_CHANGED/,
  );
});

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

test('documented Square Payments terminal card/request failures are definitive', async () => {
  // These names are the installed Square SDK ErrorCode values. They represent
  // rejected payment instruments/entry attempts, not transport uncertainty.
  const terminalCodes = [
    'INVALID_ACCOUNT',
    'VOICE_FAILURE',
    'PAN_FAILURE',
    'EXPIRATION_FAILURE',
    'INVALID_POSTAL_CODE',
    'MANUALLY_ENTERED_PAYMENT_NOT_SUPPORTED',
  ];
  for (const code of terminalCodes) {
    restoreCalls = 0;
    order.payments[0] = { id: 'pickup-payment-1', status: 'pending', providerTxnId: null, createdAt: new Date(), capturedAt: null };
    squareCreate = async () => {
      const error = new Error(code);
      error.statusCode = 400;
      error.body = { errors: [{ code }] };
      throw error;
    };

    const result = await createPickupOrder(input);
    assert.equal(result.paymentStatus, 'canceled', code);
    assert.equal(order.payments[0].status, 'failed', code);
    assert.equal(restoreCalls, 1, code);
  }
});

test('408, 429, and 5xx override even card-coded Square errors as outcome-uncertain', async () => {
  for (const statusCode of [408, 429, 500, 503]) {
    restoreCalls = 0;
    order.payments[0] = { id: 'pickup-payment-1', status: 'pending', providerTxnId: null, createdAt: new Date(), capturedAt: null };
    squareCreate = async () => {
      const error = new Error('response outcome uncertain');
      error.statusCode = statusCode;
      error.errors = [{ code: 'CARD_DECLINED' }];
      throw error;
    };

    await assert.rejects(() => createPickupOrder(input), /Payment is being confirmed/, String(statusCode));
    assert.equal(order.payments[0].status, 'pending', String(statusCode));
    assert.equal(restoreCalls, 0, String(statusCode));
  }
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

test('legacy combo without a ledger finalizes safely with a staff reconciliation record and no guessed stock', async () => {
  const reconciliationRecords = [];
  const tx = {
    $executeRaw: async () => {},
    inventoryRestoration: { findUnique: async () => null, create: async () => assert.fail('must not record a false restoration') },
    inventoryReconciliation: {
      upsert: async ({ create }) => { reconciliationRecords.push(create); return create; },
    },
    shopOrder: { findUnique: async () => ({ inventoryReservationJson: null }) },
    orderLine: {
      findMany: async () => [{ productItemId: 'main-sku', qty: 1, sideSelectionsText: 'Mac & Cheese' }],
    },
    productItem: { update: async () => assert.fail('must not guess a combo-side SKU') },
  };

  const restored = await restoreOrderInventoryOnceTx(tx, 'legacy-combo-order', { trigger: 'refund', refundId: 'refund-1' });

  assert.equal(restored, false);
  assert.equal(reconciliationRecords.length, 1);
  assert.match(reconciliationRecords[0].reason, /ledger is absent/i);
});