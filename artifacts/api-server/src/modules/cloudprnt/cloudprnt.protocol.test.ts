import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CLOUDPRNT_TEXT_MEDIA_TYPE,
  UNACKNOWLEDGED_DELIVERY_ERROR,
  cloudPrntPollIsQuarantined,
  cloudPrntPollResponse,
  hasPaymentCapturedSincePrinterCreation,
  isQuarantinedCloudPrntDelivery,
  isCloudPrntSuccessCode,
  reconciliationOrderWhere,
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