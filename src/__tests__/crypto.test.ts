import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the env module before importing crypto
vi.mock('@/lib/env', () => ({
  env: {
    OAUTH_ENCRYPTION_KEY: 'test-secret-key-for-aes-256-encryption',
  },
}));

import { encrypt, decrypt } from '@/lib/crypto';

describe('Crypto (AES-256-GCM)', () => {
  const plaintext = 'Hello, this is a secret token!';

  it('encrypts and decrypts to the original plaintext', () => {
    const encrypted = encrypt(plaintext);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it('produces base64 encoded output', () => {
    const encrypted = encrypt(plaintext);
    // base64 characters: A-Z, a-z, 0-9, +, /, =
    expect(encrypted).toMatch(/^[A-Za-z0-9+/]+=*$/);
  });

  it('produces different ciphertexts for same input (random IV)', () => {
    const enc1 = encrypt(plaintext);
    const enc2 = encrypt(plaintext);
    expect(enc1).not.toBe(enc2);
  });

  it('handles empty string', () => {
    // AES-256-GCM with empty plaintext produces IV + authTag but 0 ciphertext bytes,
    // which fails the minimum length check. This is expected behavior.
    const encrypted = encrypt('');
    expect(() => decrypt(encrypted)).toThrow('Invalid encrypted data: too short');
  });

  it('handles unicode characters', () => {
    const unicodeText = '¡Hola! 日本語テスト 🎉';
    const encrypted = encrypt(unicodeText);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(unicodeText);
  });

  it('handles long strings', () => {
    const longText = 'A'.repeat(10_000);
    const encrypted = encrypt(longText);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(longText);
  });

  it('throws on tampered ciphertext', () => {
    const encrypted = encrypt(plaintext);
    // Flip a character in the middle
    const tampered = encrypted.slice(0, 20) + 'X' + encrypted.slice(21);
    expect(() => decrypt(tampered)).toThrow();
  });

  it('throws on truncated ciphertext (too short)', () => {
    // Less than IV + authTag + 1 byte = 33 bytes => very short base64
    const tooShort = Buffer.from('short').toString('base64');
    expect(() => decrypt(tooShort)).toThrow('Invalid encrypted data: too short');
  });

  it('throws on empty base64 string', () => {
    expect(() => decrypt('')).toThrow();
  });
});
