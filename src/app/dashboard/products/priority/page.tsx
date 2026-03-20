'use client';

import { useCallback } from 'react';
import { Page, BlockStack } from '@shopify/polaris';
import { ProductFilledIcon } from '@shopify/polaris-icons';
import { Icon } from '@shopify/polaris';
import { useDashboardStore } from '@/store/dashboardStore';
import { InventoryTable } from '@/components/inventory/InventoryTable';
import { Product } from '@/types';

export default function InventoryPriorityPage() {
  const inventoryAlerts = useDashboardStore((s) => s.inventoryAlerts);

  const handleProductClick = useCallback((product: Product) => {
    // TODO: integrate with layout product detail modal
  }, []);

  const fancyTitle = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <Icon source={ProductFilledIcon} tone="base" />
      <span>Inventario Prioritario</span>
    </div>
  );

  return (
    <Page fullWidth title={fancyTitle as any}>
      <BlockStack gap="400">
        <InventoryTable alerts={inventoryAlerts} onProductClick={handleProductClick} />
      </BlockStack>
    </Page>
  );
}
