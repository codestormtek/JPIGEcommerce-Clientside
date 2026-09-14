import assert from 'node:assert/strict';
import test from 'node:test';
import { pickupCheckoutSchema, pickupConfigSchema } from './pickup.schema';

test('pickup checkout requires a durable request key and a valid phone number', () => {
  const parsed = pickupCheckoutSchema.safeParse({
    clientRequestId: '53f6aa79-cc73-4852-997d-93d9c1181b11',
    customerName: 'Ada Customer',
    customerPhone: '(803) 555-0100',
    squareNonce: 'cnon:card-nonce-ok',
    lines: [{ productItemId: 'item-1', qty: 1, sideProductIds: ['side-1', 'side-2'] }],
  });
  assert.equal(parsed.success, true);
  assert.equal(pickupCheckoutSchema.safeParse({ ...parsed.data, clientRequestId: 'not-a-uuid' }).success, false);
  assert.equal(pickupCheckoutSchema.safeParse({ ...parsed.data, customerPhone: 'not a phone' }).success, false);
});

test('event QR pickup requires its signed source marker fields', () => {
  const checkout = {
    clientRequestId: '53f6aa79-cc73-4852-997d-93d9c1181b11',
    customerName: 'Ada Customer',
    customerPhone: '(803) 555-0100',
    squareNonce: 'cnon:card-nonce-ok',
    lines: [{ productItemId: 'item-1', qty: 1 }],
  };
  assert.equal(pickupCheckoutSchema.safeParse({ ...checkout, source: 'event_qr' }).success, false);
  assert.equal(pickupCheckoutSchema.safeParse({
    ...checkout,
    source: 'event_qr',
    sourceLinkSlug: 'market-qr',
    sourceToken: 'a'.repeat(43),
  }).success, true);
});

test('an open pickup event must have an address, name, and bounded wait', () => {
  assert.equal(pickupConfigSchema.safeParse({
    isOrderingOpen: true, eventName: '', streetAddress: '', asapWaitMinutes: 20, taxRatePercent: 7, menuProductIds: [],
  }).success, false);
  assert.equal(pickupConfigSchema.safeParse({
    isOrderingOpen: true, eventName: 'Saturday Market', streetAddress: '12 Main St', asapWaitMinutes: 20, taxRatePercent: 7, menuProductIds: [],
  }).success, true);
});