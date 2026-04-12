'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  Card,
  BlockStack,
  Text,
  Button,
  InlineStack,
  IndexTable,
  IndexFilters,
  IndexFiltersMode,
  useSetIndexFiltersMode,
  Badge,
  Box,
  Modal,
  FormLayout,
  Banner,
  TextField,
  DatePicker,
  DropZone,
  Thumbnail,
  InlineGrid,
  useIndexResourceState,
} from '@shopify/polaris';
import type { TabProps } from '@shopify/polaris';
import { ArchiveIcon } from '@shopify/polaris-icons';
import { useDashboardStore } from '@/store/dashboardStore';
import { useToast } from '@/components/notifications/ToastProvider';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { FormSelect } from '@/components/ui/FormSelect';
import { formatCurrency } from '@/lib/utils';
import { usePermissions } from '@/hooks/usePermissions';
import { uploadFile } from '@/lib/storage';

// ── Reason config ──
const REASON_CONFIG: Record<string, { label: string; tone: 'critical' | 'warning' | 'attention' | 'info' }> = {
  expiration: { label: 'Vencimiento', tone: 'critical' },
  damage: { label: 'Daño', tone: 'warning' },
  spoilage: { label: 'Deterioro', tone: 'attention' },
  other: { label: 'Otro', tone: 'info' },
};

const razonOptions = [
  { label: 'Vencimiento / Caducidad', value: 'expiration' },
  { label: 'Daño físico', value: 'damage' },
  { label: 'Deterioro / Descomposición', value: 'spoilage' },
  { label: 'Otro (robo, desconocido)', value: 'other' },
];

// ── Tab definitions ──
const TAB_DEFS: { id: string; content: string; reason: string | null }[] = [
  { id: 'todas', content: 'Todas', reason: null },
  { id: 'expiration', content: 'Vencimiento', reason: 'expiration' },
  { id: 'damage', content: 'Daño', reason: 'damage' },
  { id: 'spoilage', content: 'Deterioro', reason: 'spoilage' },
  { id: 'other', content: 'Otro', reason: 'other' },
];

function getMermaEvidencePath(mermaId: string, originalName: string): string {
  const ext = originalName.split('.').pop();
  return `mermas/${mermaId}-${Date.now()}.${ext}`;
}

