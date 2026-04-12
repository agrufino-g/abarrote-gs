'use server';

import { requirePermission, sanitize, validateNumber } from '@/lib/auth/guard';
import { withLogging } from '@/lib/errors';
import { db } from '@/db';
import { servicios, storeConfig } from '@/db/schema';
import { eq, desc, sql, and, gte, lte } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { logger } from '@/lib/logger';
import type { Servicio, ServicioEstado } from '@/types';
import { sendNotification, escapeHTML } from './_notifications';
import { SERVICIO_CATALOGO } from './servicios-catalogo';
import { validateSchema, createRecargaSchema, createPagoServicioSchema, idSchema } from '@/lib/validation/schemas';
import {
  getActiveProvider,
  normalizePhoneNumber,
  isValidMexicanPhone,
  validateReferenceNumber,
  type ServiciosProviderConfig,
} from '@/infrastructure/servicios';

// ==================== HELPERS ====================

/** Load the active servicios provider from storeConfig */
async function loadProviderConfig(): Promise<ServiciosProviderConfig> {
  const [row] = await db
    .select({
      providerId: storeConfig.serviciosProvider,
      apiKey: storeConfig.serviciosApiKey,
      apiSecret: storeConfig.serviciosApiSecret,
      sandbox: storeConfig.serviciosSandbox,
    })
    .from(storeConfig)
    .limit(1);

  return {
    providerId: row?.providerId ?? 'local',
    apiKey: row?.apiKey ?? undefined,
    apiSecret: row?.apiSecret ?? undefined,
    sandbox: row?.sandbox ?? true,
  };
}

function mapRow(r: typeof servicios.$inferSelect): Servicio {
  return {
    id: r.id,
    tipo: r.tipo as 'recarga' | 'servicio',
    categoria: r.categoria,
    nombre: r.nombre,
    monto: Number(r.monto),
    comision: Number(r.comision),
    numeroReferencia: r.numeroReferencia,
    folio: r.folio,
    estado: r.estado as ServicioEstado,
    cajero: r.cajero,
    fecha: r.fecha.toISOString(),
    providerId: r.providerId,
    providerTransactionId: r.providerTransactionId ?? undefined,
    providerAuthCode: r.providerAuthCode ?? undefined,
    providerError: r.providerError ?? undefined,
    providerRespondedAt: r.providerRespondedAt?.toISOString(),
  };
}

/** Atomic folio generation using a sequence */
async function generateFolio(): Promise<string> {
  await db.execute(sql`CREATE SEQUENCE IF NOT EXISTS servicios_folio_seq START 1`);

  // Sync sequence to current max folio (first time only)
  const maxResult = await db.execute(
    sql`SELECT COALESCE(MAX(CAST(SUBSTRING(folio FROM 'SRV-(.*)') AS INTEGER)), 0) AS max_num FROM servicios`,
  );
  const maxNum = Number((maxResult as unknown as { rows: { max_num: number }[] }).rows?.[0]?.max_num) || 0;

  await db.execute(
    sql`SELECT setval('servicios_folio_seq', GREATEST(${maxNum}, (SELECT last_value FROM servicios_folio_seq)), true)`,
  );

  const result = await db.execute(sql`SELECT nextval('servicios_folio_seq') AS seq`);
  const seq = Number((result as unknown as { rows: { seq: string }[] }).rows?.[0]?.seq) || Date.now();

  return `SRV-${String(seq).padStart(6, '0')}`;
}

// ==================== QUERIES ==

async function _fetchServicios(filtro?: {
  tipo?: 'recarga' | 'servicio';
  desde?: string;
  hasta?: string;
}): Promise<Servicio[]> {
  await requirePermission('servicios.view');

  const conditions = [];
  if (filtro?.tipo) {
    conditions.push(eq(servicios.tipo, filtro.tipo));
  }
  if (filtro?.desde) {
    conditions.push(gte(servicios.fecha, new Date(filtro.desde)));
  }
  if (filtro?.hasta) {
    conditions.push(lte(servicios.fecha, new Date(filtro.hasta)));
  }

  const rows =
    conditions.length > 0
      ? await db
          .select()
          .from(servicios)
          .where(and(...conditions))
          .orderBy(desc(servicios.fecha))
      : await db.select().from(servicios).orderBy(desc(servicios.fecha));

  return rows.map(mapRow);
}

