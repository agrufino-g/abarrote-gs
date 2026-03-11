import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Preference, Payment, Point } from 'mercadopago';
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { action, accessToken, ...data } = body;

        // Inicializa la SDK Oficial de Mercado Pago con el token que mandó el Kiosco
        // IMPORTANTE: En producción este token debería vivir en una variable de entorno segura
        // ej: process.env.MP_ACCESS_TOKEN y no viajar en el frontend
        const client = new MercadoPagoConfig({ accessToken: accessToken, options: { timeout: 5000 } });

        switch (action) {
            // 1. Terminal Física de Mercado Pago (Point)
            case 'create_point_intent': {
                const point = new Point(client);

                // Convertimos tu frontend payload al tipo exacto del SDK
                const response = await point.createPaymentIntent({
                    device_id: data.deviceId,
                    requestOptions: { idempotencyKey: data.external_reference },
                    request: {
                        amount: Number(data.amount.toFixed(2)),
                        description: data.description || 'Cobro desde Kiosco',
                        additional_info: {
                            external_reference: data.external_reference,
                            print_on_terminal: data.print_on_terminal ?? true
                        }
                    }
                });

                return NextResponse.json(response);
            }

            case 'get_point_status': {
                const point = new Point(client);
                const response = await point.getPaymentIntentStatus({ payment_intent_id: data.paymentIntentId });
                return NextResponse.json(response);
            }

            case 'cancel_point_intent': {
                const point = new Point(client);
                const response = await point.cancelPaymentIntent({ device_id: data.deviceId, payment_intent_id: data.paymentIntentId });
                return NextResponse.json(response);
            }

            // 2. Checkout PRO y Link de Pago Mágico (Código QR)
            case 'create_preference': {
                const preference = new Preference(client);
                const response = await preference.create({
                    body: {
                        items: [
                            {
                                id: data.external_reference || 'KIOSCO',
                                title: data.description || 'Compra Kiosco',
                                quantity: 1,
                                unit_price: Number(data.amount.toFixed(2))
                            }
                        ],
                        external_reference: data.external_reference,
                        statement_descriptor: 'KIOSCO',
                        // Puedes agregar URLs de retorno cuando tengamos a dónde mandarlos
                        // back_urls: { success: 'https://tusitio.com/success', failure: '...', pending: '...' }
                    }
                });

                // Retorna un link de pago (init_point) que puedes abrir en otra pestaña o crear un QR
                return NextResponse.json(response);
            }

            // 3. Procesar Tarjetas por Software (Payment Brick React SDK)
            case 'process_payment': {
                const payment = new Payment(client);

                // Formateamos correctamente el monto por si frontend lo manda sin decimales o nulo
                const amountVal = Number(data.transaction_amount || 0);

                const response = await payment.create({
                    body: {
                        transaction_amount: amountVal,
                        description: data.description || 'Venta Kiosco Software',
                        payment_method_id: data.payment_method_id,
                        payer: data.payer,
                        token: data.token, // El token viene encriptado y seguro del Brick
                        installments: data.installments || 1,
                        issuer_id: data.issuer_id,
                        external_reference: data.external_reference,
                    }
                });
                return NextResponse.json(response);
            }

            // 4. Consultar Detalles Reales de un Pago (Webhooks)
            case 'get_payment': {
                const payment = new Payment(client);
                const response = await payment.get({ id: data.paymentId });
                return NextResponse.json(response);
            }

            // 5. Obtener terminales registradas de la cuenta (Point Devices)
            case 'get_devices': {
                // La SDK de mercadopago/sdk-node maneja Point a traves de request directos al fetcher o con classes Point
                // Sin embargo, si no cuenta con helper para listar devices, hacemos la peticion autorizada raw:
                const request = await fetch(`https://api.mercadopago.com/point/integration-api/devices`, {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                });
                const devicesData = await request.json();
                return NextResponse.json(devicesData);
            }

            default:
                return NextResponse.json({ error: 'Acción de Mercado Pago no soportada' }, { status: 400 });
        }
    } catch (error: any) {
        console.error('[MP_BACKEND_ERROR]', error.message, error.cause);
        return NextResponse.json({ error: error.message || 'Error del servidor procesando MP' }, { status: 500 });
    }
}
