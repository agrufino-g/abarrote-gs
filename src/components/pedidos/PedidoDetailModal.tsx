'use client';

import { useMemo } from 'react';
import {
  Text,
  Badge,
  BlockStack,
  InlineStack,
  Button,
  Modal,
  Banner,
  Box,
  DataTable,
  InlineGrid,
  ProgressBar,
} from '@shopify/polaris';
import type { PedidoRecord, Product } from '@/types';
import { formatCurrency } from '@/lib/utils';

const estadoBadge: Record<PedidoRecord['estado'], { tone: 'attention' | 'info' | 'success'; label: string }> = {
  pendiente: { tone: 'attention', label: 'Borrador' },
  enviado: { tone: 'info', label: 'En Tránsito' },
  recibido: { tone: 'success', label: 'Recibido' },
};

export interface PedidoDetailModalProps {
  open: boolean;
  pedido: PedidoRecord | null;
  products: Product[];
  receiving: boolean;
  onClose: () => void;
  onReceive: (id: string) => void;
  onStatusChange: (id: string, estado: PedidoRecord['estado']) => void;
  onReprint: (pedido: PedidoRecord) => void;
}

export function PedidoDetailModal({
  open,
  pedido,
  products,
  receiving,
  onClose,
  onReceive,
  onStatusChange,
  onReprint,
}: PedidoDetailModalProps) {
  // ── Computed data ──
  const lineItems = useMemo(() => {
    if (!pedido) return [];
    return pedido.productos.map((p) => {
      const found = products.find((pr) => pr.id === p.productId);
      const costPrice = found?.costPrice ?? 0;
      return {
        name: p.productName,
        sku: found?.sku ?? '—',
        qty: p.cantidad,
        costPrice,
        subtotal: costPrice * p.cantidad,
      };
    });
  }, [pedido, products]);

  const totalItems = useMemo(() => lineItems.reduce((s, l) => s + l.qty, 0), [lineItems]);
  const totalCost = useMemo(() => lineItems.reduce((s, l) => s + l.subtotal, 0), [lineItems]);
  const receivedItems = pedido?.estado === 'recibido' ? totalItems : 0;
  const receiveProgress = totalItems > 0 ? (receivedItems / totalItems) * 100 : 0;

  if (!pedido) return null;

  const badge = estadoBadge[pedido.estado];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Orden de Compra — ${pedido.proveedor}`}
      size="large"
      primaryAction={
        pedido.estado !== 'recibido'
          ? { content: 'Recibir Mercancía', onAction: () => onReceive(pedido.id), loading: receiving }
          : undefined
      }
      secondaryActions={[
        { content: 'Reimprimir ticket', onAction: () => onReprint(pedido) },
        { content: 'Cerrar', onAction: onClose },
      ]}
    >
      {/* ── Header info ── */}
      <Modal.Section>
        <InlineGrid columns={{ xs: 1, md: 3 }} gap="400">
          <BlockStack gap="100">
            <Text as="p" variant="bodyXs" tone="subdued">
              Proveedor
            </Text>
            <Text as="p" variant="bodyMd" fontWeight="semibold">
              {pedido.proveedor}
            </Text>
          </BlockStack>
          <BlockStack gap="100">
            <Text as="p" variant="bodyXs" tone="subdued">
              Fecha del pedido
            </Text>
            <Text as="p" variant="bodyMd">
              {new Date(pedido.fecha).toLocaleDateString('es-MX', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
          </BlockStack>
          <BlockStack gap="100">
            <Text as="p" variant="bodyXs" tone="subdued">
              Estado
            </Text>
            <InlineStack gap="200" blockAlign="center">
              <Badge tone={badge.tone}>{badge.label}</Badge>
              {pedido.estado === 'pendiente' && (
                <Button size="micro" onClick={() => onStatusChange(pedido.id, 'enviado')}>
                  Marcar Ordenado
                </Button>
              )}
            </InlineStack>
          </BlockStack>
        </InlineGrid>
      </Modal.Section>

      {/* ── Progress bar ── */}
      <Modal.Section>
        <BlockStack gap="200">
          <InlineStack align="space-between" blockAlign="center">
            <Text as="p" variant="bodySm" fontWeight="medium">
              Progreso de recepción
            </Text>
            <Text as="p" variant="bodySm" tone="subdued">
              {receivedItems} de {totalItems} artículos ({receiveProgress.toFixed(0)}%)
            </Text>
          </InlineStack>
          <ProgressBar
            progress={receiveProgress}
            size="small"
            tone={pedido.estado === 'recibido' ? 'success' : 'highlight'}
          />
        </BlockStack>
      </Modal.Section>

      {/* ── Notes banner ── */}
      {pedido.notas && (
        <Modal.Section>
          <Banner tone="info">
            <p>{pedido.notas}</p>
          </Banner>
        </Modal.Section>
      )}

      {/* ── Product table ── */}
      <Modal.Section>
        <BlockStack gap="300">
          <Text as="h3" variant="headingSm" fontWeight="bold">
            Productos solicitados
          </Text>
          {lineItems.length === 0 ? (
            <Box padding="600">
              <Text as="p" tone="subdued" alignment="center">
                Sin productos registrados en este pedido
              </Text>
            </Box>
          ) : (
            <DataTable
              columnContentTypes={['text', 'text', 'numeric', 'numeric', 'numeric']}
              headings={['Producto', 'SKU', 'Cantidad', 'Costo Unit.', 'Subtotal']}
              rows={lineItems.map((item) => [
                item.name,
                item.sku,
                String(item.qty),
                formatCurrency(item.costPrice),
                formatCurrency(item.subtotal),
              ])}
              totals={['', '', String(totalItems), '', formatCurrency(totalCost)]}
              totalsName={{ singular: 'Total', plural: 'Total' }}
            />
          )}
        </BlockStack>
      </Modal.Section>

      {/* ── Summary footer ── */}
      <Modal.Section>
        <InlineGrid columns={3} gap="300">
          <Box padding="300" background="bg-surface-secondary" borderRadius="200">
            <BlockStack gap="050">
              <Text as="p" variant="bodyXs" tone="subdued">
                Total Artículos
              </Text>
              <Text as="p" variant="headingSm" fontWeight="bold">
                {totalItems}
              </Text>
            </BlockStack>
          </Box>
          <Box padding="300" background="bg-surface-secondary" borderRadius="200">
            <BlockStack gap="050">
              <Text as="p" variant="bodyXs" tone="subdued">
                Valor de la Orden
              </Text>
              <Text as="p" variant="headingSm" fontWeight="bold">
                {formatCurrency(totalCost)}
              </Text>
            </BlockStack>
          </Box>
          <Box
            padding="300"
            background={pedido.estado === 'recibido' ? 'bg-fill-success-secondary' : 'bg-surface-secondary'}
            borderRadius="200"
          >
            <BlockStack gap="050">
              <Text as="p" variant="bodyXs" tone="subdued">
                Recepción
              </Text>
              <Text
                as="p"
                variant="headingSm"
                fontWeight="bold"
                tone={pedido.estado === 'recibido' ? 'success' : 'subdued'}
              >
                {pedido.estado === 'recibido' ? 'Completa' : 'Pendiente'}
              </Text>
            </BlockStack>
          </Box>
        </InlineGrid>
      </Modal.Section>

      {/* ── Received confirmation ── */}
      {pedido.estado === 'recibido' && (
        <Modal.Section>
          <Banner tone="success">
            <p>Este pedido fue recibido — el inventario ya fue actualizado.</p>
          </Banner>
        </Modal.Section>
      )}
    </Modal>
  );
}
