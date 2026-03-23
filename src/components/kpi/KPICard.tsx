'use client';

import { Card, Text, BlockStack, InlineStack, Badge, Icon, Box } from '@shopify/polaris';
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

  const getTokenDetails = () => {
    switch (type) {
      case 'currency': 
        return { color: 'var(--p-color-text-brand)', bg: 'var(--p-color-bg-fill-brand-subdued)', border: 'var(--p-color-border-brand)' };
      case 'percentage': 
        return { color: 'var(--p-color-text-warning)', bg: 'var(--p-color-bg-fill-warning-subdued)', border: 'var(--p-color-border-warning)' };
      case 'number': 
        return value > 5 
          ? { color: 'var(--p-color-text-critical)', bg: 'var(--p-color-bg-fill-critical-subdued)', border: 'var(--p-color-border-critical)' }
          : { color: 'var(--p-color-text-info)', bg: 'var(--p-color-bg-fill-info-subdued)', border: 'var(--p-color-border-info)' };
      default: 
        return { color: 'var(--p-color-text-secondary)', bg: 'var(--p-color-bg-fill-secondary-subdued)', border: 'var(--p-color-border-subdued)' };
    }
  };

  const getChangePrefix = (changeValue: number): string => {
    return changeValue > 0 ? '+' : '';
  };

  const tokens = getTokenDetails();

  return (
    <Card padding="400">
      <InlineStack align="start" blockAlign="center" gap="400">
        <Box
          padding="200"
          borderRadius="200"
        >
          <div style={{ 
            backgroundColor: tokens.bg,
            color: tokens.color,
            borderLeft: `4px solid ${tokens.border}`,
            padding: '8px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Icon source={icon as any} />
          </div>
        </Box>
        <BlockStack gap="050">
          <Text as="p" variant="bodyXs" tone="subdued" fontWeight="medium">
            {title}
          </Text>
          <Text as="p" variant="headingLg" fontWeight="bold">
            {formattedValue}
          </Text>
        </BlockStack>
      </InlineStack>
      {change !== undefined && (
        <Box paddingBlockStart="300">
          <InlineStack gap="200" blockAlign="center">
            <Badge tone={getChangeTone(change)}>
              {`${getChangePrefix(change)}${change}%`}
            </Badge>
            <Text as="span" variant="bodyXs" tone="subdued">
              {changeLabel}
            </Text>
          </InlineStack>
        </Box>
      )}
    </Card>
  );
}
