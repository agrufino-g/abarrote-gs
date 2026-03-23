'use client';

import { Card, Text, BlockStack } from '@shopify/polaris';
import dynamic from 'next/dynamic';
import { SalesData } from '@/types';
import { formatCurrency } from '@/lib/utils';

const LineChart = dynamic(
  () => import('@shopify/polaris-viz').then((mod) => mod.LineChart),
  { ssr: false, loading: () => <div style={{ height: 300 }} /> }
);

interface SalesChartProps {
  data: SalesData[];
}

export function SalesChart({ data }: SalesChartProps) {
  const chartData = [
    {
      name: 'Semana actual',
      color: '#0518d2' as const,
      data: data.map((d) => ({
        key: d.date,
        value: d.currentWeek,
      })),
    },
    {
      name: 'Semana pasada',
      color: '#c1c4cd' as const,
      isComparison: true,
      data: data.map((d) => ({
        key: d.date,
        value: d.previousWeek,
      })),
    },
  ];

  return (
    <Card padding="500">
      <BlockStack gap="400">
        <BlockStack gap="100">
          <Text as="h3" variant="headingMd" fontWeight="semibold">
            Tendencia de Ingresos
          </Text>
          <Text as="p" variant="bodySm" tone="subdued">
            Comparativa de desempeño semanal
          </Text>
        </BlockStack>

        <div style={{ height: 400, marginTop: '12px' }}>
          <LineChart
            data={chartData}
            theme="Light"
            tooltipOptions={{
              valueFormatter: (value: string | number | null) => formatCurrency(Number(value ?? 0)),
            }}
            yAxisOptions={{
              labelFormatter: (value: string | number | null) => {
                const val = Number(value ?? 0);
                if (val >= 1000) return `$${(val / 1000).toFixed(1)}k`;
                return `$${val}`;
              },
            }}
          />
        </div>
      </BlockStack>
    </Card>
  );
}
