import assert from 'node:assert/strict';
import test from 'node:test';
import { kioskOrderSchema } from './kiosk.schema';

test('kiosk checkout accepts an optional reviewed total in cents', () => {
  const checkout = {
    clientRequestId: '53f6aa79-cc73-4852-997d-93d9c1181b11',
    expectedTotalCents: 1250,
    customerName: 'Ada Customer',
    paymentMethod: 'card',
    squareNonce: 'cnon:card-nonce-ok',
    lines: [{ productItemId: 'item-1', qty: 1 }],
  };
  const parsed = kioskOrderSchema.safeParse(checkout);
  assert.equal(parsed.success, true);
  if (parsed.success) assert.equal(parsed.data.expectedTotalCents, 1250);
  assert.equal(kioskOrderSchema.safeParse({
    ...checkout,
    expectedTotalCents: 12.5,
  }).success, false);
});