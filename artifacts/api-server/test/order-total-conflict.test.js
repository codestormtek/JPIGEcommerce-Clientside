const assert = require('node:assert/strict');
const test = require('node:test');

let inventoryUpdates = 0;
let orderCreates = 0;
let productLookupWhere;
let inventoryWhere;
let hideMenuItem = false;
const tx = {
  orderStatus: { findFirst: async () => ({ id: 'pending-status' }) },
  productItem: {
    findMany: async ({ where }) => {
      productLookupWhere = where;
      return hideMenuItem ? [] : [{ id: 'item-1', price: 12, product: { name: 'Plate' } }];
    },
    updateMany: async ({ where }) => {
      inventoryWhere = where;
      inventoryUpdates += 1;
      return { count: 1 };
    },
  },
  shopOrder: {
    count: async () => 0,
    create: async () => {
      orderCreates += 1;
      return {};
    },
  },
};
const prisma = {
  $transaction: async callback => callback(tx),
};

function mock(relativePath, exports) {
  const id = require.resolve(relativePath);
  require.cache[id] = { id, filename: id, loaded: true, exports };
}

mock('../dist/lib/prisma', { __esModule: true, default: prisma });
const { placeOrder } = require('../dist/modules/orders/orders.repository');

const orderInput = {
  lines: [{ productItemId: 'item-1', qty: 1 }],
  addresses: [{
    addressType: 'billing',
    fullName: 'Customer',
    addressLine1: 'Pickup',
    city: 'Pickup',
    postalCode: '00000',
    countryName: 'United States',
    countryIso2: 'US',
  }],
  currency: 'USD',
  orderType: 'remote_pickup',
  expectedTotalCents: 1199,
};

test('stale reviewed total conflicts before reservation, order, or payment entry', async () => {
  inventoryUpdates = 0;
  orderCreates = 0;
  hideMenuItem = false;

  await assert.rejects(
    () => placeOrder('pickup-user', orderInput, 0, 0, { provider: 'square' }, 0),
    error => error?.statusCode === 409 && error?.message === 'MENU_CHANGED'
      && error.details.expectedTotalCents === 1199
      && error.details.actualTotalCents === 1200,
  );
  assert.equal(inventoryUpdates, 0);
  assert.equal(orderCreates, 0);
});

test('kiosk and pickup transactions reject an item hidden after menu load', async () => {
  inventoryUpdates = 0;
  orderCreates = 0;
  hideMenuItem = true;

  await assert.rejects(
    () => placeOrder('pickup-user', {
      ...orderInput,
      expectedTotalCents: undefined,
      orderType: 'remote_pickup',
    }, 0, 0, { provider: 'square' }, 0),
    error => error?.statusCode === 409 && error?.message === 'MENU_CHANGED',
  );
  assert.equal(productLookupWhere.isPublished, true);
  assert.equal(productLookupWhere.qtyInStock.gt, 0);
  assert.deepEqual(productLookupWhere.product, {
    isDeleted: false,
    visibility: { in: ['kiosk', 'both'] },
  });
  assert.equal(inventoryUpdates, 0);
  assert.equal(orderCreates, 0);
});

test('online shop transactions retain their existing unrestricted item lookup', async () => {
  inventoryUpdates = 0;
  orderCreates = 0;
  hideMenuItem = false;

  await placeOrder('shop-user', {
    ...orderInput,
    expectedTotalCents: undefined,
    orderType: 'retail',
  }, 0, 0, undefined);

  assert.deepEqual(productLookupWhere, { id: { in: ['item-1'] } });
  assert.deepEqual(inventoryWhere, { id: 'item-1', qtyInStock: { gte: 1 } });
  assert.equal(inventoryUpdates, 1);
  assert.equal(orderCreates, 1);
});