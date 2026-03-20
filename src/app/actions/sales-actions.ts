'use server';

import { requirePermission, requireAuth, validateId } from '@/lib/auth/guard';
import { db } from '@/db';
import { saleRecords, saleItems, products, clientes, gastos, cortesCaja, loyaltyTransactions } from '@/db/schema';
import { eq, desc, sql, inArray } from 'drizzle-orm';
import type { SaleRecord, SaleItem, SalesData, CorteCaja } from '@/types';
import { numVal } from './_helpers';
import { sendNotification } from './_notifications';
import { logger } from '@/lib/logger';

// ==================== FOLIO ====================

async function getNextFolio(): Promise<string> {
  // Use MAX(folio) instead of COUNT(*) to avoid race condition duplicates
  // Filter only numeric folios to avoid cast errors
  const result = await db
    .select({ maxFolio: sql<string>`coalesce(max(case when folio ~ '^\d+$' then folio::integer end), 309000)` })
    .from(saleRecords);
  const next = Number(result[0]?.maxFolio ?? 309000) + 1;
  return String(next);
}

// ==================== SALES DATA (computed) ====================

export async function fetchSalesData(): Promise<SalesData[]> {
  await requirePermission('sales.view');
  const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const today = new Date();
  const dayOfWeek = today.getDay();

  const result: SalesData[] = [];

  for (let i = 0; i < 7; i++) {
    const currentDate = new Date(today);
    currentDate.setDate(today.getDate() - dayOfWeek + i);
    const currentDateStr = currentDate.toISOString().split('T')[0];

    const prevDate = new Date(currentDate);
    prevDate.setDate(prevDate.getDate() - 7);
    const prevDateStr = prevDate.toISOString().split('T')[0];

    const currentResult = await db
      .select({ total: sql<string>`coalesce(sum(total::numeric), 0)` })
      .from(saleRecords)
      .where(sql`date::date = ${currentDateStr}`);

    const prevResult = await db
      .select({ total: sql<string>`coalesce(sum(total::numeric), 0)` })
      .from(saleRecords)
      .where(sql`date::date = ${prevDateStr}`);

    result.push({
      date: days[i],
      currentWeek: numVal(currentResult[0]?.total),
      previousWeek: numVal(prevResult[0]?.total),
    });
  }

  return result;
}

// ==================== SALES ====================

export async function fetchSaleRecords(): Promise<SaleRecord[]> {
  await requirePermission('sales.view');
  const rows = await db.select().from(saleRecords).orderBy(desc(saleRecords.date));
  if (rows.length === 0) return [];

  // Batch fetch all items for all sales in one query
  const saleIds = rows.map(r => r.id);
  const allItems = await db.select().from(saleItems).where(inArray(saleItems.saleId, saleIds));

  // Group items by saleId
  const itemsBySaleId = new Map<string, SaleItem[]>();
  for (const item of allItems) {
    const list = itemsBySaleId.get(item.saleId) || [];
    list.push({
      productId: item.productId,
      productName: item.productName,
      sku: item.sku,
      quantity: item.quantity,
      unitPrice: numVal(item.unitPrice),
      subtotal: numVal(item.subtotal),
    });
    itemsBySaleId.set(item.saleId, list);
  }

  return rows.map(row => ({
    id: row.id,
    folio: row.folio,
    items: itemsBySaleId.get(row.id) || [],
    subtotal: numVal(row.subtotal),
    iva: numVal(row.iva),
    cardSurcharge: numVal(row.cardSurcharge),
    total: numVal(row.total),
    paymentMethod: row.paymentMethod as 'efectivo' | 'tarjeta' | 'transferencia' | 'fiado',
    amountPaid: numVal(row.amountPaid),
    change: numVal(row.change),
    date: row.date.toISOString(),
    cajero: row.cajero,
    pointsEarned: numVal(row.pointsEarned),
    pointsUsed: numVal(row.pointsUsed),
    discount: numVal((row as any).discount ?? '0'),
    discountType: ((row as any).discountType ?? 'amount') as 'amount' | 'percent',
  }));
}

