'use client';

import { useMemo } from 'react';
import {
  IndexTable,
  InlineStack,
  Text,
  TextField,
  Thumbnail,
  useIndexResourceState,
} from '@shopify/polaris';
import { ImageIcon } from '@shopify/polaris-icons';
import { Product } from '@/types';
import { BulkColumnDefinition } from './InventoryTypes';

interface InventoryProductTableProps {
  filteredProducts: Product[];
  appliedColumnDefinitions: BulkColumnDefinition[];
  promotedBulkActions: { content: string; onAction: () => void }[];
  onProductClick?: (product: Product) => void;
  selectedResources: string[];
  allResourcesSelected: boolean;
  handleSelectionChange: (...args: any[]) => void;
}

export function InventoryProductTable({
  filteredProducts,
  appliedColumnDefinitions,
  promotedBulkActions,
  onProductClick,
  selectedResources,
  allResourcesSelected,
  handleSelectionChange,
}: InventoryProductTableProps) {
  const rowMarkup = filteredProducts.map((product, index) => {
    const unavailable = product.expirationDate && new Date(product.expirationDate) < new Date()
      ? product.currentStock
      : 0;
    const committed = 0;
    const available = Math.max(product.currentStock - unavailable - committed, 0);
    const onHand = product.currentStock;

    return (
      <IndexTable.Row
        id={product.id}
        key={product.id}
        position={index}
        selected={selectedResources.includes(product.id)}
        onClick={() => onProductClick?.(product)}
      >
        {appliedColumnDefinitions.map((column) => {
          switch (column.key) {
            case 'title':
              return (
                <IndexTable.Cell key={column.key}>
                  <InlineStack gap="300" blockAlign="center">
                    <Thumbnail size="small" source={product.imageUrl || ImageIcon} alt={product.name} />
                    <Text as="span" variant="bodyMd" fontWeight="semibold">
                      {product.name}
                    </Text>
                  </InlineStack>
                </IndexTable.Cell>
              );
            case 'sku':
              return (
                <IndexTable.Cell key={column.key}>
                  <Text as="span" variant="bodyMd" tone="subdued">
                    {product.sku || 'Sin SKU'}
                  </Text>
                </IndexTable.Cell>
              );
            case 'barcode':
              return (
                <IndexTable.Cell key={column.key}>
                  <Text as="span" variant="bodyMd" tone="subdued">
                    {product.barcode || 'Sin codigo'}
                  </Text>
                </IndexTable.Cell>
              );
            case 'category':
              return (
                <IndexTable.Cell key={column.key}>
                  <Text as="span" variant="bodyMd">{product.category || 'Sin categoria'}</Text>
                </IndexTable.Cell>
              );
            case 'unitPrice':
              return (
                <IndexTable.Cell key={column.key}>
                  <Text as="span" variant="bodyMd">${product.unitPrice}</Text>
                </IndexTable.Cell>
              );
            case 'costPrice':
              return (
                <IndexTable.Cell key={column.key}>
                  <Text as="span" variant="bodyMd">${product.costPrice}</Text>
                </IndexTable.Cell>
              );
            case 'available':
              return (
                <IndexTable.Cell key={column.key}>
                  <div onClick={(event) => event.stopPropagation()}>
                    <TextField label="Disponible" labelHidden autoComplete="off" value={String(available)} readOnly />
                  </div>
                </IndexTable.Cell>
              );
            case 'onHand':
              return (
                <IndexTable.Cell key={column.key}>
                  <div onClick={(event) => event.stopPropagation()}>
                    <TextField label="En existencia" labelHidden autoComplete="off" value={String(onHand)} readOnly />
                  </div>
                </IndexTable.Cell>
              );
            case 'minStock':
              return (
                <IndexTable.Cell key={column.key}>
                  <Text as="span" variant="bodyMd">{product.minStock}</Text>
                </IndexTable.Cell>
              );
            case 'expirationDate':
              return (
                <IndexTable.Cell key={column.key}>
                  <Text as="span" variant="bodyMd" tone="subdued">
                    {product.expirationDate || 'Sin fecha'}
                  </Text>
                </IndexTable.Cell>
              );
            default:
              return null;
          }
        })}
      </IndexTable.Row>
    );
  });

  return (
    <IndexTable
      resourceName={{ singular: 'producto', plural: 'productos' }}
      itemCount={filteredProducts.length}
      selectedItemsCount={allResourcesSelected ? 'All' : selectedResources.length}
      onSelectionChange={handleSelectionChange}
      promotedBulkActions={promotedBulkActions}
      headings={appliedColumnDefinitions.map((column) => ({ title: column.mainTableTitle || column.label }))}
    >
      {rowMarkup}
    </IndexTable>
  );
}
