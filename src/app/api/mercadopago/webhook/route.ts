import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment } from 'mercadopago';

// =========================================================================
// RUTA DE WEBHOOKS PARA MERCADO PAGO 
// URL que debes pegar en Mercado Pago: https://tu-dominio.com/api/mercadopago/webhook
// (Si estás en local, usa Ngrok: https://xxxx.ngrok.io/api/mercadopago/webhook)
// =========================================================================

export async function POST(req: Request) {
    try {
        const url = new URL(req.url);

        // Mercado Pago envía el ID de la transacción y el tipo de evento
        // Puede venir en los query params (ej. ?data.id=123&type=payment) o en el body
        const queryId = url.searchParams.get('data.id') || url.searchParams.get('id');
        const queryType = url.searchParams.get('type') || url.searchParams.get('topic');

        // Leemos el body (para webhooks a veces viene en el body)
        const body = await req.json().catch(() => ({}));

        const paymentId = queryId || body?.data?.id;
        const eventType = queryType || body?.type || body?.action;

        // Solo nos interesan los eventos de pagos ('payment')
        if (eventType === 'payment' && paymentId) {
            console.log(`[Webhook] Recibida notificación de pago ID: ${paymentId}`);

            // ⚠️ IMPORTANTE PARA WEBHOOKS:
            // A diferencia del frontend (que tenía el token en localStorage), este código lo ejecuta
            // Mercado Pago directamente llamando a tu servidor. Mercado Pago no sabe tu token.
            // Por eso, DEBEMOS tener el token guardado en tu servidor (ej. en .env.local)

            const accessToken = process.env.MP_ACCESS_TOKEN;

            if (!accessToken) {
                console.error('[Webhook] ERROR: No se encontró proces.env.MP_ACCESS_TOKEN. Para que el Webhook valide pagos, debes agregar esta variable en tu .env.local');
                // Aún así respondemos 200 OK para que MercadoPago no siga reintentando infinitamente
                return NextResponse.json({ received: true, error: 'Falta Token' }, { status: 200 });
            }

            // 1. Configuramos el cliente SDK
            const client = new MercadoPagoConfig({ accessToken, options: { timeout: 5000 } });
            const paymentClient = new Payment(client);

            // 2. Buscamos la info real del pago en los servidores de MP por seguridad
            const paymentData = await paymentClient.get({ id: paymentId }).catch(err => {
                console.error(`[Webhook] Error al consultar pago ${paymentId}:`, err);
                return null;
            });

            if (paymentData) {
                console.log(`[Webhook] Estado del Pago ${paymentId}:`, paymentData.status);
                console.log(`[Webhook] Referencia Externa:`, paymentData.external_reference); // ej. 'venta-17154...'

                // 3. AQUÍ DEBES ACTUALIZAR TU BASE DE DATOS
                if (paymentData.status === 'approved') {
                    // Ejemplo:
                    // await db.venta.updateStatus(paymentData.external_reference, 'PAGADO');
                    console.log('✅ El pago ha sido aprobado correctamente. Actualizando DB...');
                } else if (paymentData.status === 'rejected') {
                    console.log('❌ El pago fue rechazado.');
                } else if (paymentData.status === 'in_process') {
                    console.log('⏳ Pago pendiente (ej. OXXO o transferencia demorada).');
                }
            }
        } else {
            console.log('[Webhook] Evento ignorado:', eventType);
        }

        // Mercado Pago requiere que respondas HTTP 200 OK inmediatamente
        // o de lo contrario seguirá intentando notificar el mismo evento.
        return NextResponse.json({ success: true }, { status: 200 });

    } catch (error: any) {
        console.error('[Webhook] Error crítico procesando webhook:', error);
        // Siempre devolver 200 para evitar reintentos de errores de parseo
        return NextResponse.json({ success: false, error: error.message }, { status: 200 });
    }
}
