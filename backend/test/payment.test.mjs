import test from 'node:test';
import assert from 'node:assert/strict';
import { getIdempotencyKey, fingerprint, assertSameRequest, normalizePaymentDate } from '../src/routes/payment.routes.js';

test('payment idempotency keys are bounded and restricted to safe characters', () => {
  assert.equal(getIdempotencyKey(' retry-ABC_123 '), 'retry-ABC_123');
  assert.throws(() => getIdempotencyKey('short'), /valid idempotencyKey/);
  assert.throws(() => getIdempotencyKey('bad key 123'), /valid idempotencyKey/);
});

test('payment fingerprints are deterministic for the same payload', () => {
  const payload = { accountId: 'a', paymentAmount: 1000, paymentMethod: 'cash' };
  const first = fingerprint(payload);
  const second = fingerprint(payload);
  assert.equal(first, second);
  assert.match(first, /^[a-f0-9]{64}$/);
  assert.notEqual(first, fingerprint({ ...payload, paymentAmount: 1001 }));
});

test('idempotency keys cannot replay a different payment request', () => {
  assert.doesNotThrow(() => assertSameRequest({ idempotencyFingerprint: 'same' }, 'same'));
  assert.throws(
    () => assertSameRequest({ idempotencyFingerprint: 'other' }, 'same'),
    /already been used for a different payment request/,
  );
});

test('payment dates reject invalid and future timestamps', () => {
  const now = Date.now();
  assert.ok(Math.abs(normalizePaymentDate(new Date(now - 1000)).getTime() - (now - 1000)) < 5000);
  assert.throws(() => normalizePaymentDate('not-a-date'), /paymentDate is invalid/);
  assert.throws(() => normalizePaymentDate(new Date(now + 10 * 60 * 1000)), /cannot be in the future/);
});