async function _fetchServiciosResumen(): Promise<{
  totalHoy: number;
  comisionesHoy: number;
  recargasHoy: number;
  pagosHoy: number;
}> {
  await requirePermission('servicios.view');

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const rows = await db
    .select({
      tipo: servicios.tipo,
      total: sql<string>`COALESCE(SUM(monto::numeric), 0)`,
      comisiones: sql<string>`COALESCE(SUM(comision::numeric), 0)`,
      count: sql<number>`COUNT(*)`,
    })
    .from(servicios)
    .where(and(gte(servicios.fecha, todayStart), eq(servicios.estado, 'completado')))
    .groupBy(servicios.tipo);

  const recargaRow = rows.find((r) => r.tipo === 'recarga');
  const servicioRow = rows.find((r) => r.tipo === 'servicio');

  return {
    totalHoy: Number(recargaRow?.total ?? 0) + Number(servicioRow?.total ?? 0),
    comisionesHoy: Number(recargaRow?.comisiones ?? 0) + Number(servicioRow?.comisiones ?? 0),
    recargasHoy: Number(recargaRow?.count ?? 0),
    pagosHoy: Number(servicioRow?.count ?? 0),
  };
}

// ==================== MUTATIONS ====================

async function _createRecarga(data: {
  categoria: string;
  nombre: string;
  monto: number;
  numeroReferencia: string;
  cajero: string;
}): Promise<Servicio> {
  const user = await requirePermission('servicios.create');
  validateSchema(createRecargaSchema, data, 'createRecarga');

  const nombre = sanitize(data.nombre);
  const categoria = sanitize(data.categoria);
  const rawPhone = sanitize(data.numeroReferencia);
  const cajero = sanitize(data.cajero);
  const monto = validateNumber(data.monto, { min: 10, max: 5000, label: 'Monto de recarga' });

  // ── Carrier validation ──
  const normalizedPhone = normalizePhoneNumber(rawPhone);
  if (!normalizedPhone || !isValidMexicanPhone(normalizedPhone)) {
    throw new Error('Número de teléfono inválido. Ingresa los 10 dígitos sin código de país.');
  }

  // Calculate commission from catalog
  const catalogEntry = SERVICIO_CATALOGO.recargas.find((r) => r.id === categoria);
  const comisionPct = catalogEntry?.comisionPct ?? 4;
  const comision = Math.round(monto * (comisionPct / 100) * 100) / 100;

  const id = `srv-${crypto.randomUUID()}`;
  const folio = await generateFolio();

  // ── Process through provider ──
  const providerConfig = await loadProviderConfig();
  const provider = getActiveProvider(providerConfig);

  const providerResult = await provider.processTopup({
    carrierId: categoria,
    phoneNumber: normalizedPhone,
    amount: monto,
    folio,
  });

  const estado = providerResult.accepted ? providerResult.status : 'fallido';

  const [row] = await db
    .insert(servicios)
    .values({
      id,
      tipo: 'recarga',
      categoria,
      nombre,
      monto: String(monto),
      comision: String(comision),
      numeroReferencia: normalizedPhone,
      folio,
      estado,
      cajero,
      fecha: new Date(),
      providerId: provider.id,
      providerTransactionId: providerResult.providerTransactionId ?? null,
      providerAuthCode: providerResult.authorizationCode ?? null,
      providerError: providerResult.errorMessage ?? null,
      providerRespondedAt: providerResult.accepted ? new Date() : null,
    })
    .returning();

  logger.info('Recarga created', {
    folio,
    categoria,
    monto,
    cajero: user.uid,
    provider: provider.id,
    status: estado,
    providerTxn: providerResult.providerTransactionId,
  });

  if (!providerResult.accepted) {
    throw new Error(
      providerResult.errorMessage ?? 'El proveedor rechazó la recarga. Intenta de nuevo o procesa manualmente.',
    );
  }

  // Telegram notification
  const providerLabel = provider.isLive ? provider.name : 'Local';
  await sendNotification(
    `📱 <b>RECARGA REALIZADA</b>\n\n` +
      `Operador: ${escapeHTML(nombre)}\n` +
      `Número: ${escapeHTML(normalizedPhone)}\n` +
      `Monto: $${monto.toFixed(2)}\n` +
      `Comisión: $${comision.toFixed(2)}\n` +
      `Folio: ${escapeHTML(folio)}\n` +
      `Proveedor: ${escapeHTML(providerLabel)}\n` +
      `Cajero: ${escapeHTML(cajero)}`,
  );

  revalidatePath('/dashboard');
  return mapRow(row);
}

