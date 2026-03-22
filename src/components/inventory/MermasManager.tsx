'use client';

import { useState, useCallback } from 'react';
import {
  Card,
  BlockStack,
  Text,
  Button,
  InlineStack,
  IndexTable,
  Badge,
  EmptyState,
  Modal,
  FormLayout,
  Banner,
  TextField,
  DatePicker,
} from '@shopify/polaris';
import { ArchiveIcon } from '@shopify/polaris-icons';
import { useDashboardStore } from '@/store/dashboardStore';
import { useToast } from '@/components/notifications/ToastProvider';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { FormSelect } from '@/components/ui/FormSelect';
import { formatCurrency } from '@/lib/utils';
import { usePermissions } from '@/hooks/usePermissions';

export function MermasManager() {
  const mermas = useDashboardStore((s) => s.mermaRecords);
  const products = useDashboardStore((s) => s.products);
  const registerMerma = useDashboardStore((s) => s.registerMerma);
  const toast = useToast();
  const { hasPermission, isLoaded } = usePermissions();

  const canManageInventory = !isLoaded || hasPermission('inventory.edit');

  const [modalOpen, setModalOpen] = useState(false);
  const [mermaProducto, setMermaProducto] = useState('');
  const [mermaCantidad, setMermaCantidad] = useState('');
  const [mermaRazon, setMermaRazon] = useState('expiration');
  const [mermaDate, setMermaDate] = useState(new Date());
  const [mermaMonth, setMermaMonth] = useState(new Date().getMonth());
  const [mermaYear, setMermaYear] = useState(new Date().getFullYear());

  const razonOptions = [
    { label: 'Vencimiento', value: 'expiration' },
    { label: 'Daño físico', value: 'damage' },
    { label: 'Deterioro', value: 'spoilage' },
    { label: 'Otro', value: 'other' },
  ];

  const productOptions = products.map((p) => ({
    label: `${p.name} (${p.sku})`,
    value: p.id,
  }));

  const selectedMermaProduct = products.find((p) => p.id === mermaProducto);

  const handleSubmit = useCallback(async () => {
    if (!mermaProducto || !mermaCantidad || !selectedMermaProduct) return;

    const qty = parseInt(mermaCantidad, 10);
    if (isNaN(qty) || qty <= 0) {
      toast.showError('Ingresa una cantidad válida');
      return;
    }

    try {
      await registerMerma({
        productId: mermaProducto,
        productName: selectedMermaProduct.name,
        quantity: qty,
        reason: mermaRazon as 'expiration' | 'damage' | 'spoilage' | 'other',
        date: mermaDate.toISOString(),
        value: qty * selectedMermaProduct.unitPrice,
      });

      toast.showSuccess(`Merma registrada: ${qty} unidades de ${selectedMermaProduct.name}`);
      setModalOpen(false);
      setMermaProducto('');
      setMermaCantidad('');
      setMermaRazon('expiration');
      setMermaDate(new Date());
    } catch {
      toast.showError('Error al registrar merma');
    }
  }, [mermaProducto, mermaCantidad, mermaRazon, mermaDate, selectedMermaProduct, registerMerma, toast]);

  const mapReasonBadge = (reason: string) => {
    switch (reason) {
      case 'expiration': return <Badge tone="critical">Vencimiento</Badge>;
      case 'damage': return <Badge tone="warning">Daño</Badge>;
      case 'spoilage': return <Badge tone="attention">Deterioro</Badge>;
      default: return <Badge tone="info">Otro</Badge>;
    }
  };

  const rowMarkup = mermas.map((merma, index) => {
    const d = new Date(merma.date);
    return (
      <IndexTable.Row id={merma.id} key={merma.id} position={index}>
        <IndexTable.Cell>
          <Text as="span" fontWeight="bold" variant="bodyMd">{merma.productName}</Text>
        </IndexTable.Cell>
        <IndexTable.Cell>{merma.quantity}</IndexTable.Cell>
        <IndexTable.Cell>{mapReasonBadge(merma.reason)}</IndexTable.Cell>
        <IndexTable.Cell>{d.toLocaleDateString()}</IndexTable.Cell>
        <IndexTable.Cell>
          <Text as="span" fontWeight="semibold" tone="critical">
            {formatCurrency(merma.value)}
          </Text>
        </IndexTable.Cell>
      </IndexTable.Row>
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 140px)' }}>
      {/* Header fijo */}
      <Card>
        <InlineStack align="space-between" blockAlign="center">
          <BlockStack gap="100">
            <Text as="h2" variant="headingMd">Historial de Mermas</Text>
            <Text as="p" tone="subdued">Registro general de productos perdidos, robados o vencidos.</Text>
          </BlockStack>
          {canManageInventory && (
            <Button variant="primary" icon={ArchiveIcon} onClick={() => setModalOpen(true)}>
              Registrar Merma
            </Button>
          )}
        </InlineStack>
      </Card>

      {/* Tabla scrollable */}
      <div style={{ flex: 1, overflow: 'hidden', marginTop: '8px' }}>
        <Card>
          {mermas.length === 0 ? (
            <EmptyState
              heading="No hay mermas registradas"
              image="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg'/>"
            >
              <p>El inventario no ha tenido pérdidas registradas hasta ahora.</p>
            </EmptyState>
          ) : (
            <div style={{ height: 'calc(100vh - 280px)', overflowY: 'auto' }}>
              <IndexTable
                itemCount={mermas.length}
                headings={[
                  { title: 'Producto' },
                  { title: 'Cant.' },
                  { title: 'Razón' },
                  { title: 'Fecha' },
                  { title: 'Pérdida ($)' },
                ]}
                selectable={false}
              >
                {rowMarkup}
              </IndexTable>
            </div>
          )}
        </Card>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Registrar Merma"
        primaryAction={{
          content: 'Guardar Merma',
          onAction: handleSubmit,
          disabled: !mermaProducto || !mermaCantidad,
        }}
        secondaryActions={[
          {
            content: 'Cancelar',
            onAction: () => setModalOpen(false),
          },
        ]}
      >
        <Modal.Section>
          <FormLayout>
            <Banner tone="warning">
              <p>
                Esta acción restará {mermaCantidad ? mermaCantidad : 'la cantidad seleccionada'} de tu stock actual y se registrará monetariamente como pérdida.
              </p>
            </Banner>

            <SearchableSelect
              label="Producto"
              options={productOptions}
              selected={mermaProducto}
              onChange={setMermaProducto}
            />

            {selectedMermaProduct && (
              <Text as="p" variant="bodySm" tone="subdued">
                Stock actual: <strong>{selectedMermaProduct.currentStock}</strong> unidades — Precio venta: {formatCurrency(selectedMermaProduct.unitPrice)}
              </Text>
            )}

            <TextField
              label="Cantidad a restar"
              value={mermaCantidad}
              onChange={setMermaCantidad}
              type="number"
              autoComplete="off"
              min={1}
              max={selectedMermaProduct?.currentStock}
              helpText={selectedMermaProduct ? `Máximo en sistema: ${selectedMermaProduct.currentStock}` : undefined}
              selectTextOnFocus
            />

            <FormSelect
              label="Razón de la merma"
              options={razonOptions}
              value={mermaRazon}
              onChange={setMermaRazon}
            />

            <div>
               <Text as="p" variant="bodyMd">Fecha de la merma</Text>
               <DatePicker
                 month={mermaMonth}
                 year={mermaYear}
                 onChange={({ start }) => { if (start) setMermaDate(start); }}
                 onMonthChange={(m, y) => { setMermaMonth(m); setMermaYear(y); }}
                 selected={{ start: mermaDate, end: mermaDate }}
               />
            </div>

            {selectedMermaProduct && mermaCantidad && (
              <Banner tone="critical">
                <Text as="p">
                  Valor de la pérdida: <strong>{formatCurrency(parseInt(mermaCantidad, 10) * selectedMermaProduct.unitPrice)}</strong>
                </Text>
              </Banner>
            )}
          </FormLayout>
        </Modal.Section>
      </Modal>
    </div>
  );
}
