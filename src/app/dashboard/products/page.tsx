'use client';

import { useCallback, useState } from 'react';
import { Page, Modal, FormLayout, TextField } from '@shopify/polaris';
import { ProductIcon, ViewIcon, EmailIcon } from '@shopify/polaris-icons';
import { useDashboardStore } from '@/store/dashboardStore';
import { AllProductsTable } from '@/components/inventory/AllProductsTable';
import { RegisterProductModal } from '@/components/modals/RegisterProductModal';
import { deleteProduct, updateProduct } from '@/app/actions/db-actions';
import { useToast } from '@/components/notifications/ToastProvider';
import { Product } from '@/types';

export default function ProductsPage() {
  const products = useDashboardStore((s) => s.products);
  const fetchDashboardData = useDashboardStore((s) => s.fetchDashboardData);
  const toast = useToast();

  const [registerProductOpen, setRegisterProductOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [updateProductOpen, setUpdateProductOpen] = useState(false);
  const [productToUpdate, setProductToUpdate] = useState<Product | null>(null);
  const [updateStock, setUpdateStock] = useState('');
  const [updatePrice, setUpdatePrice] = useState('');
  const [updateCostPrice, setUpdateCostPrice] = useState('');

  const handleProductClick = useCallback((product: Product) => {
    // TODO: integrate with layout product detail modal
  }, []);

  const handleDeleteProducts = useCallback(async (productsToDelete: Product[]) => {
    const count = productsToDelete.length;
    const label = count === 1 ? `"${productsToDelete[0].name}"` : `${count} productos`;
    if (confirm(`¿Estás seguro de eliminar ${label}?`)) {
      try {
        await Promise.all(productsToDelete.map((p) => deleteProduct(p.id)));
        toast.showSuccess(`${count === 1 ? `Producto ${label}` : label} eliminado${count > 1 ? 's' : ''}`);
        fetchDashboardData();
      } catch {
        toast.showError('Error al eliminar productos');
      }
    }
  }, [toast, fetchDashboardData]);

  const handleOpenUpdateProduct = useCallback((product: Product) => {
    setProductToUpdate(product);
    setUpdateStock(product.currentStock.toString());
    setUpdatePrice(product.unitPrice.toString());
    setUpdateCostPrice(product.costPrice.toString());
    setUpdateProductOpen(true);
  }, []);

  const handleUpdateProductSubmit = useCallback(async () => {
    if (!productToUpdate) return;
    try {
      await updateProduct(productToUpdate.id, {
        currentStock: parseInt(updateStock, 10) || productToUpdate.currentStock,
        unitPrice: parseFloat(updatePrice) || productToUpdate.unitPrice,
        costPrice: parseFloat(updateCostPrice) || productToUpdate.costPrice,
      });
      toast.showSuccess(`Producto "${productToUpdate.name}" actualizado`);
      setUpdateProductOpen(false);
      setProductToUpdate(null);
      fetchDashboardData();
    } catch {
      toast.showError('Error al actualizar el producto');
    }
  }, [productToUpdate, updateStock, updatePrice, updateCostPrice, toast, fetchDashboardData]);

  return (
    <>
      <Page
        fullWidth
        title="Productos"
        titleMetadata={<ProductIcon />}
        primaryAction={{
          content: 'Agregar producto',
          onAction: () => setRegisterProductOpen(true),
        }}
        secondaryActions={[
          { content: 'Exportar', onAction: () => setExportOpen(true) },
          { content: 'Importar', onAction: () => setImportOpen(true) },
        ]}
        actionGroups={[
          {
            title: 'Más acciones',
            actions: [
              { content: 'Ver estadísticas', icon: ViewIcon, onAction: () => {} },
              { content: 'Crear campaña por correo', icon: EmailIcon, onAction: () => {} },
            ],
          },
        ]}
      >
        <AllProductsTable
          products={products}
          onProductClick={handleProductClick}
          onDeleteProducts={handleDeleteProducts}
          onUpdateProduct={handleOpenUpdateProduct}
          exportOpen={exportOpen}
          onExportClose={() => setExportOpen(false)}
          importOpen={importOpen}
          onImportClose={() => setImportOpen(false)}
          onImportSuccess={fetchDashboardData}
        />
      </Page>

      <RegisterProductModal open={registerProductOpen} onClose={() => setRegisterProductOpen(false)} />

      <Modal
        open={updateProductOpen}
        onClose={() => { setUpdateProductOpen(false); setProductToUpdate(null); }}
        title={productToUpdate ? `Actualizar ${productToUpdate.name}` : 'Actualizar Producto'}
        primaryAction={{ content: 'Guardar Cambios', onAction: handleUpdateProductSubmit }}
        secondaryActions={[{ content: 'Cancelar', onAction: () => { setUpdateProductOpen(false); setProductToUpdate(null); } }]}
      >
        <Modal.Section>
          <FormLayout>
            <TextField label="Stock Actual" type="number" value={updateStock} onChange={setUpdateStock} autoComplete="off" />
            <TextField label="Precio Venta" type="number" value={updatePrice} onChange={setUpdatePrice} autoComplete="off" prefix="$" />
            <TextField label="Precio Costo" type="number" value={updateCostPrice} onChange={setUpdateCostPrice} autoComplete="off" prefix="$" />
          </FormLayout>
        </Modal.Section>
      </Modal>
    </>
  );
}
