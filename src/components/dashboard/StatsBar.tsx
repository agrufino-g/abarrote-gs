'use client';

import React from 'react';
import { Text, BlockStack, InlineStack, Badge, InlineGrid, Card } from '@shopify/polaris';
import { formatCurrency } from '@/lib/utils';

interface StatsBarProps {
  data: {
    dailySales: number;
    unitsSold: number;
    lowStock: number;
    returnRate: string;
  };
}

export function StatsBar({ data }: StatsBarProps) {
  return (
    <Card>
      <InlineGrid columns={{ xs: 2, md: 4 }} gap="400">
        <BlockStack gap="100">
          <Text as="p" variant="bodyXs" tone="subdued" fontWeight="medium">
            Venta del Día
          </Text>
          <InlineStack gap="200" blockAlign="center">
            <Text as="p" variant="headingLg" fontWeight="bold">
              {formatCurrency(data.dailySales)}
            </Text>
            <Badge tone="success">Hoy</Badge>
          </InlineStack>
        </BlockStack>

        <BlockStack gap="100">
          <Text as="p" variant="bodyXs" tone="subdued" fontWeight="medium">
            Unidades Vendidas
          </Text>
          <InlineStack gap="200" blockAlign="center">
            <Text as="p" variant="headingLg" fontWeight="bold">
              {data.unitsSold}
            </Text>
            <Badge tone="info">Activo</Badge>
          </InlineStack>
        </BlockStack>

        <BlockStack gap="100">
          <Text as="p" variant="bodyXs" tone="subdued" fontWeight="medium">
            Stock Bajo
          </Text>
          <InlineStack gap="200" blockAlign="center">
            <Text as="p" variant="headingLg" fontWeight="bold">
              {data.lowStock}
            </Text>
            <Badge tone={data.lowStock > 0 ? 'warning' : 'success'}>
              {data.lowStock > 0 ? 'Atención' : 'Normal'}
            </Badge>
          </InlineStack>
        </BlockStack>

        <BlockStack gap="100">
          <Text as="p" variant="bodyXs" tone="subdued" fontWeight="medium">
            Devoluciones
          </Text>
          <InlineStack gap="200" blockAlign="center">
            <Text as="p" variant="headingLg" fontWeight="bold">
              {data.returnRate}
            </Text>
            <Badge tone="info">Periodo</Badge>
          </InlineStack>
        </BlockStack>
      </InlineGrid>
    </Card>
  );
}
