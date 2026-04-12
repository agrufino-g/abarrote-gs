import { describe, it, expect } from 'vitest';
import { formatCurrency, formatNumber, getStockStatus, getDaysUntil } from '@/lib/utils';

describe('formatCurrency', () => {
  it('formats positive amounts as MXN', () => {
    const result = formatCurrency(1234.56);
    expect(result).toContain('1');
    expect(result).toContain('234');
  });

  it('formats zero', () => {
    const result = formatCurrency(0);
    expect(result).toContain('0');
  });

  it('formats negative amounts', () => {
    const result = formatCurrency(-500);
    expect(result).toContain('500');
  });
});

describe('formatNumber', () => {
  it('formats with locale grouping', () => {
    const result = formatNumber(1000);
    expect(result).toMatch(/1.?000/);
  });
});

describe('getStockStatus', () => {
  it('returns critical when stock is 0', () => {
    const result = getStockStatus(0, 10);
    expect(result.status).toBe('critical');
    expect(result.percentage).toBe(0);
  });

  it('returns low when stock <= minStock', () => {
    expect(getStockStatus(5, 10).status).toBe('low');
    expect(getStockStatus(10, 10).status).toBe('low');
  });

  it('returns ok when stock > minStock', () => {
    const result = getStockStatus(20, 10);
    expect(result.status).toBe('ok');
  });

  it('caps percentage at 100', () => {
    const result = getStockStatus(50, 10);
    expect(result.percentage).toBe(100);
  });

  it('handles minStock of 0', () => {
    const result = getStockStatus(5, 0);
    expect(result.status).toBe('ok');
    expect(result.percentage).toBe(100);
  });
});

describe('getDaysUntil', () => {
  it('returns 0 for today', () => {
    const today = new Date();
    expect(getDaysUntil(today)).toBe(0);
  });

  it('returns positive for future dates', () => {
    const future = new Date();
    future.setDate(future.getDate() + 5);
    expect(getDaysUntil(future)).toBe(5);
  });

  it('returns negative for past dates', () => {
    const past = new Date();
    past.setDate(past.getDate() - 3);
    expect(getDaysUntil(past)).toBe(-3);
  });
});
