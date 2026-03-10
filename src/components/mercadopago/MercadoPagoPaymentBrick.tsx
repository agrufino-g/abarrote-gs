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

    const customization = {
        paymentMethods: {
            creditCard: 'all',
            debitCard: 'all',
            mercadoPago: ['all'],
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
                    transaction_amount: formData.transaction_amount,
                    description: `Venta Kiosco (${formatCurrency(amount)})`,
                    payment_method_id: formData.payment_method_id,
                    payer: formData.payer,
                    token: formData.token,
                    installments: formData.installments,
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
                customization={customization}
                onSubmit={onSubmit}
                onReady={onReady}
                onError={(err: any) => {
                    console.error(err);
                    // Omit errors showing repeatedly when brick is destroyed/remounted
                    if (!err.message?.includes('destroy')) {
                        onError('Tuvimos un error cargando el Brick de pago');
                    }
                }}
            />
        </div>
    );
}
