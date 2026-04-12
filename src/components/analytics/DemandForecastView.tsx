'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  BlockStack,
  InlineStack,
  Text,
  Badge,
  Button,
  IndexTable,
  Spinner,
  Box,
  InlineGrid,
  Banner,
} from '@shopify/polaris';
import { RefreshIcon } from '@shopify/polaris-icons';
import { fetchDemandForecast } from '@/app/actions/analytics-advanced-actions';
import type { ForecastProduct } from '@/types';

export function DemandForecastView() {
  const [products, setProducts] = useState<ForecastProduct[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchDemandForecast();
      setProducts(result);
    } catch (err) {
      console.error('Demand forecast error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const atRisk = products.filter((p) => p.daysOfStock <= 7);
  const trending = products.filter((p) => p.trend === 'up');
  const declining = products.filter((p) => p.trend === 'down');

  const trendIcon = (t: string) => (t === 'up' ? '📈' : t === 'down' ? '📉' : '➡️');
  const trendTone = (t: string): 'success' | 'critical' | 'info' =>
    t === 'up' ? 'success' : t === 'down' ? 'critical' : 'info';

  const confidenceTone = (c: string): 'success' | 'warning' | 'critical' =>
    c === 'high' ? 'success' : c === 'medium' ? 'warning' : 'critical';

  return (
    <BlockStack gap="400">
      {/* Summary */}
      <InlineGrid columns={4} gap="400">
        <Card>
          <BlockStack gap="100">
            <Text variant="bodySm" as="p" tone="subdued">
              Productos analizados
            </Text>
            <Text variant="headingLg" as="p">
              {products.length}
            </Text>
          </BlockStack>
        </Card>
        <Card>
          <BlockStack gap="100">
            <Text variant="bodySm" as="p" tone="subdued">
              Riesgo desabasto (≤7d)
            </Text>
            <Text variant="headingLg" as="p" tone="critical">
              {atRisk.length}
            </Text>
          </BlockStack>
        </Card>
        <Card>
          <BlockStack gap="100">
            <Text variant="bodySm" as="p" tone="subdued">
              Tendencia al alza
            </Text>
            <Text variant="headingLg" as="p">
              {trending.length}
            </Text>
          </BlockStack>
        </Card>
        <Card>
          <BlockStack gap="100">
            <Text variant="bodySm" as="p" tone="subdued">
              Tendencia a la baja
            </Text>
            <Text variant="headingLg" as="p">
              {declining.length}
            </Text>
          </BlockStack>
        </Card>
      </InlineGrid>

      {atRisk.length > 0 && (
        <Banner tone="warning">
          {atRisk.length} producto(s) se quedarán sin stock en los próximos 7 días según la demanda actual.
        </Banner>
      )}

      {/* Controls */}
      <Card>
        <InlineStack align="end">
          <Button icon={RefreshIcon} onClick={load} loading={loading}>
            Recalcular
          </Button>
        </InlineStack>
      </Card>

      {/* Forecast table */}
      <Card padding="0">
        {loading && products.length === 0 ? (
          <Box padding="800">
            <InlineStack align="center">
              <Spinner />
            </InlineStack>
          </Box>
        ) : (
          <IndexTable
            resourceName={{ singular: 'producto', plural: 'productos' }}
            itemCount={products.length}
            selectable={false}
            headings={[
              { title: 'Producto' },
              { title: 'Stock', alignment: 'end' },
              { title: 'Venta/día', alignment: 'end' },
              { title: 'Días de stock', alignment: 'end' },
              { title: 'Tendencia' },
              { title: 'Próx. semana', alignment: 'end' },
              { title: 'Próx. mes', alignment: 'end' },
              { title: 'Confianza' },
              { title: 'Historial (8 sem.)' },
            ]}
          >
            {products.map((p, i) => (
              <IndexTable.Row id={p.productId} key={p.productId} position={i}>
                <IndexTable.Cell>
                  <Text variant="bodyMd" as="span" fontWeight="semibold">
                    {p.productName}
                  </Text>
                  <br />
                  <Text variant="bodySm" as="span" tone="subdued">
                    {p.category}
                  </Text>
                </IndexTable.Cell>
                <IndexTable.Cell>
                  <Text as="span" alignment="end" tone={p.daysOfStock <= 7 ? 'critical' : undefined}>
                    {p.currentStock}
                  </Text>
                </IndexTable.Cell>
                <IndexTable.Cell>
                  <Text as="span" alignment="end">
                    {p.avgDailySales}
                  </Text>
                </IndexTable.Cell>
                <IndexTable.Cell>
                  <Text as="span" alignment="end" tone={p.daysOfStock <= 7 ? 'critical' : undefined}>
                    {p.daysOfStock === 999 ? '∞' : `${p.daysOfStock}d`}
                  </Text>
                </IndexTable.Cell>
                <IndexTable.Cell>
                  <Badge tone={trendTone(p.trend)}>
                    {`${trendIcon(p.trend)} ${p.trendPercentage > 0 ? '+' : ''}${p.trendPercentage}%`}
                  </Badge>
                </IndexTable.Cell>
                <IndexTable.Cell>
                  <Text as="span" alignment="end" fontWeight="bold">
                    {p.forecastNextWeek} uds
                  </Text>
                </IndexTable.Cell>
                <IndexTable.Cell>
                  <Text as="span" alignment="end">
                    {p.forecastNextMonth} uds
                  </Text>
                </IndexTable.Cell>
                <IndexTable.Cell>
                  <Badge tone={confidenceTone(p.confidence)}>
                    {p.confidence === 'high' ? 'Alta' : p.confidence === 'medium' ? 'Media' : 'Baja'}
                  </Badge>
                </IndexTable.Cell>
                <IndexTable.Cell>
                  <Text variant="bodySm" as="span" tone="subdued">
                    {p.historicalWeekly.map((w) => w.toString()).join(' → ')}
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
