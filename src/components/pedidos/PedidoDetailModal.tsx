'use client';

import {
  Text,
  Badge,
  BlockStack,
  InlineStack,
  Button,
  Modal,
  Banner,
} from '@shopify/polaris';
import type { PedidoRecord, Product } from '@/types';

const estadoBadge: Record<PedidoRecord['estado'], { tone: 'attention' | 'info' | 'success'; label: string }> = {
  pendiente: { tone: 'attention', label: 'Pendiente' },
  enviado: { tone: 'info', label: 'Enviado' },
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
  if (!pedido) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Pedido — ${pedido.proveedor}`}
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
      <Modal.Section>
        <InlineStack align="space-between" blockAlign="center">
          <BlockStack gap="100">
            <Text as="p" variant="bodySm" tone="subdued">Fecha del pedido</Text>
            <Text as="p" variant="bodyMd">{new Date(pedido.fecha).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}</Text>
          </BlockStack>
          <Badge tone={estadoBadge[pedido.estado].tone}>
            {estadoBadge[pedido.estado].label}
          </Badge>
        </InlineStack>
      </Modal.Section>

      {pedido.notas && (
        <Modal.Section>
          <Banner tone="info"><p>{pedido.notas}</p></Banner>
        </Modal.Section>
      )}

      <Modal.Section flush>
        <div style={{ padding: '0 20px 4px', borderBottom: '1px solid #e1e3e5' }}>
          <Text as="h3" variant="headingSm">Productos solicitados</Text>
        </div>
        {pedido.productos.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <Text as="p" tone="subdued">Sin productos registrados en este pedido</Text>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f6f6f7' }}>
                <th style={{ textAlign: 'left', padding: '10px 20px', color: '#6d7175', fontWeight: 500, borderBottom: '1px solid #e1e3e5' }}>Producto</th>
                <th style={{ textAlign: 'left', padding: '10px 12px', color: '#6d7175', fontWeight: 500, borderBottom: '1px solid #e1e3e5' }}>SKU</th>
                <th style={{ textAlign: 'right', padding: '10px 12px', color: '#6d7175', fontWeight: 500, borderBottom: '1px solid #e1e3e5' }}>Precio costo</th>
                <th style={{ textAlign: 'right', padding: '10px 20px', color: '#6d7175', fontWeight: 500, borderBottom: '1px solid #e1e3e5' }}>Cantidad</th>
              </tr>
            </thead>
            <tbody>
              {pedido.productos.map((p, i) => {
                const found = products.find((pr: Product) => pr.id === p.productId);
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f1f1' }}>
                    <td style={{ padding: '12px 20px', fontWeight: 600, color: '#303030' }}>{p.productName}</td>
                    <td style={{ padding: '12px 12px', color: '#6d7175' }}>{found?.sku ?? '—'}</td>
                    <td style={{ padding: '12px 12px', textAlign: 'right', color: '#303030' }}>
                      {found ? `$${found.costPrice.toFixed(2)}` : '—'}
                    </td>
                    <td style={{ padding: '12px 20px', textAlign: 'right' }}>
                      <span style={{
                        display: 'inline-block', minWidth: '40px', padding: '2px 10px',
                        background: '#f0f0f0', borderRadius: '20px',
                        fontWeight: 700, fontSize: '13px', color: '#303030', textAlign: 'center',
                      }}>
                        {p.cantidad}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: '#f6f6f7', borderTop: '2px solid #e1e3e5' }}>
                <td colSpan={3} style={{ padding: '10px 20px', fontWeight: 600, color: '#303030' }}>
                  Total artículos
                </td>
                <td style={{ padding: '10px 20px', textAlign: 'right', fontWeight: 700, fontSize: '14px', color: '#303030' }}>
                  {pedido.productos.reduce((s, p) => s + p.cantidad, 0)}
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </Modal.Section>

      {(pedido.estado === 'pendiente' || pedido.estado === 'recibido') && (
        <Modal.Section>
          {pedido.estado === 'pendiente' && (
            <Button onClick={() => onStatusChange(pedido.id, 'enviado')}>
              Marcar como Enviado
            </Button>
          )}
          {pedido.estado === 'recibido' && (
            <Banner tone="success">
              <p>Este pedido fue recibido — el inventario ya fue actualizado.</p>
            </Banner>
          )}
        </Modal.Section>
      )}
    </Modal>
  );
}
