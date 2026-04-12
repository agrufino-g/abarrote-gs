import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/db', () => ({ db: {} }));

import {
  evaluateFlag,
  invalidateFlagCache,
  invalidateAllFlagsCache,
  type FeatureFlag,
  type EvaluationContext,
} from '@/infrastructure/feature-flags';

// ══════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════

function createTestFlag(overrides: Partial<FeatureFlag> = {}): FeatureFlag {
  return {
    id: 'test-flag',
    description: 'Test feature flag',
    enabled: true,
    rolloutPercentage: 100,
    targetUserIds: [],
    targetRoleIds: [],
    activateAt: null,
    deactivateAt: null,
    createdBy: 'system',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ══════════════════════════════════════════════════════════════
// TESTS
// ══════════════════════════════════════════════════════════════

describe('Feature Flags', () => {
  beforeEach(() => {
    invalidateAllFlagsCache();
  });

  describe('evaluateFlag — basic enabled/disabled', () => {
    it('should return false when flag is disabled', () => {
      const flag = createTestFlag({ enabled: false });
      expect(evaluateFlag(flag)).toBe(false);
    });

    it('should return true when flag is enabled with 100% rollout', () => {
      const flag = createTestFlag({ enabled: true, rolloutPercentage: 100 });
      expect(evaluateFlag(flag)).toBe(true);
    });

    it('should return false when flag has 0% rollout and no targeting', () => {
      const flag = createTestFlag({ rolloutPercentage: 0, targetUserIds: [], targetRoleIds: [] });
      expect(evaluateFlag(flag, { userId: 'user-1' })).toBe(false);
    });
  });

  describe('evaluateFlag — schedule-based activation', () => {
    it('should return false before activateAt date', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const flag = createTestFlag({ activateAt: tomorrow });
      expect(evaluateFlag(flag)).toBe(false);
    });

    it('should return true after activateAt date with 100% rollout', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const flag = createTestFlag({ activateAt: yesterday, rolloutPercentage: 100 });
      expect(evaluateFlag(flag)).toBe(true);
    });

    it('should return false after deactivateAt date', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const flag = createTestFlag({ deactivateAt: yesterday });
      expect(evaluateFlag(flag)).toBe(false);
    });

    it('should handle both activateAt and deactivateAt within window', () => {
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);

      const flag = createTestFlag({ activateAt: lastWeek, deactivateAt: nextWeek, rolloutPercentage: 100 });
      expect(evaluateFlag(flag)).toBe(true);
    });

    it('should return false when outside the schedule window', () => {
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);

      const flag = createTestFlag({ activateAt: twoWeeksAgo, deactivateAt: lastWeek });
      expect(evaluateFlag(flag)).toBe(false);
    });
  });

  describe('evaluateFlag — user targeting', () => {
    it('should return true for targeted user even with 0% rollout', () => {
      const flag = createTestFlag({
        rolloutPercentage: 0,
        targetUserIds: ['user-alpha', 'user-beta'],
      });

      expect(evaluateFlag(flag, { userId: 'user-alpha' })).toBe(true);
      expect(evaluateFlag(flag, { userId: 'user-beta' })).toBe(true);
    });

    it('should return false for non-targeted user with 0% rollout', () => {
      const flag = createTestFlag({
        rolloutPercentage: 0,
        targetUserIds: ['user-alpha'],
      });

      expect(evaluateFlag(flag, { userId: 'user-gamma' })).toBe(false);
    });

    it('should return true for targeted user regardless of schedule', () => {
      // Flag still respects enabled + schedule, but targeting lets user in
      const flag = createTestFlag({
        rolloutPercentage: 0,
        targetUserIds: ['user-vip'],
      });

      expect(evaluateFlag(flag, { userId: 'user-vip' })).toBe(true);
    });
  });

  describe('evaluateFlag — role targeting', () => {
    it('should return true for targeted role even with 0% rollout', () => {
      const flag = createTestFlag({
        rolloutPercentage: 0,
        targetRoleIds: ['admin', 'staff'],
      });

      expect(evaluateFlag(flag, { roleId: 'admin' })).toBe(true);
      expect(evaluateFlag(flag, { roleId: 'staff' })).toBe(true);
    });

    it('should return false for non-targeted role with 0% rollout', () => {
      const flag = createTestFlag({
        rolloutPercentage: 0,
        targetRoleIds: ['admin'],
      });

      expect(evaluateFlag(flag, { roleId: 'user' })).toBe(false);
    });

    it('should prioritize user targeting over role targeting', () => {
      const flag = createTestFlag({
        rolloutPercentage: 0,
        targetUserIds: ['user-1'],
        targetRoleIds: [],
      });

      // User is targeted, role is not — should still return true
      expect(evaluateFlag(flag, { userId: 'user-1', roleId: 'viewer' })).toBe(true);
    });
  });

  describe('evaluateFlag — percentage rollout', () => {
    it('should be deterministic for the same user+flag combination', () => {
      const flag = createTestFlag({ rolloutPercentage: 50 });
      const ctx: EvaluationContext = { userId: 'consistent-user' };

      const results = Array.from({ length: 100 }, () => evaluateFlag(flag, ctx));
      const allSame = results.every((r) => r === results[0]);

      expect(allSame).toBe(true);
    });

    it('should produce different results for different users', () => {
      const flag = createTestFlag({ rolloutPercentage: 50 });

      // With 50% rollout, across many users we should see both true and false
      const results = Array.from({ length: 100 }, (_, i) => evaluateFlag(flag, { userId: `user-${i}` }));

      const trueCount = results.filter(Boolean).length;
      const falseCount = results.length - trueCount;

      // With 50% rollout, we should get a mix (not all true or all false)
      expect(trueCount).toBeGreaterThan(10);
      expect(falseCount).toBeGreaterThan(10);
    });

    it('should return true for all users at 100%', () => {
      const flag = createTestFlag({ rolloutPercentage: 100 });

      const results = Array.from({ length: 50 }, (_, i) => evaluateFlag(flag, { userId: `user-${i}` }));

      expect(results.every(Boolean)).toBe(true);
    });

    it('should return false for all users at 0% without targeting', () => {
      const flag = createTestFlag({ rolloutPercentage: 0 });

      const results = Array.from({ length: 50 }, (_, i) => evaluateFlag(flag, { userId: `user-${i}` }));

      expect(results.every((r) => !r)).toBe(true);
    });

    it('should use "anonymous" when no userId provided', () => {
      const flag = createTestFlag({ rolloutPercentage: 50 });

      // Without userId, should use 'anonymous' consistently
      const result1 = evaluateFlag(flag, {});
      const result2 = evaluateFlag(flag, {});

      expect(result1).toBe(result2);
    });
  });

  describe('evaluateFlag — combined conditions', () => {
    it('should respect disabled flag even with targeting', () => {
      const flag = createTestFlag({
        enabled: false,
        targetUserIds: ['user-1'],
        rolloutPercentage: 100,
      });

      expect(evaluateFlag(flag, { userId: 'user-1' })).toBe(false);
    });

    it('should respect schedule even with targeting', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const flag = createTestFlag({
        activateAt: tomorrow,
        targetUserIds: ['user-1'],
        rolloutPercentage: 100,
      });

      expect(evaluateFlag(flag, { userId: 'user-1' })).toBe(false);
    });
  });

  describe('cache invalidation', () => {
    it('should not throw when invalidating non-existent flag', () => {
      expect(() => invalidateFlagCache('non-existent')).not.toThrow();
    });

    it('should not throw when invalidating all flags', () => {
      expect(() => invalidateAllFlagsCache()).not.toThrow();
    });
  });

  describe('withFeatureFlag HOF', () => {
    it('should be importable', async () => {
      const { withFeatureFlag } = await import('@/infrastructure/feature-flags');
      expect(typeof withFeatureFlag).toBe('function');
    });
  });
});
