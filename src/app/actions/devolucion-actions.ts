'use server';

import { requirePermission } from '@/lib/auth/guard';
import { db } from '@/db';
import { devoluciones, devolucionItems, products, clientes, saleRecords, saleItems } from '@/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import type { Devolucion, DevolucionItem } from '@/types';
import { numVal } from './_helpers';

function mapDevolucion(row: typeof devoluciones.$inferSelect, items: DevolucionItem[]): Devolucion {
  return {
    id: row.id,
    saleId: row.saleId,
    saleFolio: row.saleFolio,
    tipo: row.tipo as Devolucion['tipo'],
    motivo: row.motivo as Devolucion['motivo'],
    notas: row.notas,
    montoDevuelto: numVal(row.montoDevuelto),
    metodoDev: row.metodoDev as Devolucion['metodoDev'],
    cajero: row.cajero,
    clienteId: row.clienteId ?? undefined,
    fecha: row.fecha.toISOString(),
    items,
  };
}

export async function fetchDevoluciones(): Promise<Devolucion[]> {
  await requirePermission('sales.view');
  const rows = await db.select().from(devoluciones).orderBy(desc(devoluciones.fecha));
  const result: Devolucion[] = [];
  for (const row of rows) {
    const itemRows = await db.select().from(devolucionItems).where(eq(devolucionItems.devolucionId, row.id));
    const items: DevolucionItem[] = itemRows.map(i => ({
      id: i.id,
      productId: i.productId,
      productName: i.productName,
      sku: i.sku,
      quantity: i.quantity,
      unitPrice: numVal(i.unitPrice),
      subtotal: numVal(i.subtotal),
      regresoInventario: i.regresoInventario,
    }));
    result.push(mapDevolucion(row, items));
  }
  return result;
}

export async function createDevolucion(data: {
  saleId: string;
  saleFolio: string;
  tipo: Devolucion['tipo'];
  motivo: Devolucion['motivo'];
  notas: string;
  montoDevuelto: number;
  metodoDev: Devolucion['metodoDev'];
  cajero: string;
  clienteId?: string;
  items: Omit<DevolucionItem, 'id'>[];
}): Promise<Devolucion> {
  await requirePermission('sales.cancel');

  const id = `dev-${Date.now()}`;
  const now = new Date();

  await db.insert(devoluciones).values({
    id,
    saleId: data.saleId,
    saleFolio: data.saleFolio,
    tipo: data.tipo,
    motivo: data.motivo,
    notas: data.notas,
    montoDevuelto: String(data.montoDevuelto),
    metodoDev: data.metodoDev,
    cajero: data.cajero,
    clienteId: data.clienteId ?? null,
    fecha: now,
  });

  const savedItems: DevolucionItem[] = [];
  for (const item of data.items) {
    const itemId = `devi-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    await db.insert(devolucionItems).values({
      id: itemId,
      devolucionId: id,
      productId: item.productId,
      productName: item.productName,
      sku: item.sku,
      quantity: item.quantity,
      unitPrice: String(item.unitPrice),
      subtotal: String(item.subtotal),
      regresoInventario: item.regresoInventario,
    });

    // Regresar al inventario si aplica
    if (item.regresoInventario) {
      await db.update(products)
        .set({ currentStock: sql`current_stock + ${item.quantity}`, updatedAt: now })
        .where(eq(products.id, item.productId));
    }

    savedItems.push({ ...item, id: itemId });
  }

  // Si el método es crédito_cliente, abonar al balance del cliente
  if (data.metodoDev === 'credito_cliente' && data.clienteId) {
    await db.update(clientes)
      .set({ balance: sql`balance::numeric - ${data.montoDevuelto}`, lastTransaction: now })
      .where(eq(clientes.id, data.clienteId));
  }

  const [row] = await db.select().from(devoluciones).where(eq(devoluciones.id, id)).limit(1);
  return mapDevolucion(row, savedItems);
}

// Precarga los items de una venta para poblar el formulario de devolución
export async function getSaleItemsForDevolucion(saleId: string) {
  await requirePermission('sales.view');
  const items = await db.select().from(saleItems).where(eq(saleItems.saleId, saleId));
  return items.map(i => ({
    productId: i.productId,
    productName: i.productName,
    sku: i.sku,
    quantity: i.quantity,
    unitPrice: numVal(i.unitPrice),
    subtotal: numVal(i.subtotal),
  }));
}
