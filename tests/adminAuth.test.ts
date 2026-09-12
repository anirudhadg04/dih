import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveAdminBootstrapPassword } from '../src/utils/adminAuth';

test('uses the configured Vercel password when provided', () => {
  assert.equal(resolveAdminBootstrapPassword({ ADMIN_BOOTSTRAP_PASSWORD: 'StrongSecret123' }), 'StrongSecret123');
});

test('falls back to a safe emergency value when the env var is missing', () => {
  assert.equal(resolveAdminBootstrapPassword({}), 'AnvationAdmin@2026!');
});