export async function createSale(
  saleData: Omit<SaleRecord, 'id' | 'folio' | 'date'>
): Promise<SaleRecord> {
  return logger.withTiming('createSale', async () => {
  await requirePermission('sales.create');
  const id = `sale-${Date.now()}`;
  const folio = await getNextFolio();
  const now = new Date();
  const cajero = saleData.cajero?.trim() || 'Cajero';

  try {
    await db.insert(saleRecords).values({
      id,
      folio,
      subtotal: String(saleData.subtotal),
      iva: String(saleData.iva),
      cardSurcharge: String(saleData.cardSurcharge),
      total: String(saleData.total),
      paymentMethod: saleData.paymentMethod,
      amountPaid: String(saleData.amountPaid),
      change: String(saleData.change),
      cajero,
      pointsEarned: String(saleData.pointsEarned),
      pointsUsed: String(saleData.pointsUsed),
      discount: String(saleData.discount ?? 0),
      discountType: saleData.discountType ?? 'amount',
      date: now,
    });
  } catch (err: any) {
    logger.error('INSERT sale_records failed', {
      action: 'createSale',
      folio,
      pgCode: err?.cause?.code ?? err?.code,
      pgMessage: err?.cause?.message ?? err?.message,
      detail: err?.cause?.detail ?? err?.detail,
    });
    throw err;
  }

  const clienteId = (saleData as any).clienteId;
  if (clienteId) {
    // Get current points balance before update
    const [clienteRow] = await db.select().from(clientes).where(eq(clientes.id, clienteId)).limit(1);
    const saldoAnterior = clienteRow ? numVal(clienteRow.points) : 0;
    const puntosNetos = saleData.pointsEarned - saleData.pointsUsed;
    const saldoNuevo = saldoAnterior + puntosNetos;

    await db.update(clientes)
      .set({
        points: sql`points::numeric + ${saleData.pointsEarned} - ${saleData.pointsUsed}`,
        lastTransaction: now,
      })
      .where(eq(clientes.id, clienteId));

    // Write loyalty history only when points change
    if (puntosNetos !== 0) {
      const ltId = `lt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      await db.insert(loyaltyTransactions).values({
        id: ltId,
        clienteId,
        clienteName: clienteRow?.name ?? '',
        tipo: saleData.pointsEarned > 0 ? 'acumulacion' : 'canje',
        puntos: String(puntosNetos),
        saldoAnterior: String(saldoAnterior),
        saldoNuevo: String(saldoNuevo),
        saleId: id,
        saleFolio: folio,
        notas: `Venta folio ${folio}`,
        cajero,        fecha: now,
      });
    }
  }

  for (const item of saleData.items) {
    await db.insert(saleItems).values({
      id: `si-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      saleId: id,
      productId: item.productId,
      productName: item.productName,
      sku: item.sku,
      quantity: item.quantity,
      unitPrice: String(item.unitPrice),
      subtotal: String(item.subtotal),
    });
  }

  for (const item of saleData.items) {
    await db
      .update(products)
      .set({
        currentStock: sql`greatest(0, current_stock - ${item.quantity})`,
        updatedAt: now,
      })
      .where(eq(products.id, item.productId));

    const p = await db.select().from(products).where(eq(products.id, item.productId)).limit(1);
    if (p.length > 0 && p[0].currentStock <= p[0].minStock * 0.2) {
      await sendNotification(
        `⚠️ <b>STOCK CRÍTICO</b>\n\n` +
        `Producto: ${p[0].name}\n` +
        `Stock actual: ${p[0].currentStock}\n` +
        `Mínimo sugerido: ${p[0].minStock}`
      );
    }
  }

  return {
    ...saleData,
    id,
    folio,
    date: now.toISOString(),
    discount: saleData.discount ?? 0,
    discountType: saleData.discountType ?? 'amount',
  };
  }, { items: saleData.items.length });
}

