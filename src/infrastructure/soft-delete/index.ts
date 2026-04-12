/**
 * Soft Delete Infrastructure
 *
 * Enterprise-grade soft delete system that:
 * - Marks records as deleted instead of physically removing them
 * - Provides Drizzle filter helpers (isNotDeleted / isDeleted)
 * - Supports restore operations
 * - Ensures audit trail via deletedAt timestamp
 * - Works with any table that has a `deletedAt` column
 *
 * Tables with soft delete support:
 *   - products
 *   - productCategories
 *   - clientes
 *   - proveedores
 *   - promotions
 *
 * @example
 * // Query only active records
 * const activeProducts = await db
 *   .select()
 *   .from(products)
 *   .where(isNotDeleted(products));
 *
 * // Soft delete a record
 * await softDelete(products, productId);
 *
 * // Restore a soft-deleted record
 * await restoreSoftDeleted(products, productId);
 *
 * // Query including deleted (admin view)
 * const allProducts = await db.select().from(products);
 *
 * // Query only deleted
 * const trashedProducts = await db
 *   .select()
 *   .from(products)
 *   .where(isDeleted(products));
 */

import { db } from '@/db';
import { products, productCategories, clientes, proveedores, promotions } from '@/db/schema';
import { eq, isNull, isNotNull, sql, type SQL } from 'drizzle-orm';
import type { PgTable, PgColumn } from 'drizzle-orm/pg-core';
import { logger } from '@/lib/logger';

// ══════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════

/**
 * Any Drizzle table that has a `deletedAt` timestamp column
 */
interface SoftDeletableTable {
  id: PgColumn;
  deletedAt: PgColumn;
}

/**
 * Registry of tables supporting soft delete.
 * Used for type-safe operations and validation.
 */
const _SOFT_DELETABLE_TABLES = {
  products,
  productCategories,
  clientes,
  proveedores,
  promotions,
} as const;

export type SoftDeletableTableName = keyof typeof _SOFT_DELETABLE_TABLES;

// ══════════════════════════════════════════════════════════════
// DRIZZLE FILTER HELPERS
// ══════════════════════════════════════════════════════════════

/**
 * Drizzle WHERE condition: record is NOT soft-deleted.
 * Use in all standard queries to exclude deleted records.
 *
 * @example
 * db.select().from(products).where(isNotDeleted(products))
 */
export function isNotDeleted(table: SoftDeletableTable): SQL {
  return isNull(table.deletedAt);
}

/**
 * Drizzle WHERE condition: record IS soft-deleted.
 * Use for admin "trash" views.
 *
 * @example
 * db.select().from(products).where(isDeleted(products))
 */
export function isDeleted(table: SoftDeletableTable): SQL {
  return isNotNull(table.deletedAt);
}

// ══════════════════════════════════════════════════════════════
// SOFT DELETE OPERATIONS
// ══════════════════════════════════════════════════════════════

/**
 * Soft delete a record by setting `deletedAt = now()`.
 *
 * Does NOT physically remove the row — data is preserved for auditing
 * and can be restored at any time.
 *
 * @returns true if a record was marked as deleted, false if not found
 */
export async function softDelete(table: SoftDeletableTable & PgTable, recordId: string): Promise<boolean> {
  try {
    const result = await db
      .update(table)
      .set({ deletedAt: new Date() } as Record<string, unknown>)
      .where(eq(table.id, recordId));

    const deleted = (result as { rowCount?: number }).rowCount !== 0;

    if (deleted) {
      logger.info('Record soft-deleted', {
        action: 'soft_delete',
        table: (table as unknown as Record<string | symbol, unknown>)[Symbol.for('drizzle:Name')] ?? 'unknown',
        recordId,
      });
    }

    return deleted;
  } catch (err) {
    logger.error('Soft delete failed', {
      action: 'soft_delete_error',
      recordId,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

/**
 * Restore a soft-deleted record by setting `deletedAt = null`.
 *
 * @returns true if a record was restored, false if not found
 */
export async function restoreSoftDeleted(table: SoftDeletableTable & PgTable, recordId: string): Promise<boolean> {
  try {
    const result = await db
      .update(table)
      .set({ deletedAt: null } as Record<string, unknown>)
      .where(eq(table.id, recordId));

    const restored = (result as { rowCount?: number }).rowCount !== 0;

    if (restored) {
      logger.info('Record restored from soft-delete', {
        action: 'soft_delete_restore',
        table: (table as unknown as Record<string | symbol, unknown>)[Symbol.for('drizzle:Name')] ?? 'unknown',
        recordId,
      });
    }

    return restored;
  } catch (err) {
    logger.error('Soft delete restore failed', {
      action: 'soft_delete_restore_error',
      recordId,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

/**
 * Permanently delete records that have been soft-deleted for longer
 * than the specified retention period.
 *
 * This should be run as a scheduled job (e.g., weekly via QStash).
 *
 * @param table - The table to purge
 * @param retentionDays - Records older than this many days will be permanently deleted
 * @returns Number of records permanently deleted
 */
export async function purgeSoftDeleted(table: SoftDeletableTable & PgTable, retentionDays: number): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  try {
    const result = await db
      .delete(table)
      .where(sql`${table.deletedAt} IS NOT NULL AND ${table.deletedAt} < ${cutoffDate}`);

    const count = (result as { rowCount?: number }).rowCount ?? 0;

    logger.info('Soft-deleted records purged', {
      action: 'soft_delete_purge',
      table: (table as unknown as Record<string | symbol, unknown>)[Symbol.for('drizzle:Name')] ?? 'unknown',
      retentionDays,
      purgedCount: count,
    });

    return count;
  } catch (err) {
    logger.error('Soft delete purge failed', {
      action: 'soft_delete_purge_error',
      retentionDays,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

/**
 * Count soft-deleted records for a table (for admin dashboard).
 */
export async function countSoftDeleted(table: SoftDeletableTable & PgTable): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(table)
    .where(isDeleted(table));

  return Number(result[0]?.count ?? 0);
}
