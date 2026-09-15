import assert from 'node:assert/strict';
import crypto from 'crypto';
import test from 'node:test';
import prisma from '../../lib/prisma';
import {
  CLOUDPRNT_TEXT_MEDIA_TYPE,
  UNACKNOWLEDGED_DELIVERY_ERROR,
  cloudPrntPollIsQuarantined,
  cloudPrntPollResponse,
  completeJob,
  hasPaymentCapturedSincePrinterCreation,
  isQuarantinedCloudPrntDelivery,
  isCloudPrntSuccessCode,
  reconciliationOrderWhere,
  reprintJob,
  selectCloudPrntDeliverySlot,
} from './cloudprnt.service';
import {
  cloudPrntCompletionQuerySchema,
  cloudPrntJobQuerySchema,
  printerPollSchema,
} from './cloudprnt.schema';

test('CloudPRNT official POST poll reply contains no unsupported job token', () => {
  const response = cloudPrntPollResponse();

  assert.deepEqual(response.mediaTypes, ['text/plain']);
  assert.equal(response.jobReady, true);
  assert.equal(response.deleteMethod, 'DELETE');
  assert.deepEqual(Object.keys(response).sort(), ['deleteMethod', 'jobReady', 'mediaTypes']);
});

test('CloudPRNT completion treats all 2xx printer status codes as success', () => {
  assert.equal(isCloudPrntSuccessCode('200 OK'), true);
  assert.equal(isCloudPrntSuccessCode('221 Paper at exit'), true);
  assert.equal(isCloudPrntSuccessCode('200%20OK'), true);
  assert.equal(isCloudPrntSuccessCode(200), true);
  assert.equal(isCloudPrntSuccessCode('520 Media decoding error'), false);
  assert.equal(isCloudPrntSuccessCode('2 paper errors'), false);
  assert.equal(isCloudPrntSuccessCode(''), false);
});

test('CloudPRNT accepts official POST, GET, and DELETE request examples', () => {
  assert.equal(printerPollSchema.safeParse({ statusCode: '200%20OK', printerMAC: '00:11:22:33:44:55' }).success, true);
  assert.equal(printerPollSchema.safeParse({ printerMAC: '00:11:22:33:44:55' }).success, false);

  assert.deepEqual(
    cloudPrntJobQuerySchema.parse({ type: 'text/plain', mac: '00:11:22:33:44:55' }),
    { type: 'text/plain', mac: '00:11:22:33:44:55' },
  );
  assert.deepEqual(
    cloudPrntCompletionQuerySchema.parse({ mac: '00:11:22:33:44:55', code: '200%20OK' }),
    { mac: '00:11:22:33:44:55', code: '200%20OK' },
  );
});

test('reconciliation suppresses historical and inactive pickup orders', () => {
  const printerCreatedAt = new Date('2026-05-01T12:00:00.000Z');
  assert.equal(hasPaymentCapturedSincePrinterCreation([
    { status: 'captured', capturedAt: new Date('2026-04-30T23:59:59.999Z') },
  ], printerCreatedAt), false);
  assert.equal(hasPaymentCapturedSincePrinterCreation([
    { status: 'captured', capturedAt: null },
  ], printerCreatedAt), false);
  assert.equal(hasPaymentCapturedSincePrinterCreation([
    { status: 'captured', capturedAt: new Date('2026-05-01T12:00:00.000Z') },
  ], printerCreatedAt), true);

  assert.deepEqual(reconciliationOrderWhere('printer-1', printerCreatedAt), {
    orderType: { in: ['kiosk', 'event_qr', 'remote_pickup'] },
    orderStatus: { status: { in: ['pending', 'confirmed', 'processing', 'ready_to_ship'] } },
    payments: { some: { status: { in: ['captured', 'partially_refunded'] }, capturedAt: { gte: printerCreatedAt } } },
    cloudPrntJobs: { none: { printerId: 'printer-1' } },
  });
});

