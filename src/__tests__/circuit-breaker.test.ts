import { describe, it, expect, beforeEach } from 'vitest';
import {
  createCircuitBreaker,
  CircuitOpenError,
} from '@/infrastructure/circuit-breaker';

describe('Circuit Breaker', () => {
  describe('createCircuitBreaker', () => {
    it('should start in CLOSED state', () => {
      const breaker = createCircuitBreaker('test-service');
      const stats = breaker.getStats();
      expect(stats.state).toBe('CLOSED');
      expect(stats.failures).toBe(0);
      expect(stats.totalRequests).toBe(0);
    });

    it('should execute function in CLOSED state', async () => {
      const breaker = createCircuitBreaker('test-service');
      const result = await breaker.execute(async () => 42);
      expect(result).toBe(42);
      expect(breaker.getStats().totalRequests).toBe(1);
    });

    it('should count failures', async () => {
      const breaker = createCircuitBreaker('test-service', { failureThreshold: 5 });

      await expect(
        breaker.execute(async () => { throw new Error('fail'); }),
      ).rejects.toThrow('fail');

      expect(breaker.getStats().failures).toBe(1);
      expect(breaker.getStats().state).toBe('CLOSED');
    });

    it('should open after failure threshold', async () => {
      const breaker = createCircuitBreaker('test-service', { failureThreshold: 3 });

      for (let i = 0; i < 3; i++) {
        await expect(
          breaker.execute(async () => { throw new Error(`fail-${i}`); }),
        ).rejects.toThrow();
      }

      expect(breaker.getStats().state).toBe('OPEN');
    });

    it('should fail-fast when OPEN', async () => {
      const breaker = createCircuitBreaker('test-service', {
        failureThreshold: 2,
        resetTimeoutMs: 60_000,
      });

      // Trip the breaker
      for (let i = 0; i < 2; i++) {
        await expect(
          breaker.execute(async () => { throw new Error('fail'); }),
        ).rejects.toThrow();
      }

      // Next call should throw CircuitOpenError immediately
      await expect(
        breaker.execute(async () => 'should not reach'),
      ).rejects.toThrow(CircuitOpenError);
    });

    it('should recover after reset', () => {
      const breaker = createCircuitBreaker('test-service', { failureThreshold: 1 });

      breaker.reset();
      expect(breaker.getStats().state).toBe('CLOSED');
    });

    it('should reset failure count on success', async () => {
      const breaker = createCircuitBreaker('test-service', { failureThreshold: 3 });

      // 2 failures
      for (let i = 0; i < 2; i++) {
        await expect(
          breaker.execute(async () => { throw new Error('fail'); }),
        ).rejects.toThrow();
      }

      // 1 success resets counter
      await breaker.execute(async () => 'ok');
      expect(breaker.getStats().failures).toBe(0);
      expect(breaker.getStats().state).toBe('CLOSED');
    });

    it('should use fallback when OPEN', async () => {
      const breaker = createCircuitBreaker('test-service', {
        failureThreshold: 1,
        resetTimeoutMs: 60_000,
        fallback: () => 'fallback-value',
      });

      await expect(
        breaker.execute(async () => { throw new Error('fail'); }),
      ).rejects.toThrow();

      // Should use fallback instead of throwing
      const result = await breaker.execute(async () => 'should not reach');
      expect(result).toBe('fallback-value');
    });

    it('should track total stats', async () => {
      const breaker = createCircuitBreaker('test-service', { failureThreshold: 10 });

      await breaker.execute(async () => 'ok');
      await breaker.execute(async () => 'ok');
      await expect(breaker.execute(async () => { throw new Error('fail'); })).rejects.toThrow();

      const stats = breaker.getStats();
      expect(stats.totalRequests).toBe(3);
      expect(stats.totalFailures).toBe(1);
      expect(stats.service).toBe('test-service');
    });
  });
});
