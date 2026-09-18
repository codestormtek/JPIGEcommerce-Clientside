const assert = require('node:assert/strict');
const test = require('node:test');

function mock(relativePath, exports) {
  const id = require.resolve(relativePath);
  require.cache[id] = { id, filename: id, loaded: true, exports };
}

mock('../dist/config', { config: { resend: { apiKey: '', from: 'orders@example.com' } } });
mock('../dist/utils/logger', { logger: { info() {}, warn() {}, error() {} } });

const { classifyResendErrorName } = require('../dist/lib/mailer');

test('only explicit Resend client rejections are safe to classify as rejected', () => {
  assert.equal(classifyResendErrorName('validation_error'), 'rejected');
  assert.equal(classifyResendErrorName('invalid_from_address'), 'rejected');
  assert.equal(classifyResendErrorName('rate_limit_exceeded'), 'retryable_rejected');
  assert.equal(classifyResendErrorName('internal_server_error'), 'unknown');
  assert.equal(classifyResendErrorName('application_error'), 'unknown');
  assert.equal(classifyResendErrorName(''), 'unknown');
});