'use client';

import {
  Card,
  Text,
  BlockStack,
  InlineStack,
  Badge,
  ProgressBar,
  Avatar,
  Box,
} from '@shopify/polaris';
import { formatCurrency } from '@/lib/utils';

interface TopProduct {
  id: string;
  name: string;
  sku: string;
  unitsSold: number;
  revenue: number;
  margin: number;
  trend: 'up' | 'down' | 'stable';
}

interface TopProductsProps {
  products?: TopProduct[];
  title?: string;
}

const defaultTopProducts: TopProduct[] = [
  { id: '1', name: 'Coca-Cola 600ml', sku: 'BEB-001', unitsSold: 245, revenue: 4165, margin: 22, trend: 'up' },
  { id: '2', name: 'Leche Entera 1L', sku: 'LAC-001', unitsSold: 180, revenue: 5130, margin: 15, trend: 'up' },
  { id: '3', name: 'Pan Blanco Bimbo', sku: 'PAN-001', unitsSold: 156, revenue: 5460, margin: 18, trend: 'stable' },
  { id: '4', name: 'Huevo Blanco 1kg', sku: 'HUE-001', unitsSold: 142, revenue: 7384, margin: 12, trend: 'up' },
  { id: '5', name: 'Sabritas Original', sku: 'BOT-001', unitsSold: 128, revenue: 2560, margin: 35, trend: 'down' },
];

function getTrendBadge(trend: 'up' | 'down' | 'stable') {
  switch (trend) {
    case 'up':
      return <Badge tone="success">↑ Subiendo</Badge>;
    case 'down':
      return <Badge tone="critical">↓ Bajando</Badge>;
    default:
      return <Badge tone="info">→ Estable</Badge>;
  }
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function TopProducts({ products = defaultTopProducts, title = "Productos Más Vendidos" }: TopProductsProps) {
  const maxUnits = Math.max(...products.map((p) => p.unitsSold));

  return (
    <Card>
      <BlockStack gap="400">
        <InlineStack align="space-between" blockAlign="center">
          <Text as="h3" variant="headingMd">
            {title}
          </Text>
          <Badge tone="info">Hoy</Badge>
        </InlineStack>

        <BlockStack gap="300">
          {products.map((product, index) => (
            <Box
              key={product.id}
              padding="300"
              background={index % 2 === 0 ? 'bg-surface-secondary' : 'bg-surface'}
              borderRadius="200"
            >
              <BlockStack gap="200">
                <InlineStack align="space-between" blockAlign="start">
                  <InlineStack gap="300" blockAlign="center">
                    <Avatar
                      size="sm"
                      initials={getInitials(product.name)}
                      name={product.name}
                    />
                    <BlockStack gap="050">
                      <Text as="p" variant="bodyMd" fontWeight="semibold">
                        {product.name}
                      </Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        {product.sku}
                      </Text>
                    </BlockStack>
                  </InlineStack>
                  {getTrendBadge(product.trend)}
                </InlineStack>

                <InlineStack gap="400">
                  <BlockStack gap="050">
                    <Text as="p" variant="bodySm" tone="subdued">
                      Unidades
                    </Text>
                    <Text as="p" variant="bodyMd" fontWeight="semibold">
                      {product.unitsSold}
                    </Text>
                  </BlockStack>
                  <BlockStack gap="050">
                    <Text as="p" variant="bodySm" tone="subdued">
                      Ingresos
                    </Text>
                    <Text as="p" variant="bodyMd" fontWeight="semibold">
                      {formatCurrency(product.revenue)}
                    </Text>
                  </BlockStack>
                  <BlockStack gap="050">
                    <Text as="p" variant="bodySm" tone="subdued">
                      Margen
                    </Text>
                    <Text as="p" variant="bodyMd" fontWeight="semibold" tone="success">
                      {product.margin}%
                    </Text>
                  </BlockStack>
                </InlineStack>

                <ProgressBar
                  progress={(product.unitsSold / maxUnits) * 100}
                  size="small"
                />
              </BlockStack>
            </Box>
          ))}
        </BlockStack>
      </BlockStack>
    </Card>
  );
}
