'use client';

import {
  Text,
  Badge,
  BlockStack,
  InlineStack,
  Divider,
  Modal,
  Banner,
  Button,
} from '@shopify/polaris';
import { PrintIcon, DeleteIcon, ReturnIcon } from '@shopify/polaris-icons';
import { useState } from 'react';
import { formatCurrency } from '@/lib/utils';
import type { SaleRecord } from '@/types';

function paymentBadge(method: string) {
  switch (method) {
    case 'efectivo':      return <Badge tone="success">Efectivo</Badge>;
    case 'tarjeta':       return <Badge tone="info">Tarjeta</Badge>;
    case 'transferencia': return <Badge tone="attention">Transferencia</Badge>;
    default:              return <Badge>{method}</Badge>;
  }
}

export interface SaleDetailModalProps {
  open: boolean;
  sale: SaleRecord | null;
  onClose: () => void;
  onCancel: () => Promise<void>;
  onReturn: () => void;
  onPrint: () => void;
}

export function SaleDetailModal({
  open,
  sale,
  onClose,
  onCancel,
  onReturn,
  onPrint,
}: SaleDetailModalProps) {
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  if (!sale) return null;

  const handleCancelSale = async () => {
    setCancelling(true);
    try {
      await onCancel();
      setCancelConfirm(false);
    } catch {
      // error handled by parent callback
    }
    setCancelling(false);
  };

  const handleClose = () => {
    setCancelConfirm(false);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={`Venta ${sale.folio}`}
      primaryAction={{ content: 'Reimprimir Ticket', icon: PrintIcon, onAction: onPrint }}
      secondaryActions={[{ content: 'Cerrar', onAction: handleClose }]}
    >
      <Modal.Section>
        <BlockStack gap="300">
          <InlineStack align="space-between">
            <Text as="span" variant="bodySm" tone="subdued">{new Date(sale.date).toLocaleString('es-MX')}</Text>
            <Text as="span" variant="bodySm" tone="subdued">Cajero: {sale.cajero}</Text>
          </InlineStack>
          <Divider />
          {sale.items.map((item, i) => (
            <InlineStack key={i} align="space-between">
              <BlockStack gap="050">
                <Text as="span" fontWeight="semibold">{item.productName}</Text>
                <Text as="span" variant="bodySm" tone="subdued">{item.quantity} x {formatCurrency(item.unitPrice)}</Text>
              </BlockStack>
              <Text as="span" fontWeight="semibold">{formatCurrency(item.subtotal)}</Text>
            </InlineStack>
          ))}
          <Divider />
          <InlineStack align="space-between">
            <Text as="span">Subtotal:</Text>
            <Text as="span">{formatCurrency(sale.subtotal)}</Text>
          </InlineStack>
          <InlineStack align="space-between">
            <Text as="span">IVA (16%):</Text>
            <Text as="span">{formatCurrency(sale.iva)}</Text>
          </InlineStack>
          <InlineStack align="space-between">
            <Text as="span" variant="headingMd" fontWeight="bold">TOTAL:</Text>
            <Text as="span" variant="headingMd" fontWeight="bold">{formatCurrency(sale.total)}</Text>
          </InlineStack>
          <Divider />
          <InlineStack align="space-between">
            <Text as="span">Método de pago:</Text>
            {paymentBadge(sale.paymentMethod)}
          </InlineStack>
          {sale.paymentMethod === 'efectivo' && (
            <>
              <InlineStack align="space-between">
                <Text as="span">Pagó con:</Text>
                <Text as="span">{formatCurrency(sale.amountPaid)}</Text>
              </InlineStack>
              <InlineStack align="space-between">
                <Text as="span" fontWeight="bold">Cambio:</Text>
                <Text as="span" fontWeight="bold">{formatCurrency(sale.change)}</Text>
              </InlineStack>
            </>
          )}
          <Divider />
          {cancelConfirm ? (
            <Banner tone="critical" title="¿Cancelar esta venta?" onDismiss={() => setCancelConfirm(false)}>
              <p style={{ marginBottom: 8 }}>Se revertirá el inventario y se eliminará la venta <strong>{sale.folio}</strong>. Esta acción no se puede deshacer.</p>
              <InlineStack gap="200">
                <Button variant="primary" tone="critical" onClick={handleCancelSale} loading={cancelling}>Sí, Cancelar Venta</Button>
                <Button onClick={() => setCancelConfirm(false)}>No</Button>
              </InlineStack>
            </Banner>
          ) : (
            <InlineStack align="space-between">
              <Button
                icon={ReturnIcon}
                onClick={onReturn}
                variant="secondary"
              >
                Iniciar Devolución
              </Button>
              <Button variant="plain" tone="critical" icon={DeleteIcon} onClick={() => setCancelConfirm(true)}>
                Cancelar Venta
              </Button>
            </InlineStack>
          )}
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
}
