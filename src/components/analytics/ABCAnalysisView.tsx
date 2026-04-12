'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  BlockStack,
  InlineStack,
  Text,
  Badge,
  Select,
  Button,
  IndexTable,
  useIndexResourceState,
  Spinner,
  ProgressBar,
  Box,
  InlineGrid,
} from '@shopify/polaris';
import { RefreshIcon } from '@shopify/polaris-icons';
import { fetchABCAnalysis } from '@/app/actions/analytics-advanced-actions';
import { formatCurrency } from '@/lib/utils';
import type { ABCAnalysis, ABCProduct } from '@/types';

export function ABCAnalysisView() {
  const [data, setData] = useState<ABCAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState('30');
  const [filterClass, setFilterClass] = useState<'all' | 'A' | 'B' | 'C'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchABCAnalysis(parseInt(period));
      setData(result);
    } catch (err) {
      console.error('ABC analysis error:', err);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = data?.products.filter((p) => filterClass === 'all' || p.classification === filterClass) ?? [];

  const { selectedResources, allResourcesSelected, handleSelectionChange } = useIndexResourceState(
    filtered as unknown as { [key: string]: unknown }[],
    { resourceIDResolver: (p) => (p as unknown as ABCProduct).productId },
  );

  const classTone = (c: string) => (c === 'A' ? 'success' : c === 'B' ? 'warning' : 'critical');

  return (
    <BlockStack gap="400">
      {/* Summary cards */}
      {data && (
        <InlineGrid columns={3} gap="400">
          {(['A', 'B', 'C'] as const).map((cls) => (
            <Card key={cls}>
              <BlockStack gap="200">
                <InlineStack align="space-between">
                  <Text variant="headingMd" as="h3">
                    Clase {cls}
                  </Text>
                  <Badge tone={classTone(cls) as 'success' | 'info'}>{`${data.summary[cls].count} productos`}</Badge>
                </InlineStack>
                <Text variant="bodySm" as="p" tone="subdued">
                  {cls === 'A'
                    ? 'Top 80% de ingresos — prioridad máxima'
                    : cls === 'B'
                      ? 'Siguiente 15% — monitoreo regular'
                      : 'Último 5% — candidatos a descontinuar'}
                </Text>
                <Box>
                  <ProgressBar
                    progress={data.summary[cls].revenueShare}
                    tone={classTone(cls) as 'success' | 'primary'}
                    size="small"
                  />
                </Box>
                <InlineStack gap="200">
                  <Text variant="bodySm" as="span">
                    {data.summary[cls].revenueShare.toFixed(1)}% ingresos
                  </Text>
                  <Text variant="bodySm" as="span" tone="subdued">
                    {data.summary[cls].skuShare.toFixed(1)}% SKUs
                  </Text>
                </InlineStack>
              </BlockStack>
            </Card>
          ))}
        </InlineGrid>
      )}

      {/* Filter controls */}
      <Card>
        <BlockStack gap="300">
          <InlineStack align="space-between">
            <InlineStack gap="300">
              <Select
                label="Período"
                labelInline
                options={[
                  { label: '7 días', value: '7' },
                  { label: '30 días', value: '30' },
                  { label: '90 días', value: '90' },
                ]}
                value={period}
                onChange={setPeriod}
              />
              <Select
                label="Clase"
                labelInline
                options={[
                  { label: 'Todas', value: 'all' },
                  { label: 'A — Vitales', value: 'A' },
                  { label: 'B — Importantes', value: 'B' },
                  { label: 'C — Prescindibles', value: 'C' },
                ]}
                value={filterClass}
                onChange={(v) => setFilterClass(v as typeof filterClass)}
              />
            </InlineStack>
            <Button icon={RefreshIcon} onClick={load} loading={loading}>
              Actualizar
            </Button>
          </InlineStack>

          {data && (
            <Text variant="bodySm" as="p" tone="subdued">
              Ingresos totales: {formatCurrency(data.totalRevenue)} en los últimos {data.periodDays} días —{' '}
              {data.products.length} productos analizados
            </Text>
          )}
        </BlockStack>
      </Card>

      {/* Products table */}
      <Card padding="0">
        {loading && !data ? (
          <Box padding="800">
            <InlineStack align="center">
              <Spinner />
            </InlineStack>
          </Box>
        ) : (
          <IndexTable
            resourceName={{ singular: 'producto', plural: 'productos' }}
            itemCount={filtered.length}
            selectedItemsCount={allResourcesSelected ? 'All' : selectedResources.length}
            onSelectionChange={handleSelectionChange}
            headings={[
              { title: 'Producto' },
              { title: 'SKU' },
              { title: 'Clase' },
              { title: 'Ingresos', alignment: 'end' },
              { title: '% Total', alignment: 'end' },
              { title: '% Acum.', alignment: 'end' },
              { title: 'Uds vendidas', alignment: 'end' },
              { title: 'Stock actual', alignment: 'end' },
            ]}
          >
            {filtered.map((p, i) => (
              <IndexTable.Row
                id={p.productId}
                key={p.productId}
                position={i}
                selected={selectedResources.includes(p.productId)}
              >
                <IndexTable.Cell>
                  <Text variant="bodyMd" as="span" fontWeight="semibold">
                    {p.productName}
                  </Text>
                </IndexTable.Cell>
                <IndexTable.Cell>{p.sku}</IndexTable.Cell>
                <IndexTable.Cell>
                  <Badge tone={classTone(p.classification)}>{p.classification}</Badge>
                </IndexTable.Cell>
                <IndexTable.Cell>
                  <Text as="span" alignment="end">
                    {formatCurrency(p.totalRevenue)}
                  </Text>
                </IndexTable.Cell>
                <IndexTable.Cell>
                  <Text as="span" alignment="end">
                    {p.revenuePercentage.toFixed(1)}%
                  </Text>
                </IndexTable.Cell>
                <IndexTable.Cell>
                  <Text as="span" alignment="end">
                    {p.cumulativePercentage.toFixed(1)}%
                  </Text>
                </IndexTable.Cell>
                <IndexTable.Cell>
                  <Text as="span" alignment="end">
                    {p.totalQuantity}
                  </Text>
                </IndexTable.Cell>
                <IndexTable.Cell>
                  <Text as="span" alignment="end" tone={p.currentStock <= 0 ? 'critical' : undefined}>
                    {p.currentStock}
                  </Text>
                </IndexTable.Cell>
              </IndexTable.Row>
            ))}
          </IndexTable>
        )}
      </Card>
    </BlockStack>
  );
}
