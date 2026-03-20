'use client';

import { Product } from '@/types';
import { ProductExportModal, ProductImportModal } from './ShopifyModals';
import { downloadFile, generateCSV, generatePDF } from '@/components/export/ExportModal';

interface InventoryModalsProps {
  filteredProducts: Product[];
  isExportOpen: boolean;
  isImportOpen: boolean;
  onExportClose: () => void;
  onImportClose: () => void;
  onImportSuccess?: () => void;
}

export function InventoryModals({
  filteredProducts,
  isExportOpen,
  isImportOpen,
  onExportClose,
  onImportClose,
  onImportSuccess,
}: InventoryModalsProps) {
  return (
    <>
      <ProductExportModal
        open={isExportOpen}
        onClose={onExportClose}
        onExport={(format) => {
          const exportData = filteredProducts.map((product) => {
            const unavailable = product.expirationDate && new Date(product.expirationDate) < new Date()
              ? product.currentStock
              : 0;
            const committed = 0;
            const available = Math.max(product.currentStock - unavailable - committed, 0);

            return {
              Producto: product.name,
              SKU: product.sku || 'Sin SKU',
              'No disponible': unavailable,
              Comprometido: committed,
              Disponible: available,
              'En existencia': product.currentStock,
            };
          });

          const filename = `Inventario_General_${new Date().toISOString().split('T')[0]}`;

          if (format === 'pdf') {
            generatePDF('Inventario general', exportData as Record<string, unknown>[], `${filename}.pdf`);
            return;
          }

          const csvContent = generateCSV(exportData as Record<string, unknown>[], true);
          const mime = format === 'csv' ? 'text/csv;charset=utf-8;' : 'application/vnd.ms-excel;charset=utf-8;';
          downloadFile(csvContent, `${filename}.csv`, mime);
        }}
      />

      <ProductImportModal
        open={isImportOpen}
        onClose={onImportClose}
        onImportSuccess={onImportSuccess}
      />
    </>
  );
}
