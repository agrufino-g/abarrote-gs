import { describe, it, expect } from 'vitest';
import { Product } from '@/domain/entities/Product';
import { Money, StockLevel } from '@/domain/value-objects';

describe('Product Entity', () => {
  function validProductProps() {
    return {
      id: 'p-123',
      name: 'Coca-Cola 600ml',
      sku: 'CC600',
      barcode: '7501234567890',
      category: 'bebidas',
      costPrice: Money.fromPesos(15),
      unitPrice: Money.fromPesos(22),
      unit: 'pz',
      unitMultiple: 1,
      stockLevel: StockLevel.of(100, 20),
      isPerishable: false,
      expirationDate: null,
    };
  }

  describe('creation', () => {
    it('should create valid product', () => {
      const product = Product.create(validProductProps());
      expect(product.id).toBe('p-123');
      expect(product.name).toBe('Coca-Cola 600ml');
      expect(product.sku).toBe('CC600');
      expect(product.barcode).toBe('7501234567890');
      expect(product.category).toBe('bebidas');
    });

    it('should expose prices correctly', () => {
      const product = Product.create(validProductProps());
      expect(product.costPrice.toPesos()).toBe(15);
      expect(product.unitPrice.toPesos()).toBe(22);
    });

    it('should expose stock level with correct status', () => {
      const product = Product.create(validProductProps());
      // 100 current vs 20 minimum = ok status
      expect(product.stockLevel.status).toBe('ok');
    });
  });

  describe('invariant validation', () => {
    it('should throw if ID is empty', () => {
      expect(() => Product.create({ ...validProductProps(), id: '' })).toThrow('Product: ID is required');
    });

    it('should throw if ID is whitespace', () => {
      expect(() => Product.create({ ...validProductProps(), id: '   ' })).toThrow('Product: ID is required');
    });

    it('should throw if name is empty', () => {
      expect(() => Product.create({ ...validProductProps(), name: '' })).toThrow('Product: Name is required');
    });

    it('should throw if SKU is empty', () => {
      expect(() => Product.create({ ...validProductProps(), sku: '' })).toThrow('Product: SKU is required');
    });

    it('should throw if barcode is empty', () => {
      expect(() => Product.create({ ...validProductProps(), barcode: '' })).toThrow('Product: Barcode is required');
    });

    it('should throw if cost price is zero', () => {
      expect(() =>
        Product.create({
          ...validProductProps(),
          costPrice: Money.zero(),
        }),
      ).toThrow('Product: Cost price must be positive');
    });

    it('should throw if unit price is zero', () => {
      expect(() =>
        Product.create({
          ...validProductProps(),
          unitPrice: Money.zero(),
        }),
      ).toThrow('Product: Unit price must be positive');
    });

    it('should throw if unit price is less than cost price', () => {
      expect(() =>
        Product.create({
          ...validProductProps(),
          costPrice: Money.fromPesos(25),
          unitPrice: Money.fromPesos(20),
        }),
      ).toThrow('Product: Unit price must be greater than cost price');
    });

    it('should throw if unit price equals cost price', () => {
      expect(() =>
        Product.create({
          ...validProductProps(),
          costPrice: Money.fromPesos(20),
          unitPrice: Money.fromPesos(20),
        }),
      ).toThrow('Product: Unit price must be greater than cost price');
    });

    it('should throw if perishable without expiration date', () => {
      expect(() =>
        Product.create({
          ...validProductProps(),
          isPerishable: true,
          expirationDate: null,
        }),
      ).toThrow('Product: Perishable products require expiration date');
    });

    it('should allow perishable with expiration date', () => {
      const product = Product.create({
        ...validProductProps(),
        isPerishable: true,
        expirationDate: '2025-12-31',
      });
      expect(product.isPerishable).toBe(true);
    });
  });

  describe('fromPersistence', () => {
    it('should create product without validation (trusted source)', () => {
      const product = Product.fromPersistence(validProductProps());
      expect(product.id).toBe('p-123');
    });
  });

  describe('business logic', () => {
    it('should check low stock status via stockLevel', () => {
      const lowStockProduct = Product.create({
        ...validProductProps(),
        stockLevel: StockLevel.of(10, 20),
      });
      expect(lowStockProduct.stockLevel.status).toBe('low');
    });

    it('should have ok status for adequate stock', () => {
      const product = Product.create(validProductProps());
      expect(product.stockLevel.status).toBe('ok');
    });

    it('should have critical status for very low stock', () => {
      const criticalProduct = Product.create({
        ...validProductProps(),
        stockLevel: StockLevel.of(5, 20),
      });
      expect(criticalProduct.stockLevel.status).toBe('critical');
    });

    it('should have out_of_stock status for zero stock', () => {
      const emptyProduct = Product.create({
        ...validProductProps(),
        stockLevel: StockLevel.of(0, 20),
      });
      expect(emptyProduct.stockLevel.status).toBe('out_of_stock');
    });
  });
});
