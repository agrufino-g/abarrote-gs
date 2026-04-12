import { NextRequest, NextResponse } from 'next/server';
import { expireStalePoints } from '@/app/actions/loyalty-actions';
import { logger } from '@/lib/logger';
import { idempotencyCheck } from '@/infrastructure/redis';
import { env } from '@/lib/env';
import { db } from '@/db';
import { storeConfig } from '@/db/schema';

/**
 * Weekly cron to expire loyalty points for inactive customers.
 * Reads loyaltyExpirationDays from storeConfig (default: 365).
 */
export async function GET(req: NextRequest) {
  const cronSecret = env.CRON_SECRET;
  const authHeader = req.headers.get('authorization');

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const week = `${new Date().getFullYear()}-W${Math.ceil(
      ((Date.now() - new Date(new Date().getFullYear(), 0, 1).getTime()) / 86_400_000 + 1) / 7,
    )}`;
    const isNew = await idempotencyCheck(`cron_loyalty_expire:${week}`, { ttlMs: 7 * 86_400_000 });
    if (!isNew) {
      return NextResponse.json({ message: 'Ya se ejecutó esta semana' });
    }

    // Read configurable expiration days
    const [cfg] = await db.select({ days: storeConfig.loyaltyExpirationDays }).from(storeConfig).limit(1);
    const expirationDays = cfg?.days ?? 365;

    const result = await expireStalePoints(expirationDays);
    logger.info('Loyalty expiration cron completed', { expired: result.expired, expirationDays });
    return NextResponse.json({ ok: true, ...result, expirationDays });
  } catch (error) {
    logger.error('Loyalty expiration cron failed', { error });
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