async function _createPagoServicio(data: {
  categoria: string;
  nombre: string;
  monto: number;
  numeroReferencia: string;
  cajero: string;
}): Promise<Servicio> {
  const user = await requirePermission('servicios.create');
  validateSchema(createPagoServicioSchema, data, 'createPagoServicio');

  const nombre = sanitize(data.nombre);
  const categoria = sanitize(data.categoria);
  const rawReference = sanitize(data.numeroReferencia);
  const cajero = sanitize(data.cajero);
  const monto = validateNumber(data.monto, { min: 1, max: 50000, label: 'Monto del pago' });

  // ── Reference validation per service type ──
  const refValidation = validateReferenceNumber(categoria, rawReference);
  if (!refValidation.valid) {
    throw new Error(refValidation.reason!);
  }
  const numeroReferencia = rawReference.trim();

  // Fixed commission from catalog
  const catalogEntry = SERVICIO_CATALOGO.servicios.find((s) => s.id === categoria);
  const comision = catalogEntry?.comisionFija ?? 8;

  const id = `srv-${crypto.randomUUID()}`;
  const folio = await generateFolio();

  // ── Process through provider ──
  const providerConfig = await loadProviderConfig();
  const provider = getActiveProvider(providerConfig);

  const providerResult = await provider.processBillPayment({
    serviceId: categoria,
    referenceNumber: numeroReferencia,
    amount: monto,
    folio,
  });

  const estado = providerResult.accepted ? providerResult.status : 'fallido';

  const [row] = await db
    .insert(servicios)
    .values({
      id,
      tipo: 'servicio',
      categoria,
      nombre,
      monto: String(monto),
      comision: String(comision),
      numeroReferencia,
      folio,
      estado,
      cajero,
      fecha: new Date(),
      providerId: provider.id,
      providerTransactionId: providerResult.providerTransactionId ?? null,
      providerAuthCode: providerResult.authorizationCode ?? null,
      providerError: providerResult.errorMessage ?? null,
      providerRespondedAt: providerResult.accepted ? new Date() : null,
    })
    .returning();

  logger.info('Pago de servicio created', {
    folio,
    categoria,
    monto,
    cajero: user.uid,
    provider: provider.id,
    status: estado,
    providerTxn: providerResult.providerTransactionId,
  });

  if (!providerResult.accepted) {
    throw new Error(
      providerResult.errorMessage ?? 'El proveedor rechazó el pago. Intenta de nuevo o procesa manualmente.',
    );
  }

  const providerLabel = provider.isLive ? provider.name : 'Local';
  await sendNotification(
    `🏠 <b>PAGO DE SERVICIO</b>\n\n` +
      `Servicio: ${escapeHTML(nombre)}\n` +
      `Referencia: ${escapeHTML(numeroReferencia)}\n` +
      `Monto: $${monto.toFixed(2)}\n` +
      `Comisión ganada: $${comision.toFixed(2)}\n` +
      `Folio: ${escapeHTML(folio)}\n` +
      `Proveedor: ${escapeHTML(providerLabel)}\n` +
      `Cajero: ${escapeHTML(cajero)}`,
  );

  revalidatePath('/dashboard');
  return mapRow(row);
}

