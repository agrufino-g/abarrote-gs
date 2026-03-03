'use client';

import { Card, Text, BlockStack, InlineStack, Badge } from '@shopify/polaris';
import type { ReactNode } from 'react';
import { formatCurrency, formatNumber } from '@/lib/utils';

interface KPICardProps {
  title: string;
  value: number;
  type: 'currency' | 'number' | 'percentage';
  change?: number;
  changeLabel?: string;
  icon: ReactNode;
}

export function KPICard({
  title,
  value,
  type,
  change,
  changeLabel = 'vs ayer',
  icon,
}: KPICardProps) {
  const formattedValue = type === 'currency' 
    ? formatCurrency(value)
    : type === 'percentage'
    ? `${value}%`
    : formatNumber(value);

  const getChangeTone = (changeValue: number): 'success' | 'warning' | 'critical' => {
    if (changeValue > 0) return 'success';
    if (changeValue < 0) return 'critical';
    return 'warning';
  };

  const getChangePrefix = (changeValue: number): string => {
    return changeValue > 0 ? '+' : '';
  };

  return (
    <Card>
      <BlockStack gap="200">
        <InlineStack align="space-between" blockAlign="center">
          <Text as="p" variant="bodySm" tone="subdued">
            {title}
          </Text>
        </InlineStack>
        <Text as="p" variant="headingLg" fontWeight="bold">
          {formattedValue}
        </Text>
        {change !== undefined && (
          <InlineStack gap="200" blockAlign="center">
            <Badge tone={getChangeTone(change)}>
              {`${getChangePrefix(change)}${change}%`}
            </Badge>
            <Text as="span" variant="bodySm" tone="subdued">
              {changeLabel}
            </Text>
          </InlineStack>
        )}
      </BlockStack>
    </Card>
  );
}