test('a timed-out A quarantines the printer, so a late DELETE cannot acknowledge B', () => {
  // This models the oldest-first slot read used by both POST and DELETE.
  // A timed out after the GET response was lost; B is queued but has never
  // been advertised to the printer.
  const a = {
    id: 'A',
    status: 'error',
    lastError: UNACKNOWLEDGED_DELIVERY_ERROR,
    acknowledgedAt: null,
  };
  const b = {
    id: 'B',
    status: 'queued',
    lastError: null,
    acknowledgedAt: null,
  };

  const slotAfterATimeout = selectCloudPrntDeliverySlot([a, b]);
  assert.equal(slotAfterATimeout?.id, 'A');
  assert.equal(isQuarantinedCloudPrntDelivery(a), true);
  // The next official POST returns jobReady:false; it must not claim B.
  assert.equal(cloudPrntPollIsQuarantined(slotAfterATimeout), true);

  // A delayed official DELETE has no job ID. Since A still owns the slot,
  // the DELETE completion selection targets only A, never B.
  const slotForLateDelete = selectCloudPrntDeliverySlot([
    a,
    { ...b, status: 'delivering' },
  ]);
  assert.equal(slotForLateDelete?.id, 'A');
});

test('mocked credential retirement blocks a delayed A DELETE after its reprint starts delivering', async () => {
  // An already-authenticated A request carries this generation while staff
  // resolves it. The test mocks the persistence boundary; it makes no DB call.
  const client = prisma as any;
  const original = {
    transaction: client.$transaction,
    jobFindFirst: client.cloudPrntJob.findFirst,
    jobFindMany: client.cloudPrntJob.findMany,
    jobUpdateMany: client.cloudPrntJob.updateMany,
    auditCreate: client.auditLog.create,
  };
  const oldTokenHash = 'old-credential-generation';
  let currentTokenHash = oldTokenHash;
  const a = {
    id: 'A', printerId: 'printer-1', orderId: 'order-1', originalJobId: null,
    ticketKind: 'order', contentType: 'text/plain', payloadText: 'A',
    status: 'error', lastError: UNACKNOWLEDGED_DELIVERY_ERROR,
    acknowledgedAt: null, printedAt: null, fetchedAt: new Date('2026-05-01T12:00:00.000Z'),
  };
  let reprint: any = null;

  try {
    client.auditLog.create = async () => ({});
    client.cloudPrntJob.findFirst = async () => a;
    client.$transaction = async (callback: any) => callback({
      cloudPrntPrinter: {
        findUnique: async () => ({ id: 'printer-1', name: 'Kitchen pass' }),
        update: async ({ data }: any) => {
          currentTokenHash = data.tokenHash;
          return { id: 'printer-1' };
        },
      },
      cloudPrntJob: {
        updateMany: async () => {
          a.status = 'cancelled';
          a.lastError = 'Delivery outcome was unknown. Staff checked the kitchen and explicitly chose this audited reprint.';
          return { count: 1 };
        },
        create: async ({ data }: any) => {
          reprint = {
            id: 'R', ...data, status: 'queued', lastError: null, acknowledgedAt: null,
            printedAt: null, fetchedAt: null,
          };
          return reprint;
        },
      },
    });

    const resolved = await reprintJob('printer-1', 'A', 'staff-1');
    assert.equal(a.status, 'cancelled');
    assert.equal(resolved.job.id, 'R');
    assert.ok(resolved.replacementCredential);
    assert.equal(
      currentTokenHash,
      crypto.createHash('sha256').update(resolved.replacementCredential!.token).digest('hex'),
    );
    assert.notEqual(currentTokenHash, oldTokenHash);

    // The reprint is now the next job after the printer is explicitly reset and
    // configured with the replacement credential. A delayed DELETE assembled
    // under the retired credential must not be allowed to complete R.
    reprint.status = 'delivering';
    reprint.fetchedAt = new Date('2026-05-01T12:10:00.000Z');
    client.cloudPrntJob.findMany = async ({ where }: any) =>
      where.printer.is.tokenHash === currentTokenHash ? [reprint] : [];
    client.cloudPrntJob.updateMany = async ({ where, data }: any) => {
      if (where.id === reprint.id && where.printer.is.tokenHash === currentTokenHash) {
        Object.assign(reprint, data);
        return { count: 1 };
      }
      return { count: 0 };
    };

    await completeJob(
      { id: 'printer-1', tokenHash: oldTokenHash, printerMac: '00:11:22:33:44:55' },
      { mac: '00:11:22:33:44:55', code: '200%20OK' },
    );
    assert.equal(reprint.status, 'delivering');
    assert.equal(reprint.acknowledgedAt, null);
  } finally {
    client.$transaction = original.transaction;
    client.cloudPrntJob.findFirst = original.jobFindFirst;
    client.cloudPrntJob.findMany = original.jobFindMany;
    client.cloudPrntJob.updateMany = original.jobUpdateMany;
    client.auditLog.create = original.auditCreate;
  }
});