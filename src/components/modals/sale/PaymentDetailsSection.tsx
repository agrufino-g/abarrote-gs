'use client';

import {
  FormLayout,
  TextField,
  Banner,
  BlockStack,
  InlineStack,
  Text,
  Badge,
  Card,
  Spinner,
  ProgressBar,
  Button,
} from '@shopify/polaris';
import { FormSelect } from '@/components/ui/FormSelect';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { MercadoPagoPaymentBrick } from '@/components/mercadopago/MercadoPagoPaymentBrick';
import { formatCurrency } from '@/lib/utils';
import type { Cliente, UserRoleRecord } from '@/types';
import type { MercadoPagoConfig } from '@/lib/mercadopago';

const paymentMethodOptions = [
  { label: 'Efectivo', value: 'efectivo' },
  { label: 'Tarjeta (Terminal Mercado Pago)', value: 'tarjeta' },
  { label: 'Mercado Pago Web (Lector Blando / QR)', value: 'tarjeta_web' },
  { label: 'Tarjeta (manual sin terminal)', value: 'tarjeta_manual' },
  { label: 'Transferencia', value: 'transferencia' },
  { label: 'Fiado (crédito a cliente)', value: 'fiado' },
  { label: 'Puntos de Lealtad (Monedero)', value: 'puntos' },
];

export interface PaymentDetailsSectionProps {
  currentUserRole: UserRoleRecord | null;
  paymentMethod: string;
  onPaymentMethodChange: (value: string) => void;
  clienteId: string;
  onClienteIdChange: (value: string) => void;
  clientes: Cliente[];
  amountPaid: string;
  onAmountPaidChange: (value: string) => void;
  total: number;
  subtotal: number;
  iva: number;
  cardSurcharge: number;
  change: number;
  pointsAvailable: number;
  mpConfig: MercadoPagoConfig;
  mpProcessing: boolean;
  mpStatus: string;
  mpError: string;
  mpWebSuccess: boolean;
  onCancelMPPayment: () => void;
  onMpWebSuccess: () => void;
  finishSale: (pmOverride?: string) => Promise<void>;
  showError: (msg: string) => void;
}

