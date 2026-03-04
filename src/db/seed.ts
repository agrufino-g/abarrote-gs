// Seed script para poblar la base de datos con datos iniciales
// Ejecutar con: bun run db:seed

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL no esta configurada.');
  console.error('   Revisa tu archivo .env.local');
  process.exit(1);
}

const sql = neon(DATABASE_URL);
const db = drizzle(sql, { schema });

async function seed() {
  console.log('🌱 Iniciando seed de la base de datos...');

  // ==================== PRODUCTOS ====================
  console.log('Insertando productos...');
  const productData = [
    {
      id: 'p1',
      name: 'Leche Entera 1L',
      sku: 'LEC-001',
      barcode: '7501055300112',
      currentStock: 5,
      minStock: 20,
      expirationDate: '2026-03-05',
      category: 'Lácteos',
      costPrice: '22.00',
      unitPrice: '28.50',
      isPerishable: true,
    },
    {
      id: 'p2',
      name: 'Pan Blanco Bimbo',
      sku: 'PAN-001',
      barcode: '7441029500127',
      currentStock: 3,
      minStock: 15,
      expirationDate: '2026-03-04',
      category: 'Panadería',
      costPrice: '26.00',
      unitPrice: '35.00',
      isPerishable: true,
    },
    {
      id: 'p3',
      name: 'Huevo Blanco 1kg',
      sku: 'HUE-001',
      barcode: '7501000910205',
      currentStock: 2,
      minStock: 10,
      expirationDate: '2026-03-10',
      category: 'Huevos',
      costPrice: '42.00',
      unitPrice: '52.00',
      isPerishable: true,
    },
    {
      id: 'p4',
      name: 'Yogurt Natural 500g',
      sku: 'YOG-001',
      barcode: '7501055363148',
      currentStock: 8,
      minStock: 12,
      expirationDate: '2026-03-06',
      category: 'Lácteos',
      costPrice: '14.50',
      unitPrice: '18.90',
      isPerishable: true,
    },
    {
      id: 'p5',
      name: 'Tortillas de Maíz 1kg',
      sku: 'TOR-001',
      barcode: '7501003332100',
      currentStock: 4,
      minStock: 20,
      expirationDate: '2026-03-04',
      category: 'Tortillería',
      costPrice: '16.00',
      unitPrice: '22.00',
      isPerishable: true,
    },
  ];

  for (const p of productData) {
    await db.insert(schema.products).values(p).onConflictDoNothing();
  }

  // ==================== PROVEEDORES ====================
  console.log('🏭 Insertando proveedores...');
  const proveedorData = [
    {
      id: 'prov-1',
      nombre: 'Distribuidora La Central',
      contacto: 'Carlos López',
      telefono: '(555) 234-5678',
      email: 'ventas@lacentral.mx',
      direccion: 'Av. Central #456, CDMX',
      categorias: ['abarrotes', 'bebidas'],
      notas: 'Entrega los martes y viernes',
      activo: true,
      ultimoPedido: new Date('2026-02-28T10:00:00Z'),
    },
    {
      id: 'prov-2',
      nombre: 'Lácteos del Valle',
      contacto: 'María García',
      telefono: '(555) 345-6789',
      email: 'pedidos@lacteosva.mx',
      direccion: 'Blvd. Industrial #789',
      categorias: ['lacteos'],
      notas: 'Manejan devolución por caducidad',
      activo: true,
      ultimoPedido: new Date('2026-03-01T08:00:00Z'),
    },
    {
      id: 'prov-3',
      nombre: 'Panificadora San Marcos',
      contacto: 'Roberto Hernández',
      telefono: '(555) 456-7890',
      email: 'info@sanmarcos.mx',
      direccion: 'Calle Panaderos #12',
      categorias: ['panaderia'],
      notas: 'Entrega diaria a las 6 AM',
      activo: true,
      ultimoPedido: new Date('2026-03-03T06:00:00Z'),
    },
  ];

  for (const prov of proveedorData) {
    await db.insert(schema.proveedores).values(prov).onConflictDoNothing();
  }

  // ==================== VENTAS DE EJEMPLO ====================
  console.log('Insertando ventas de ejemplo...');
  const today = new Date().toISOString().split('T')[0];

  const sale1 = {
    id: 'sale-seed-1',
    folio: 'V-000001',
    subtotal: '80.50',
    iva: '12.88',
    cardSurcharge: '0',
    total: '93.38',
    paymentMethod: 'efectivo',
    amountPaid: '100.00',
    change: '6.62',
    cajero: 'Cajero 1',
    date: new Date(`${today}T09:30:00Z`),
  };

  const sale2 = {
    id: 'sale-seed-2',
    folio: 'V-000002',
    subtotal: '156.00',
    iva: '24.96',
    cardSurcharge: '5.27',
    total: '186.23',
    paymentMethod: 'tarjeta',
    amountPaid: '186.23',
    change: '0',
    cajero: 'Cajero 1',
    date: new Date(`${today}T11:15:00Z`),
  };

  await db.insert(schema.saleRecords).values(sale1).onConflictDoNothing();
  await db.insert(schema.saleRecords).values(sale2).onConflictDoNothing();

  // Sale items
  await db.insert(schema.saleItems).values([
    { id: 'si-seed-1', saleId: 'sale-seed-1', productId: 'p1', productName: 'Leche Entera 1L', sku: 'LEC-001', quantity: 2, unitPrice: '28.50', subtotal: '57.00' },
    { id: 'si-seed-2', saleId: 'sale-seed-1', productId: 'p5', productName: 'Tortillas de Maíz 1kg', sku: 'TOR-001', quantity: 1, unitPrice: '22.00', subtotal: '22.00' },
    { id: 'si-seed-3', saleId: 'sale-seed-2', productId: 'p3', productName: 'Huevo Blanco 1kg', sku: 'HUE-001', quantity: 3, unitPrice: '52.00', subtotal: '156.00' },
  ]).onConflictDoNothing();

  // ==================== CLIENTES ====================
  console.log('👥 Insertando clientes de ejemplo...');
  await db.insert(schema.clientes).values([
    {
      id: 'cli-seed-1',
      name: 'María Sánchez',
      phone: '(555) 111-2233',
      address: 'Calle Juárez #23',
      balance: '350.00',
      creditLimit: '1000.00',
      createdAt: new Date('2026-01-15T10:00:00Z'),
      lastTransaction: new Date('2026-03-01T14:00:00Z'),
    },
    {
      id: 'cli-seed-2',
      name: 'José Ramírez',
      phone: '(555) 444-5566',
      address: 'Av. Reforma #456',
      balance: '0',
      creditLimit: '500.00',
      createdAt: new Date('2026-02-01T10:00:00Z'),
      lastTransaction: null,
    },
  ]).onConflictDoNothing();

  // ==================== FIADO ====================
  console.log('📝 Insertando transacciones de fiado...');
  await db.insert(schema.fiadoTransactions).values([
    {
      id: 'fiado-seed-1',
      clienteId: 'cli-seed-1',
      clienteName: 'María Sánchez',
      type: 'fiado',
      amount: '500.00',
      description: 'Compra semanal',
      saleFolio: null,
      date: new Date('2026-02-20T10:00:00Z'),
    },
    {
      id: 'fiado-seed-2',
      clienteId: 'cli-seed-1',
      clienteName: 'María Sánchez',
      type: 'abono',
      amount: '150.00',
      description: 'Abono parcial',
      date: new Date('2026-03-01T14:00:00Z'),
    },
  ]).onConflictDoNothing();

  // ==================== GASTOS ====================
  console.log('💸 Insertando gastos de ejemplo...');
  await db.insert(schema.gastos).values([
    {
      id: 'gasto-seed-1',
      concepto: 'Renta del local',
      categoria: 'renta',
      monto: '8500.00',
      fecha: new Date('2026-03-01T10:00:00Z'),
      notas: 'Pago mensual de marzo',
      comprobante: true,
    },
    {
      id: 'gasto-seed-2',
      concepto: 'Recibo de luz',
      categoria: 'servicios',
      monto: '1200.00',
      fecha: new Date('2026-03-02T10:00:00Z'),
      notas: 'Bimestral',
      comprobante: true,
    },
  ]).onConflictDoNothing();

  console.log('');
  console.log('Seed completado exitosamente!');
  console.log('   - 5 productos');
  console.log('   - 3 proveedores');
  console.log('   - 2 ventas con 3 items');
  console.log('   - 2 clientes');
  console.log('   - 2 transacciones de fiado');
  console.log('   - 2 gastos');
  console.log('');
  console.log('Ahora puedes iniciar la app con: bun run dev');
}

seed().catch((err) => {
  console.error('Error en seed:', err);
  process.exit(1);
});
