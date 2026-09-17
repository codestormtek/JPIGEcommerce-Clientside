import assert from 'node:assert/strict';
import crypto from 'crypto';
import test from 'node:test';
import { finalizedDeliveryStatus, pickupSmsWorkerEnabled, verifyTelnyxSignature } from './pickupSms.contract';

test('pickup SMS has no live-send path in development', () => {
  assert.equal(pickupSmsWorkerEnabled('development', true), false);
  assert.equal(pickupSmsWorkerEnabled('production', false), false);
  assert.equal(pickupSmsWorkerEnabled('production', true), true);
});

test('Telnyx finalized fixture maps per-recipient delivery status', () => {
  assert.equal(finalizedDeliveryStatus({ eventType: 'message.finalized', statuses: ['delivered'] }), 'delivered');
  assert.equal(finalizedDeliveryStatus({ eventType: 'message.finalized', statuses: ['delivery_failed'] }), 'delivery_failed');
  assert.equal(finalizedDeliveryStatus({ eventType: 'message.finalized', statuses: [] }), 'sent');
  assert.equal(finalizedDeliveryStatus({ eventType: 'message.finalized', hasErrors: true }), 'delivery_failed');
});

test('duplicate/out-of-order contract never makes finalized delivery look like failure', () => {
  assert.equal(finalizedDeliveryStatus({ eventType: 'message.finalized', statuses: ['delivered', 'delivery_failed'] }), 'delivered');
  assert.equal(finalizedDeliveryStatus({ eventType: 'message.sent' }), 'sent');
});

test('official Ed25519 timestamp.rawBody fixture verifies and stale fixture rejects', () => {
  const keyPair = crypto.generateKeyPairSync('ed25519');
  const rawBody = Buffer.from('{"data":{"id":"evt-1","event_type":"message.finalized","payload":{"id":"msg-1","to":[{"status":"delivered"}]}}}');
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = crypto.sign(null, Buffer.from(`${timestamp}|${rawBody.toString('utf8')}`), keyPair.privateKey).toString('base64');
  const publicKey = keyPair.publicKey.export({ type: 'spki', format: 'der' }).toString('base64');

  assert.equal(verifyTelnyxSignature(rawBody, timestamp, signature, publicKey), true);
  const dotSignature = crypto.sign(null, Buffer.from(`${timestamp}.${rawBody.toString('utf8')}`), keyPair.privateKey).toString('base64');
  assert.equal(verifyTelnyxSignature(rawBody, timestamp, dotSignature, publicKey), false);
  assert.equal(verifyTelnyxSignature(rawBody, String(Number(timestamp) - 301), signature, publicKey), false);
  assert.equal(verifyTelnyxSignature(Buffer.from('tampered'), timestamp, signature, publicKey), false);
});