import { NextRequest, NextResponse } from 'next/server';
import { sendDailyTelegramReport } from '@/app/actions/analytics-advanced-actions';
import { logger } from '@/lib/logger';

/**
 * Cron endpoint for the automated daily Telegram report.
 *
 * Can be triggered by:
 * - Vercel Cron Jobs (vercel.json → cron)
 * - External cron service (e.g. cron-job.org) hitting this URL
 * - Manual call from the dashboard
 *
 * Protected by a shared secret to prevent unauthorized triggers.
 */
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization');

  // CRON_SECRET is mandatory — if not set, reject all requests
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const result = await sendDailyTelegramReport();
    logger.info('Daily Telegram report', { sent: result.sent });
    return NextResponse.json(result);
  } catch (error) {
    logger.error('Daily report cron failed', { error: error instanceof Error ? error.message : error });
    return NextResponse.json(
      { error: 'Error al generar reporte diario' },
      { status: 500 },
    );
  }
}
