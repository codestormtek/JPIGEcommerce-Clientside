const assert = require('node:assert/strict');
const test = require('node:test');

let outboxState;
let sendCalls;
const row = {
  id: 'outbox-1',
  orderId: 'order-1',
  eventType: 'confirmation',
  phoneNumber: '+15551234567',
  messageBody: 'pickup confirmation',
  attemptCount: 0,
  status: 'queued',
};

const prisma = {
  pickupSmsOutbox: {
    updateMany: async ({ where, data }) => {
      if (where.status === 'sending' && !where.id) return { count: 0 };
      if (where.status === 'queued' && where.id === row.id && outboxState === 'queued') {
        outboxState = data.status;
        row.attemptCount += 1;
        return { count: 1 };
      }
      return { count: 0 };
    },
    findMany: async ({ where }) => (where.status === 'queued' && outboxState === 'queued' ? [row] : []),
    findUnique: async () => ({
      ...row,
      status: outboxState,
      order: { payments: [{ status: 'captured' }], orderStatus: { status: 'pending' } },
    }),
    update: async ({ data }) => {
      outboxState = data.status;
      return {};
    },
  },
  pickupSmsSuppression: { findUnique: async () => null },
  pickupSmsConsent: { findUnique: async () => ({ optedIn: true }) },
};

function mock(relativePath, exports) {
  const id = require.resolve(relativePath);
  require.cache[id] = { id, filename: id, loaded: true, exports };
}

mock('../dist/lib/prisma', { __esModule: true, default: prisma });
mock('../dist/config', {
  config: {
    env: 'production',
    pickupSms: { enabled: true },
    telnyx: { publicKey: 'unused' },
  },
});
mock('../dist/utils/logger', { logger: { info() {}, warn() {}, error() {}, debug() {} } });
mock('../dist/lib/telnyx', {
  sendSms: async () => {
    sendCalls += 1;
    return { success: false, messageId: null, error: 'timeout', uncertain: true };
  },
});

const { processPickupSmsOutbox } = require('../dist/modules/pickup/pickupSms');

test('opt-in false is skipped and uncertain send is never blindly retried', async () => {
  outboxState = 'queued';
  sendCalls = 0;
  prisma.pickupSmsConsent.findUnique = async () => ({ optedIn: false });
  await processPickupSmsOutbox();
  assert.equal(sendCalls, 0);

  // Re-enable consent for the provider-uncertainty half of the fixture.
  prisma.pickupSmsConsent.findUnique = async () => ({ optedIn: true });
  outboxState = 'queued';
  await processPickupSmsOutbox();
  assert.equal(sendCalls, 1);
  assert.equal(outboxState, 'uncertain');
  await processPickupSmsOutbox();
  assert.equal(sendCalls, 1);
});