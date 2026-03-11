import { useState, useEffect } from 'react';
import { initMercadoPago, Payment } from '@mercadopago/sdk-react';
import { Spinner, BlockStack, Text, Banner } from '@shopify/polaris';
import { formatCurrency } from '@/lib/utils';

interface MercadoPagoPaymentBrickProps {
    amount: number;
    externalReference: string;
    publicKey: string;
    accessToken: string;
    onSuccess: () => void;
    onError: (error: string) => void;
}

export function MercadoPagoPaymentBrick({
    amount,
    externalReference,
    publicKey,
    accessToken,
    onSuccess,
    onError,
}: MercadoPagoPaymentBrickProps) {
    const [initError, setInitError] = useState('');

    // Inicializar Mercado Pago en React
    useEffect(() => {
        if (!publicKey) {
            setInitError('Falta la Llave Pública (Public Key) de Mercado Pago');
            return;
        }
        initMercadoPago(publicKey, { locale: 'es-MX' });
    }, [publicKey]);

    const initialization = {
        amount: amount,
        preferenceId: undefined, // Si quisiéramos usar preferenceId
    };

    const customization: any = {
        visual: {
            style: {
                theme: 'default' as const, // Tema claro por defecto (Flat/Clean)
                customVariables: {
                    baseColor: '#005bd3', // Azul Polaris (Botón principal típico de Shopify Checkout)
                    formBackgroundColor: '#ffffff', // Fondo completamente blanco y limpio
                    textPrimaryColor: '#202223', // Texto principal (Negro/Gris muy oscuro de Shopify)
                    textSecondaryColor: '#6d7175', // Texto secundario/ayuda (Gris atenuado de Shopify)
                    outlinePrimaryColor: '#c9cccf', // Bordes sutiles grises de las tarjetas y los inputs de Shopify
                    buttonTextColor: '#ffffff', // Letra blanca en el botón principal
                    errorColor: '#d82c0d', // Rojo Polaris para errores
                    successColor: '#008060' // Verde Polaris de validaciones (Aprobado)
                }
            },
            texts: {
                payButton: 'Pagar ahora', // Texto clásico de Shopify
                formTitle: 'Registro de cobro (Checkout)',
                emailSectionTitle: 'Contacto',
                installmentsSectionTitle: 'Pago',
            }
        },
        paymentMethods: {
            creditCard: 'all',
            debitCard: 'all',
            ticket: 'all',          // Activa OXXO, PayCash, etc (que muestran código de barras)
            bankTransfer: 'all',    // Activa transferencias SPEI
            mercadoPago: ['all'],   // Activa pago directo con la App de MP / Código QR de la app
        },
    };

    const onSubmit = async ({ selectedPaymentMethod, formData }: any) => {
        return new Promise<void>((resolve, reject) => {
            fetch('/api/mercadopago', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'process_payment',
                    accessToken: accessToken,
                    transaction_amount: formData.transaction_amount || amount,
                    description: `Venta Kiosco (${formatCurrency(amount)})`,
                    payment_method_id: formData.payment_method_id || 'mercado_pago',
                    payer: formData.payer,
                    token: formData.token,
                    installments: formData.installments || 1,
                    issuer_id: formData.issuer_id,
                    external_reference: externalReference,
                }),
            })
                .then((response) => response.json())
                .then((result) => {
                    if (result.status === 'approved' || result.status === 'in_process') {
                        resolve();
                        onSuccess();
                    } else {
                        console.error('Error MP:', result);
                        const msg = result.message || result.error || 'Pago rechazado o con error';
                        reject(new Error(msg));
                        onError(msg);
                    }
                })
                .catch((error) => {
                    console.error('Network Error:', error);
                    reject(new Error('Error de conexión'));
                    onError('Error de conexión con Backend.');
                });
        });
    };

    const onReady = async () => { };

    if (initError) {
        return (
            <Banner tone="critical">
                <p>{initError}</p>
            </Banner>
        );
    }

    return (
        <div style={{ width: '100%', minHeight: '350px' }}>
            <Payment
                initialization={initialization}
                customization={customization as any}
                onSubmit={onSubmit}
                onReady={onReady}
                onError={(rawError: any) => {
                    // ULTRASAFE: En Turbopack, cualquier intento de Next.js u overlay de acceder 
                    // a un objeto Cross-Origin de iframe (como Window) lanza "$$typeof Permission denied".
                    // ¡POR LO TANTO NO DEBEMOS PASARLO A CONSOLE.ERROR() TAMPOCO!
                    try {
                        let errMsg = '';
                        // Intentamos leer el mensaje bajo un trycatch bloqueado
                        try {
                            errMsg = rawError?.message || rawError?.type || String(rawError);
                        } catch (_) {
                            errMsg = 'cross-origin-error';
                        }

                        // Ignorar errores fantasma de desmonte
                        if (errMsg && !errMsg.includes('destroy')) {
                            onError('No pudimos cargar la pasarela segura. Revisa tu conexión.');
                        }
                    } catch (fatal) {
                        // Ignorar falla silenciosamente para que la caja registradora no crashee
                    }
                }}
            />
        </div>
    );
}