export function MermasManager() {
  const mermas = useDashboardStore((s) => s.mermaRecords);
  const products = useDashboardStore((s) => s.products);
  const registerMerma = useDashboardStore((s) => s.registerMerma);
  const toast = useToast();
  const { hasPermission, isLoaded } = usePermissions();

  const canManageInventory = !isLoaded || hasPermission('inventory.edit');

  // ── State: filters ──
  const [selectedTab, setSelectedTab] = useState(0);
  const [queryValue, setQueryValue] = useState('');
  const [sortSelected, setSortSelected] = useState(['date desc']);
  const { mode, setMode } = useSetIndexFiltersMode(IndexFiltersMode.Filtering);

  // ── State: register modal ──
  const [modalOpen, setModalOpen] = useState(false);
  const [mermaProducto, setMermaProducto] = useState('');
  const [mermaCantidad, setMermaCantidad] = useState('');
  const [mermaRazon, setMermaRazon] = useState('expiration');
  const [mermaNotas, setMermaNotas] = useState('');
  const [mermaDate, setMermaDate] = useState(new Date());
  const [mermaMonth, setMermaMonth] = useState(new Date().getMonth());
  const [mermaYear, setMermaYear] = useState(new Date().getFullYear());
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // ── State: detail view ──
  const [detailMerma, setDetailMerma] = useState<(typeof mermas)[0] | null>(null);

  // ── Tabs ──
  const tabs: TabProps[] = TAB_DEFS.map((t, i) => ({
    content: t.content,
    index: i,
    id: t.id,
    isLocked: i === 0,
    onAction: () => {},
  }));

  // ── Sort ──
  const sortOptions = [
    { label: 'Fecha', value: 'date desc' as const, directionLabel: 'Más reciente' },
    { label: 'Fecha', value: 'date asc' as const, directionLabel: 'Más antiguo' },
    { label: 'Valor', value: 'value desc' as const, directionLabel: 'Mayor pérdida' },
    { label: 'Valor', value: 'value asc' as const, directionLabel: 'Menor pérdida' },
    { label: 'Producto', value: 'product asc' as const, directionLabel: 'A-Z' },
    { label: 'Producto', value: 'product desc' as const, directionLabel: 'Z-A' },
  ];

  // ── Filtered + sorted mermas ──
  const filteredMermas = useMemo(() => {
    const reasonFilter = TAB_DEFS[selectedTab]?.reason ?? null;
    let result = [...mermas];

    if (reasonFilter) {
      result = result.filter((m) => m.reason === reasonFilter);
    }

    if (queryValue.trim()) {
      const q = queryValue.toLowerCase();
      result = result.filter(
        (m) =>
          m.productName.toLowerCase().includes(q) ||
          m.notes?.toLowerCase().includes(q) ||
          m.id.toLowerCase().includes(q),
      );
    }

    const [sortKey, sortDir] = sortSelected[0].split(' ');
    result.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'date') cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
      else if (sortKey === 'value') cmp = a.value - b.value;
      else if (sortKey === 'product') cmp = a.productName.localeCompare(b.productName);
      return sortDir === 'desc' ? -cmp : cmp;
    });

    return result;
  }, [mermas, selectedTab, queryValue, sortSelected]);

  const { selectedResources, allResourcesSelected, handleSelectionChange } = useIndexResourceState(
    filteredMermas as { id: string }[],
  );

  // ── KPI data ──
  const kpis = useMemo(() => {
    const totalValue = mermas.reduce((s, m) => s + m.value, 0);
    const totalQty = mermas.reduce((s, m) => s + m.quantity, 0);
    const byReason = mermas.reduce(
      (acc, m) => {
        acc[m.reason] = (acc[m.reason] || 0) + m.value;
        return acc;
      },
      {} as Record<string, number>,
    );
    const topReason = Object.entries(byReason).sort((a, b) => b[1] - a[1])[0];
    const thisMonth = mermas.filter((m) => {
      const d = new Date(m.date);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const monthValue = thisMonth.reduce((s, m) => s + m.value, 0);

    return {
      totalValue,
      totalQty,
      count: mermas.length,
      topReason: topReason ? REASON_CONFIG[topReason[0]]?.label ?? topReason[0] : '—',
      topReasonValue: topReason?.[1] ?? 0,
      monthValue,
      monthCount: thisMonth.length,
    };
  }, [mermas]);

  // ── Product options for SearchableSelect ──
  const productOptions = useMemo(
    () => products.map((p) => ({ label: `${p.name} (${p.sku})`, value: p.id })),
    [products],
  );

  const selectedMermaProduct = products.find((p) => p.id === mermaProducto);

  // ── Handlers ──
  const resetForm = useCallback(() => {
    setMermaProducto('');
    setMermaCantidad('');
    setMermaRazon('expiration');
    setMermaNotas('');
    setEvidenceFile(null);
    setMermaDate(new Date());
    setMermaMonth(new Date().getMonth());
    setMermaYear(new Date().getFullYear());
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!mermaProducto || !mermaCantidad || !selectedMermaProduct) return;

    const qty = parseInt(mermaCantidad, 10);
    if (isNaN(qty) || qty <= 0) {
      toast.showError('Ingresa una cantidad válida');
      return;
    }
    if (qty > selectedMermaProduct.currentStock) {
      toast.showError(`Solo hay ${selectedMermaProduct.currentStock} unidades en stock`);
      return;
    }

    setSubmitting(true);
    try {
      let evidenceUrl: string | undefined;
      if (evidenceFile) {
        const path = getMermaEvidencePath(mermaProducto, evidenceFile.name);
        evidenceUrl = await uploadFile(evidenceFile, path);
      }

      await registerMerma({
        productId: mermaProducto,
        productName: selectedMermaProduct.name,
        quantity: qty,
        reason: mermaRazon as 'expiration' | 'damage' | 'spoilage' | 'other',
        notes: mermaNotas.trim() || undefined,
        evidenceUrl,
        date: mermaDate.toISOString(),
        value: qty * selectedMermaProduct.unitPrice,
      });

      toast.showSuccess(`Merma registrada: ${qty} × ${selectedMermaProduct.name}`);
      setModalOpen(false);
      resetForm();
    } catch {
      toast.showError('Error al registrar merma');
    } finally {
      setSubmitting(false);
    }
  }, [
    mermaProducto,
    mermaCantidad,
    mermaRazon,
    mermaNotas,
    mermaDate,
    evidenceFile,
    selectedMermaProduct,
    registerMerma,
    toast,
    resetForm,
  ]);

  const handleDropFile = useCallback(
    (_dropFiles: File[], acceptedFiles: File[]) => setEvidenceFile(acceptedFiles[0] ?? null),
    [],
  );

  const estimatedLoss =
    selectedMermaProduct && mermaCantidad ? parseInt(mermaCantidad, 10) * selectedMermaProduct.unitPrice : 0;

  // ── Row markup ──
  const rowMarkup = filteredMermas.map((merma, index) => {
    const d = new Date(merma.date);
    const reason = REASON_CONFIG[merma.reason] ?? REASON_CONFIG.other;

    return (
      <IndexTable.Row
        id={merma.id}
        key={merma.id}
        position={index}
        selected={selectedResources.includes(merma.id)}
        onClick={() => setDetailMerma(merma)}
      >
        <IndexTable.Cell>
          <Text as="span" fontWeight="semibold" variant="bodyMd">
            {merma.productName}
          </Text>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <Text as="span" variant="bodyMd">
            {merma.quantity} uds
          </Text>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <Badge tone={reason.tone}>{reason.label}</Badge>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <Text as="span" variant="bodyMd">
            {d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: '2-digit' })}
          </Text>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <Text as="span" fontWeight="semibold" tone="critical" variant="bodyMd">
            {formatCurrency(merma.value)}
          </Text>
        </IndexTable.Cell>
        <IndexTable.Cell>
          {merma.evidenceUrl ? (
            <Badge tone="success">Con evidencia</Badge>
          ) : (
            <Text as="span" variant="bodySm" tone="subdued">
              —
            </Text>
          )}
        </IndexTable.Cell>
        <IndexTable.Cell>
          <Text as="span" variant="bodySm" tone="subdued" truncate>
            {merma.notes || '—'}
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
                Pérdida Total Acumulada
              </Text>
              <Text as="p" variant="headingLg" fontWeight="bold" tone="critical">
                {formatCurrency(kpis.totalValue)}
              </Text>
              <Text as="p" variant="bodyXs" tone="subdued">
                {kpis.count} registros · {kpis.totalQty} unidades
              </Text>
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="100">
              <Text as="p" variant="bodyXs" tone="subdued">
                Pérdida Este Mes
              </Text>
              <Text as="p" variant="headingLg" fontWeight="bold">
                {formatCurrency(kpis.monthValue)}
              </Text>
              <Text as="p" variant="bodyXs" tone="subdued">
                {kpis.monthCount} mermas registradas
              </Text>
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="100">
              <Text as="p" variant="bodyXs" tone="subdued">
                Causa Principal
              </Text>
              <Text as="p" variant="headingLg" fontWeight="bold">
                {kpis.topReason}
              </Text>
              <Text as="p" variant="bodyXs" tone="subdued">
                {formatCurrency(kpis.topReasonValue)} en pérdidas
              </Text>
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="100">
              <Text as="p" variant="bodyXs" tone="subdued">
                Impacto vs Inventario
              </Text>
              <Text as="p" variant="headingLg" fontWeight="bold">
                {products.length > 0
                  ? (
                      (kpis.totalQty /
                        Math.max(
                          1,
                          products.reduce((s, p) => s + p.currentStock, 0),
                        )) *
                      100
                    ).toFixed(1)
                  : '0'}
                %
              </Text>
              <Text as="p" variant="bodyXs" tone="subdued">
                del stock total perdido
              </Text>
            </BlockStack>
          </Card>
        </InlineGrid>

        {/* ═══ ACTIONS ROW ═══ */}
        {canManageInventory && (
          <InlineStack align="end">
            <Button variant="primary" icon={ArchiveIcon} onClick={() => setModalOpen(true)}>
              Registrar Merma
            </Button>
          </InlineStack>
        )}

        {/* ═══ INDEX TABLE ═══ */}
        <Card padding="0">
          <IndexFilters
            sortOptions={sortOptions}
            sortSelected={sortSelected}
            queryValue={queryValue}
            queryPlaceholder="Buscar por producto, notas..."
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
            resourceName={{ singular: 'merma', plural: 'mermas' }}
            itemCount={filteredMermas.length}
            selectedItemsCount={allResourcesSelected ? 'All' : selectedResources.length}
            onSelectionChange={handleSelectionChange}
            headings={[
              { title: 'Producto' },
              { title: 'Cantidad' },
              { title: 'Causa' },
              { title: 'Fecha' },
              { title: 'Pérdida' },
              { title: 'Evidencia' },
              { title: 'Notas' },
            ]}
            emptyState={
              <Box padding="800">
                <BlockStack gap="200" inlineAlign="center">
                  <Text as="p" variant="headingMd" alignment="center">
                    Sin mermas registradas
                  </Text>
                  <Text as="p" tone="subdued" alignment="center">
                    El inventario no ha tenido pérdidas registradas hasta ahora.
                  </Text>
                </BlockStack>
              </Box>
            }
          >
            {rowMarkup}
          </IndexTable>
        </Card>
      </BlockStack>

      {/* ═══ REGISTER MODAL ═══ */}
      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          resetForm();
        }}
        title="Registrar Nueva Merma"
        size="large"
        primaryAction={{
          content: 'Registrar Merma',
          onAction: handleSubmit,
          loading: submitting,
          disabled: !mermaProducto || !mermaCantidad || submitting,
        }}
        secondaryActions={[
          {
            content: 'Cancelar',
            onAction: () => {
              setModalOpen(false);
              resetForm();
            },
            disabled: submitting,
          },
        ]}
      >
        <Modal.Section>
          <Banner tone="warning">
            <p>
              Esta acción descontará unidades del inventario y registrará una pérdida monetaria. Asegúrate de
              adjuntar evidencia fotográfica cuando sea posible.
            </p>
          </Banner>
        </Modal.Section>

        <Modal.Section>
          <FormLayout>
            <FormLayout.Group>
              <SearchableSelect
                label="Producto afectado"
                options={productOptions}
                selected={mermaProducto}
                onChange={setMermaProducto}
              />
              <FormSelect
                label="Causa de la merma"
                options={razonOptions}
                value={mermaRazon}
                onChange={setMermaRazon}
              />
            </FormLayout.Group>

            {selectedMermaProduct && (
              <Box padding="300" background="bg-surface-secondary" borderRadius="200">
                <InlineStack align="space-between" blockAlign="center">
                  <BlockStack gap="050">
                    <Text as="p" variant="bodySm" fontWeight="medium">
                      {selectedMermaProduct.name}
                    </Text>
                    <Text as="p" variant="bodyXs" tone="subdued">
                      SKU: {selectedMermaProduct.sku} · Categoría: {selectedMermaProduct.category}
                    </Text>
                  </BlockStack>
                  <InlineStack gap="300">
                    <BlockStack gap="050">
                      <Text as="p" variant="bodyXs" tone="subdued">
                        Stock actual
                      </Text>
                      <Text as="p" variant="bodySm" fontWeight="bold">
                        {selectedMermaProduct.currentStock} uds
                      </Text>
                    </BlockStack>
                    <BlockStack gap="050">
                      <Text as="p" variant="bodyXs" tone="subdued">
                        Valor unitario
                      </Text>
                      <Text as="p" variant="bodySm" fontWeight="bold">
                        {formatCurrency(selectedMermaProduct.unitPrice)}
                      </Text>
                    </BlockStack>
                  </InlineStack>
                </InlineStack>
              </Box>
            )}

            <FormLayout.Group>
              <TextField
                label="Cantidad perdida"
                value={mermaCantidad}
                onChange={setMermaCantidad}
                type="number"
                autoComplete="off"
                min={1}
                max={selectedMermaProduct?.currentStock}
                helpText={selectedMermaProduct ? `Máximo disponible: ${selectedMermaProduct.currentStock}` : undefined}
                selectTextOnFocus
              />
              <div>
                <Text as="p" variant="bodySm" fontWeight="medium">
                  Fecha de la merma
                </Text>
                <Box paddingBlockStart="100">
                  <DatePicker
                    month={mermaMonth}
                    year={mermaYear}
                    onChange={({ start }) => {
                      if (start) setMermaDate(start);
                    }}
                    onMonthChange={(m, y) => {
                      setMermaMonth(m);
                      setMermaYear(y);
                    }}
                    selected={{ start: mermaDate, end: mermaDate }}
                    disableDatesAfter={new Date()}
                  />
                </Box>
              </div>
            </FormLayout.Group>

            <TextField
              label="Descripción del incidente"
              value={mermaNotas}
              onChange={setMermaNotas}
              autoComplete="off"
              multiline={3}
              helpText="Describe las circunstancias: qué pasó, quién lo detectó, ubicación del producto."
              maxLength={500}
              showCharacterCount
            />
          </FormLayout>
        </Modal.Section>

        {/* ── Evidence upload ── */}
        <Modal.Section>
          <BlockStack gap="300">
            <Text as="h3" variant="headingSm" fontWeight="bold">
              Evidencia Fotográfica
            </Text>
            <Text as="p" variant="bodyXs" tone="subdued">
              Sube una foto del producto dañado, vencido o la evidencia del incidente. Formatos: JPG, PNG, GIF.
            </Text>
            <DropZone
              accept="image/*"
              type="image"
              onDrop={handleDropFile}
              allowMultiple={false}
              variableHeight
            >
              {evidenceFile ? (
                <Box padding="400">
                  <InlineStack gap="400" blockAlign="center">
                    <Thumbnail
                      size="large"
                      alt={evidenceFile.name}
                      source={window.URL.createObjectURL(evidenceFile)}
                    />
                    <BlockStack gap="100">
                      <Text as="p" variant="bodySm" fontWeight="medium">
                        {evidenceFile.name}
                      </Text>
                      <Text as="p" variant="bodyXs" tone="subdued">
                        {(evidenceFile.size / 1024).toFixed(1)} KB
                      </Text>
                      <Button
                        size="micro"
                        variant="plain"
                        tone="critical"
                        onClick={() => setEvidenceFile(null)}
                      >
                        Eliminar
                      </Button>
                    </BlockStack>
                  </InlineStack>
                </Box>
              ) : (
                <DropZone.FileUpload actionHint="JPG, PNG o GIF (máx. 5MB)" actionTitle="Subir evidencia" />
              )}
            </DropZone>
          </BlockStack>
        </Modal.Section>

        {/* ── Loss preview ── */}
        {selectedMermaProduct && mermaCantidad && !isNaN(estimatedLoss) && estimatedLoss > 0 && (
          <Modal.Section>
            <Box padding="400" background="bg-fill-critical-secondary" borderRadius="200">
              <InlineStack align="space-between" blockAlign="center">
                <BlockStack gap="050">
                  <Text as="p" variant="bodySm" fontWeight="bold">
                    Pérdida estimada
                  </Text>
                  <Text as="p" variant="bodyXs" tone="subdued">
                    {mermaCantidad} × {formatCurrency(selectedMermaProduct.unitPrice)} (precio venta)
                  </Text>
                </BlockStack>
                <Text as="p" variant="headingLg" fontWeight="bold" tone="critical">
                  {formatCurrency(estimatedLoss)}
                </Text>
              </InlineStack>
            </Box>
          </Modal.Section>
        )}
      </Modal>

      {/* ═══ DETAIL MODAL ═══ */}
      <Modal
        open={!!detailMerma}
        onClose={() => setDetailMerma(null)}
        title={detailMerma ? `Merma — ${detailMerma.productName}` : ''}
        size="large"
        secondaryActions={[{ content: 'Cerrar', onAction: () => setDetailMerma(null) }]}
      >
        {detailMerma && (
          <>
            <Modal.Section>
              <InlineGrid columns={{ xs: 1, md: 3 }} gap="400">
                <BlockStack gap="100">
                  <Text as="p" variant="bodyXs" tone="subdued">
                    Producto
                  </Text>
                  <Text as="p" variant="bodyMd" fontWeight="semibold">
                    {detailMerma.productName}
                  </Text>
                </BlockStack>
                <BlockStack gap="100">
                  <Text as="p" variant="bodyXs" tone="subdued">
                    Fecha
                  </Text>
                  <Text as="p" variant="bodyMd">
                    {new Date(detailMerma.date).toLocaleDateString('es-MX', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </Text>
                </BlockStack>
                <BlockStack gap="100">
                  <Text as="p" variant="bodyXs" tone="subdued">
                    Causa
                  </Text>
                  <Badge tone={REASON_CONFIG[detailMerma.reason]?.tone ?? 'info'}>
                    {REASON_CONFIG[detailMerma.reason]?.label ?? detailMerma.reason}
                  </Badge>
                </BlockStack>
              </InlineGrid>
            </Modal.Section>

            <Modal.Section>
              <InlineGrid columns={3} gap="300">
                <Box padding="300" background="bg-surface-secondary" borderRadius="200">
                  <BlockStack gap="050">
                    <Text as="p" variant="bodyXs" tone="subdued">
                      Cantidad Perdida
                    </Text>
                    <Text as="p" variant="headingSm" fontWeight="bold">
                      {detailMerma.quantity} unidades
                    </Text>
                  </BlockStack>
                </Box>
                <Box padding="300" background="bg-fill-critical-secondary" borderRadius="200">
                  <BlockStack gap="050">
                    <Text as="p" variant="bodyXs" tone="subdued">
                      Valor de la Pérdida
                    </Text>
                    <Text as="p" variant="headingSm" fontWeight="bold" tone="critical">
                      {formatCurrency(detailMerma.value)}
                    </Text>
                  </BlockStack>
                </Box>
                <Box padding="300" background="bg-surface-secondary" borderRadius="200">
                  <BlockStack gap="050">
                    <Text as="p" variant="bodyXs" tone="subdued">
                      ID del Registro
                    </Text>
                    <Text as="p" variant="bodySm" fontWeight="medium">
                      {detailMerma.id.slice(0, 12)}...
                    </Text>
                  </BlockStack>
                </Box>
              </InlineGrid>
            </Modal.Section>

            {detailMerma.notes && (
              <Modal.Section>
                <BlockStack gap="200">
                  <Text as="h3" variant="headingSm" fontWeight="bold">
                    Notas del Incidente
                  </Text>
                  <Box padding="300" background="bg-surface-secondary" borderRadius="200">
                    <Text as="p" variant="bodyMd">
                      {detailMerma.notes}
                    </Text>
                  </Box>
                </BlockStack>
              </Modal.Section>
            )}

            {detailMerma.evidenceUrl && (
              <Modal.Section>
                <BlockStack gap="200">
                  <Text as="h3" variant="headingSm" fontWeight="bold">
                    Evidencia Fotográfica
                  </Text>
                  <Box borderRadius="200" overflowX="hidden" overflowY="hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={detailMerma.evidenceUrl}
                      alt={`Evidencia de merma: ${detailMerma.productName}`}
                      style={{
                        width: '100%',
                        maxHeight: 400,
                        objectFit: 'contain',
                        background: '#f6f6f7',
                        borderRadius: 8,
                      }}
                    />
                  </Box>
                </BlockStack>
              </Modal.Section>
            )}

            {!detailMerma.evidenceUrl && (
              <Modal.Section>
                <Banner tone="warning">
                  <p>Este registro no tiene evidencia fotográfica adjunta.</p>
                </Banner>
              </Modal.Section>
            )}
          </>
        )}
      </Modal>
    </>
  );
}
