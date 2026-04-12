import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/lib/auth/guard';
import { createSale } from '@/app/actions/sales-actions';
import { updateProduct, updateProductStock } from '@/app/actions/product-actions';
import { checkRateLimit, getClientIp } from '@/infrastructure/redis';
import { logger } from '@/lib/logger';
import { db } from '@/db';
import { products } from '@/db/schema';
import { eq } from 'drizzle-orm';

/** Rate limit: 30 sync requests per minute per IP */
const RATE_LIMIT = { maxRequests: 30, windowMs: 60_000 } as const;

type SyncAction = 'createSale' | 'updateProduct' | 'adjustStock' | 'batch';
const ALLOWED_ACTIONS = new Set<SyncAction>(['createSale', 'updateProduct', 'adjustStock', 'batch']);

/**
 * Basic structural validation for sync payloads.
 * Domain-level validation happens inside the action functions.
 */
function validateSyncPayload(action: string, payload: unknown): { valid: boolean; error?: string } {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'Payload inválido: se esperaba un objeto' };
  }

  const obj = payload as Record<string, unknown>;

  if (action === 'createSale') {
    if (!Array.isArray(obj.items) || obj.items.length === 0) {
      return { valid: false, error: 'La venta debe contener al menos un producto' };
    }
    if (typeof obj.total !== 'number' || obj.total < 0) {
      return { valid: false, error: 'Total de venta inválido' };
    }
    if (typeof obj.paymentMethod !== 'string') {
      return { valid: false, error: 'Método de pago requerido' };
    }
  }

  if (action === 'updateProduct') {
    if (typeof obj.id !== 'string' || obj.id.length === 0) {
      return { valid: false, error: 'ID de producto requerido' };
    }
  }

  if (action === 'adjustStock') {
    if (typeof obj.productId !== 'string' || obj.productId.length === 0) {
      return { valid: false, error: 'ID de producto requerido' };
    }
    if (typeof obj.quantity !== 'number') {
      return { valid: false, error: 'Cantidad requerida' };
    }
  }

  if (action === 'batch') {
    if (!Array.isArray(obj.operations)) {
      return { valid: false, error: 'Se esperaba un arreglo de operaciones' };
    }
    if (obj.operations.length > 50) {
      return { valid: false, error: 'Máximo 50 operaciones por lote' };
    }
  }

  return { valid: true };
}

/**
 * Check for inventory conflicts — if the server stock has diverged from
 * what the client believes, return a conflict signal.
 */
async function checkStockConflict(
  productId: string,
  clientExpectedStock?: number | null,
): Promise<{ conflict: boolean; serverStock?: number }> {
  if (clientExpectedStock == null) return { conflict: false };

  const [row] = await db
    .select({ currentStock: products.currentStock })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);

  if (!row) return { conflict: false };

  const serverStock = Number(row.currentStock ?? 0);
  // Allow a tolerance of ±1 for rounding
  if (Math.abs(serverStock - clientExpectedStock) > 1) {
    return { conflict: true, serverStock };
  }
  return { conflict: false };
}

/** Execute a single sync action and return result */
async function executeAction(
  action: string,
  payload: Record<string, unknown>,
): Promise<{ success: boolean; serverId?: string; conflict?: boolean; serverStock?: number; error?: string }> {
  const validation = validateSyncPayload(action, payload);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  switch (action) {
    case 'createSale': {
      // Check stock conflicts for each item before creating sale
      const items = payload.items as Array<{ productId: string; expectedStock?: number }>;
      const conflicts: Array<{ productId: string; serverStock: number }> = [];

      for (const item of items) {
        if (item.expectedStock != null) {
          const check = await checkStockConflict(item.productId, item.expectedStock);
          if (check.conflict) {
            conflicts.push({ productId: item.productId, serverStock: check.serverStock! });
          }
        }
      }

      if (conflicts.length > 0) {
        logger.warn('Offline sale sync: stock conflict detected', {
          action: 'sync_conflict',
          conflicts,
        });
        // Still create the sale — but flag the conflict in response
        // The server-side createSale uses actual DB stock, so it's authoritative
      }

      const result = await createSale(payload as Parameters<typeof createSale>[0]);
      return {
        success: true,
        serverId: typeof result === 'object' && result !== null ? (result as { id?: string }).id : undefined,
        conflict: conflicts.length > 0,
      };
    }
    case 'updateProduct': {
      const productPayload = payload as { id: string } & Record<string, unknown>;
      await updateProduct(productPayload.id, productPayload);
      return { success: true };
    }
    case 'adjustStock': {
      const { productId, quantity } = payload as { productId: string; quantity: number; reason?: string };
      await updateProductStock(productId, quantity);
      return { success: true };
    }
    default:
      return { success: false, error: 'Acción no soportada' };
  }
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rl = checkRateLimit(`sync:${ip}`, RATE_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 });
    }

    await requireAuth();

    // Body size guard: reject payloads over 512 KB to prevent DoS
    const contentLength = req.headers.get('content-length');
    const MAX_BODY_BYTES = 512 * 1024; // 512 KB
    if (contentLength && parseInt(contentLength, 10) > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'Payload demasiado grande' }, { status: 413 });
    }

    const body = await req.json();
    const { action, payload } = body as { action: unknown; payload: unknown };

    if (typeof action !== 'string' || !ALLOWED_ACTIONS.has(action as SyncAction)) {
      return NextResponse.json({ error: 'Acción no soportada' }, { status: 400 });
    }

    // ── Batch mode: process multiple operations in order ──
    if (action === 'batch') {
      const validation = validateSyncPayload(action, payload);
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }

      const ops = (payload as { operations: Array<{ action: string; payload: Record<string, unknown> }> }).operations;
      const results: Array<{ index: number; success: boolean; serverId?: string; conflict?: boolean; error?: string }> =
        [];
      let syncedCount = 0;

      for (let i = 0; i < ops.length; i++) {
        const op = ops[i];
        if (!ALLOWED_ACTIONS.has(op.action as SyncAction) || op.action === 'batch') {
          results.push({ index: i, success: false, error: 'Acción no soportada' });
          continue;
        }
        try {
          const result = await executeAction(op.action, op.payload);
          results.push({ index: i, ...result });
          if (result.success) syncedCount++;
        } catch (err) {
          results.push({
            index: i,
            success: false,
            error: err instanceof Error ? err.message : 'Error desconocido',
          });
        }
      }

      logger.info('Batch sync completed', {
        action: 'batch_sync',
        total: ops.length,
        synced: syncedCount,
        failed: ops.length - syncedCount,
      });

      return NextResponse.json({ success: true, results, synced: syncedCount, failed: ops.length - syncedCount });
    }

    // ── Single action mode ──
    const result = await executeAction(action, payload as Record<string, unknown>);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      serverId: result.serverId,
      conflict: result.conflict,
      serverStock: result.serverStock,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logger.error('Sync action failed', {
      error: error instanceof Error ? error.message : 'Unknown',
      action: 'sync',
    });
    return NextResponse.json({ error: 'Error al sincronizar datos' }, { status: 500 });
  }
}
