import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getActiveProvider } from '@/infrastructure/servicios';
import { updateServicioFromProvider } from '@/app/actions/servicios-actions';
import { db } from '@/db';
import { storeConfig } from '@/db/schema';

/**
 * Webhook endpoint for servicios providers (TuRecarga, Infopago, etc.).
 *
 * POST /api/webhooks/servicios
 *
 * Each provider sends status updates here when a topup or payment
 * is confirmed, failed, or reversed. The webhook is verified using
 * the provider's signature verification method.
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await req.text();

    // Load current provider config
    const [row] = await db
      .select({
        providerId: storeConfig.serviciosProvider,
        apiKey: storeConfig.serviciosApiKey,
        apiSecret: storeConfig.serviciosApiSecret,
        sandbox: storeConfig.serviciosSandbox,
      })
      .from(storeConfig)
      .limit(1);

    const provider = getActiveProvider({
      providerId: row?.providerId ?? 'local',
      apiKey: row?.apiKey ?? undefined,
      apiSecret: row?.apiSecret ?? undefined,
      sandbox: row?.sandbox ?? true,
    });

    // Local provider doesn't receive webhooks
    if (!provider.isLive) {
      logger.warn('Webhook received but no live provider configured', {
        action: 'servicios_webhook_no_provider',
      });
      return NextResponse.json({ error: 'No live provider configured' }, { status: 400 });
    }

    // Verify webhook signature
    if (provider.verifyWebhook) {
      const valid = await provider.verifyWebhook(req.headers, body);
      if (!valid) {
        logger.warn('Servicios webhook signature verification failed', {
          action: 'servicios_webhook_invalid_signature',
          provider: provider.id,
        });
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    // Parse the webhook payload
    if (!provider.parseWebhook) {
      logger.warn('Provider does not support webhook parsing', {
        action: 'servicios_webhook_no_parser',
        provider: provider.id,
      });
      return NextResponse.json({ error: 'Provider does not support webhooks' }, { status: 400 });
    }

    const update = await provider.parseWebhook(body);

    // Apply the status update
    await updateServicioFromProvider(
      update.providerTransactionId,
      update.status,
      update.authorizationCode,
      update.errorMessage,
    );

    logger.info('Servicios webhook processed', {
      action: 'servicios_webhook_success',
      provider: provider.id,
      providerTxn: update.providerTransactionId,
      status: update.status,
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error('Servicios webhook error', {
      action: 'servicios_webhook_error',
      error: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
