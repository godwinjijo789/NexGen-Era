import test from 'node:test';
import assert from 'node:assert/strict';
import { createAuthService } from './auth.js';

const service = createAuthService(':memory:');

test('register and login persist a user account', () => {
  const user = service.register({
    name: 'Alice Host',
    email: 'alice@example.com',
    password: 'Secret123',
    role: 'host',
    participantId: 'PART-1001'
  });

  assert.equal(user.email, 'alice@example.com');
  assert.notEqual(user.password, 'Secret123');

  const signedIn = service.login({
    email: 'alice@example.com',
    password: 'Secret123'
  });

  assert.ok(signedIn);
  assert.equal(signedIn.email, 'alice@example.com');
  assert.equal(signedIn.role, 'host');
});

test('login fails for wrong password', () => {
  const result = service.login({
    email: 'alice@example.com',
    password: 'wrongpassword'
  });

  assert.equal(result, null);
});
