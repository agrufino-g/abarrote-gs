'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  Badge,
  BlockStack,
  Box,
  Card,
  IndexFilters,
  IndexFiltersMode,
  IndexTable,
  InlineGrid,
  InlineStack,
  Text,
  useIndexResourceState,
  useSetIndexFiltersMode,
} from '@shopify/polaris';
import type { TabProps } from '@shopify/polaris';
import { useDashboardStore } from '@/store/dashboardStore';
import { useToast } from '@/components/notifications/ToastProvider';
import { GenericExportModal } from '@/components/inventory/ShopifyModals';
import { generateCSV, downloadFile } from '@/components/export/ExportModal';
import { generatePDF } from '@/components/export/generatePDF';
import type { PedidoRecord, Product } from '@/types';
import { printTicketSurtido, type OrderLineItem } from './printTicketSurtido';
import { PedidoDetailModal } from './PedidoDetailModal';
import { formatCurrency } from '@/lib/utils';

// ── Status mapping ──
const estadoBadge: Record<PedidoRecord['estado'], { tone: 'attention' | 'info' | 'success'; label: string }> = {
  pendiente: { tone: 'attention', label: 'Borrador' },
  enviado: { tone: 'info', label: 'Ordenado' },
  recibido: { tone: 'success', label: 'Recibido' },
};

// ── Tab definitions for IndexFilters ──
const TAB_DEFINITIONS: { id: string; content: string; filter: PedidoRecord['estado'] | null }[] = [
  { id: 'todas', content: 'Todas', filter: null },
  { id: 'pendiente', content: 'Borrador', filter: 'pendiente' },
  { id: 'enviado', content: 'Ordenado', filter: 'enviado' },
  { id: 'recibido', content: 'Recibido', filter: 'recibido' },
];

interface PedidosManagerProps {
  onCreateOrder: () => void;
}

