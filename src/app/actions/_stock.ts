// Shared stock adjustment helper used across server action modules.
// Requires DB — separated from _helpers.ts to keep pure helpers testable.

import { db } from '@/db';
import { products } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

/**
 * Adjust product stock atomically. Positive delta = add, negative = subtract.
 * Ensures stock never goes below 0.
 * Returns the updated product row (name, currentStock, minStock).
 *
 * Accepts an optional Drizzle transaction so it can participate in
 * a broader transactional workflow.
 */
export async function adjustStock(
  productId: string,
  delta: number,
  opts?: { tx?: Parameters<Parameters<typeof db.transaction>[0]>[0] | typeof db; now?: Date },
) {
  const executor = opts?.tx ?? db;
  const now = opts?.now ?? new Date();

  const [updated] = await executor
    .update(products)
    .set({
      currentStock: delta >= 0 ? sql`current_stock + ${delta}` : sql`greatest(0, current_stock + ${delta})`,
      updatedAt: now,
    })
    .where(eq(products.id, productId))
    .returning({
      name: products.name,
      currentStock: products.currentStock,
      minStock: products.minStock,
    });

  return updated ?? null;
}
