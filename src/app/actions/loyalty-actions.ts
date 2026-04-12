'use server';

import { requirePermission } from '@/lib/auth/guard';
import { withLogging } from '@/lib/errors';
import { db } from '@/db';
import { loyaltyTransactions, clientes } from '@/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import type { LoyaltyTransaction } from '@/types';
import { numVal } from './_helpers';
import { validateSchema, createLoyaltyTransactionSchema } from '@/lib/validation/schemas';

function mapTransaction(row: typeof loyaltyTransactions.$inferSelect): LoyaltyTransaction {
  return {
    id: row.id,
    clienteId: row.clienteId,
    clienteName: row.clienteName,
    tipo: row.tipo as LoyaltyTransaction['tipo'],
    puntos: numVal(row.puntos),
    saldoAnterior: numVal(row.saldoAnterior),
    saldoNuevo: numVal(row.saldoNuevo),
    saleId: row.saleId ?? undefined,
    saleFolio: row.saleFolio ?? undefined,
    notas: row.notas,
    cajero: row.cajero,
    fecha: row.fecha.toISOString(),
  };
}

async function _fetchLoyaltyTransactions(clienteId?: string): Promise<LoyaltyTransaction[]> {
  await requirePermission('customers.view');
  const rows = clienteId
    ? await db
        .select()
        .from(loyaltyTransactions)
        .where(eq(loyaltyTransactions.clienteId, clienteId))
        .orderBy(desc(loyaltyTransactions.fecha))
    : await db.select().from(loyaltyTransactions).orderBy(desc(loyaltyTransactions.fecha));
  return rows.map(mapTransaction);
}

async function _createLoyaltyTransaction(data: {
  clienteId: string;
  clienteName: string;
  tipo: LoyaltyTransaction['tipo'];
  puntos: number;
  saldoAnterior: number;
  saldoNuevo: number;
  saleId?: string;
  saleFolio?: string;
  notas: string;
  cajero: string;
}): Promise<LoyaltyTransaction> {
  await requirePermission('sales.create');
  const _validated = validateSchema(createLoyaltyTransactionSchema, data, 'createLoyaltyTransaction');

  const id = `lt-${crypto.randomUUID()}`;
  const now = new Date();

  await db.insert(loyaltyTransactions).values({
    id,
    clienteId: data.clienteId,
    clienteName: data.clienteName,
    tipo: data.tipo,
    puntos: String(data.puntos),
    saldoAnterior: String(data.saldoAnterior),
    saldoNuevo: String(data.saldoNuevo),
    saleId: data.saleId ?? null,
    saleFolio: data.saleFolio ?? null,
    notas: data.notas,
    cajero: data.cajero,
    fecha: now,
  });

  const [row] = await db.select().from(loyaltyTransactions).where(eq(loyaltyTransactions.id, id)).limit(1);
  return mapTransaction(row);
}

// ==================== POINT EXPIRATION ====================

/**
 * Expire loyalty points for customers inactive longer than `expirationDays`.
 * Called by cron/QStash. Finds customers with points > 0 whose last transaction
 * is older than the cutoff, creates an 'expiracion' record, and zeros their balance.
 */
async function _expireStalePoints(expirationDays = 365): Promise<{ expired: number }> {
  await requirePermission('customers.edit');

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - expirationDays);

  // Find customers with points > 0 and last transaction before cutoff
  const staleClientes = await db
    .select({
      id: clientes.id,
      name: clientes.name,
      points: clientes.points,
      lastTransaction: clientes.lastTransaction,
    })
    .from(clientes)
    .where(sql`${clientes.points}::numeric > 0 AND ${clientes.lastTransaction} < ${cutoffDate}`);

  let expired = 0;

  for (const cliente of staleClientes) {
    const currentPoints = numVal(cliente.points);
    if (currentPoints <= 0) continue;

    // Zero out points
    await db
      .update(clientes)
      .set({ points: sql`0` })
      .where(eq(clientes.id, cliente.id));

    // Record expiration transaction
    await db.insert(loyaltyTransactions).values({
      id: `lt-exp-${crypto.randomUUID()}`,
      clienteId: cliente.id,
      clienteName: cliente.name,
      tipo: 'expiracion',
      puntos: String(-currentPoints),
      saldoAnterior: String(currentPoints),
      saldoNuevo: '0',
      saleId: null,
      saleFolio: null,
      notas: `Expiración por inactividad (${expirationDays} días sin transacciones)`,
      cajero: 'sistema',
      fecha: new Date(),
    });

    expired++;
  }

  return { expired };
}

// ==================== EXPORTS ====================

export const fetchLoyaltyTransactions = withLogging('loyalty.fetchLoyaltyTransactions', _fetchLoyaltyTransactions);
export const createLoyaltyTransaction = withLogging('loyalty.createLoyaltyTransaction', _createLoyaltyTransaction);
export const expireStalePoints = withLogging('loyalty.expireStalePoints', _expireStalePoints);
