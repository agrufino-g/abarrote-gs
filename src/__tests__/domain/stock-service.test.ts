import { describe, it, expect } from 'vitest';
import { StockService } from '@/domain/services/StockService';
import { Product, SaleItem } from '@/domain/entities';
import { Money, StockLevel } from '@/domain/value-objects';

function createTestProduct(
  overrides: Partial<{
    id: string;
    currentStock: number;
    minStock: number;
    costPrice: number;
    unitPrice: number;
    isPerishable: boolean;
    expirationDate: string | null;
  }> = {},
): Product {
  return Product.fromPersistence({
    id: overrides.id ?? 'p-test',
    name: 'Test Product',
    sku: 'TEST001',
    barcode: '1234567890',
    category: 'test',
    costPrice: Money.fromPesos(overrides.costPrice ?? 10),
    unitPrice: Money.fromPesos(overrides.unitPrice ?? 20),
    unit: 'pieza',
    unitMultiple: 1,
    stockLevel: StockLevel.of(overrides.currentStock ?? 100, overrides.minStock ?? 20),
    isPerishable: overrides.isPerishable ?? false,
    expirationDate: overrides.expirationDate ?? null,
  });
}

function createTestSaleItem(
  overrides: Partial<{
    productId: string;
    quantity: number;
    unitPrice: number;
  }> = {},
): SaleItem {
  return SaleItem.fromPersistence(
    overrides.productId ?? 'p-test',
    'Test Product',
    overrides.quantity ?? 5,
    overrides.unitPrice ?? 20,
    10,
    0,
  );
}

describe('StockService', () => {
  describe('checkAvailability', () => {
    it('returns canFulfill true when stock is sufficient', () => {
      const products = new Map([['p-1', createTestProduct({ id: 'p-1', currentStock: 100 })]]);
      const items = [createTestSaleItem({ productId: 'p-1', quantity: 10 })];

      const result = StockService.checkAvailability(items, products);

      expect(result.canFulfill).toBe(true);
      expect(result.unavailable).toHaveLength(0);
    });

    it('returns canFulfill false when stock is insufficient', () => {
      const products = new Map([['p-1', createTestProduct({ id: 'p-1', currentStock: 5 })]]);
      const items = [createTestSaleItem({ productId: 'p-1', quantity: 10 })];

      const result = StockService.checkAvailability(items, products);

      expect(result.canFulfill).toBe(false);
      expect(result.unavailable).toHaveLength(1);
      expect(result.unavailable[0]).toContain('stock: 5');
    });

    it('handles missing products', () => {
      const products = new Map<string, Product>();
      const items = [createTestSaleItem({ productId: 'p-missing', quantity: 1 })];

      const result = StockService.checkAvailability(items, products);

      expect(result.canFulfill).toBe(false);
      expect(result.unavailable[0]).toContain('no encontrado');
    });

    it('handles multiple items', () => {
      const products = new Map([
        ['p-1', createTestProduct({ id: 'p-1', currentStock: 100 })],
        ['p-2', createTestProduct({ id: 'p-2', currentStock: 5 })],
      ]);
      const items = [
        createTestSaleItem({ productId: 'p-1', quantity: 10 }),
        createTestSaleItem({ productId: 'p-2', quantity: 10 }),
      ];

      const result = StockService.checkAvailability(items, products);

      expect(result.canFulfill).toBe(false);
      expect(result.unavailable).toHaveLength(1);
    });
  });

  describe('calculateSaleAdjustments', () => {
    it('returns negative adjustments for sales', () => {
      const items = [
        createTestSaleItem({ productId: 'p-1', quantity: 5 }),
        createTestSaleItem({ productId: 'p-2', quantity: 3 }),
      ];

      const adjustments = StockService.calculateSaleAdjustments(items);

      expect(adjustments.get('p-1')).toBe(-5);
      expect(adjustments.get('p-2')).toBe(-3);
    });

    it('aggregates quantities for same product', () => {
      const items = [
        createTestSaleItem({ productId: 'p-1', quantity: 5 }),
        createTestSaleItem({ productId: 'p-1', quantity: 3 }),
      ];

      const adjustments = StockService.calculateSaleAdjustments(items);

      expect(adjustments.get('p-1')).toBe(-8);
    });
  });

  describe('calculateReturnAdjustments', () => {
    it('returns positive adjustments for returns', () => {
      const items = [createTestSaleItem({ productId: 'p-1', quantity: 5 })];

      const adjustments = StockService.calculateReturnAdjustments(items);

      expect(adjustments.get('p-1')).toBe(5);
    });
  });

  describe('generateAlerts', () => {
    it('generates alerts for low stock products', () => {
      const products = [
        createTestProduct({ id: 'p-1', currentStock: 100, minStock: 20 }), // OK
        createTestProduct({ id: 'p-2', currentStock: 15, minStock: 20 }), // Low
        createTestProduct({ id: 'p-3', currentStock: 5, minStock: 20 }), // Critical
        createTestProduct({ id: 'p-4', currentStock: 0, minStock: 20 }), // Out of stock
      ];

      const alerts = StockService.generateAlerts(products);

      expect(alerts).toHaveLength(3);
      expect(alerts[0].status).toBe('out_of_stock');
      expect(alerts[1].status).toBe('critical');
      expect(alerts[2].status).toBe('low');
    });

    it('calculates units to reorder', () => {
      const products = [createTestProduct({ id: 'p-1', currentStock: 10, minStock: 50 })];

      const alerts = StockService.generateAlerts(products);

      // Target is 2x min (100), current is 10, need 90
      expect(alerts[0].unitsNeeded).toBe(90);
    });
  });

  describe('countByStatus', () => {
    it('counts products by status', () => {
      const products = [
        createTestProduct({ currentStock: 100, minStock: 20 }),
        createTestProduct({ currentStock: 15, minStock: 20 }),
        createTestProduct({ currentStock: 5, minStock: 20 }),
        createTestProduct({ currentStock: 0, minStock: 20 }),
      ];

      const counts = StockService.countByStatus(products);

      expect(counts.ok).toBe(1);
      expect(counts.low).toBe(1);
      expect(counts.critical).toBe(1);
      expect(counts.out_of_stock).toBe(1);
    });
  });

  describe('findExpiring', () => {
    it('finds products expiring within days', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);

      const products = [
        createTestProduct({
          id: 'p-1',
          isPerishable: true,
          expirationDate: tomorrow.toISOString().split('T')[0],
        }),
        createTestProduct({
          id: 'p-2',
          isPerishable: true,
          expirationDate: nextWeek.toISOString().split('T')[0],
        }),
        createTestProduct({ id: 'p-3', isPerishable: false }),
      ];

      const expiring = StockService.findExpiring(products, 3);

      expect(expiring).toHaveLength(1);
      expect(expiring[0].id).toBe('p-1');
    });
  });

  describe('generateReorderSuggestions', () => {
    it('generates reorder suggestions for low stock', () => {
      const products = [
        createTestProduct({ id: 'p-1', currentStock: 100, minStock: 20 }), // OK
        createTestProduct({ id: 'p-2', currentStock: 10, minStock: 50, costPrice: 15 }), // Low
      ];

      const suggestions = StockService.generateReorderSuggestions(products);

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].productId).toBe('p-2');
      expect(suggestions[0].suggestedQuantity).toBe(90); // 2*50 - 10
      expect(suggestions[0].estimatedCost).toBe(90 * 15);
    });
  });
});
