import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isObjectId,
  requireObjectId,
  assertAllowedFields,
  requireString,
  requirePositiveNumber,
  requireNonNegativeNumber,
  requireSameOriginForCookieMutations,
} from '../src/middleware/security.js';

const response = () => {
  const state = { status: 200, body: null };
  return {
    state,
    status(code) { state.status = code; return this; },
    json(body) { state.body = body; return body; },
  };
};

const request = ({ method = 'POST', cookie, origin, referer } = {}) => ({
  method,
  headers: cookie ? { cookie } : {},
  get(name) {
    return name === 'origin' ? origin : name === 'referer' ? referer : undefined;
  },
});

test('ObjectId validation rejects malformed identifiers and returns ObjectId for valid ones', () => {
  assert.equal(isObjectId('not-an-id'), false);
  assert.equal(isObjectId('507f1f77bcf86cd799439011'), true);
  assert.equal(String(requireObjectId('507f1f77bcf86cd799439011')), '507f1f77bcf86cd799439011');
  assert.throws(() => requireObjectId('bad', 'customer id'), /Invalid customer id/);
});

test('request field allowlist rejects client-controlled unknown fields', () => {
  assert.doesNotThrow(() => assertAllowedFields({ name: 'x', status: 'draft' }, ['name', 'status']));
  assert.throws(() => assertAllowedFields({ name: 'x', isAdmin: true }, ['name']), /Unsupported fields: isAdmin/);
});

test('numeric and string validators reject unsafe values', () => {
  assert.equal(requireString('  hello  ', 'name'), 'hello');
  assert.equal(requirePositiveNumber('12.5', 'amount'), 12.5);
  assert.equal(requireNonNegativeNumber(0, 'amount'), 0);
  assert.throws(() => requireString('', 'name'), /length is invalid/);
  assert.throws(() => requirePositiveNumber(0, 'amount'), /positive number/);
  assert.throws(() => requireNonNegativeNumber(-1, 'amount'), /non-negative number/);
  assert.throws(() => requireNonNegativeNumber('Infinity', 'amount'), /non-negative number/);
});

test('authenticated cookie mutations require an allowed origin', () => {
  const previous = process.env.CORS_ORIGIN;
  process.env.CORS_ORIGIN = 'https://shop.example, https://admin.example';

  let called = false;
  requireSameOriginForCookieMutations(
    request({ cookie: '__Host-admin_session=secret', origin: 'https://admin.example' }),
    { status: () => ({ json: () => {} }) },
    () => { called = true; },
  );
  assert.equal(called, true);

  const blocked = response();
  requireSameOriginForCookieMutations(
    request({ cookie: '__Host-admin_session=secret', origin: 'https://evil.example' }),
    blocked,
    () => { throw new Error('should not continue'); },
  );
  assert.equal(blocked.state.status, 403);
  assert.equal(blocked.state.body.message, 'Cross-site request blocked');

  if (previous === undefined) delete process.env.CORS_ORIGIN;
  else process.env.CORS_ORIGIN = previous;
});

test('non-browser and unauthenticated requests are not blocked by CSRF middleware', () => {
  let called = 0;
  const next = () => { called += 1; };
  requireSameOriginForCookieMutations(request({ method: 'GET', cookie: '__Host-admin_session=x' }), {}, next);
  requireSameOriginForCookieMutations(request({ method: 'POST' }), {}, next);
  assert.equal(called, 2);
});