export async function cancelSale(saleId: string): Promise<void> {
  await requirePermission('sales.cancel');
  validateId(saleId, 'Sale ID');
  const items = await db.select().from(saleItems).where(eq(saleItems.saleId, saleId));
  for (const item of items) {
    await db
      .update(products)
      .set({
        currentStock: sql`current_stock + ${item.quantity}`,
        updatedAt: new Date(),
      })
      .where(eq(products.id, item.productId));
  }
  await db.delete(saleItems).where(eq(saleItems.saleId, saleId));
  await db.delete(saleRecords).where(eq(saleRecords.id, saleId));
}

// ==================== CORTES DE CAJA ====================

export async function fetchCortesHistory(): Promise<CorteCaja[]> {
  await requirePermission('corte.view');
  const rows = await db.select().from(cortesCaja).orderBy(desc(cortesCaja.fecha));
  return rows.map((r) => ({
    id: r.id,
    fecha: r.fecha.toISOString(),
    cajero: r.cajero,
    ventasEfectivo: numVal(r.ventasEfectivo),
    ventasTarjeta: numVal(r.ventasTarjeta),
    ventasTransferencia: numVal(r.ventasTransferencia),
    ventasFiado: numVal(r.ventasFiado),
    totalVentas: numVal(r.totalVentas),
    totalTransacciones: r.totalTransacciones,
    efectivoEsperado: numVal(r.efectivoEsperado),
    efectivoContado: numVal(r.efectivoContado),
    diferencia: numVal(r.diferencia),
    fondoInicial: numVal(r.fondoInicial),
    gastosDelDia: numVal(r.gastosDelDia),
    notas: r.notas,
    status: r.status as 'abierto' | 'cerrado',
  }));
}

export async function createCorteCaja(data: {
  cajero: string;
  efectivoContado: number;
  fondoInicial: number;
  notas: string;
}): Promise<CorteCaja> {
  await requirePermission('corte.create');
  const todayStr = new Date().toISOString().split('T')[0];

  const salesRows = await db
    .select()
    .from(saleRecords)
    .where(sql`date::date = ${todayStr}`);

  const ventasEfectivo = salesRows.filter((s) => s.paymentMethod === 'efectivo').reduce((sum, s) => sum + numVal(s.total), 0);
  const ventasTarjeta = salesRows.filter((s) => s.paymentMethod === 'tarjeta').reduce((sum, s) => sum + numVal(s.total), 0);
  const ventasTransferencia = salesRows.filter((s) => s.paymentMethod === 'transferencia').reduce((sum, s) => sum + numVal(s.total), 0);
  const ventasFiado = salesRows.filter((s) => s.paymentMethod === 'fiado').reduce((sum, s) => sum + numVal(s.total), 0);
  const totalVentas = ventasEfectivo + ventasTarjeta + ventasTransferencia + ventasFiado;
  const totalTransacciones = salesRows.length;

  const gastosRows = await db.select().from(gastos).where(sql`fecha::date = ${todayStr}`);
  const gastosDelDia = gastosRows.reduce((sum, g) => sum + numVal(g.monto), 0);

  const efectivoEsperado = data.fondoInicial + ventasEfectivo - gastosDelDia;
  const diferencia = data.efectivoContado - efectivoEsperado;

  const corte: CorteCaja = {
    id: `corte-${Date.now()}`,
    fecha: new Date().toISOString(),
    cajero: data.cajero,
    ventasEfectivo,
    ventasTarjeta,
    ventasTransferencia,
    ventasFiado,
    totalVentas,
    totalTransacciones,
    efectivoEsperado,
    efectivoContado: data.efectivoContado,
    diferencia,
    fondoInicial: data.fondoInicial,
    gastosDelDia,
    notas: data.notas,
    status: 'cerrado',
  };

  await db.insert(cortesCaja).values({
    id: corte.id,
    fecha: new Date(),
    cajero: corte.cajero,
    ventasEfectivo: String(corte.ventasEfectivo),
    ventasTarjeta: String(corte.ventasTarjeta),
    ventasTransferencia: String(corte.ventasTransferencia),
    ventasFiado: String(corte.ventasFiado),
    totalVentas: String(corte.totalVentas),
    totalTransacciones: corte.totalTransacciones,
    efectivoEsperado: String(corte.efectivoEsperado),
    efectivoContado: String(corte.efectivoContado),
    diferencia: String(corte.diferencia),
    fondoInicial: String(corte.fondoInicial),
    gastosDelDia: String(corte.gastosDelDia),
    notas: corte.notas,
    status: corte.status,
  });

  await sendNotification(
    `💰 <b>CORTE DE CAJA REALIZADO</b>\n\n` +
    `Cajero: ${corte.cajero}\n` +
    `Total Ventas: $${numVal(String(corte.totalVentas)).toFixed(2)}\n` +
    `Efectivo Contado: $${numVal(String(corte.efectivoContado)).toFixed(2)}\n` +
    `Diferencia: $${numVal(String(corte.diferencia)).toFixed(2)}\n` +
    `Status: <b>${corte.status.toUpperCase()}</b>\n\n` +
    (corte.notas ? `Notas: ${corte.notas}` : '')
  );

  return corte;
}

