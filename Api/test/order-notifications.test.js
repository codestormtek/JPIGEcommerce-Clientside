const assert = require('node:assert/strict');
const test = require('node:test');

const sent = [];
function mockModule(relativePath, exports) {
  const id = require.resolve(relativePath);
  require.cache[id] = { id, filename: id, loaded: true, exports };
}

mockModule('../src/lib/telnyx', {
  sendSms: async (phone, body) => {
    sent.push({ phone, body });
    return { success: true };
  },
});
mockModule('../src/modules/order-notifications/order-notifications.repository', {
  findActive: async () => [
    { id: 'recipient-1', phoneNumber: '+15550000001' },
    { id: 'recipient-2', phoneNumber: '+15550000002' },
  ],
});
mockModule('../src/config', { config: { store: { name: 'The Jiggling Pig' } } });
mockModule('../src/utils/logger', {
  logger: { info: () => {}, warn: () => {}, error: () => {} },
});

const { sendNewOrderStoreAlerts } =
  require('../src/modules/order-notifications/order-notifications.service');

test('staff alert includes customer and item details and stays within 600 characters', async () => {
  sent.length = 0;
  await sendNewOrderStoreAlerts({
    orderNumber: 'K-007',
    customerName: 'Pat Customer',
    customerPhone: '+15551234567',
    itemCount: 40,
    items: Array.from({ length: 20 }, (_, index) => ({
      name: `Extra long smoked barbecue platter number ${index + 1}`,
      qty: 2,
      sides: 'Mac & Cheese, Collard Greens, Candied Yams',
    })),
    grandTotal: 275.5,
    currency: 'USD',
  });

  assert.equal(sent.length, 2);
  for (const message of sent) {
    assert.match(message.body, /New order K-007 - Pat Customer \(\+15551234567\)/);
    assert.match(message.body, /2x Extra long smoked barbecue platter number 1/);
    assert.match(message.body, /Mac & Cheese, Collard Greens, Candied Yams/);
    assert.match(message.body, /\+\d+ more items/);
    assert.match(message.body, /Total USD 275\.50\. - The Jiggling Pig$/);
    assert.ok(message.body.length <= 600);
  }
});