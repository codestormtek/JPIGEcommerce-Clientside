const assert = require('node:assert/strict');
const test = require('node:test');

process.env.ADMIN_EMAIL = 'staff@example.com';

const rows = new Map();
let nextId = 1;
let smsResult = { success: true, messageId: 'sms-1', error: null };
const config = {
  env: 'production',
  store: { adminEmail: 'staff@example.com' },
  resend: { apiKey: 'configured-for-mock', from: 'orders@example.com' },
  telnyx: { apiKey: 'configured-for-mock', fromNumber: '+12025550100', publicKey: 'signed-webhook-key' },
  staffOrderNotifications: {
    emailEnabled: true,
    smsEnabled: true,
    smsProviderReady: true,
    adminUrl: 'https://admin.thejigglingpig.com',
  },
};
const recipients = [
  { id: 'active', phoneNumber: '+12025550101', isActive: true },
  { id: 'same-active-formatted', phoneNumber: '(202) 555-0101', isActive: true },
  { id: 'inactive', phoneNumber: '+12025550102', isActive: false },
];
const order = {
  id: 'order-1', kioskOrderNumber: 'K-101', grandTotal: 23.5,
  currency: 'USD',
  lines: [{
    qty: 2,
    productNameSnapshot: 'Brisket <script>',
    sideSelectionsText: 'Mac & Cheese',
    lineTotal: 23.5,
  }],
  payments: [{ status: 'captured' }],
  orderStatus: { status: 'pending' },
  orderType: 'kiosk',
  requestedFulfillmentAt: null,
  requestedFulfillmentTimezone: null,
  preparationReminderLeadMinutes: null,
};
const pushEvents = [];
let failCreate = false;
const savepointCommands = [];

function matchesChannel(row, where) {
  return !where.channel?.in || where.channel.in.includes(row.channel);
}
const prisma = {
  shopOrder: {
    findUnique: async () => order,
  },
  orderNotificationRecipient: {
    findMany: async ({ where }) => recipients.filter(r => !where?.isActive || r.isActive),
    count: async () => recipients.filter(r => r.isActive).length,
  },
  staffOrderDelivery: {
    createMany: async ({ data }) => {
      if (failCreate) throw Object.assign(new Error('staff_order_deliveries does not exist'), { code: 'P2021' });
      for (const candidate of data) {
        const duplicate = [...rows.values()].some(row =>
          row.orderId === candidate.orderId && row.eventType === candidate.eventType
          && row.channel === candidate.channel && row.recipient === candidate.recipient);
        if (!duplicate) {
          const now = new Date();
          rows.set(String(nextId), {
            id: String(nextId++), status: 'queued', attempts: 0,
            createdAt: now, updatedAt: now, claimedAt: null,
            nextAttemptAt: null, sentAt: null, unknownAt: null, lastError: null,
            ...candidate,
          });
        }
      }
    },
    updateMany: async ({ where, data }) => {
      if (!where.id) return { count: 0 };
      const row = rows.get(where.id);
      if (!row || (where.status && row.status !== where.status)) return { count: 0 };
      Object.assign(row, data, {
        attempts: data.attempts?.increment ? row.attempts + data.attempts.increment : row.attempts,
      });
      return { count: 1 };
    },
    findMany: async ({ where, take }) => [...rows.values()]
      .filter(row => row.status === where.status && matchesChannel(row, where))
      .slice(0, take).map(row => ({ id: row.id })),
    findUnique: async ({ where }) => {
      const row = rows.get(where.id);
      return row ? { ...row, order } : null;
    },
    update: async ({ where, data }) => Object.assign(rows.get(where.id), data),
  },
  pushNotificationEvent: {
    createMany: async ({ data }) => {
      for (const candidate of data) {
        if (!pushEvents.some(event => event.orderId === candidate.orderId && event.eventType === candidate.eventType)) {
          pushEvents.push(candidate);
        }
      }
    },
  },
  $executeRawUnsafe: async command => { savepointCommands.push(command); },
  $queryRaw: async () => [{ ready: true }],
};

function mock(relativePath, exports) {
  const id = require.resolve(relativePath);
  require.cache[id] = { id, filename: id, loaded: true, exports };
}
class EmailProviderRejectedError extends Error {
  constructor(message, retryable) {
    super(message);
    this.retryable = retryable;
  }
}
mock('../dist/lib/prisma', { __esModule: true, default: prisma });
mock('../dist/config', { config });
mock('../dist/lib/mailer', {
  EmailProviderRejectedError,
  sendEmail: async () => 'email-1',
});
mock('../dist/lib/telnyx', { sendSms: async () => smsResult });
mock('../dist/lib/smsSuppression', { isSmsSuppressed: async () => false });
mock('../dist/utils/logger', { logger: { info() {}, warn() {}, error() {}, debug() {} } });

const service = require('../dist/services/staffOrderNotifications');

