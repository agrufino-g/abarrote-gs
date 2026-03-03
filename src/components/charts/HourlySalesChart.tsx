'use client';

import { Card, Text, BlockStack, InlineStack, Badge } from '@shopify/polaris';
import dynamic from 'next/dynamic';
import { formatCurrency } from '@/lib/utils';

const BarChart = dynamic(
  () => import('@shopify/polaris-viz').then((mod) => mod.BarChart),
  { ssr: false, loading: () => <div style={{ height: 280 }} /> }
);

interface HourlySalesData {
  hour: string;
  sales: number;
  transactions: number;
  isPeak: boolean;
}

interface HourlySalesChartProps {
  data?: HourlySalesData[];
}

const defaultData: HourlySalesData[] = [
  { hour: '6:00', sales: 850, transactions: 12, isPeak: false },
  { hour: '7:00', sales: 1200, transactions: 18, isPeak: false },
  { hour: '8:00', sales: 2100, transactions: 32, isPeak: true },
  { hour: '9:00', sales: 1800, transactions: 28, isPeak: false },
  { hour: '10:00', sales: 1500, transactions: 22, isPeak: false },
  { hour: '11:00', sales: 1350, transactions: 20, isPeak: false },
  { hour: '12:00', sales: 2400, transactions: 38, isPeak: true },
  { hour: '13:00', sales: 2200, transactions: 35, isPeak: true },
  { hour: '14:00', sales: 1600, transactions: 24, isPeak: false },
  { hour: '15:00', sales: 1100, transactions: 16, isPeak: false },
  { hour: '16:00', sales: 1300, transactions: 19, isPeak: false },
  { hour: '17:00', sales: 1900, transactions: 29, isPeak: false },
  { hour: '18:00', sales: 2500, transactions: 40, isPeak: true },
  { hour: '19:00', sales: 2300, transactions: 36, isPeak: true },
  { hour: '20:00', sales: 1700, transactions: 26, isPeak: false },
  { hour: '21:00', sales: 900, transactions: 14, isPeak: false },
];

export function HourlySalesChart({ data = defaultData }: HourlySalesChartProps) {
  const peakHours = data.filter((d) => d.isPeak);
  const totalSales = data.reduce((acc, d) => acc + d.sales, 0);
  const peakSales = peakHours.reduce((acc, d) => acc + d.sales, 0);
  const peakPercentage = Math.round((peakSales / totalSales) * 100);

  const chartData = [
    {
      name: 'Horario Normal',
      color: '#2c6ecb' as const,
      data: data
        .filter((d) => !d.isPeak)
        .map((d) => ({
          key: d.hour,
          value: d.sales,
        })),
    },
    {
      name: 'Hora Pico',
      color: '#f49342' as const,
      data: data
        .filter((d) => d.isPeak)
        .map((d) => ({
          key: d.hour,
          value: d.sales,
        })),
    },
  ];

  // Single series with all hours for a cleaner timeline
  const singleSeriesData = [
    {
      name: 'Ventas por Hora',
      data: data.map((d) => ({
        key: d.hour,
        value: d.sales,
        color: d.isPeak ? '#f49342' : '#2c6ecb',
      })),
    },
  ];

  return (
    <Card>
      <BlockStack gap="400">
        <InlineStack align="space-between" blockAlign="center">
          <BlockStack gap="100">
            <Text as="h3" variant="headingMd">
              Ventas por Hora
            </Text>
            <Text as="p" variant="bodySm" tone="subdued">
              Análisis de hoy - Identifica horarios para asignación de personal
            </Text>
          </BlockStack>

          <InlineStack gap="400">
            <BlockStack gap="100">
              <Text as="p" variant="bodySm" tone="subdued">
                Horas Pico
              </Text>
              <Badge tone="attention">{`${peakHours.length} horarios`}</Badge>
            </BlockStack>
            <BlockStack gap="100">
              <Text as="p" variant="bodySm" tone="subdued">
                % en Picos
              </Text>
              <Badge tone="success">{`${peakPercentage}%`}</Badge>
            </BlockStack>
          </InlineStack>
        </InlineStack>

        <div style={{ height: 280 }}>
          <BarChart
            data={singleSeriesData}
            theme="Light"
            tooltipOptions={{
              valueFormatter: (value: string | number | null) => formatCurrency(Number(value) || 0),
            }}
            yAxisOptions={{
              labelFormatter: (value: string | number | null) =>
                `$${(Number(value || 0) / 1000).toFixed(0)}k`,
            }}
          />
        </div>

        <InlineStack gap="400" align="center">
          <InlineStack gap="100" blockAlign="center">
            <div
              style={{
                width: 12,
                height: 12,
                backgroundColor: '#2c6ecb',
                borderRadius: 2,
              }}
            />
            <Text as="span" variant="bodySm" tone="subdued">
              Horario Normal
            </Text>
          </InlineStack>
          <InlineStack gap="100" blockAlign="center">
            <div
              style={{
                width: 12,
                height: 12,
                backgroundColor: '#f49342',
                borderRadius: 2,
              }}
            />
            <Text as="span" variant="bodySm" tone="subdued">
              Hora Pico (requiere más personal)
            </Text>
          </InlineStack>
        </InlineStack>
      </BlockStack>
    </Card>
  );
}
