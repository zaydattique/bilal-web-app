import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPublicUrl, assertStorageConfigured } from '../src/utils/mediaStorage.js';

test('persistent media configuration fails closed when required settings are missing', () => {
  const names = ['MEDIA_BUCKET', 'MEDIA_REGION', 'MEDIA_ACCESS_KEY_ID', 'MEDIA_SECRET_ACCESS_KEY', 'MEDIA_PUBLIC_BASE_URL'];
  const previous = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  for (const name of names) delete process.env[name];
  assert.throws(() => assertStorageConfigured(), /MEDIA_BUCKET is required/);
  for (const [name, value] of Object.entries(previous)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

test('public media URLs encode each storage-key segment safely', () => {
  const names = ['MEDIA_BUCKET', 'MEDIA_REGION', 'MEDIA_ACCESS_KEY_ID', 'MEDIA_SECRET_ACCESS_KEY', 'MEDIA_PUBLIC_BASE_URL'];
  const previous = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  process.env.MEDIA_BUCKET = 'bucket';
  process.env.MEDIA_REGION = 'auto';
  process.env.MEDIA_ACCESS_KEY_ID = 'key';
  process.env.MEDIA_SECRET_ACCESS_KEY = 'secret';
  process.env.MEDIA_PUBLIC_BASE_URL = 'https://cdn.example/assets///';
  const url = buildPublicUrl('business one/image 01.webp');
  assert.equal(url, 'https://cdn.example/assets/business%20one/image%2001.webp');
  for (const [name, value] of Object.entries(previous)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});
