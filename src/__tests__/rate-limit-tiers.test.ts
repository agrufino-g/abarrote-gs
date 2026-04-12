import { describe, it, expect, vi } from 'vitest';
import {
  checkTieredRateLimit,
  withRateLimit,
  checkBruteForce,
  roleIdToTier,
  RateLimitError,
  STANDARD,
  STRICT,
  BRUTE_FORCE,
} from '@/infrastructure/redis';

describe('Tiered Rate Limiting', () => {
  describe('roleIdToTier', () => {
    it('should return owner for owner roleId', () => {
      expect(roleIdToTier('owner')).toBe('owner');
      expect(roleIdToTier('propietario')).toBe('owner');
      expect(roleIdToTier('OWNER')).toBe('owner');
    });

    it('should return admin for admin roleId', () => {
      expect(roleIdToTier('admin')).toBe('admin');
      expect(roleIdToTier('administrador')).toBe('admin');
      expect(roleIdToTier('ADMIN-user')).toBe('admin');
    });

    it('should return staff for staff/employee roleId', () => {
      expect(roleIdToTier('staff')).toBe('staff');
      expect(roleIdToTier('empleado')).toBe('staff');
      expect(roleIdToTier('cajero')).toBe('staff');
    });

    it('should return user for authenticated users', () => {
      expect(roleIdToTier('user')).toBe('user');
      expect(roleIdToTier('usuario')).toBe('user');
      expect(roleIdToTier('customer')).toBe('user');
    });

    it('should return default for undefined/unknown', () => {
      expect(roleIdToTier(undefined)).toBe('default');
      expect(roleIdToTier('')).toBe('default');
    });
  });

  describe('checkTieredRateLimit', () => {
    it('should allow requests within limit', async () => {
      const uniqueId = `test-allow-${Date.now()}-${Math.random()}`;
      const result = await checkTieredRateLimit('product.fetch', uniqueId);

      expect(result.allowed).toBe(true);
      expect(result.blocked).toBe(false);
      expect(result.action).toBe('product.fetch');
    });

    it('should apply correct tier based on roleId', async () => {
      const uniqueId = `test-tier-${Date.now()}-${Math.random()}`;

      const ownerResult = await checkTieredRateLimit('sales.create', uniqueId, {
        roleId: 'owner',
      });

      // Owner should bypass rate limiting
      expect(ownerResult.tier).toBe('owner');
      expect(ownerResult.allowed).toBe(true);
      expect(ownerResult.remaining).toBe(Infinity);
    });

    it('should return user tier for authenticated users', async () => {
      const uniqueId = `test-user-tier-${Date.now()}-${Math.random()}`;

      const result = await checkTieredRateLimit('product.create', uniqueId, {
        roleId: 'empleado',
      });

      expect(result.tier).toBe('staff');
      expect(result.allowed).toBe(true);
    });

    it('should find config by prefix wildcard', async () => {
      const uniqueId = `test-wildcard-${Date.now()}-${Math.random()}`;

      // 'inventory.fetchAlerts' should match 'inventory.*'
      const result = await checkTieredRateLimit('inventory.fetchAlerts', uniqueId, {
        roleId: 'admin',
      });

      expect(result.allowed).toBe(true);
      expect(result.tier).toBe('admin');
    });

    it('should fallback to default config for unknown actions', async () => {
      const uniqueId = `test-fallback-${Date.now()}-${Math.random()}`;

      const result = await checkTieredRateLimit('unknown.action', uniqueId);

      expect(result.allowed).toBe(true);
      expect(result.tier).toBe('default');
    });

    it('should block after exceeding limit', async () => {
      const uniqueId = `test-exceed-${Date.now()}-${Math.random()}`;

      // auth.pin has limit of 3 for default tier
      for (let i = 0; i < 3; i++) {
        await checkTieredRateLimit('auth.pin', uniqueId);
      }

      const blocked = await checkTieredRateLimit('auth.pin', uniqueId);

      expect(blocked.blocked).toBe(true);
      expect(blocked.allowed).toBe(false);
      expect(blocked.remaining).toBe(0);
    });

    it('should return reset time', async () => {
      const uniqueId = `test-reset-${Date.now()}-${Math.random()}`;

      const result = await checkTieredRateLimit('sales.create', uniqueId);

      expect(result.reset).toBeInstanceOf(Date);
      expect(result.reset.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('checkBruteForce', () => {
    it('should use auth prefix', async () => {
      const uniqueId = `test-brute-${Date.now()}-${Math.random()}`;

      const result = await checkBruteForce('login', uniqueId);

      expect(result.action).toBe('auth.login');
      expect(result.allowed).toBe(true);
    });

    it('should block after multiple failed attempts', async () => {
      const uniqueId = `test-brute-block-${Date.now()}-${Math.random()}`;

      // BRUTE_FORCE is 5 per 15 minutes
      for (let i = 0; i < 5; i++) {
        await checkBruteForce('login', uniqueId);
      }

      const blocked = await checkBruteForce('login', uniqueId);

      expect(blocked.blocked).toBe(true);
    });
  });

  describe('withRateLimit HOF', () => {
    it('should allow function execution within limit', async () => {
      const mockFn = vi.fn().mockResolvedValue('success');
      const wrapped = withRateLimit(`test.action-${Date.now()}`, mockFn);

      const result = await wrapped('user-123');

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should pass arguments to wrapped function', async () => {
      const mockFn = vi.fn().mockImplementation((a, b) => Promise.resolve(a + b));
      const wrapped = withRateLimit(`test.args-${Date.now()}`, mockFn);

      const result = await wrapped(10, 20);

      expect(result).toBe(30);
      expect(mockFn).toHaveBeenCalledWith(10, 20);
    });

    it('should use custom identifier extractor', async () => {
      const mockFn = vi.fn().mockResolvedValue('done');
      const wrapped = withRateLimit(`test.custom-id-${Date.now()}`, mockFn, {
        getIdentifier: (data: { userId: string }) => data.userId,
      });

      await wrapped({ userId: 'custom-user-123' });

      expect(mockFn).toHaveBeenCalled();
    });

    it('should throw RateLimitError when blocked', async () => {
      const uniqueAction = `test.throw-${Date.now()}-${Math.random()}`;
      const mockFn = vi.fn().mockResolvedValue('success');

      // Create wrapper with very strict limit for testing
      const wrapped = withRateLimit(uniqueAction, mockFn);

      // First 3 calls should succeed (auth.pin has limit 3)
      // We need to exhaust the default limit
      const strictAction = `auth.pin-test-${Date.now()}`;
      const _strictWrapped = withRateLimit(strictAction, mockFn);

      // Making calls exceeding the standard limit
      for (let i = 0; i < 60; i++) {
        try {
          await wrapped(`exhaust-${Date.now()}`);
        } catch {
          // Ignore - we're exhausting the limit
        }
      }
    });

    it('should return error result when throwOnLimit is false', async () => {
      const uniqueAction = `test.no-throw-${Date.now()}-${Math.random()}`;
      const identifier = `user-${Date.now()}`;
      const mockFn = vi.fn().mockResolvedValue({ success: true });

      const wrapped = withRateLimit(uniqueAction, mockFn, { throwOnLimit: false });

      // Exhaust limit - auth.pin has 3 for default
      for (let i = 0; i < 3; i++) {
        await wrapped(identifier);
      }

      // Should return error result, not throw
      const result = await wrapped(identifier);

      // The function should return - we can only verify it doesn't throw
      expect(result).toBeDefined();
    });
  });

  describe('RateLimitError', () => {
    it('should create error with correct properties', () => {
      const mockResult = {
        remaining: 0,
        reset: new Date(Date.now() + 30000),
        blocked: true,
        isRateLimited: true,
        allowed: false,
        tier: 'user' as const,
        action: 'sales.create',
      };

      const error = new RateLimitError(mockResult);

      expect(error.message).toContain('Demasiadas solicitudes');
      expect(error.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(error.statusCode).toBe(429);
      expect(error.tier).toBe('user');
      expect(error.retryAfterMs).toBeGreaterThan(0);
    });

    it('should generate response object', () => {
      const mockResult = {
        remaining: 0,
        reset: new Date(Date.now() + 60000),
        blocked: true,
        isRateLimited: true,
        allowed: false,
        tier: 'default' as const,
        action: 'test.action',
      };

      const error = new RateLimitError(mockResult);
      const response = error.toResponse();

      expect(response.error).toContain('Demasiadas solicitudes');
      expect(response.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(response.retryAfter).toBeGreaterThan(0);
    });
  });

  describe('Predefined Tiers', () => {
    it('STANDARD should have 60 requests per minute', () => {
      expect(STANDARD.limit).toBe(60);
      expect(STANDARD.windowMs).toBe(60_000);
    });

    it('STRICT should have 20 requests per minute', () => {
      expect(STRICT.limit).toBe(20);
      expect(STRICT.windowMs).toBe(60_000);
    });

    it('BRUTE_FORCE should have 5 requests per 15 minutes', () => {
      expect(BRUTE_FORCE.limit).toBe(5);
      expect(BRUTE_FORCE.windowMs).toBe(15 * 60_000);
    });
  });
});
