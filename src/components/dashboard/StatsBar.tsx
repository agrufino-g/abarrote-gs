'use client';

import React from 'react';
import { 
  Box, 
  Grid, 
  Text, 
  BlockStack, 
  InlineStack, 
  Badge 
} from '@shopify/polaris';
import { 
  ArrowUpIcon, 
  ArrowDownIcon,
  MinusIcon
} from '@shopify/polaris-icons';
import { formatCurrency } from '@/lib/utils';

interface StatItemProps {
  label: string;
  value: string | number;
  trend?: string;
  trendType?: 'success' | 'warning' | 'critical' | 'subdued';
  isCurrency?: boolean;
}

function StatItem({ label, value, trend, trendType = 'subdued', isCurrency }: StatItemProps) {
  const trendIcon = trendType === 'success' ? ArrowUpIcon : trendType === 'critical' ? ArrowDownIcon : MinusIcon;

  return (
    <div style={{ transition: 'background 0.2s', borderRadius: 'var(--p-border-radius-200)' }}>
      <Box
        as="div"
        paddingBlockStart="400"
        paddingBlockEnd="400"
        paddingInlineStart="200"
        paddingInlineEnd="200"
      >
        <BlockStack gap="100">
          <Text as="h3" variant="bodySm" tone="subdued" fontWeight="medium">
            {label}
          </Text>
          <InlineStack gap="200" align="start" blockAlign="center">
            <Text as="p" variant="headingLg" fontWeight="bold">
              {isCurrency ? formatCurrency(Number(value)) : value}
            </Text>
            {trend && (
              <Badge tone={trendType as any} icon={trendIcon}>
                 {trend}
              </Badge>
            )}
          </InlineStack>
        </BlockStack>
      </Box>
    </div>
  );
}

interface StatsBarProps {
  data: {
    dailySales: number;
    unitsSold: number;
    lowStock: number;
    returnRate: string;
  }
}

export function StatsBar({ data }: StatsBarProps) {
  return (
    <Box padding="0" background="bg-surface" borderRadius="300" borderWidth="025" borderColor="border">
      <Grid columns={{ xs: 1, sm: 5, md: 5, lg: 5 }}>
        {/* Item 1: Ventas */}
        <Grid.Cell columnSpan={{ xs: 1, sm: 1, md: 1, lg: 1 }}>
          <StatItem 
            label="Venta del día" 
            value={data.dailySales} 
            trend="Hoy" 
            trendType="success"
            isCurrency
          />
        </Grid.Cell>
        
        {/* Divider 1 - Solo visible en tablets/desktop */}
        <Grid.Cell columnSpan={{ xs: 1, sm: 1, md: 1, lg: 1 }}>
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 20px' }}>
             <div style={{ height: '50%', width: '1px', backgroundColor: 'var(--p-color-border-subdued)' }} />
          </div>
        </Grid.Cell>

        {/* Item 2: Unidades */}
        <Grid.Cell columnSpan={{ xs: 1, sm: 1, md: 1, lg: 1 }}>
          <StatItem 
            label="Unidades Vendidas" 
            value={data.unitsSold} 
            trend="Activo" 
            trendType="success"
          />
        </Grid.Cell>

        {/* Divider 2 - Solo visible en tablets/desktop */}
        <Grid.Cell columnSpan={{ xs: 1, sm: 1, md: 1, lg: 1 }}>
           <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 20px' }}>
             <div style={{ height: '50%', width: '1px', backgroundColor: 'var(--p-color-border-subdued)' }} />
          </div>
        </Grid.Cell>

        {/* Item 3: Alertas */}
        <Grid.Cell columnSpan={{ xs: 1, sm: 1, md: 1, lg: 1 }}>
          <StatItem 
            label="Stock bajo" 
            value={data.lowStock} 
            trend={data.lowStock > 0 ? 'Atención' : 'Normal'} 
            trendType={data.lowStock > 0 ? 'warning' : 'success'}
          />
        </Grid.Cell>
      </Grid>
    </Box>
  );
}