export function PedidosManager({ onCreateOrder: _onCreateOrder }: PedidosManagerProps) {
  const pedidos = useDashboardStore((s) => s.pedidos);
  const updatePedidoStatus = useDashboardStore((s) => s.updatePedidoStatus);
  const receivePedido = useDashboardStore((s) => s.receivePedido);
  const storeConfig = useDashboardStore((s) => s.storeConfig);
  const products = useDashboardStore((s) => s.products);
  const { showSuccess, showError } = useToast();

  const [selectedTab, setSelectedTab] = useState(0);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedPedido, setSelectedPedido] = useState<PedidoRecord | null>(null);
  const [receiving, setReceiving] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [queryValue, setQueryValue] = useState('');
  const [sortSelected, setSortSelected] = useState(['fecha desc']);

  const { mode, setMode } = useSetIndexFiltersMode(IndexFiltersMode.Filtering);

  // ── Tabs as TabProps[] ──
  const tabs: TabProps[] = TAB_DEFINITIONS.map((t, i) => ({
    content: t.content,
    index: i,
    id: t.id,
    isLocked: i === 0,
    onAction: () => {},
  }));

  // ── Sort options ──
  const sortOptions = [
    { label: 'Fecha', value: 'fecha desc' as const, directionLabel: 'Más reciente' },
    { label: 'Fecha', value: 'fecha asc' as const, directionLabel: 'Más antiguo' },
    { label: 'Total', value: 'total desc' as const, directionLabel: 'Mayor a menor' },
    { label: 'Total', value: 'total asc' as const, directionLabel: 'Menor a mayor' },
    { label: 'Proveedor', value: 'proveedor asc' as const, directionLabel: 'A-Z' },
    { label: 'Proveedor', value: 'proveedor desc' as const, directionLabel: 'Z-A' },
  ];

  // ── Compute totals for each pedido ──
  const getPedidoTotal = useCallback(
    (pedido: PedidoRecord) =>
      pedido.productos.reduce((sum, p) => {
        const found = products.find((pr) => pr.id === p.productId);
        return sum + (found?.costPrice ?? 0) * p.cantidad;
      }, 0),
    [products],
  );

  // ── Filter + Sort ──
  const filteredPedidos = useMemo(() => {
    const statusFilter = TAB_DEFINITIONS[selectedTab]?.filter ?? null;

    let result = [...pedidos];

    if (statusFilter) {
      result = result.filter((p) => p.estado === statusFilter);
    }

    if (queryValue.trim()) {
      const q = queryValue.toLowerCase();
      result = result.filter(
        (p) =>
          p.proveedor.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q) ||
          p.notas?.toLowerCase().includes(q),
      );
    }

    const [sortKey, sortDir] = sortSelected[0].split(' ');
    result.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'fecha') cmp = new Date(a.fecha).getTime() - new Date(b.fecha).getTime();
      else if (sortKey === 'total') cmp = getPedidoTotal(a) - getPedidoTotal(b);
      else if (sortKey === 'proveedor') cmp = a.proveedor.localeCompare(b.proveedor);
      return sortDir === 'desc' ? -cmp : cmp;
    });

    return result;
  }, [pedidos, selectedTab, queryValue, sortSelected, getPedidoTotal]);

  const { selectedResources, allResourcesSelected, handleSelectionChange } = useIndexResourceState(
    filteredPedidos as { id: string }[],
  );

  // ── KPI aggregates ──
  const kpis = useMemo(() => {
    const total = pedidos.reduce((s, p) => s + getPedidoTotal(p), 0);
    const pendientes = pedidos.filter((p) => p.estado === 'pendiente').length;
    const enviados = pedidos.filter((p) => p.estado === 'enviado').length;
    const recibidos = pedidos.filter((p) => p.estado === 'recibido').length;
    return { total, pendientes, enviados, recibidos, count: pedidos.length };
  }, [pedidos, getPedidoTotal]);

  // ── Handlers ──
  const handleViewDetail = useCallback((pedido: PedidoRecord) => {
    setSelectedPedido(pedido);
    setDetailOpen(true);
  }, []);

  const handleStatusChange = useCallback(
    async (id: string, estado: PedidoRecord['estado']) => {
      try {
        await updatePedidoStatus(id, estado);
        showSuccess(`Pedido marcado como "${estadoBadge[estado].label}"`);
        setSelectedPedido((prev) => (prev?.id === id ? { ...prev, estado } : prev));
      } catch {
        showError('Error al actualizar estado');
      }
    },
    [updatePedidoStatus, showSuccess, showError],
  );

  const handleReceive = useCallback(
    async (id: string) => {
      setReceiving(true);
      try {
        await receivePedido(id);
        showSuccess('Pedido recibido — inventario actualizado');
        setSelectedPedido((prev) => (prev?.id === id ? { ...prev, estado: 'recibido' as const } : prev));
      } catch {
        showError('Error al recibir mercancía');
      }
      setReceiving(false);
    },
    [receivePedido, showSuccess, showError],
  );

  const handleReprint = useCallback(
    (pedido: PedidoRecord) => {
      const lineItems: OrderLineItem[] = pedido.productos.map((p) => {
        const found = products.find((pr: Product) => pr.id === p.productId);
        return {
          productId: p.productId,
          productName: p.productName,
          sku: found?.sku ?? '',
          precio: found?.costPrice ?? 0,
          cantidad: p.cantidad,
        };
      });
      const subtotal = lineItems.reduce((s, l) => s + l.precio * l.cantidad, 0);
      printTicketSurtido({
        folio: pedido.id,
        fecha: pedido.fecha,
        proveedor: pedido.proveedor,
        terminosPago: '',
        moneda: 'MXN',
        destino: storeConfig.storeName,
        destinoAddress: [storeConfig.address, storeConfig.city].filter(Boolean).join(', '),
        notas: pedido.notas ?? '',
        lineItems,
        subtotal,
        storeName: storeConfig.storeName,
        storeAddress: [storeConfig.address, storeConfig.city, storeConfig.postalCode].filter(Boolean).join(', '),
        storePhone: storeConfig.phone,
        templateProveedor: storeConfig.ticketTemplateProveedor,
      });
    },
    [products, storeConfig],
  );

  const handleDetailClose = useCallback(() => {
    setDetailOpen(false);
    setSelectedPedido(null);
  }, []);

  const getRecibidoText = useCallback((pedido: PedidoRecord) => {
    const total = pedido.productos.reduce((s, p) => s + p.cantidad, 0);
    if (pedido.estado === 'recibido') return `${total} de ${total}`;
    return `0 de ${total}`;
  }, []);

  const formatFechaCorta = (fecha: string) =>
    new Date(fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: '2-digit' });

  const getFolio = (_pedido: PedidoRecord, index: number) => `#PO-${String(index + 1).padStart(4, '0')}`;

  // ── Promoted bulk actions ──
  const promotedBulkActions = [
    {
      content: 'Exportar seleccionados',
      onAction: () => setIsExportOpen(true),
    },
  ];

  // ── Row markup ──
  const rowMarkup = filteredPedidos.map((pedido, index) => {
    const total = getPedidoTotal(pedido);
    const badge = estadoBadge[pedido.estado];
    const itemCount = pedido.productos.reduce((s, p) => s + p.cantidad, 0);

    return (
      <IndexTable.Row
        id={pedido.id}
        key={pedido.id}
        position={index}
        selected={selectedResources.includes(pedido.id)}
        onClick={() => handleViewDetail(pedido)}
      >
        <IndexTable.Cell>
          <Text as="span" variant="bodyMd" fontWeight="bold">
            {getFolio(pedido, index)}
          </Text>
        </IndexTable.Cell>

        <IndexTable.Cell>
          <Text as="span" variant="bodyMd" fontWeight="medium">
            {pedido.proveedor}
          </Text>
        </IndexTable.Cell>

        <IndexTable.Cell>
          <Text as="span" variant="bodyMd">
            {formatFechaCorta(pedido.fecha)}
          </Text>
        </IndexTable.Cell>

        <IndexTable.Cell>
          <Badge tone={badge.tone}>{badge.label}</Badge>
        </IndexTable.Cell>

        <IndexTable.Cell>
          <Text as="span" variant="bodyMd" tone="subdued">
            {`${itemCount} artículos`}
          </Text>
        </IndexTable.Cell>

        <IndexTable.Cell>
          <Text as="span" variant="bodyMd">
            {getRecibidoText(pedido)}
          </Text>
        </IndexTable.Cell>

        <IndexTable.Cell>
          <Text as="span" variant="bodyMd" fontWeight="semibold">
            {formatCurrency(total)}
          </Text>
        </IndexTable.Cell>
      </IndexTable.Row>
    );
  });

  return (
    <>
      <BlockStack gap="400">
        {/* ═══ KPI SUMMARY ═══ */}
        <InlineGrid columns={{ xs: 2, md: 4 }} gap="300">
          <Card>
            <BlockStack gap="100">
              <Text as="p" variant="bodyXs" tone="subdued">
                Total Órdenes
              </Text>
              <Text as="p" variant="headingLg" fontWeight="bold">
                {kpis.count}
              </Text>
              <Text as="p" variant="bodyXs" tone="subdued">
                {formatCurrency(kpis.total)} valor total
              </Text>
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="100">
              <Text as="p" variant="bodyXs" tone="subdued">
                Borradores
              </Text>
              <InlineStack gap="200" blockAlign="center">
                <Text as="p" variant="headingLg" fontWeight="bold">
                  {kpis.pendientes}
                </Text>
                {kpis.pendientes > 0 && <Badge tone="attention">Pendientes</Badge>}
              </InlineStack>
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="100">
              <Text as="p" variant="bodyXs" tone="subdued">
                En Tránsito
              </Text>
              <InlineStack gap="200" blockAlign="center">
                <Text as="p" variant="headingLg" fontWeight="bold">
                  {kpis.enviados}
                </Text>
                {kpis.enviados > 0 && <Badge tone="info">Ordenados</Badge>}
              </InlineStack>
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="100">
              <Text as="p" variant="bodyXs" tone="subdued">
                Recibidos
              </Text>
              <InlineStack gap="200" blockAlign="center">
                <Text as="p" variant="headingLg" fontWeight="bold">
                  {kpis.recibidos}
                </Text>
                <Badge tone="success">Completados</Badge>
              </InlineStack>
            </BlockStack>
          </Card>
        </InlineGrid>

        {/* ═══ INDEX TABLE WITH FILTERS ═══ */}
        <Card padding="0">
          <IndexFilters
            sortOptions={sortOptions}
            sortSelected={sortSelected}
            queryValue={queryValue}
            queryPlaceholder="Buscar por proveedor, folio o notas..."
            onQueryChange={setQueryValue}
            onQueryClear={() => setQueryValue('')}
            onSort={setSortSelected}
            cancelAction={{ onAction: () => {}, disabled: false, loading: false }}
            tabs={tabs}
            selected={selectedTab}
            onSelect={setSelectedTab}
            mode={mode}
            setMode={setMode}
            filters={[]}
            appliedFilters={[]}
            onClearAll={() => {}}
          />

          <IndexTable
            resourceName={{ singular: 'orden de compra', plural: 'órdenes de compra' }}
            itemCount={filteredPedidos.length}
            selectedItemsCount={allResourcesSelected ? 'All' : selectedResources.length}
            onSelectionChange={handleSelectionChange}
            headings={[
              { title: 'Orden' },
              { title: 'Proveedor' },
              { title: 'Fecha' },
              { title: 'Estado' },
              { title: 'Productos' },
              { title: 'Recibido' },
              { title: 'Total' },
            ]}
            promotedBulkActions={promotedBulkActions}
            emptyState={
              <Box padding="800">
                <BlockStack gap="200" inlineAlign="center">
                  <Text as="p" variant="headingMd" alignment="center">
                    No hay órdenes de compra
                  </Text>
                  <Text as="p" tone="subdued" alignment="center">
                    Crea tu primera orden para abastecer tu inventario
                  </Text>
                </BlockStack>
              </Box>
            }
          >
            {rowMarkup}
          </IndexTable>
        </Card>
      </BlockStack>

      {/* Detail Modal */}
      <PedidoDetailModal
        open={detailOpen}
        pedido={selectedPedido}
        products={products}
        receiving={receiving}
        onClose={handleDetailClose}
        onReceive={handleReceive}
        onStatusChange={handleStatusChange}
        onReprint={handleReprint}
      />

      {/* Export Modal */}
      <GenericExportModal
        open={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        title="Exportar órdenes de compra"
        exportName="órdenes"
        onExport={(format) => {
          const exportData = filteredPedidos.map((p) => ({
            Orden: p.id.slice(0, 8),
            Distribuidor: p.proveedor,
            Fecha: new Date(p.fecha).toLocaleDateString('es-MX'),
            Estado: estadoBadge[p.estado].label,
            Recibido: getRecibidoText(p),
            Total: formatCurrency(getPedidoTotal(p)),
            Notas: p.notas || 'N/A',
          }));
          const filename = `Ordenes_Compra_${new Date().toISOString().split('T')[0]}`;
          if (format === 'pdf') {
            generatePDF('Órdenes de compra', exportData as Record<string, unknown>[], `${filename}.pdf`);
          } else {
            const csvContent = generateCSV(exportData as Record<string, unknown>[], true);
            const mime = format === 'csv' ? 'text/csv;charset=utf-8;' : 'application/vnd.ms-excel;charset=utf-8;';
            downloadFile(csvContent, `${filename}.csv`, mime);
          }
        }}
      />
    </>
  );
}
