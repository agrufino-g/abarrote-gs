import { describe, it, expect } from 'vitest';
import { isValidRFC, getRFCType } from '@/lib/validation/rfc';

describe('RFC Validation', () => {
  describe('isValidRFC()', () => {
    // ── Persona física (13 chars) ──
    it('accepts valid persona física RFC', () => {
      expect(isValidRFC('GARC850101ABC')).toBe(true);
    });

    it('accepts persona física with Ñ', () => {
      expect(isValidRFC('GOÑI900215XYZ')).toBe(true);
    });

    it('accepts persona física with &', () => {
      expect(isValidRFC('GA&C850101AB1')).toBe(true);
    });

    it('accepts lowercase (normalizes to upper)', () => {
      expect(isValidRFC('garc850101abc')).toBe(true);
    });

    it('accepts with leading/trailing whitespace', () => {
      expect(isValidRFC('  GARC850101ABC  ')).toBe(true);
    });

    // ── Persona moral (12 chars) ──
    it('accepts valid persona moral RFC', () => {
      expect(isValidRFC('GAR850101AB1')).toBe(true);
    });

    // ── Special RFCs ──
    it('accepts público en general RFC', () => {
      expect(isValidRFC('XAXX010101000')).toBe(true);
    });

    it('accepts extranjero RFC', () => {
      expect(isValidRFC('XEXX010101000')).toBe(true);
    });

    // ── Invalid inputs ──
    it('rejects empty string', () => {
      expect(isValidRFC('')).toBe(false);
    });

    it('rejects too-short string', () => {
      expect(isValidRFC('GARC')).toBe(false);
    });

    it('rejects invalid month (13)', () => {
      expect(isValidRFC('GARC851301ABC')).toBe(false);
    });

    it('rejects invalid day (32)', () => {
      expect(isValidRFC('GARC850132ABC')).toBe(false);
    });

    it('rejects month 00', () => {
      expect(isValidRFC('GARC850001ABC')).toBe(false);
    });

    it('rejects day 00', () => {
      expect(isValidRFC('GARC850100ABC')).toBe(false);
    });

    it('rejects Feb 30th', () => {
      expect(isValidRFC('GARC850230ABC')).toBe(false);
    });

    it('rejects letters where digits expected', () => {
      expect(isValidRFC('GARCABCDEFABC')).toBe(false);
    });

    it('rejects 11-char string', () => {
      expect(isValidRFC('GA850101AB1')).toBe(false);
    });
  });

  describe('getRFCType()', () => {
    it('identifies persona física', () => {
      expect(getRFCType('GARC850101ABC')).toBe('Persona física');
    });

    it('identifies persona moral', () => {
      expect(getRFCType('GAR850101AB1')).toBe('Persona moral');
    });

    it('identifies público en general', () => {
      expect(getRFCType('XAXX010101000')).toBe('Público en general');
    });

    it('identifies extranjero', () => {
      expect(getRFCType('XEXX010101000')).toBe('Extranjero');
    });

    it('returns null for invalid RFC', () => {
      expect(getRFCType('INVALID')).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(getRFCType('')).toBeNull();
    });
  });
});
