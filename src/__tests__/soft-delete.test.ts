import { describe, it, expect, vi } from 'vitest';

vi.mock('@/db', () => ({ db: {} }));

import { isNotDeleted, isDeleted } from '@/infrastructure/soft-delete';

describe('Soft Delete Infrastructure', () => {
  describe('isNotDeleted', () => {
    it('should return a SQL condition object', () => {
      // We test that the function returns a truthy SQL expression
      // without accessing a real database. The table mock provides the column.
      const mockTable = {
        id: { name: 'id' },
        deletedAt: { name: 'deleted_at' },
      };

      // Should not throw and should return a SQL expression
      const result = isNotDeleted(mockTable as Parameters<typeof isNotDeleted>[0]);
      expect(result).toBeTruthy();
    });
  });

  describe('isDeleted', () => {
    it('should return a SQL condition object', () => {
      const mockTable = {
        id: { name: 'id' },
        deletedAt: { name: 'deleted_at' },
      };

      const result = isDeleted(mockTable as Parameters<typeof isDeleted>[0]);
      expect(result).toBeTruthy();
    });
  });

  describe('module exports', () => {
    it('should export all expected functions', async () => {
      const mod = await import('@/infrastructure/soft-delete');

      expect(typeof mod.isNotDeleted).toBe('function');
      expect(typeof mod.isDeleted).toBe('function');
      expect(typeof mod.softDelete).toBe('function');
      expect(typeof mod.restoreSoftDeleted).toBe('function');
      expect(typeof mod.purgeSoftDeleted).toBe('function');
      expect(typeof mod.countSoftDeleted).toBe('function');
    });
  });

  describe('Drizzle filter composition', () => {
    it('isNotDeleted and isDeleted return different SQL conditions', () => {
      const mockTable = {
        id: { name: 'id' },
        deletedAt: { name: 'deleted_at' },
      };

      const notDeletedSql = isNotDeleted(mockTable as Parameters<typeof isNotDeleted>[0]);
      const deletedSql = isDeleted(mockTable as Parameters<typeof isDeleted>[0]);

      // They should produce different SQL conditions
      expect(notDeletedSql).not.toEqual(deletedSql);
    });
  });

  describe('schema validation', () => {
    it('products table should have deletedAt column', async () => {
      const { products } = await import('@/db/schema');
      expect(products.deletedAt).toBeDefined();
    });

    it('clientes table should have deletedAt column', async () => {
      const { clientes } = await import('@/db/schema');
      expect(clientes.deletedAt).toBeDefined();
    });

    it('productCategories table should have deletedAt column', async () => {
      const { productCategories } = await import('@/db/schema');
      expect(productCategories.deletedAt).toBeDefined();
    });

    it('proveedores table should have deletedAt column', async () => {
      const { proveedores } = await import('@/db/schema');
      expect(proveedores.deletedAt).toBeDefined();
    });

    it('promotions table should have deletedAt column', async () => {
      const { promotions } = await import('@/db/schema');
      expect(promotions.deletedAt).toBeDefined();
    });

    it('featureFlags table should exist with expected columns', async () => {
      const { featureFlags } = await import('@/db/schema');
      expect(featureFlags).toBeDefined();
      expect(featureFlags.id).toBeDefined();
      expect(featureFlags.enabled).toBeDefined();
      expect(featureFlags.rolloutPercentage).toBeDefined();
      expect(featureFlags.targetUserIds).toBeDefined();
      expect(featureFlags.targetRoleIds).toBeDefined();
      expect(featureFlags.activateAt).toBeDefined();
      expect(featureFlags.deactivateAt).toBeDefined();
      expect(featureFlags.createdBy).toBeDefined();
    });
  });
});
