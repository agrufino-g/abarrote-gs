/**
 * Drizzle Product Repository — Infrastructure Implementation
 *
 * Implements IProductRepository using Drizzle ORM + Neon PostgreSQL.
 * This bridges the domain layer (pure entities) with the persistence layer.
 *
 * Features:
 * - Soft delete awareness (all queries filter deletedAt IS NULL)
 * - Domain entity hydration via Product.fromPersistence()
 * - Atomic stock adjustment via SQL UPDATE SET
 * - Duplicate detection for SKU/barcode
 */

import { db } from '@/db';
import { products } from '@/db/schema';
import { eq, isNull, and, sql, ne, lte } from 'drizzle-orm';
import { Product, type ProductProps } from '@/domain/entities/Product';
import { Money, Quantity, StockLevel } from '@/domain/value-objects';
import type { IProductRepository } from '@/domain/repositories/IProductRepository';

// ══════════════════════════════════════════════════════════════
// Row-to-Entity Mapper
// ══════════════════════════════════════════════════════════════

type ProductRow = typeof products.$inferSelect;

function toDomain(row: ProductRow): Product {
  return Product.fromPersistence({
    id: row.id,
    name: row.name,
    sku: row.sku,
    barcode: row.barcode,
    category: row.category,
    costPrice: Money.fromPesos(Number(row.costPrice)),
    unitPrice: Money.fromPesos(Number(row.unitPrice)),
    unit: row.unit,
    unitMultiple: row.unitMultiple,
    stockLevel: StockLevel.of(row.currentStock, row.minStock),
    isPerishable: row.isPerishable,
    expirationDate: row.expirationDate ?? null,
    imageUrl: row.imageUrl ?? undefined,
  });
}

function toRow(product: Product): Omit<ProductRow, 'createdAt' | 'updatedAt' | 'deletedAt'> {
  return {
    id: product.id,
    name: product.name,
    sku: product.sku,
    barcode: product.barcode,
    category: product.category,
    costPrice: product.costPrice.toPesos().toString(),
    unitPrice: product.unitPrice.toPesos().toString(),
    unit: product.unit,
    unitMultiple: product.unitMultiple,
    currentStock: product.currentStock,
    minStock: product.minStock,
    isPerishable: product.isPerishable,
    expirationDate: product.expirationDate,
    imageUrl: product.imageUrl ?? null,
  };
}

// Active record filter (soft delete)
const notDeleted = isNull(products.deletedAt);

// ══════════════════════════════════════════════════════════════
// Repository Implementation
// ══════════════════════════════════════════════════════════════

export class DrizzleProductRepository implements IProductRepository {
  async findById(id: string): Promise<Product | null> {
    const [row] = await db
      .select()
      .from(products)
      .where(and(eq(products.id, id), notDeleted))
      .limit(1);
    return row ? toDomain(row) : null;
  }

  async findByBarcode(barcode: string): Promise<Product | null> {
    const [row] = await db
      .select()
      .from(products)
      .where(and(eq(products.barcode, barcode), notDeleted))
      .limit(1);
    return row ? toDomain(row) : null;
  }

  async findBySku(sku: string): Promise<Product | null> {
    const [row] = await db
      .select()
      .from(products)
      .where(and(eq(products.sku, sku), notDeleted))
      .limit(1);
    return row ? toDomain(row) : null;
  }

  async findAll(): Promise<Product[]> {
    const rows = await db
      .select()
      .from(products)
      .where(notDeleted);
    return rows.map(toDomain);
  }

  async findByCategory(categoryId: string): Promise<Product[]> {
    const rows = await db
      .select()
      .from(products)
      .where(and(eq(products.category, categoryId), notDeleted));
    return rows.map(toDomain);
  }

  async findLowStock(): Promise<Product[]> {
    const rows = await db
      .select()
      .from(products)
      .where(and(
        sql`${products.currentStock} <= ${products.minStock}`,
        notDeleted,
      ));
    return rows.map(toDomain);
  }

  async findExpiringSoon(days: number): Promise<Product[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    const dateStr = futureDate.toISOString().split('T')[0];

    const rows = await db
      .select()
      .from(products)
      .where(and(
        lte(products.expirationDate, dateStr),
        notDeleted,
      ));
    return rows.map(toDomain);
  }

  async save(product: Product): Promise<Product> {
    const data = toRow(product);
    const now = new Date();

    await db
      .insert(products)
      .values({ ...data, createdAt: now, updatedAt: now })
      .onConflictDoUpdate({
        target: products.id,
        set: { ...data, updatedAt: now },
      });

    return product;
  }

  async delete(id: string): Promise<void> {
    await db
      .update(products)
      .set({ deletedAt: new Date() })
      .where(and(eq(products.id, id), notDeleted));
  }

  async existsBySku(sku: string, excludeId?: string): Promise<boolean> {
    const conditions = [eq(products.sku, sku), notDeleted];
    if (excludeId) conditions.push(ne(products.id, excludeId));

    const [row] = await db
      .select({ id: products.id })
      .from(products)
      .where(and(...conditions))
      .limit(1);

    return !!row;
  }

  async existsByBarcode(barcode: string, excludeId?: string): Promise<boolean> {
    const conditions = [eq(products.barcode, barcode), notDeleted];
    if (excludeId) conditions.push(ne(products.id, excludeId));

    const [row] = await db
      .select({ id: products.id })
      .from(products)
      .where(and(...conditions))
      .limit(1);

    return !!row;
  }

  async adjustStock(id: string, delta: number): Promise<Product | null> {
    const [row] = await db
      .update(products)
      .set({
        currentStock: sql`GREATEST(0, ${products.currentStock} + ${delta})`,
        updatedAt: new Date(),
      })
      .where(and(eq(products.id, id), notDeleted))
      .returning();

    return row ? toDomain(row) : null;
  }
}
