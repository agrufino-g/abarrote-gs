import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import crypto from 'crypto';

// =========================================================================
// RUTA DE WEBHOOKS PARA MERCADO PAGO 
// URL que debes pegar en Mercado Pago: https://tu-dominio.com/api/mercadopago/webhook
// =========================================================================

/**
 * Verifica la firma HMAC-SHA256 del webhook de MercadoPago.
 * Docs: https://www.mercadopago.com.mx/developers/es/docs/your-integrations/notifications/webhooks
 */
function verifyWebhookSignature(req: Request, body: string): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) {
    // Si no hay secret configurado, loguear warning pero permitir (migración gradual)
    console.warn('[Webhook] MP_WEBHOOK_SECRET no configurado — se omite verificación de firma');
    return true;
  }

  const xSignature = req.headers.get('x-signature');
  const xRequestId = req.headers.get('x-request-id');

  if (!xSignature || !xRequestId) {
    console.error('[Webhook] Falta x-signature o x-request-id en headers');
    return false;
  }

  // Parse x-signature: "ts=...,v1=..."
  const parts: Record<string, string> = {};
  for (const part of xSignature.split(',')) {
    const [key, ...valueParts] = part.split('=');
    parts[key.trim()] = valueParts.join('=').trim();
  }

  const ts = parts['ts'];
  const v1 = parts['v1'];

  if (!ts || !v1) {
    console.error('[Webhook] Formato de x-signature inválido');
    return false;
  }

  // Obtener data.id del query string
  const url = new URL(req.url);
  const dataId = url.searchParams.get('data.id') || '';

  // Construir el manifest para HMAC
  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const hmac = crypto.createHmac('sha256', secret).update(manifest).digest('hex');

  return hmac === v1;
}

export async function POST(req: Request) {
    try {
        // Clonar el body para verificación de firma
        const rawBody = await req.text();
        
        // Verificar firma HMAC
        if (!verifyWebhookSignature(req, rawBody)) {
            console.error('[Webhook] Firma inválida — posible ataque');
            return NextResponse.json({ error: 'Firma inválida' }, { status: 403 });
        }

        const url = new URL(req.url);

        const queryId = url.searchParams.get('data.id') || url.searchParams.get('id');
        const queryType = url.searchParams.get('type') || url.searchParams.get('topic');

        let body: any = {};
        try {
            body = JSON.parse(rawBody);
        } catch {
            // body vacío es válido en algunos webhooks
        }

        const paymentId = queryId || body?.data?.id;
        const eventType = queryType || body?.type || body?.action;

        // Solo nos interesan los eventos de pagos ('payment')
        if (eventType === 'payment' && paymentId) {
            console.log(`[Webhook] Recibida notificación de pago ID: ${paymentId}`);

            const accessToken = process.env.MP_ACCESS_TOKEN;

            if (!accessToken) {
                console.error('[Webhook] ERROR: No se encontró MP_ACCESS_TOKEN');
                return NextResponse.json({ received: true, error: 'Falta Token' }, { status: 200 });
            }

            const client = new MercadoPagoConfig({ accessToken, options: { timeout: 5000 } });
            const paymentClient = new Payment(client);

            const paymentData = await paymentClient.get({ id: paymentId }).catch(err => {
                console.error(`[Webhook] Error al consultar pago ${paymentId}:`, err);
                return null;
            });

            if (paymentData) {
                console.log(`[Webhook] Estado del Pago ${paymentId}:`, paymentData.status);
                console.log(`[Webhook] Referencia Externa:`, paymentData.external_reference);

                if (paymentData.status === 'approved') {
                    console.log('[Webhook] Pago aprobado. Actualizando DB...');
                    // TODO: await db.venta.updateStatus(paymentData.external_reference, 'PAGADO');
                } else if (paymentData.status === 'rejected') {
                    console.log('[Webhook] Pago rechazado.');
                } else if (paymentData.status === 'in_process') {
                    console.log('[Webhook] Pago pendiente.');
                }
            }
        } else {
            console.log('[Webhook] Evento ignorado:', eventType);
        }

        return NextResponse.json({ success: true }, { status: 200 });

    } catch (error: any) {
        console.error('[Webhook] Error crítico procesando webhook:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 200 });
    }
}
