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
  if (parsed.success) assert.equal(parsed.data.smsOptIn, false);
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
    isOrderingOpen: true, eventName: '', streetAddress: '', asapWaitMinutes: 20, taxRatePercent: 7,
  }).success, false);
  const parsed = pickupConfigSchema.safeParse({
    isOrderingOpen: true,
    eventName: 'Saturday Market',
    streetAddress: '12 Main St',
    asapWaitMinutes: 20,
    taxRatePercent: 7,
    // Older admin clients may still submit the stored compatibility field.
    menuProductIds: ['not-a-product-id'],
  });
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(Object.prototype.hasOwnProperty.call(parsed.data, 'menuProductIds'), false);
  }
});

test('pickup instructions remain optional for legacy admin config payloads', () => {
  const legacyConfig = {
    isOrderingOpen: false,
    eventName: '',
    streetAddress: '',
    asapWaitMinutes: 20,
    taxRatePercent: 0,
  };
  assert.equal(pickupConfigSchema.safeParse(legacyConfig).success, true);
});

test('pickup instructions are trimmed and capped at 1000 characters', () => {
  const config = {
    isOrderingOpen: false,
    eventName: '',
    streetAddress: '',
    asapWaitMinutes: 20,
    taxRatePercent: 0,
  };
  const parsed = pickupConfigSchema.safeParse({ ...config, pickupInstructions: '  Collect orders at the counter.  ' });
  assert.equal(parsed.success, true);
  if (parsed.success) assert.equal(parsed.data.pickupInstructions, 'Collect orders at the counter.');
  assert.equal(pickupConfigSchema.safeParse({ ...config, pickupInstructions: 'x'.repeat(1000) }).success, true);
  assert.equal(pickupConfigSchema.safeParse({ ...config, pickupInstructions: 'x'.repeat(1001) }).success, false);
});

test('pickup checkout accepts an optional reviewed total in cents', () => {
  const checkout = {
    clientRequestId: '53f6aa79-cc73-4852-997d-93d9c1181b11',
    expectedTotalCents: 1250,
    customerName: 'Ada Customer',
    customerPhone: '(803) 555-0100',
    squareNonce: 'cnon:card-nonce-ok',
    lines: [{ productItemId: 'item-1', qty: 1 }],
  };
  const parsed = pickupCheckoutSchema.safeParse(checkout);
  assert.equal(parsed.success, true);
  if (parsed.success) assert.equal(parsed.data.expectedTotalCents, 1250);
  assert.equal(pickupCheckoutSchema.safeParse({
    ...checkout,
    expectedTotalCents: 12.5,
  }).success, false);
});