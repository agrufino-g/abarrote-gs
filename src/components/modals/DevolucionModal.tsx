'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  Modal,
  BlockStack,
  InlineStack,
  Text,
  Select,
  TextField,
  Checkbox,
  Button,
  Divider,
  Banner,
  Badge,
  Box,
} from '@shopify/polaris';
import { ReturnIcon } from '@shopify/polaris-icons';
import { useDashboardStore } from '@/store/dashboardStore';
import { getSaleItemsForDevolucion } from '@/app/actions/db-actions';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/components/notifications/ToastProvider';
import type { SaleRecord, Devolucion, DevolucionItem } from '@/types';

interface DevolucionItemForm {
  productId: string;
  productName: string;
  sku: string;
  maxQty: number;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  regresoInventario: boolean;
  selected: boolean;
}

interface Props {
  open: boolean;
  sale: SaleRecord;
  cajero: string;
  onClose: () => void;
  onSuccess: (devolucion: Devolucion) => void;
}

const MOTIVOS = [
  { label: 'Seleccionar motivo...', value: '' },
  { label: 'Producto dañado', value: 'producto_danado' },
  { label: 'Producto incorrecto', value: 'producto_incorrecto' },
  { label: 'Insatisfacción del cliente', value: 'insatisfaccion' },
  { label: 'Otro', value: 'otro' },
];

const METODOS = [
  { label: 'Efectivo', value: 'efectivo' },
  { label: 'Crédito al cliente', value: 'credito_cliente' },
  { label: 'Transferencia', value: 'transferencia' },
];

