'use client';

import { useCallback, useState } from 'react';
import { Page } from '@shopify/polaris';
import { InventoryIcon } from '@shopify/polaris-icons';
import { useDashboardStore } from '@/store/dashboardStore';
import { InventoryGeneralView } from '@/components/inventory/InventoryGeneralView';
import { Product } from '@/types';

export default function InventoryPage() {
  const products = useDashboardStore((s) => s.products);
  const fetchDashboardData = useDashboardStore((s) => s.fetchDashboardData);

  const [exportOpen, setExportOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const handleProductClick = useCallback((product: Product) => {
    // TODO: integrate with layout product detail modal
  }, []);

  return (
    <Page
      fullWidth
      title="Inventario"
      titleMetadata={<InventoryIcon />}
      secondaryActions={[
        { content: 'Exportar', onAction: () => setExportOpen(true) },
        { content: 'Importar', onAction: () => setImportOpen(true) },
      ]}
    >
      <InventoryGeneralView
        products={products}
        onProductClick={handleProductClick}
        exportOpen={exportOpen}
        onExportClose={() => setExportOpen(false)}
        importOpen={importOpen}
        onImportClose={() => setImportOpen(false)}
        onImportSuccess={fetchDashboardData}
      />
    </Page>
  );
}
