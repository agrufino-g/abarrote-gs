import { describe, it, expect } from 'vitest';
import { sanitize, validateNumber, validateId } from '@/lib/auth/guard';

describe('Input Validation Helpers', () => {
  // ────────────────────────────────────────────────────────────────
  // sanitize()
  // ────────────────────────────────────────────────────────────────
  describe('sanitize()', () => {
    it('returns empty string for null/undefined', () => {
      expect(sanitize(null)).toBe('');
      expect(sanitize(undefined)).toBe('');
    });

    it('returns empty string for empty input', () => {
      expect(sanitize('')).toBe('');
    });

    it('trims whitespace', () => {
      expect(sanitize('  hello  ')).toBe('hello');
    });

    it('removes null bytes', () => {
      expect(sanitize('hel\0lo')).toBe('hello');
    });

    it('removes HTML/injection characters', () => {
      expect(sanitize('<script>alert("xss")</script>')).toBe('scriptalert(xss)/script');
    });

    it('removes SQL comment sequences', () => {
      expect(sanitize('SELECT * FROM users -- drop')).toBe('SELECT * FROM users  drop');
    });

    it('removes control characters', () => {
      expect(sanitize('hello\x00\x01\x02world')).toBe('helloworld');
    });

    it('truncates to 1000 characters', () => {
      const long = 'A'.repeat(2000);
      expect(sanitize(long).length).toBe(1000);
    });

    it('preserves normal text', () => {
      expect(sanitize('Producto de limpieza #42')).toBe('Producto de limpieza #42');
    });

    it('preserves unicode (Spanish characters)', () => {
      expect(sanitize('Café señor ñoño')).toBe('Café señor ñoño');
    });
  });

  // ────────────────────────────────────────────────────────────────
  // validateNumber()
  // ────────────────────────────────────────────────────────────────
  describe('validateNumber()', () => {
    it('returns valid number within default range', () => {
      expect(validateNumber(42)).toBe(42);
    });

    it('accepts zero (default min)', () => {
      expect(validateNumber(0)).toBe(0);
    });

    it('accepts custom range boundaries', () => {
      expect(validateNumber(5, { min: 1, max: 10 })).toBe(5);
      expect(validateNumber(1, { min: 1, max: 10 })).toBe(1);
      expect(validateNumber(10, { min: 1, max: 10 })).toBe(10);
    });

    it('throws on NaN', () => {
      expect(() => validateNumber(NaN)).toThrow('debe ser un número válido');
    });

    it('throws on non-number type', () => {
      expect(() => validateNumber('42' as unknown as number)).toThrow('debe ser un número válido');
    });

    it('throws on negative when min is 0', () => {
      expect(() => validateNumber(-1)).toThrow('debe estar entre');
    });

    it('throws on value below min', () => {
      expect(() => validateNumber(0, { min: 1, max: 100 })).toThrow('debe estar entre 1 y 100');
    });

    it('throws on value above max', () => {
      expect(() => validateNumber(101, { min: 1, max: 100 })).toThrow('debe estar entre 1 y 100');
    });

    it('includes custom label in error message', () => {
      expect(() => validateNumber(NaN, { label: 'precio' })).toThrow('precio debe ser un número válido');
    });
  });

  // ────────────────────────────────────────────────────────────────
  // validateId()
  // ────────────────────────────────────────────────────────────────
  describe('validateId()', () => {
    it('accepts valid alphanumeric ID', () => {
      expect(validateId('product-123')).toBe('product-123');
    });

    it('accepts underscores and dashes', () => {
      expect(validateId('my_product-id_v2')).toBe('my_product-id_v2');
    });

    it('throws on empty string', () => {
      expect(() => validateId('')).toThrow('es obligatorio');
    });

    it('throws on null/undefined', () => {
      expect(() => validateId(null as unknown as string)).toThrow('es obligatorio');
      expect(() => validateId(undefined as unknown as string)).toThrow('es obligatorio');
    });

    it('throws on special characters (injection attempt)', () => {
      expect(() => validateId("'; DROP TABLE --")).toThrow('formato inválido');
    });

    it('throws on spaces', () => {
      expect(() => validateId('with spaces')).toThrow('formato inválido');
    });

    it('throws on IDs longer than 128 chars', () => {
      const longId = 'a'.repeat(129);
      expect(() => validateId(longId)).toThrow('formato inválido');
    });

    it('accepts ID exactly 128 chars', () => {
      const maxId = 'a'.repeat(128);
      expect(validateId(maxId)).toBe(maxId);
    });

    it('uses custom label in error message', () => {
      expect(() => validateId('', 'ClienteID')).toThrow('ClienteID es obligatorio');
    });
  });
});
