'use server';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { paymentCharges } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { idempotencyCheck } from '@/infrastructure/redis';

/**
 * Cobrar.io Webhook Handler
 *
 * Receives payment status notifications from Cobrar.io.
 * Supports HMAC-SHA256 signature verification.
 *
 * Events: charge.paid, charge.expired, charge.cancelled
 */

const COBRAR_WEBHOOK_SECRET = process.env.COBRAR_WEBHOOK_SECRET;

async function verifySignature(body: string, signature: string | null): Promise<boolean> {
  if (!COBRAR_WEBHOOK_SECRET || !signature) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(COBRAR_WEBHOOK_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
  const expected = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  // Constant-time comparison
  if (expected.length !== signature.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return mismatch === 0;
}

type CobrarEvent = {
  id: string;
  type: 'charge.paid' | 'charge.expired' | 'charge.cancelled';
  data: {
    id: string;
    amount: number;
    currency: string;
    status: string;
    reference: string;
    payment_method?: string;
    paid_at?: string;
    metadata?: Record<string, unknown>;
  };
};

// Valid status transitions to prevent downgrade attacks
const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ['paid', 'expired', 'cancelled', 'failed'],
  paid: [], // Terminal state
  expired: [], // Terminal state
  cancelled: [], // Terminal state
  failed: [], // Terminal state
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    const body = await request.text();
    const signature = request.headers.get('x-cobrar-signature');

    // Verify webhook signature
    if (COBRAR_WEBHOOK_SECRET) {
      const valid = await verifySignature(body, signature);
      if (!valid) {
        logger.warn('Cobrar.io webhook signature verification failed', {
          action: 'cobrar_webhook_invalid_sig',
        });
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    let event: CobrarEvent;
    try {
      event = JSON.parse(body);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    if (!event.id || !event.type || !event.data?.id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    logger.info('Cobrar.io webhook received', {
      action: 'cobrar_webhook',
      eventType: event.type,
      eventId: event.id,
      chargeId: event.data.id,
    });

    // Idempotency
    const isNew = await idempotencyCheck(`cobrar_webhook:${event.id}`, { ttlMs: 86_400_000 });
    if (!isNew) {
      logger.info('Cobrar.io webhook duplicate skipped', {
        action: 'cobrar_webhook_duplicate',
        eventId: event.id,
      });
      return NextResponse.json({ received: true, duplicate: true });
    }

    // Map Cobrar.io event to internal status
    const statusMap: Record<string, string> = {
      'charge.paid': 'paid',
      'charge.expired': 'expired',
      'charge.cancelled': 'failed',
    };
    const newStatus = statusMap[event.type];

    if (!newStatus) {
      logger.info('Cobrar.io webhook unhandled event type', {
        action: 'cobrar_webhook_unhandled',
        eventType: event.type,
      });
      return NextResponse.json({ received: true, handled: false });
    }

    // Find the charge in our DB
    const [existing] = await db
      .select()
      .from(paymentCharges)
      .where(and(eq(paymentCharges.provider, 'cobrar'), eq(paymentCharges.providerChargeId, event.data.id)))
      .limit(1);

    if (!existing) {
      logger.warn('Cobrar.io webhook charge not found', {
        action: 'cobrar_webhook_not_found',
        chargeId: event.data.id,
      });
      return NextResponse.json({ received: true, handled: false });
    }

    // Validate state transition
    const allowed = VALID_TRANSITIONS[existing.status] ?? [];
    if (!allowed.includes(newStatus)) {
      logger.warn('Cobrar.io invalid status transition blocked', {
        action: 'cobrar_webhook_invalid_transition',
        chargeId: event.data.id,
        currentStatus: existing.status,
        attemptedStatus: newStatus,
      });
      return NextResponse.json({ received: true, handled: false });
    }

    // Update charge status
    await db
      .update(paymentCharges)
      .set({
        status: newStatus,
        paidAt: event.data.paid_at ? new Date(event.data.paid_at) : undefined,
        providerMetadata: event.data.metadata ?? {},
        updatedAt: new Date(),
      })
      .where(eq(paymentCharges.id, existing.id));

    logger.info('Cobrar.io charge status updated', {
      action: 'cobrar_webhook_updated',
      chargeId: existing.id,
      provider: 'cobrar',
      oldStatus: existing.status,
      newStatus,
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json({ received: true, handled: true });
  } catch (error) {
    logger.error('Cobrar.io webhook processing failed', {
      action: 'cobrar_webhook_error',
      error: error instanceof Error ? error.message : 'Unknown error',
      durationMs: Date.now() - startTime,
    });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