async function _cancelarServicio(id: string): Promise<void> {
  await requirePermission('servicios.edit');
  validateSchema(idSchema, id, 'cancelarServicio:id');

  const rows = await db.select().from(servicios).where(eq(servicios.id, id));
  if (rows.length === 0) throw new Error('Servicio no encontrado');

  const srv = rows[0];

  // State machine: only completado and pendiente can be cancelled
  if (srv.estado === 'cancelado') throw new Error('Este servicio ya fue cancelado');
  if (srv.estado === 'fallido') throw new Error('Este servicio ya falló — no requiere cancelación');
  if (srv.estado === 'procesando')
    throw new Error('Este servicio está siendo procesado por el proveedor. Espera la confirmación.');

  // Attempt provider cancel if live
  const providerConfig = await loadProviderConfig();
  const provider = getActiveProvider(providerConfig);

  if (provider.isLive && srv.providerTransactionId && provider.cancelTransaction) {
    const cancelResult = await provider.cancelTransaction(srv.providerTransactionId);
    if (!cancelResult.accepted) {
      throw new Error(cancelResult.errorMessage ?? 'El proveedor no permitió la cancelación. Contacta soporte.');
    }
  }

  await db.update(servicios).set({ estado: 'cancelado' }).where(eq(servicios.id, id));

  logger.info('Servicio cancelled', { id, folio: srv.folio, provider: srv.providerId });
  revalidatePath('/dashboard');
}

/** Update a transaction status from webhook or polling */
async function _updateServicioFromProvider(
  providerTransactionId: string,
  status: ServicioEstado,
  authCode?: string,
  errorMessage?: string,
): Promise<void> {
  const rows = await db
    .select()
    .from(servicios)
    .where(eq(servicios.providerTransactionId, providerTransactionId))
    .limit(1);

  if (rows.length === 0) {
    logger.warn('Webhook for unknown provider transaction', {
      action: 'servicios_webhook_unknown',
      providerTransactionId,
    });
    return;
  }

  const srv = rows[0];

  // State machine: only allow valid transitions
  const validTransitions: Record<string, string[]> = {
    pendiente: ['procesando', 'completado', 'fallido', 'cancelado'],
    procesando: ['completado', 'fallido', 'cancelado'],
    completado: [], // Terminal state
    fallido: [], // Terminal state
    cancelado: [], // Terminal state
  };

  const allowed = validTransitions[srv.estado] ?? [];
  if (!allowed.includes(status)) {
    logger.warn('Invalid state transition attempted', {
      action: 'servicios_invalid_transition',
      id: srv.id,
      from: srv.estado,
      to: status,
    });
    return;
  }

  await db
    .update(servicios)
    .set({
      estado: status,
      providerAuthCode: authCode ?? srv.providerAuthCode,
      providerError: errorMessage ?? srv.providerError,
      providerRespondedAt: new Date(),
    })
    .where(eq(servicios.id, srv.id));

  logger.info('Servicio status updated from provider', {
    action: 'servicios_status_update',
    id: srv.id,
    folio: srv.folio,
    from: srv.estado,
    to: status,
  });

  revalidatePath('/dashboard');
}

// ==================== EXPORTS ====================

export const fetchServicios = withLogging('servicios.fetchServicios', _fetchServicios);
export const fetchServiciosResumen = withLogging('servicios.fetchServiciosResumen', _fetchServiciosResumen);
export const createRecarga = withLogging('servicios.createRecarga', _createRecarga);
export const createPagoServicio = withLogging('servicios.createPagoServicio', _createPagoServicio);
export const cancelarServicio = withLogging('servicios.cancelarServicio', _cancelarServicio);
export const updateServicioFromProvider = withLogging('servicios.updateFromProvider', _updateServicioFromProvider);
