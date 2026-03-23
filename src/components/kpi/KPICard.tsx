'use client';

import { Card, Text, InlineStack, Box, Icon } from '@shopify/polaris';
import { ArrowUpIcon, ArrowDownIcon } from '@shopify/polaris-icons';
import { SparkLineChart } from '@shopify/polaris-viz';
import '@shopify/polaris-viz/build/esm/styles.css';
import type { ReactNode } from 'react';
import { formatCurrency, formatNumber } from '@/lib/utils';

interface KPICardProps {
  title: string;
  value: number;
  type: 'currency' | 'number' | 'percentage';
  change?: number;
  changeLabel?: string;
  icon?: ReactNode;
  data?: number[];
}

export function KPICard({
  title,
  value,
  type,
  change,
  changeLabel = 'vs ayer',
  icon,
  data = [],
}: KPICardProps) {
  const formattedValue = type === 'currency'
    ? formatCurrency(value)
    : type === 'percentage'
    ? `${value}%`
    : formatNumber(value);

  const hasData = data && data.length > 1;

  // Calculate percentage change from first to last entry
  const percentageChange = hasData
    ? getPercentageChange(Number(data[0]), Number(data.at(-1)))
    : change ?? null;

  const chartData = hasData
    ? [{ data: data.map((val, idx) => ({ key: idx, value: val })) }]
    : [];

  return (
    <Card padding="0">
      <Box paddingBlock="400" paddingInlineStart="400">
        <div
          style={{
            height: 72,
            position: 'relative',
            width: '100%',
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          {/* Left side: title, value, change */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
              minWidth: 80,
              zIndex: 2,
            }}
          >
            <div style={{ position: 'absolute', top: -4, left: 0, zIndex: 20 }}>
              <Text as="p" variant="bodySm" fontWeight="medium" tone="subdued">
                {title}
              </Text>
            </div>
            <span style={{ fontWeight: 'bold', fontSize: '22px', lineHeight: '28px', color: '#202223' }}>
              {formattedValue}
            </span>
            {percentageChange !== null && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '2px', marginBottom: -2 }}>
                {Number(percentageChange) > 0 ? (
                  <Icon source={ArrowUpIcon} tone="success" />
                ) : Number(percentageChange) < 0 ? (
                  <Icon source={ArrowDownIcon} tone="critical" />
                ) : null}
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 500,
                    color: Number(percentageChange) > 0
                      ? '#008060'
                      : Number(percentageChange) < 0
                      ? '#d72c0d'
                      : '#6d7175',
                  }}
                >
                  {Math.abs(Number(percentageChange))}%
                </span>
              </div>
            )}
          </div>

          {/* Right side: sparkline chart */}
          {chartData.length > 0 && (
            <div style={{ flex: 1, width: '50%', height: '80%', alignSelf: 'flex-end' }}>
              <SparkLineChart
                offsetLeft={4}
                offsetRight={0}
                data={chartData}
              />
            </div>
          )}
        </div>
      </Box>
    </Card>
  );
}

function getPercentageChange(start: number, end: number): number | null {
  if (isNaN(start) || isNaN(end) || start === 0) return null;

  const percentage = Math.round(((end - start) / start) * 100);

  if (percentage > 999) return 999;
  if (percentage < -999) return -999;

  return percentage;
}
