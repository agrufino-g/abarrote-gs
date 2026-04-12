import { describe, it, expect } from 'vitest';
import { Quantity } from '@/domain/value-objects';

describe('Quantity Value Object', () => {
  describe('creation', () => {
    it('should create valid quantity', () => {
      const qty = Quantity.of(5);
      expect(qty.value).toBe(5);
    });

    it('should create zero quantity', () => {
      const qty = Quantity.zero();
      expect(qty.value).toBe(0);
      expect(qty.isZero()).toBe(true);
    });

    it('should create quantity of one', () => {
      const qty = Quantity.one();
      expect(qty.value).toBe(1);
    });

    it('should accept decimal values', () => {
      const qty = Quantity.of(2.5);
      expect(qty.value).toBe(2.5);
    });

    it('should throw for negative quantity', () => {
      expect(() => Quantity.of(-1)).toThrow('Quantity: Cannot be negative');
    });

    it('should throw for NaN', () => {
      expect(() => Quantity.of(NaN)).toThrow('Quantity: Must be a finite number');
    });

    it('should throw for Infinity', () => {
      expect(() => Quantity.of(Infinity)).toThrow('Quantity: Must be a finite number');
    });

    it('should throw for negative Infinity', () => {
      expect(() => Quantity.of(-Infinity)).toThrow('Quantity: Must be a finite number');
    });
  });

  describe('arithmetic operations', () => {
    describe('add', () => {
      it('should add quantities', () => {
        const a = Quantity.of(3);
        const b = Quantity.of(2);
        const result = a.add(b);
        expect(result.value).toBe(5);
      });

      it('should be immutable', () => {
        const a = Quantity.of(3);
        const b = Quantity.of(2);
        a.add(b);
        expect(a.value).toBe(3);
        expect(b.value).toBe(2);
      });

      it('should handle adding zero', () => {
        const qty = Quantity.of(5);
        const result = qty.add(Quantity.zero());
        expect(result.value).toBe(5);
      });
    });

    describe('subtract', () => {
      it('should subtract quantities', () => {
        const a = Quantity.of(5);
        const b = Quantity.of(2);
        const result = a.subtract(b);
        expect(result.value).toBe(3);
      });

      it('should throw when result would be negative', () => {
        const a = Quantity.of(2);
        const b = Quantity.of(5);
        expect(() => a.subtract(b)).toThrow('Quantity: Subtraction would result in negative quantity');
      });

      it('should allow subtracting to zero', () => {
        const a = Quantity.of(5);
        const b = Quantity.of(5);
        const result = a.subtract(b);
        expect(result.value).toBe(0);
      });

      it('should be immutable', () => {
        const a = Quantity.of(5);
        const b = Quantity.of(2);
        a.subtract(b);
        expect(a.value).toBe(5);
      });
    });

    describe('subtractSafe', () => {
      it('should subtract quantities', () => {
        const a = Quantity.of(5);
        const b = Quantity.of(2);
        const result = a.subtractSafe(b);
        expect(result.value).toBe(3);
      });

      it('should floor at zero instead of throwing', () => {
        const a = Quantity.of(2);
        const b = Quantity.of(5);
        const result = a.subtractSafe(b);
        expect(result.value).toBe(0);
      });

      it('should handle exact subtraction to zero', () => {
        const a = Quantity.of(5);
        const b = Quantity.of(5);
        const result = a.subtractSafe(b);
        expect(result.value).toBe(0);
      });
    });

    describe('multiply', () => {
      it('should multiply by factor', () => {
        const qty = Quantity.of(3);
        const result = qty.multiply(4);
        expect(result.value).toBe(12);
      });

      it('should handle decimal factors', () => {
        const qty = Quantity.of(10);
        const result = qty.multiply(0.5);
        expect(result.value).toBe(5);
      });

      it('should handle zero factor', () => {
        const qty = Quantity.of(100);
        const result = qty.multiply(0);
        expect(result.value).toBe(0);
      });

      it('should throw for negative factor', () => {
        const qty = Quantity.of(5);
        expect(() => qty.multiply(-2)).toThrow('Quantity: Cannot multiply by negative factor');
      });

      it('should be immutable', () => {
        const qty = Quantity.of(3);
        qty.multiply(4);
        expect(qty.value).toBe(3);
      });
    });
  });

  describe('comparison operations', () => {
    it('should check equality', () => {
      const a = Quantity.of(5);
      const b = Quantity.of(5);
      const c = Quantity.of(3);

      expect(a.equals(b)).toBe(true);
      expect(a.equals(c)).toBe(false);
    });

    it('should check greater than', () => {
      const larger = Quantity.of(5);
      const smaller = Quantity.of(3);

      expect(larger.isGreaterThan(smaller)).toBe(true);
      expect(smaller.isGreaterThan(larger)).toBe(false);
      expect(larger.isGreaterThan(larger)).toBe(false);
    });

    it('should check greater than or equal', () => {
      const larger = Quantity.of(5);
      const equal = Quantity.of(5);
      const smaller = Quantity.of(3);

      expect(larger.isGreaterThanOrEqual(smaller)).toBe(true);
      expect(larger.isGreaterThanOrEqual(equal)).toBe(true);
      expect(smaller.isGreaterThanOrEqual(larger)).toBe(false);
    });

    it('should check less than', () => {
      const smaller = Quantity.of(3);
      const larger = Quantity.of(5);

      expect(smaller.isLessThan(larger)).toBe(true);
      expect(larger.isLessThan(smaller)).toBe(false);
      expect(smaller.isLessThan(smaller)).toBe(false);
    });

    it('should check less than or equal', () => {
      const smaller = Quantity.of(3);
      const equal = Quantity.of(3);
      const larger = Quantity.of(5);

      expect(smaller.isLessThanOrEqual(larger)).toBe(true);
      expect(smaller.isLessThanOrEqual(equal)).toBe(true);
      expect(larger.isLessThanOrEqual(smaller)).toBe(false);
    });

    it('should check zero', () => {
      expect(Quantity.zero().isZero()).toBe(true);
      expect(Quantity.of(0).isZero()).toBe(true);
      expect(Quantity.of(1).isZero()).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle very small decimals', () => {
      const qty = Quantity.of(0.001);
      expect(qty.value).toBe(0.001);
      expect(qty.isZero()).toBe(false);
    });

    it('should handle very large numbers', () => {
      const qty = Quantity.of(1_000_000);
      expect(qty.value).toBe(1_000_000);
    });

    it('should preserve precision in calculations', () => {
      const a = Quantity.of(0.1);
      const b = Quantity.of(0.2);
      const result = a.add(b);
      expect(result.value).toBeCloseTo(0.3, 10);
    });
  });
});
