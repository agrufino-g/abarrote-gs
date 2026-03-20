'use client';

import {
  Card,
  BlockStack,
  Text,
  IndexTable,
  Icon,
  Button,
} from '@shopify/polaris';
import { DeleteIcon, BarcodeIcon } from '@shopify/polaris-icons';
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
        <Text as="h3" variant="headingSm">Productos en venta ({items.length})</Text>
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
                  {productInfo?.imageUrl ? (
                    <div style={{ width: '40px', height: '40px', borderRadius: '4px', overflow: 'hidden', border: '1px solid #e1e3e5' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={productInfo.imageUrl} alt={item.productName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  ) : (
                    <div style={{ width: '40px', height: '40px', borderRadius: '4px', background: '#f4f6f8', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e1e3e5' }}>
                      <Icon source={BarcodeIcon} tone="subdued" />
                    </div>
                  )}
                </IndexTable.Cell>
                <IndexTable.Cell>
                  <Text as="span" variant="bodyMd" fontWeight="semibold">{item.productName}</Text>
                </IndexTable.Cell>
                <IndexTable.Cell>
                  <Text as="span" variant="bodySm" tone="subdued">{item.sku}</Text>
                </IndexTable.Cell>
                <IndexTable.Cell>{item.quantity}</IndexTable.Cell>
                <IndexTable.Cell>{formatCurrency(item.unitPrice)}</IndexTable.Cell>
                <IndexTable.Cell>
                  <Text as="span" fontWeight="semibold">{formatCurrency(item.subtotal)}</Text>
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
