import { describe, it, expect, beforeEach, vi } from 'vitest';
import { cache } from '@/lib/cache';

describe('Cache', () => {
  beforeEach(() => {
    cache.clear();
  });

  it('stores and retrieves values', () => {
    cache.set('key1', { foo: 'bar' }, 60000);
    expect(cache.get('key1')).toEqual({ foo: 'bar' });
  });

  it('returns null for missing keys', () => {
    expect(cache.get('nonexistent')).toBeNull();
  });

  it('expires entries after TTL', () => {
    vi.useFakeTimers();
    cache.set('key1', 'value', 1000);

    vi.advanceTimersByTime(500);
    expect(cache.get('key1')).toBe('value');

    vi.advanceTimersByTime(600);
    expect(cache.get('key1')).toBeNull();

    vi.useRealTimers();
  });

  it('invalidates by key', () => {
    cache.set('key1', 'value');
    cache.invalidate('key1');
    expect(cache.get('key1')).toBeNull();
  });

  it('invalidates by pattern', () => {
    cache.set('products:list', [1, 2, 3]);
    cache.set('products:detail:1', { id: 1 });
    cache.set('sales:list', [4, 5]);

    cache.invalidatePattern('^products');
    expect(cache.get('products:list')).toBeNull();
    expect(cache.get('products:detail:1')).toBeNull();
    expect(cache.get('sales:list')).toEqual([4, 5]);
  });

  it('clears all entries', () => {
    cache.set('a', 1);
    cache.set('b', 2);
    cache.clear();
    expect(cache.get('a')).toBeNull();
    expect(cache.get('b')).toBeNull();
  });
});
