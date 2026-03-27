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
  Spinner,
  Box,
  InlineGrid,
} from '@shopify/polaris';
import { RefreshIcon } from '@shopify/polaris-icons';
import { fetchRFMAnalysis } from '@/app/actions/analytics-advanced-actions';
import { formatCurrency } from '@/lib/utils';
import type { RFMAnalysis, RFMSegment } from '@/types';
import { RFM_SEGMENT_LABELS } from '@/types';

const SEGMENT_TONES: Record<RFMSegment, 'success' | 'warning' | 'critical' | 'info' | 'attention'> = {
  champions: 'success',
  loyal: 'success',
  potential_loyal: 'info',
  recent: 'info',
  promising: 'info',
  needs_attention: 'warning',
  about_to_sleep: 'warning',
  at_risk: 'critical',
  lost: 'critical',
};

export function RFMAnalysisView() {
  const [data, setData] = useState<RFMAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState('90');
  const [filterSegment, setFilterSegment] = useState<'all' | RFMSegment>('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchRFMAnalysis(parseInt(period));
      setData(result);
    } catch (err) {
      console.error('RFM analysis error:', err);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { load(); }, [load]);

  const filtered = data?.customers.filter(
    (c) => filterSegment === 'all' || c.segment === filterSegment
  ) ?? [];

  const segmentOptions = [
    { label: 'Todos los segmentos', value: 'all' },
    ...Object.entries(RFM_SEGMENT_LABELS).map(([k, v]) => ({
      label: `${v} (${data?.segments[k as RFMSegment] ?? 0})`,
      value: k,
    })),
  ];

  return (
    <BlockStack gap="400">
      {/* Summary cards */}
      {data && (
        <InlineGrid columns={3} gap="400">
          <Card>
            <BlockStack gap="100">
              <Text variant="bodySm" as="p" tone="subdued">Clientes analizados</Text>
              <Text variant="headingLg" as="p">{data.customers.length}</Text>
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="100">
              <Text variant="bodySm" as="p" tone="subdued">Recencia promedio</Text>
              <Text variant="headingLg" as="p">{data.averageRecency} días</Text>
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="100">
              <Text variant="bodySm" as="p" tone="subdued">Gasto promedio</Text>
              <Text variant="headingLg" as="p">{formatCurrency(data.averageMonetary)}</Text>
            </BlockStack>
          </Card>
        </InlineGrid>
      )}

      {/* Segment distribution */}
      {data && (
        <Card>
          <BlockStack gap="300">
            <Text variant="headingMd" as="h3">Distribución de segmentos</Text>
            <InlineStack gap="200" wrap>
              {(Object.entries(data.segments) as [RFMSegment, number][])
                .filter(([, count]) => count > 0)
                .sort(([, a], [, b]) => b - a)
                .map(([segment, count]) => (
                  <Badge key={segment} tone={SEGMENT_TONES[segment]}>
                    {`${RFM_SEGMENT_LABELS[segment]}: ${count}`}
                  </Badge>
                ))}
            </InlineStack>
          </BlockStack>
        </Card>
      )}

      {/* Controls */}
      <Card>
        <InlineStack align="space-between">
          <InlineStack gap="300">
            <Select
              label="Período"
              labelInline
              options={[
                { label: '30 días', value: '30' },
                { label: '90 días', value: '90' },
                { label: '180 días', value: '180' },
              ]}
              value={period}
              onChange={setPeriod}
            />
            <Select
              label="Segmento"
              labelInline
              options={segmentOptions}
              value={filterSegment}
              onChange={(v) => setFilterSegment(v as typeof filterSegment)}
            />
          </InlineStack>
          <Button icon={RefreshIcon} onClick={load} loading={loading}>Actualizar</Button>
        </InlineStack>
      </Card>

      {/* Customer table */}
      <Card padding="0">
        {loading && !data ? (
          <Box padding="800"><InlineStack align="center"><Spinner /></InlineStack></Box>
        ) : (
          <IndexTable
            resourceName={{ singular: 'cliente', plural: 'clientes' }}
            itemCount={filtered.length}
            selectable={false}
            headings={[
              { title: 'Cliente' },
              { title: 'Teléfono' },
              { title: 'Segmento' },
              { title: 'Recencia', alignment: 'end' },
              { title: 'Frecuencia', alignment: 'end' },
              { title: 'Gasto total', alignment: 'end' },
              { title: 'R-F-M', alignment: 'end' },
              { title: 'Saldo', alignment: 'end' },
              { title: 'Puntos', alignment: 'end' },
            ]}
          >
            {filtered.map((c, i) => (
              <IndexTable.Row id={c.clienteId} key={c.clienteId} position={i}>
                <IndexTable.Cell>
                  <Text variant="bodyMd" as="span" fontWeight="semibold">{c.clienteName}</Text>
                </IndexTable.Cell>
                <IndexTable.Cell>{c.phone}</IndexTable.Cell>
                <IndexTable.Cell>
                  <Badge tone={SEGMENT_TONES[c.segment]}>{RFM_SEGMENT_LABELS[c.segment]}</Badge>
                </IndexTable.Cell>
                <IndexTable.Cell>
                  <Text as="span" alignment="end">{c.recency}d</Text>
                </IndexTable.Cell>
                <IndexTable.Cell>
                  <Text as="span" alignment="end">{c.frequency}</Text>
                </IndexTable.Cell>
                <IndexTable.Cell>
                  <Text as="span" alignment="end">{formatCurrency(c.monetary)}</Text>
                </IndexTable.Cell>
                <IndexTable.Cell>
                  <Text as="span" alignment="end">{c.rScore}-{c.fScore}-{c.mScore}</Text>
                </IndexTable.Cell>
                <IndexTable.Cell>
                  <Text as="span" alignment="end" tone={c.balance > 0 ? 'critical' : undefined}>
                    {formatCurrency(c.balance)}
                  </Text>
                </IndexTable.Cell>
                <IndexTable.Cell>
                  <Text as="span" alignment="end">{c.points}</Text>
                </IndexTable.Cell>
              </IndexTable.Row>
            ))}
          </IndexTable>
        )}
      </Card>
    </BlockStack>
  );
}
