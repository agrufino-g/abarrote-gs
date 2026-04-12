'use client';

import { Card, Text, BlockStack, InlineStack, Badge } from '@shopify/polaris';
import type { BadgeProps } from '@shopify/polaris';
import type { ReactNode } from 'react';
import { formatCurrency, formatNumber } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: number | string;
  format?: 'currency' | 'number' | 'percentage' | 'text';
  icon?: ReactNode;
  change?: number;
  changeLabel?: string;
  subtitle?: string;
  badge?: { content: string; tone: BadgeProps['tone'] };
  tone?: 'success' | 'critical' | 'attention' | 'info';
}

export function StatCard({
  label,
  value,
  format = 'text',
  icon,
  change,
  changeLabel = 'vs ayer',
  subtitle,
  badge,
  tone: _tone,
}: StatCardProps) {
  const formattedValue =
    typeof value === 'string'
      ? value
      : format === 'currency'
        ? formatCurrency(value)
        : format === 'percentage'
          ? `${value}%`
          : format === 'number'
            ? formatNumber(value)
            : String(value);

  const changeTone = (v: number): BadgeProps['tone'] => (v > 0 ? 'success' : v < 0 ? 'critical' : 'warning');

  return (
    <Card>
      <BlockStack gap="200">
        <InlineStack align="space-between" blockAlign="center">
          <Text as="p" variant="bodySm" tone="subdued">
            {label}
          </Text>
          {icon}
        </InlineStack>
        <InlineStack gap="200" blockAlign="center">
          <Text as="p" variant="headingLg" fontWeight="bold">
            {formattedValue}
          </Text>
          {badge && <Badge tone={badge.tone}>{badge.content}</Badge>}
        </InlineStack>
        {change !== undefined && (
          <InlineStack gap="200" blockAlign="center">
            <Badge tone={changeTone(change)}>{`${change > 0 ? '+' : ''}${change}%`}</Badge>
            <Text as="span" variant="bodySm" tone="subdued">
              {changeLabel}
            </Text>
          </InlineStack>
        )}
        {subtitle && (
          <Text as="p" variant="bodySm" tone="subdued">
            {subtitle}
          </Text>
        )}
      </BlockStack>
    </Card>
  );
}
