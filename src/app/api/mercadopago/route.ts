import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Preference, Payment, Point } from 'mercadopago';
import { requireAuth, AuthError } from '@/lib/auth/guard';

export async function POST(req: Request) {
    try {
        await requireAuth();

        const body = await req.json();
        const { action, ...data } = body;

        // El token SIEMPRE se toma de las variables de entorno del servidor
        const accessToken = process.env.MP_ACCESS_TOKEN;
        if (!accessToken) {
            return NextResponse.json(
                { error: 'MP_ACCESS_TOKEN no configurado en el servidor' },
                { status: 500 }
            );
        }

        const client = new MercadoPagoConfig({ accessToken, options: { timeout: 5000 } });

        switch (action) {
            // 1. Terminal Física de Mercado Pago (Point)
            case 'create_point_intent': {
                const point = new Point(client);

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
                    }
                });

                return NextResponse.json(response);
            }

            // 3. Procesar Tarjetas por Software (Payment Brick React SDK)
            case 'process_payment': {
                const payment = new Payment(client);
                const amountVal = Number(data.transaction_amount || 0);

                const response = await payment.create({
                    body: {
                        transaction_amount: amountVal,
                        description: data.description || 'Venta Kiosco Software',
                        payment_method_id: data.payment_method_id,
                        payer: data.payer,
                        token: data.token,
                        installments: data.installments || 1,
                        issuer_id: data.issuer_id,
                        external_reference: data.external_reference,
                    }
                });
                return NextResponse.json(response);
            }

            // 4. Consultar Detalles Reales de un Pago
            case 'get_payment': {
                const payment = new Payment(client);
                const response = await payment.get({ id: data.paymentId });
                return NextResponse.json(response);
            }

            // 5. Obtener terminales registradas de la cuenta (Point Devices)
            case 'get_devices': {
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
        if (error instanceof AuthError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }
        console.error('[MP_BACKEND_ERROR]', error.message, error.cause);
        return NextResponse.json({ error: error.message || 'Error del servidor procesando MP' }, { status: 500 });
    }
}
