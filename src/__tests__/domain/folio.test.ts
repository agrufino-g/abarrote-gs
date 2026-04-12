import { describe, it, expect, vi } from 'vitest';
import { Folio } from '@/domain/value-objects/Folio';

describe('Folio Value Object', () => {
  describe('generate()', () => {
    it('creates a folio with date prefix and zero-padded sequence', () => {
      const folio = Folio.generate('20260404', 42);
      expect(folio.toString()).toBe('20260404-0042');
    });

    it('pads single-digit sequence numbers', () => {
      const folio = Folio.generate('20260101', 1);
      expect(folio.toString()).toBe('20260101-0001');
    });

    it('handles sequence numbers above 9999', () => {
      const folio = Folio.generate('20260101', 12345);
      expect(folio.toString()).toBe('20260101-12345');
    });

    it('is not temporary', () => {
      const folio = Folio.generate('20260101', 1);
      expect(folio.isTemporary()).toBe(false);
    });
  });

  describe('generateOffline()', () => {
    it('creates a folio prefixed with OFF-', () => {
      const folio = Folio.generateOffline();
      expect(folio.toString()).toMatch(/^OFF-\d+$/);
    });

    it('is marked as temporary', () => {
      const folio = Folio.generateOffline();
      expect(folio.isTemporary()).toBe(true);
    });

    it('generates unique folios on successive calls', () => {
      vi.useFakeTimers();
      const f1 = Folio.generateOffline();
      vi.advanceTimersByTime(1);
      const f2 = Folio.generateOffline();
      vi.useRealTimers();
      expect(f1.toString()).not.toBe(f2.toString());
    });
  });

  describe('fromString()', () => {
    it('reconstructs a standard folio', () => {
      const folio = Folio.fromString('20260404-0042');
      expect(folio.toString()).toBe('20260404-0042');
      expect(folio.isTemporary()).toBe(false);
    });

    it('reconstructs an offline folio', () => {
      const folio = Folio.fromString('OFF-1712000000000');
      expect(folio.toString()).toBe('OFF-1712000000000');
      expect(folio.isTemporary()).toBe(true);
    });

    it('throws on empty string', () => {
      expect(() => Folio.fromString('')).toThrow('Invalid folio string');
    });

    it('throws on null/undefined', () => {
      expect(() => Folio.fromString(null as unknown as string)).toThrow('Invalid folio string');
      expect(() => Folio.fromString(undefined as unknown as string)).toThrow('Invalid folio string');
    });
  });

  describe('getDatePrefix()', () => {
    it('extracts date prefix from standard folio', () => {
      const folio = Folio.generate('20260404', 1);
      expect(folio.getDatePrefix()).toBe('20260404');
    });

    it('returns null for offline folio', () => {
      const folio = Folio.generateOffline();
      expect(folio.getDatePrefix()).toBeNull();
    });
  });

  describe('getSequenceNumber()', () => {
    it('extracts sequence number from standard folio', () => {
      const folio = Folio.generate('20260404', 42);
      expect(folio.getSequenceNumber()).toBe(42);
    });

    it('returns null for offline folio', () => {
      const folio = Folio.generateOffline();
      expect(folio.getSequenceNumber()).toBeNull();
    });
  });

  describe('equals()', () => {
    it('returns true for folios with same value', () => {
      const f1 = Folio.generate('20260404', 42);
      const f2 = Folio.fromString('20260404-0042');
      expect(f1.equals(f2)).toBe(true);
    });

    it('returns false for folios with different values', () => {
      const f1 = Folio.generate('20260404', 42);
      const f2 = Folio.generate('20260404', 43);
      expect(f1.equals(f2)).toBe(false);
    });
  });

  describe('serialization', () => {
    it('toJSON returns the string value', () => {
      const folio = Folio.generate('20260404', 42);
      expect(folio.toJSON()).toBe('20260404-0042');
    });

    it('survives JSON round-trip via fromString', () => {
      const original = Folio.generate('20260404', 42);
      const json = JSON.stringify({ folio: original });
      const parsed = JSON.parse(json);
      const restored = Folio.fromString(parsed.folio);
      expect(original.equals(restored)).toBe(true);
    });
  });
});
