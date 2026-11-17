import { describe, expect, it } from 'vitest';
import { hashPassword, sha256Hex, verifyPassword } from '../apps/api/src/security/password';
import { decodeCursor, encodeCursor } from '../apps/api/src/utils/cursor';
import { createSessionToken } from '../apps/api/src/security/password';

describe('API security utilities', () => {
  it('hashes and verifies passwords with PBKDF2-SHA256', async () => {
    const salt = Uint8Array.from({ length: 16 }, (_, index) => index + 1);
    const encoded = await hashPassword('correct horse battery staple', {
      iterations: 10_000,
      salt
    });

    expect(encoded).toMatch(/^pbkdf2_sha256\$10000\$/);
    await expect(verifyPassword('correct horse battery staple', encoded)).resolves.toBe(true);
    await expect(verifyPassword('wrong password', encoded)).resolves.toBe(false);
    await expect(verifyPassword('correct horse battery staple', 'malformed')).resolves.toBe(false);
  });

  it('stores only a SHA-256 digest of a random session token', async () => {
    const first = createSessionToken();
    const second = createSessionToken();

    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(first).not.toBe(second);
    expect(await sha256Hex(first)).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe('Cursor encoding', () => {
  it('round-trips timestamps and ids and rejects malformed cursors', () => {
    const position = {
      createdAt: '2026-11-17T22:00:00.000Z',
      id: '550e8400-e29b-41d4-a716-446655440000'
    };
    expect(decodeCursor(encodeCursor(position))).toEqual(position);
    expect(decodeCursor('not-a-cursor')).toBeNull();
  });
});