export function DevolucionModal({ open, sale, cajero, onClose, onSuccess }: Props) {
  const registerDevolucion = useDashboardStore((s) => s.registerDevolucion);
  const clientes = useDashboardStore((s) => s.clientes);
  const { showSuccess, showError } = useToast();

  const [items, setItems] = useState<DevolucionItemForm[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [metodoDev, setMetodoDev] = useState<'efectivo' | 'credito_cliente' | 'transferencia'>('efectivo');
  const [notas, setNotas] = useState('');
  const [saving, setSaving] = useState(false);
  const [clienteId, setClienteId] = useState('');

  // Load items from the sale when modal opens
  const handleOpen = useCallback(async () => {
    setLoadingItems(true);
    setMotivo('');
    setMetodoDev('efectivo');
    setNotas('');
    setClienteId('');
    try {
      const saleItems = await getSaleItemsForDevolucion(sale.id);
      setItems(saleItems.map((i) => ({
        ...i,
        maxQty: i.quantity,
        regresoInventario: true,
        selected: true,
      })));
    } catch {
      showError('Error al cargar los artículos de la venta');
    }
    setLoadingItems(false);
  }, [sale.id, showError]);

  // When modal opens, load items
  useEffect(() => {
    if (open && items.length === 0 && !loadingItems) {
      handleOpen();
    }
  }, [open, items.length, loadingItems, handleOpen]);

  const selectedItems = items.filter((i) => i.selected && i.quantity > 0);
  const montoDevuelto = selectedItems.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);

  const updateItem = (idx: number, partial: Partial<DevolucionItemForm>) => {
    setItems((prev) => prev.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, ...partial };
      updated.subtotal = updated.quantity * updated.unitPrice;
      return updated;
    }));
  };

  const handleQtyChange = (idx: number, value: string) => {
    const qty = Math.max(0, Math.min(items[idx].maxQty, parseInt(value, 10) || 0));
    updateItem(idx, { quantity: qty });
  };

  const handleSubmit = async () => {
    if (!motivo) { showError('Selecciona un motivo'); return; }
    if (selectedItems.length === 0) { showError('Selecciona al menos un artículo'); return; }
    if (metodoDev === 'credito_cliente' && !clienteId) { showError('Selecciona el cliente para aplicar crédito'); return; }

    setSaving(true);
    try {
      const tipo = selectedItems.length === items.length &&
        selectedItems.every((i) => i.quantity === i.maxQty) ? 'total' : 'parcial';

      const devolucion = await registerDevolucion({
        saleId: sale.id,
        saleFolio: sale.folio,
        tipo,
        motivo: motivo as Devolucion['motivo'],
        notas,
        montoDevuelto,
        metodoDev,
        cajero,
        clienteId: clienteId || undefined,
        items: selectedItems.map((i) => ({
          productId: i.productId,
          productName: i.productName,
          sku: i.sku,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          subtotal: i.quantity * i.unitPrice,
          regresoInventario: i.regresoInventario,
        })),
      });

      showSuccess(`Devolución registrada — ${formatCurrency(montoDevuelto)} devueltos`);
      onSuccess(devolucion);
      onClose();
      setItems([]);
    } catch {
      showError('Error al registrar la devolución');
    }
    setSaving(false);
  };

  const clienteOptions = [
    { label: 'Sin cliente', value: '' },
    ...clientes.map((c) => ({ label: c.name, value: c.id })),
  ];

  return (
    <Modal
      open={open}
      onClose={() => { onClose(); setItems([]); }}
      title={`Devolución — Venta ${sale.folio}`}
      primaryAction={{
        content: saving ? 'Registrando...' : `Registrar Devolución (${formatCurrency(montoDevuelto)})`,
        onAction: handleSubmit,
        loading: saving,
        disabled: selectedItems.length === 0 || !motivo,
      }}
      secondaryActions={[{
        content: 'Cancelar',
        onAction: () => { onClose(); setItems([]); },
      }]}
      size="large"
    >
      <Modal.Section>
        {loadingItems ? (
          <Box padding="400">
            <Text as="p" tone="subdued">Cargando artículos...</Text>
          </Box>
        ) : (
          <BlockStack gap="400">

            {/* Motivo + Método */}
            <InlineStack gap="400" wrap={false}>
              <div style={{ flex: 1 }}>
                <Select
                  label="Motivo de devolución"
                  options={MOTIVOS}
                  value={motivo}
                  onChange={setMotivo}
                />
              </div>
              <div style={{ flex: 1 }}>
                <Select
                  label="Método de devolución"
                  options={METODOS}
                  value={metodoDev}
                  onChange={(v) => setMetodoDev(v as typeof metodoDev)}
                />
              </div>
            </InlineStack>

            {/* Cliente (solo si crédito_cliente) */}
            {metodoDev === 'credito_cliente' && (
              <Select
                label="Cliente"
                options={clienteOptions}
                value={clienteId}
                onChange={setClienteId}
              />
            )}

            <Divider />

            {/* Items */}
            <Text as="h3" variant="headingSm" fontWeight="semibold">Artículos a devolver</Text>

            {items.map((item, idx) => (
              <Box
                key={item.productId}
                background={item.selected ? 'bg-surface-selected' : 'bg-surface'}
                borderWidth="025"
                borderColor="border"
                borderRadius="200"
                padding="300"
              >
                <BlockStack gap="200">
                  <InlineStack align="space-between" blockAlign="center">
                    <InlineStack gap="300" blockAlign="center">
                      <Checkbox
                        label=""
                        labelHidden
                        checked={item.selected}
                        onChange={(v) => updateItem(idx, { selected: v })}
                      />
                      <BlockStack gap="050">
                        <Text as="span" fontWeight="semibold">{item.productName}</Text>
                        <Text as="span" variant="bodySm" tone="subdued">SKU: {item.sku} · {formatCurrency(item.unitPrice)} c/u</Text>
                      </BlockStack>
                    </InlineStack>
                    <Badge tone="info">{`Máx: ${item.maxQty}`}</Badge>
                  </InlineStack>

                  {item.selected && (
                    <InlineStack gap="400" blockAlign="end">
                      <div style={{ width: 120 }}>
                        <TextField
                          label="Cantidad a devolver"
                          type="number"
                          value={String(item.quantity)}
                          onChange={(v) => handleQtyChange(idx, v)}
                          min="1"
                          max={String(item.maxQty)}
                          autoComplete="off"
                        />
                      </div>
                      <Checkbox
                        label="Regresar a inventario"
                        checked={item.regresoInventario}
                        onChange={(v) => updateItem(idx, { regresoInventario: v })}
                      />
                      <Text as="span" fontWeight="semibold">
                        {formatCurrency(item.quantity * item.unitPrice)}
                      </Text>
                    </InlineStack>
                  )}
                </BlockStack>
              </Box>
            ))}

            <Divider />

            <TextField
              label="Notas adicionales"
              multiline={3}
              value={notas}
              onChange={setNotas}
              autoComplete="off"
              placeholder="Observaciones opcionales..."
            />

            {selectedItems.length > 0 && (
              <Banner tone="info">
                <InlineStack align="space-between">
                  <Text as="span" fontWeight="semibold">
                    {selectedItems.reduce((s, i) => s + i.quantity, 0)} artículo(s) a devolver
                  </Text>
                  <Text as="span" variant="headingMd" fontWeight="bold">
                    Total: {formatCurrency(montoDevuelto)}
                  </Text>
                </InlineStack>
              </Banner>
            )}

          </BlockStack>
        )}
      </Modal.Section>
    </Modal>
  );
}
