import { describe, it, expect } from 'vitest';
import { SaleItem } from '@/domain/entities/SaleItem';
import { Money, Quantity } from '@/domain/value-objects';

describe('SaleItem Entity', () => {
  function validItemProps() {
    return {
      productId: 'p-123',
      productName: 'Coca-Cola 600ml',
      quantity: Quantity.of(3),
      unitPrice: Money.fromPesos(22),
      costPrice: Money.fromPesos(15),
    };
  }

  describe('creation', () => {
    it('should create valid sale item', () => {
      const item = SaleItem.create(validItemProps());
      expect(item.productId).toBe('p-123');
      expect(item.productName).toBe('Coca-Cola 600ml');
      expect(item.quantity.value).toBe(3);
    });

    it('should default discount to zero', () => {
      const item = SaleItem.create(validItemProps());
      expect(item.discount.toPesos()).toBe(0);
    });

    it('should accept explicit discount', () => {
      const item = SaleItem.create({
        ...validItemProps(),
        discount: Money.fromPesos(5),
      });
      expect(item.discount.toPesos()).toBe(5);
    });
  });

  describe('invariant validation', () => {
    it('should throw if product ID is empty', () => {
      expect(() => SaleItem.create({ ...validItemProps(), productId: '' }))
        .toThrow('SaleItem: Product ID is required');
    });

    it('should throw if product ID is whitespace', () => {
      expect(() => SaleItem.create({ ...validItemProps(), productId: '   ' }))
        .toThrow('SaleItem: Product ID is required');
    });

    it('should throw if product name is empty', () => {
      expect(() => SaleItem.create({ ...validItemProps(), productName: '' }))
        .toThrow('SaleItem: Product name is required');
    });

    it('should throw if quantity is zero', () => {
      expect(() => SaleItem.create({
        ...validItemProps(),
        quantity: Quantity.of(0),
      })).toThrow('SaleItem: Quantity must be greater than zero');
    });

    it('should throw if unit price is zero', () => {
      expect(() => SaleItem.create({
        ...validItemProps(),
        unitPrice: Money.zero(),
      })).toThrow('SaleItem: Unit price must be positive');
    });
  });

  describe('fromPersistence', () => {
    it('should create from primitive values', () => {
      const item = SaleItem.fromPersistence('p-456', 'Pepsi 600ml', 2, 20, 12, 0);
      expect(item.productId).toBe('p-456');
      expect(item.productName).toBe('Pepsi 600ml');
      expect(item.quantity.value).toBe(2);
      expect(item.unitPrice.toPesos()).toBe(20);
      expect(item.costPrice.toPesos()).toBe(12);
    });

    it('should handle optional discount in persistence', () => {
      const item = SaleItem.fromPersistence('p-456', 'Pepsi 600ml', 2, 20, 12);
      expect(item.discount.toPesos()).toBe(0);
    });

    it('should parse discount from persistence', () => {
      const item = SaleItem.fromPersistence('p-456', 'Pepsi 600ml', 2, 20, 12, 3);
      expect(item.discount.toPesos()).toBe(3);
    });
  });

  describe('calculations', () => {
    it('should calculate gross subtotal', () => {
      const item = SaleItem.create(validItemProps());
      // 22 × 3 = 66
      expect(item.grossSubtotal.toPesos()).toBe(66);
    });

    it('should calculate subtotal with discount', () => {
      const item = SaleItem.create({
        ...validItemProps(),
        discount: Money.fromPesos(6),
      });
      // 66 - 6 = 60
      expect(item.subtotal.toPesos()).toBe(60);
    });

    it('should calculate subtotal without discount', () => {
      const item = SaleItem.create(validItemProps());
      expect(item.subtotal.toPesos()).toBe(66);
    });

    it('should calculate total cost', () => {
      const item = SaleItem.create(validItemProps());
      // 15 × 3 = 45
      expect(item.totalCost.toPesos()).toBe(45);
    });

    it('should calculate profit', () => {
      const item = SaleItem.create(validItemProps());
      // subtotal (66) - totalCost (45) = 21
      expect(item.profit.toPesos()).toBe(21);
    });

    it('should calculate profit with discount', () => {
      const item = SaleItem.create({
        ...validItemProps(),
        discount: Money.fromPesos(6),
      });
      // subtotal (60) - totalCost (45) = 15
      expect(item.profit.toPesos()).toBe(15);
    });

    it('should calculate margin percent', () => {
      const item = SaleItem.create(validItemProps());
      // profit (21) / totalCost (45) × 100 ≈ 46.67%
      expect(item.marginPercent).toBeCloseTo(46.67, 1);
    });
  });

  describe('immutability', () => {
    it('should create new instance when adding quantity', () => {
      const original = SaleItem.create(validItemProps());
      const updated = original.addQuantity(Quantity.of(2));
      
      expect(updated.quantity.value).toBe(5);
      expect(original.quantity.value).toBe(3);
      expect(updated).not.toBe(original);
    });

    it('should create new instance when applying discount', () => {
      const original = SaleItem.create(validItemProps());
      const updated = original.applyDiscount(Money.fromPesos(10));
      
      expect(updated.discount.toPesos()).toBe(10);
      expect(original.discount.toPesos()).toBe(0);
      expect(updated).not.toBe(original);
    });

    it('should throw if discount exceeds subtotal', () => {
      const item = SaleItem.create(validItemProps());
      expect(() => item.applyDiscount(Money.fromPesos(100)))
        .toThrow('SaleItem: Discount cannot exceed subtotal');
    });
  });

  describe('edge cases', () => {
    it('should handle large quantities', () => {
      const item = SaleItem.create({
        ...validItemProps(),
        quantity: Quantity.of(1000),
      });
      expect(item.grossSubtotal.toPesos()).toBe(22000);
    });

    it('should handle fractional quantities', () => {
      const item = SaleItem.create({
        ...validItemProps(),
        quantity: Quantity.of(1.5),
      });
      // 22 × 1.5 = 33
      expect(item.grossSubtotal.toPesos()).toBe(33);
    });
  });
});