export function PaymentDetailsSection({
  currentUserRole,
  paymentMethod,
  onPaymentMethodChange,
  clienteId,
  onClienteIdChange,
  clientes,
  amountPaid,
  onAmountPaidChange,
  total,
  subtotal,
  iva,
  cardSurcharge,
  change,
  pointsAvailable,
  mpConfig,
  mpProcessing,
  mpStatus,
  mpError,
  mpWebSuccess,
  onCancelMPPayment,
  onMpWebSuccess,
  finishSale,
  showError,
}: PaymentDetailsSectionProps) {
  return (
    <FormLayout>
      <TextField
        label="Cajero / ID Global"
        value={currentUserRole ? (currentUserRole.globalId || currentUserRole.employeeNumber || '') : ''}
        readOnly
        autoComplete="off"
        placeholder="Cargando cajero..."
        helpText="Venta vinculada automáticamente a tu ID Global de empleado"
      />
      <FormSelect
        label="Método de pago"
        options={paymentMethodOptions}
        value={paymentMethod}
        onChange={(v) => {
          onPaymentMethodChange(v);
          if (v !== 'efectivo') onAmountPaidChange('');
        }}
      />

      {/* Loyalty/Client Selection for all methods */}
      <BlockStack gap="200">
        <Text as="h3" variant="headingSm">Cliente (para lealtad o fiado)</Text>
        <SearchableSelect
          label="Seleccionar Cliente"
          labelHidden
          options={clientes.map((c) => ({
            label: `${c.name} — Puntos: ${Math.floor(parseFloat(String(c.points)))} — Deuda: ${formatCurrency(c.balance)}`,
            value: c.id,
          }))}
          selected={clienteId}
          onChange={onClienteIdChange}
        />
        {clienteId && (() => {
          const c = clientes.find((cl) => cl.id === clienteId);
          if (!c) return null;
          return (
            <Banner tone="info">
              <InlineStack align="space-between">
                <Text as="p">Puntos disponibles:</Text>
                <Badge tone="success">{`${Math.floor(parseFloat(String(c.points)))} pts`}</Badge>
              </InlineStack>
            </Banner>
          );
        })()}
      </BlockStack>

      {paymentMethod === 'fiado' && (
        <BlockStack gap="200">
          <Banner tone="warning">
            <p>Esta venta se registrará como <strong>fiado</strong>. El monto se sumará a la deuda del cliente.</p>
          </Banner>
          {clienteId && (() => {
            const c = clientes.find((cl) => cl.id === clienteId);
            if (!c) return null;
            const disponible = Math.max(0, c.creditLimit - c.balance);
            const excedeCredito = total > 0 && (c.balance + total) > c.creditLimit;
            return (
              <Banner tone={excedeCredito ? 'critical' : 'info'}>
                <BlockStack gap="100">
                  <Text as="p" variant="bodySm">
                    Deuda actual: <strong>{formatCurrency(c.balance)}</strong> / Límite: <strong>{formatCurrency(c.creditLimit)}</strong>
                  </Text>
                  <Text as="p" variant="bodySm">
                    Crédito disponible: <strong>{formatCurrency(disponible)}</strong>
                  </Text>
                  {excedeCredito && (
                    <Text as="p" variant="bodySm" tone="critical">
                      Esta venta de {formatCurrency(total)} excede el credito disponible.
                    </Text>
                  )}
                </BlockStack>
              </Banner>
            );
          })()}
          {clientes.length === 0 && (
            <Banner tone="info">
              <p>No hay clientes registrados. Agrega clientes desde la sección de <strong>Fiado / Crédito</strong>.</p>
            </Banner>
          )}
        </BlockStack>
      )}

      {paymentMethod === 'puntos' && (
        <BlockStack gap="200">
          <Banner tone="success">
            <p>Usando puntos de lealtad como método de pago.</p>
          </Banner>
          {total > 0 && pointsAvailable < (subtotal + iva + cardSurcharge) && (
            <Banner tone="warning">
              <p>Los puntos no cubren el total. El resto ({formatCurrency(total)}) debe cobrarse por fuera o el cliente debe tener más puntos.</p>
            </Banner>
          )}
        </BlockStack>
      )}

      {paymentMethod === 'tarjeta' && !mpConfig.enabled && (
        <Banner tone="warning">
          <p>
            Terminal Mercado Pago no configurada. Ve a <strong>Configuración &gt; Mercado Pago</strong> para
            ingresar tu Access Token y Device ID. O usa &quot;Tarjeta (manual sin terminal)&quot;.
          </p>
        </Banner>
      )}
      {paymentMethod === 'tarjeta' && mpConfig.enabled && !mpProcessing && (
        <Banner tone="info">
          <p>
            Al cobrar, se enviará el monto de <strong>{formatCurrency(total)}</strong> a tu terminal
            Mercado Pago. El cliente pasará su tarjeta en el dispositivo.
          </p>
        </Banner>
      )}
      {mpProcessing && (
        <Card>
          <BlockStack gap="300">
            <InlineStack gap="200" blockAlign="center">
              <Spinner size="small" />
              <Text as="p" variant="bodyMd" fontWeight="semibold">{mpStatus}</Text>
            </InlineStack>
            <ProgressBar progress={mpStatus.includes('Esperando') ? 50 : 25} tone="highlight" size="small" />
            {mpError && (
              <Banner tone="critical">
                <p>{mpError}</p>
              </Banner>
            )}
            <InlineStack align="end">
              <Button tone="critical" onClick={onCancelMPPayment}>
                Cancelar cobro
              </Button>
            </InlineStack>
          </BlockStack>
        </Card>
      )}

      {paymentMethod === 'efectivo' && (
        <BlockStack gap="200">
          <TextField
            label="Monto recibido"
            type="number"
            value={amountPaid}
            onChange={onAmountPaidChange}
            autoComplete="off"
            prefix="$"
            placeholder="0.00"
            helpText={total > 0 ? `Mínimo: ${formatCurrency(total)}` : undefined}
          />
          {parseFloat(amountPaid) >= total && total > 0 && (
            <Banner tone="success">
              <InlineStack align="space-between">
                <Text as="span" fontWeight="bold">Cambio:</Text>
                <Text as="span" variant="headingMd" fontWeight="bold">{formatCurrency(change)}</Text>
              </InlineStack>
            </Banner>
          )}
        </BlockStack>
      )}

      {paymentMethod === 'tarjeta_web' && (
        <BlockStack gap="400">
          <Banner tone="info">
            <p>
              El cliente puede pasar su tarjeta, pagar con saldo MercadoPago o usar código QR sin necesidad de terminal física.
            </p>
          </Banner>
          {!mpConfig.publicKey && (
            <Banner tone="critical">
              <p>Para usar esta función, necesitas configurar tu &apos;Public Key&apos; de Mercado Pago en Configuración.</p>
            </Banner>
          )}
          {mpConfig.publicKey && total > 0 && !mpWebSuccess && (
            <MercadoPagoPaymentBrick
              amount={total}
              externalReference={`venta-${Date.now()}`}
              publicKey={mpConfig.publicKey}
              onSuccess={() => {
                onMpWebSuccess();
                finishSale('tarjeta_web');
              }}
              onError={(e) => showError(e)}
            />
          )}
          {mpWebSuccess && (
            <Banner tone="success">
              <p>Pago procesado correctamente mediante Mercado Pago Web.</p>
            </Banner>
          )}
        </BlockStack>
      )}
    </FormLayout>
  );
}
