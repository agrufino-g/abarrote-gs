'use client';

import { Card, BlockStack, Text, IndexTable, Button } from '@shopify/polaris';
import { DeleteIcon } from '@shopify/polaris-icons';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { formatCurrency } from '@/lib/utils';
import type { SaleItem, Product } from '@/types';

export interface SaleItemsTableProps {
  items: SaleItem[];
  allProducts: Product[];
  onRemove: (productId: string) => void;
}

export function SaleItemsTable({ items, allProducts, onRemove }: SaleItemsTableProps) {
  if (items.length === 0) return null;

  return (
    <Card>
      <BlockStack gap="200">
        <Text as="h3" variant="headingSm">
          Productos en venta ({items.length})
        </Text>
        <IndexTable
          resourceName={{ singular: 'producto', plural: 'productos' }}
          itemCount={items.length}
          headings={[
            { title: 'Foto' },
            { title: 'Producto' },
            { title: 'SKU' },
            { title: 'Cant.' },
            { title: 'P. Unit.' },
            { title: 'Subtotal' },
            { title: 'Acción' },
          ]}
          selectable={false}
        >
          {items.map((item, idx) => {
            const productInfo = allProducts.find((p) => p.id === item.productId);
            return (
              <IndexTable.Row id={item.productId} key={item.productId} position={idx}>
                <IndexTable.Cell>
                  <OptimizedImage source={productInfo?.imageUrl} alt={item.productName} size="small" />
                </IndexTable.Cell>
                <IndexTable.Cell>
                  <Text as="span" variant="bodyMd" fontWeight="semibold">
                    {item.productName}
                  </Text>
                </IndexTable.Cell>
                <IndexTable.Cell>
                  <Text as="span" variant="bodySm" tone="subdued">
                    {item.sku}
                  </Text>
                </IndexTable.Cell>
                <IndexTable.Cell>{item.quantity}</IndexTable.Cell>
                <IndexTable.Cell>{formatCurrency(item.unitPrice)}</IndexTable.Cell>
                <IndexTable.Cell>
                  <Text as="span" fontWeight="semibold">
                    {formatCurrency(item.subtotal)}
                  </Text>
                </IndexTable.Cell>
                <IndexTable.Cell>
                  <Button
                    variant="plain"
                    icon={DeleteIcon}
                    tone="critical"
                    onClick={() => onRemove(item.productId)}
                    accessibilityLabel="Eliminar"
                  />
                </IndexTable.Cell>
              </IndexTable.Row>
            );
          })}
        </IndexTable>
      </BlockStack>
    </Card>
  );
}