test('paid-event enqueue snapshots active recipients and deduplicates callbacks', async () => {
  await service.enqueuePaidStaffOrderNotificationsTx(prisma, 'order-1', 'kiosk');
  await service.enqueuePaidStaffOrderNotificationsTx(prisma, 'order-1', 'kiosk');
  assert.equal(rows.size, 2);
  assert.deepEqual([...rows.values()].map(row => row.channel).sort(), ['email', 'sms']);
  assert.equal([...rows.values()].filter(row => row.channel === 'sms').length, 1, 'formatted duplicate number is canonicalized');
  const email = [...rows.values()].find(row => row.channel === 'email');
  assert.match(email.bodyHtml, /Brisket &lt;script&gt;/);
  assert.match(email.bodyHtml, /Mac &amp; Cheese/);
  assert.doesNotMatch(email.bodyHtml, /Brisket <script>/);
  const sms = [...rows.values()].find(row => row.channel === 'sms');
  assert.doesNotMatch(sms.bodyText, /Brisket|Mac|Customer/);
});

test('missing outbox rolls back only the savepoint and returns to payment transaction', async () => {
  failCreate = true;
  savepointCommands.length = 0;
  assert.equal(await service.enqueuePaidStaffOrderNotificationsTx(prisma, 'order-2', 'remote_pickup'), false);
  assert.deepEqual(savepointCommands, [
    'SAVEPOINT staff_order_notification_enqueue',
    'ROLLBACK TO SAVEPOINT staff_order_notification_enqueue',
    'RELEASE SAVEPOINT staff_order_notification_enqueue',
  ]);
  failCreate = false;
});

test('scheduled pickup snapshots one preparation reminder per channel and app audience', async () => {
  const originalId = order.id;
  order.id = 'scheduled-order';
  order.orderType = 'remote_pickup';
  order.requestedFulfillmentAt = new Date('2030-06-12T18:00:00.000Z');
  order.requestedFulfillmentTimezone = 'America/New_York';
  order.preparationReminderLeadMinutes = 20;
  await service.enqueuePaidStaffOrderNotificationsTx(prisma, order.id, 'remote_pickup');
  await service.enqueuePaidStaffOrderNotificationsTx(prisma, order.id, 'remote_pickup');
  const reminders = [...rows.values()].filter(row =>
    row.orderId === order.id && row.eventType === 'preparation_due');
  assert.equal(reminders.length, 2);
  assert.ok(reminders.every(row => row.nextAttemptAt.toISOString() === '2030-06-12T17:40:00.000Z'));
  assert.ok(reminders.every(row => /Pickup/.test(row.bodyText)));
  assert.equal(pushEvents.filter(event => event.orderId === order.id).length, 1);
  assert.equal(pushEvents.find(event => event.orderId === order.id).nextAttemptAt.toISOString(), '2030-06-12T17:40:00.000Z');
  order.id = originalId;
  order.orderType = 'kiosk';
  order.requestedFulfillmentAt = null;
  order.requestedFulfillmentTimezone = null;
  order.preparationReminderLeadMinutes = null;
});

test('pending and canceled orders never enqueue, and a late duplicate stays deduped', async () => {
  const before = rows.size;
  order.payments[0].status = 'pending';
  assert.equal(await service.enqueuePaidStaffOrderNotificationsTx(prisma, 'pending-order', 'kiosk'), false);
  order.payments[0].status = 'captured';
  order.orderStatus.status = 'canceled';
  assert.equal(await service.enqueuePaidStaffOrderNotificationsTx(prisma, 'canceled-order', 'remote_pickup'), false);
  order.orderStatus.status = 'pending';
  await service.enqueuePaidStaffOrderNotificationsTx(prisma, 'order-1', 'kiosk');
  assert.equal(rows.size, before);
});

test('worker sends in production and quarantines ambiguous SMS without retry', async () => {
  await service.processStaffOrderNotifications();
  assert.ok([...rows.values()].every(row => row.status === 'sent'));

  const sms = [...rows.values()].find(row => row.channel === 'sms');
  sms.status = 'queued';
  sms.nextAttemptAt = null;
  smsResult = { success: false, messageId: null, error: 'timeout', uncertain: true };
  await service.processStaffOrderNotifications();
  assert.equal(sms.status, 'unknown');
  const attempts = sms.attempts;
  await service.processStaffOrderNotifications();
  assert.equal(sms.attempts, attempts);
});

test('worker suppresses an alert when payment/order is no longer paid and open', async () => {
  const email = [...rows.values()].find(row => row.channel === 'email');
  email.status = 'queued';
  order.orderStatus.status = 'canceled';
  await service.processStaffOrderNotifications();
  assert.equal(email.status, 'suppressed');
  assert.match(email.lastError, /canceled/);
  order.orderStatus.status = 'pending';
});

test('worker suppresses a preparation reminder after refund or ready status', async () => {
  const reminder = [...rows.values()].find(row => row.eventType === 'preparation_due');
  reminder.status = 'queued';
  reminder.nextAttemptAt = new Date(0);
  order.payments[0].status = 'partially_refunded';
  await service.processStaffOrderNotifications();
  assert.equal(reminder.status, 'suppressed');
  assert.match(reminder.lastError, /no longer actionable/);
  order.payments[0].status = 'captured';
});

test('nonproduction gate performs no provider work', async () => {
  const email = [...rows.values()].find(row => row.channel === 'email');
  email.status = 'queued';
  config.env = 'development';
  const attempts = email.attempts;
  assert.equal(await service.processStaffOrderNotifications(), 0);
  assert.equal(email.attempts, attempts);
});