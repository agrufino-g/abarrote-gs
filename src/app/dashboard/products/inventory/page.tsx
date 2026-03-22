'use client';

import { useCallback, useState } from 'react';
import { Page } from '@shopify/polaris';
import { InventoryIcon } from '@shopify/polaris-icons';
import { useDashboardStore } from '@/store/dashboardStore';
import { InventoryGeneralView } from '@/components/inventory/InventoryGeneralView';
import { UpdateProductModal } from '@/components/modals/UpdateProductModal';
import { Product } from '@/types';

export default function InventoryPage() {
  const products = useDashboardStore((s) => s.products);
  const fetchDashboardData = useDashboardStore((s) => s.fetchDashboardData);

  const [exportOpen, setExportOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [updateProductOpen, setUpdateProductOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const handleProductClick = useCallback((product: Product) => {
    setSelectedProduct(product);
    setUpdateProductOpen(true);
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

      <UpdateProductModal
        open={updateProductOpen}
        onClose={() => {
          setUpdateProductOpen(false);
          setSelectedProduct(null);
        }}
        product={selectedProduct}
      />
    </Page>
  );
}
