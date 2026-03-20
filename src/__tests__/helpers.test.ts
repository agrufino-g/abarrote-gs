import { describe, it, expect } from 'vitest';
import { numVal } from '@/app/actions/_helpers';

describe('numVal', () => {
  it('parses numeric strings', () => {
    expect(numVal('42')).toBe(42);
    expect(numVal('3.14')).toBeCloseTo(3.14);
  });

  it('returns 0 for null/undefined/empty', () => {
    expect(numVal(null)).toBe(0);
    expect(numVal(undefined)).toBe(0);
    expect(numVal('')).toBe(0);
  });

  it('returns NaN for non-numeric strings', () => {
    expect(numVal('abc')).toBeNaN();
  });
});