export async function createAutoCorteCaja(): Promise<void> {
  const today = new Date().toISOString().split('T')[0];

  const existingCortes = await db.select().from(cortesCaja);
  const todayCorte = existingCortes.find(c => c.fecha.toISOString().startsWith(today));
  if (todayCorte) return;

  const allSales = await db.select().from(saleRecords);
  const todaySales = allSales.filter(s => s.date.toISOString().startsWith(today));
  if (todaySales.length === 0) return;

  const ventasEfectivo = todaySales.filter(s => s.paymentMethod === 'efectivo').reduce((sum, s) => sum + parseFloat(String(s.total)), 0);
  const ventasTarjeta = todaySales.filter(s => s.paymentMethod === 'tarjeta').reduce((sum, s) => sum + parseFloat(String(s.total)), 0);
  const ventasTransferencia = todaySales.filter(s => s.paymentMethod === 'transferencia').reduce((sum, s) => sum + parseFloat(String(s.total)), 0);
  const ventasFiado = todaySales.filter(s => s.paymentMethod === 'fiado').reduce((sum, s) => sum + parseFloat(String(s.total)), 0);
  const totalVentas = ventasEfectivo + ventasTarjeta + ventasTransferencia + ventasFiado;

  const allGastos = await db.select().from(gastos);
  const todayGastos = allGastos.filter(g => g.fecha.toISOString().startsWith(today)).reduce((sum, g) => sum + parseFloat(String(g.monto)), 0);

  const fondoInicial = 500;
  const efectivoEsperado = fondoInicial + ventasEfectivo - todayGastos;

  await db.insert(cortesCaja).values({
    id: crypto.randomUUID(),
    fecha: new Date(),
    cajero: 'Sistema (automatico)',
    ventasEfectivo: String(ventasEfectivo),
    ventasTarjeta: String(ventasTarjeta),
    ventasTransferencia: String(ventasTransferencia),
    ventasFiado: String(ventasFiado),
    totalVentas: String(totalVentas),
    totalTransacciones: todaySales.length,
    efectivoEsperado: String(efectivoEsperado),
    efectivoContado: String(efectivoEsperado),
    diferencia: '0',
    fondoInicial: String(fondoInicial),
    gastosDelDia: String(todayGastos),
    notas: 'Corte automatico generado a medianoche',
    status: 'cerrado',
  });
}
