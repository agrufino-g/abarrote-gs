'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BlockStack,
  Button,
  Card,
  IndexTable,
  InlineStack,
  Tabs,
  Text,
  TextField,
  useIndexResourceState,
} from '@shopify/polaris';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { LayoutColumns3Icon, SearchIcon, SortIcon } from '@shopify/polaris-icons';
import { Product } from '@/types';
import { useToast } from '@/components/notifications/ToastProvider';
import { useDashboardStore } from '@/store/dashboardStore';
import { ProductExportModal, ProductImportModal } from './ShopifyModals';
import { downloadFile, generateCSV } from '@/components/export/ExportModal';
import { generatePDF } from '@/components/export/generatePDF';
import { InventoryColumnsPopover } from './InventoryColumnsPopover';
import {
  BulkColumnKey,
  BulkEditRow,
  BULK_COLUMN_DEFINITIONS,
  INVENTORY_GENERAL_COLUMNS_FALLBACK,
  parseInventoryGeneralColumns,
  serializeInventoryGeneralColumns,
} from './InventoryTypes';
import { InventoryBulkEdit } from './InventoryBulkEdit';

// --- Columnas fijas del screenshot de Shopify ---
const _INVENTORY_HEADINGS: { title: string }[] = [
  { title: 'Producto' },
  { title: 'SKU' },
  { title: 'No disponible' },
  { title: 'Comprometido' },
  { title: 'Disponible' },
  { title: 'En existencia' },
  { title: 'Nombre del contenedor' },
];

const INVENTORY_TABS = [
  {
    id: 'all-items',
    content: 'Todo',
    accessibilityLabel: 'Todos los productos',
    panelID: 'all-items-content',
  },
];

interface InventoryGeneralViewProps {
  products: Product[];
  onProductClick?: (product: Product) => void;
  exportOpen: boolean;
  onExportClose: () => void;
  importOpen: boolean;
  onImportClose: () => void;
  onImportSuccess?: () => void;
}

export function InventoryGeneralView({
  products,
  onProductClick,
  exportOpen,
  onExportClose,
  importOpen,
  onImportClose,
  onImportSuccess,
}: InventoryGeneralViewProps) {
  const [selectedTab, setSelectedTab] = useState(0);
  const [queryValue, setQueryValue] = useState('');
  const [sortAscending, setSortAscending] = useState(true);
  const [isColumnsPopoverOpen, setIsColumnsPopoverOpen] = useState(false);
  const [columnQuery, setColumnQuery] = useState('');

  // --- Edicion masiva ---
  const [isBulkEditing, setIsBulkEditing] = useState(false);
  const [isSavingBulkEdit, setIsSavingBulkEdit] = useState(false);
  const [bulkRows, setBulkRows] = useState<BulkEditRow[]>([]);

  const storeConfig = useDashboardStore((state) => state.storeConfig);
  const saveStoreConfig = useDashboardStore((state) => state.saveStoreConfig);
  const [appliedVisibleColumns, setAppliedVisibleColumns] = useState(
    parseInventoryGeneralColumns(INVENTORY_GENERAL_COLUMNS_FALLBACK),
  );
  const [draftVisibleColumns, setDraftVisibleColumns] = useState(
    parseInventoryGeneralColumns(INVENTORY_GENERAL_COLUMNS_FALLBACK),
  );
  const toast = useToast();

  // --- Inline editable state for Disponible / En existencia ---
  const [editedValues, setEditedValues] = useState<Record<string, { available?: string; onHand?: string }>>({});

  const handlePersistColumns = useCallback(
    async (nextColumns: Record<BulkColumnKey, boolean>) => {
      setAppliedVisibleColumns(nextColumns);
      try {
        await saveStoreConfig({
          inventoryGeneralColumns: serializeInventoryGeneralColumns(nextColumns),
        });
      } catch {
        toast.showError('No se pudieron guardar las columnas de inventario');
      }
    },
    [saveStoreConfig, toast],
  );

  useEffect(() => {
    const persistedColumns = parseInventoryGeneralColumns(storeConfig.inventoryGeneralColumns);
    setAppliedVisibleColumns(persistedColumns);
    if (!isBulkEditing) {
      setDraftVisibleColumns(persistedColumns);
    }
  }, [isBulkEditing, storeConfig.inventoryGeneralColumns]);

  // --- Filtro ---
  const filteredProducts = useMemo(() => {
    const query = queryValue.trim().toLowerCase();
    const filtered = query
      ? products.filter(
          (p) =>
            p.name.toLowerCase().includes(query) ||
            p.sku.toLowerCase().includes(query) ||
            p.barcode.toLowerCase().includes(query),
        )
      : [...products];
    filtered.sort((a, b) => (sortAscending ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)));
    return filtered;
  }, [products, queryValue, sortAscending]);

  // --- Resource selection ---
  const { selectedResources, allResourcesSelected, handleSelectionChange } = useIndexResourceState(
    filteredProducts as { id: string }[],
  );

  const selectedProducts = useMemo(
    () => filteredProducts.filter((p) => selectedResources.includes(p.id)),
    [filteredProducts, selectedResources],
  );

  // --- Inline edit handlers ---
  const handleInlineChange = useCallback((productId: string, field: 'available' | 'onHand', value: string) => {
    setEditedValues((prev) => ({
      ...prev,
      [productId]: { ...prev[productId], [field]: value },
    }));
  }, []);

  const updateProductStore = useDashboardStore((s) => s.updateProduct);

  const handleInlineSave = useCallback(
    async (product: Product) => {
      const edited = editedValues[product.id];
      if (!edited) return;

      const parsedAvailable = edited.available !== undefined ? parseInt(edited.available, 10) : undefined;
      const parsedOnHand = edited.onHand !== undefined ? parseInt(edited.onHand, 10) : undefined;

      const newStock =
        parsedOnHand !== undefined && !isNaN(parsedOnHand)
          ? parsedOnHand
          : parsedAvailable !== undefined && !isNaN(parsedAvailable)
            ? parsedAvailable
            : undefined;

      if (newStock === undefined || newStock === product.currentStock) return;

      try {
        // Usamos el store para actualización optimista instantánea
        await updateProductStore(product.id, { currentStock: newStock });
        toast.showSuccess(`Stock de "${product.name}" actualizado a ${newStock}`);
        setEditedValues((prev) => {
          const next = { ...prev };
          delete next[product.id];
          return next;
        });
        // Ya no llamamos a onImportSuccess() para evitar el refetch masivo
      } catch {
        toast.showError('Error al actualizar stock');
      }
    },
    [editedValues, toast, updateProductStore],
  );

  // --- Bulk edit ---
  const visibleColumnDefinitions = useMemo(
    () => BULK_COLUMN_DEFINITIONS.filter((c) => draftVisibleColumns[c.key]),
    [draftVisibleColumns],
  );

  const handleOpenBulkEdit = useCallback(() => {
    if (selectedProducts.length === 0) {
      toast.showError('Selecciona al menos un producto para edicion masiva');
      return;
    }
    setDraftVisibleColumns(appliedVisibleColumns);
    setBulkRows(
      selectedProducts.map((p) => ({
        id: p.id,
        title: p.name,
        sku: p.sku || '',
        barcode: p.barcode || '',
        category: p.category || '',
        unitPrice: String(p.unitPrice),
        costPrice: String(p.costPrice),
        available: String(p.currentStock),
        onHand: String(p.currentStock),
        minStock: String(p.minStock),
        expirationDate: p.expirationDate || '',
      })),
    );
    setIsBulkEditing(true);
  }, [appliedVisibleColumns, selectedProducts, toast]);

  const handleCloseBulkEdit = useCallback(() => {
    setIsBulkEditing(false);
    setIsColumnsPopoverOpen(false);
    setColumnQuery('');
    setDraftVisibleColumns(appliedVisibleColumns);
  }, [appliedVisibleColumns]);

  const handleBulkFieldChange = useCallback((id: string, field: BulkColumnKey, value: string) => {
    setBulkRows((rows) => rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  }, []);

  const handleDraftColumnChange = useCallback((key: BulkColumnKey, checked: boolean) => {
    setDraftVisibleColumns((c) => ({ ...c, [key]: checked }));
  }, []);

  const handleAppliedColumnChange = useCallback(
    (key: BulkColumnKey, checked: boolean) => {
      void handlePersistColumns({ ...appliedVisibleColumns, [key]: checked });
    },
    [appliedVisibleColumns, handlePersistColumns],
  );

  const handleSaveBulkEdit = useCallback(async () => {
    if (bulkRows.length === 0) {
      setIsBulkEditing(false);
      return;
    }
    setIsSavingBulkEdit(true);
    try {
      await Promise.all(
        bulkRows.map(async (row) => {
          const product = products.find((p) => p.id === row.id);
          if (!product) return;
          // Usamos el store para cada actualización
          await updateProductStore(product.id, {
            name: row.title.trim() || product.name,
            sku: row.sku.trim(),
            barcode: row.barcode.trim(),
            category: row.category.trim() || product.category,
            currentStock: parseInt(row.onHand, 10) || parseInt(row.available, 10) || product.currentStock,
            minStock: parseInt(row.minStock, 10) || product.minStock,
            unitPrice: parseFloat(row.unitPrice) || product.unitPrice,
            costPrice: parseFloat(row.costPrice) || product.costPrice,
            expirationDate: row.expirationDate.trim() || null,
          });
        }),
      );
      await saveStoreConfig({ inventoryGeneralColumns: serializeInventoryGeneralColumns(draftVisibleColumns) });
      toast.showSuccess(`Se actualizaron ${bulkRows.length} producto(s)`);
      setAppliedVisibleColumns(draftVisibleColumns);
      setIsBulkEditing(false);
      // Actualización masiva terminada, el store ya tiene los datos nuevos.
    } catch {
      toast.showError('No se pudo guardar la edicion masiva');
    } finally {
      setIsSavingBulkEdit(false);
    }
  }, [bulkRows, draftVisibleColumns, products, saveStoreConfig, toast, updateProductStore]);

  // --- Promoted bulk actions ---
  const promotedBulkActions = [{ content: 'Edicion masiva', onAction: handleOpenBulkEdit }];

  // --- Export handler ---
  const handleExport = useCallback(
    (format: string) => {
      const exportData = products.map((p) => {
        const unavailable = p.expirationDate && new Date(p.expirationDate) < new Date() ? p.currentStock : 0;
        return {
          Producto: p.name,
          SKU: p.sku || 'Sin SKU',
          'Código de Barras': p.barcode || 'N/A',
          Categoría: p.category || 'N/A',
          'Costo Unitario ($)': p.costPrice,
          'Precio Público ($)': p.unitPrice,
          'Unidad de Venta': p.unit || 'N/A',
          'Es Perecedero': p.isPerishable ? 'Sí' : 'No',
          'No disponible': unavailable,
          Comprometido: 0,
          Disponible: Math.max(p.currentStock - unavailable, 0),
          'En existencia': p.currentStock,
          'Inventario Mínimo': p.minStock,
          'Fecha de Vencimiento': p.expirationDate || 'N/A',
        };
      });
      const filename = `Inventario_General_${new Date().toISOString().split('T')[0]}`;
      if (format === 'pdf') {
        generatePDF('Inventario general', exportData as Record<string, unknown>[], `${filename}.pdf`);
      } else {
        const csvContent = generateCSV(exportData as Record<string, unknown>[], true);
        const mime = format === 'csv' ? 'text/csv;charset=utf-8;' : 'application/vnd.ms-excel;charset=utf-8;';
        downloadFile(csvContent, `${filename}.csv`, mime);
      }
    },
    [products],
  );

  // --- Columnas Dinámicas para la vista ---
  const activeColumns = useMemo(
    () => BULK_COLUMN_DEFINITIONS.filter((c) => appliedVisibleColumns[c.key]),
    [appliedVisibleColumns],
  );

  const dynamicHeadings = useMemo(
    () => activeColumns.map((col) => ({ title: col.mainTableTitle || col.label })),
    [activeColumns],
  );

  const rowMarkup = filteredProducts.map((product, index) => {
    const unavailable =
      product.expirationDate && new Date(product.expirationDate) < new Date() ? product.currentStock : 0;
    const committed = 0;
    const available = Math.max(product.currentStock - unavailable - committed, 0);
    const onHand = product.currentStock;
    const edited = editedValues[product.id];

    return (
      <IndexTable.Row
        id={product.id}
        key={product.id}
        position={index}
        selected={selectedResources.includes(product.id)}
        onClick={() => onProductClick?.(product)}
      >
        {activeColumns.map((col) => {
          switch (col.key) {
            case 'title':
              return (
                <IndexTable.Cell key={col.key}>
                  <InlineStack gap="300" blockAlign="center">
                    <OptimizedImage source={product.imageUrl} alt={product.name} size="small" />
                    <Text as="span" variant="bodyMd" fontWeight="semibold">
                      {product.name}
                    </Text>
                  </InlineStack>
                </IndexTable.Cell>
              );
            case 'sku':
              return (
                <IndexTable.Cell key={col.key}>
                  <Text as="span" variant="bodyMd" tone="subdued">
                    {product.sku || 'Sin SKU'}
                  </Text>
                </IndexTable.Cell>
              );
            case 'barcode':
              return (
                <IndexTable.Cell key={col.key}>
                  <Text as="span" variant="bodyMd" tone="subdued">
                    {product.barcode || 'N/A'}
                  </Text>
                </IndexTable.Cell>
              );
            case 'category':
              return (
                <IndexTable.Cell key={col.key}>
                  <Text as="span" variant="bodyMd">
                    {product.category || 'N/A'}
                  </Text>
                </IndexTable.Cell>
              );
            case 'unitPrice':
              return (
                <IndexTable.Cell key={col.key}>
                  <Text as="span" variant="bodyMd">
                    ${product.unitPrice.toFixed(2)}
                  </Text>
                </IndexTable.Cell>
              );
            case 'costPrice':
              return (
                <IndexTable.Cell key={col.key}>
                  <Text as="span" variant="bodyMd">
                    ${product.costPrice.toFixed(2)}
                  </Text>
                </IndexTable.Cell>
              );
            case 'minStock':
              return (
                <IndexTable.Cell key={col.key}>
                  <Text as="span" variant="bodyMd">
                    {product.minStock}
                  </Text>
                </IndexTable.Cell>
              );
            case 'expirationDate':
              return (
                <IndexTable.Cell key={col.key}>
                  <Text as="span" variant="bodyMd">
                    {product.expirationDate || 'N/A'}
                  </Text>
                </IndexTable.Cell>
              );
            case 'available':
              return (
                <IndexTable.Cell key={col.key}>
                  <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '140px' }}>
                    <InlineStack gap="100" wrap={false} align="start" blockAlign="center">
                      <div style={{ flexGrow: 1 }}>
                        <TextField
                          label="Disponible"
                          labelHidden
                          autoComplete="off"
                          type="number"
                          value={edited?.available !== undefined ? edited.available : String(available)}
                          onChange={(v) => handleInlineChange(product.id, 'available', v)}
                        />
                      </div>
                      {edited?.available !== undefined && (
                        <Button size="micro" variant="primary" onClick={() => handleInlineSave(product)}>
                          Guardar
                        </Button>
                      )}
                    </InlineStack>
                  </div>
                </IndexTable.Cell>
              );
            case 'onHand':
              return (
                <IndexTable.Cell key={col.key}>
                  <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '140px' }}>
                    <InlineStack gap="100" wrap={false} align="start" blockAlign="center">
                      <div style={{ flexGrow: 1 }}>
                        <TextField
                          label="En existencia"
                          labelHidden
                          autoComplete="off"
                          type="number"
                          value={edited?.onHand !== undefined ? edited.onHand : String(onHand)}
                          onChange={(v) => handleInlineChange(product.id, 'onHand', v)}
                        />
                      </div>
                      {edited?.onHand !== undefined && (
                        <Button size="micro" variant="primary" onClick={() => handleInlineSave(product)}>
                          Guardar
                        </Button>
                      )}
                    </InlineStack>
                  </div>
                </IndexTable.Cell>
              );
            default:
              return <IndexTable.Cell key={col.key}>-</IndexTable.Cell>;
          }
        })}
      </IndexTable.Row>
    );
  });

  // --- Bulk edit mode ---
  if (isBulkEditing) {
    return (
      <InventoryBulkEdit
        bulkRows={bulkRows}
        products={products}
        visibleColumnDefinitions={visibleColumnDefinitions}
        draftVisibleColumns={draftVisibleColumns}
        isSavingBulkEdit={isSavingBulkEdit}
        isColumnsPopoverOpen={isColumnsPopoverOpen}
        columnQuery={columnQuery}
        onColumnsPopoverToggle={() => setIsColumnsPopoverOpen((c) => !c)}
        onColumnsPopoverClose={() => setIsColumnsPopoverOpen(false)}
        onColumnQueryChange={setColumnQuery}
        onDraftColumnChange={handleDraftColumnChange}
        onBulkFieldChange={handleBulkFieldChange}
        onClose={handleCloseBulkEdit}
        onSave={handleSaveBulkEdit}
      />
    );
  }

  return (
    <BlockStack gap="400">
      <Card padding="0">
        {/* Toolbar: Tabs a la izquierda, iconos a la derecha */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--p-color-border-subdued, #e1e3e5)',
          }}
        >
          {/* Izquierda: Tabs */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Tabs tabs={INVENTORY_TABS} selected={selectedTab} onSelect={setSelectedTab} fitted={false} />
          </div>

          {/* Derecha: Buscador fijo y botones */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              paddingRight: '16px',
              paddingBottom: '6px',
              paddingTop: '6px',
            }}
          >
            <div style={{ width: '280px' }}>
              <TextField
                label="Buscar"
                labelHidden
                autoComplete="off"
                value={queryValue}
                onChange={setQueryValue}
                placeholder="Buscar productos, sku..."
                prefix={<SearchIcon />}
                clearButton
                onClearButtonClick={() => setQueryValue('')}
              />
            </div>

            <InventoryColumnsPopover
              active={isColumnsPopoverOpen}
              activator={
                <Button
                  icon={LayoutColumns3Icon}
                  onClick={() => setIsColumnsPopoverOpen((c) => !c)}
                  accessibilityLabel="Administrar columnas"
                />
              }
              onClose={() => setIsColumnsPopoverOpen(false)}
              columnQuery={columnQuery}
              onColumnQueryChange={setColumnQuery}
              selectedColumns={appliedVisibleColumns}
              onColumnChange={handleAppliedColumnChange}
            />

            <Button
              icon={SortIcon}
              onClick={() => setSortAscending((prev) => !prev)}
              accessibilityLabel={sortAscending ? 'Ordenar Z-A' : 'Ordenar A-Z'}
            />
          </div>
        </div>

        {/* Tabla con encabezados dinámicos */}
        <IndexTable
          resourceName={{ singular: 'producto', plural: 'productos' }}
          itemCount={filteredProducts.length}
          selectedItemsCount={allResourcesSelected ? 'All' : selectedResources.length}
          onSelectionChange={handleSelectionChange}
          headings={dynamicHeadings as [{ title: string }, ...{ title: string }[]]}
          promotedBulkActions={promotedBulkActions}
          sortable={[true, false, false, false, false, false, false]}
        >
          {rowMarkup}
        </IndexTable>
      </Card>

      {/* Modales controlados desde padre */}
      <ProductExportModal open={exportOpen} onClose={onExportClose} onExport={handleExport} />
      <ProductImportModal open={importOpen} onClose={onImportClose} onImportSuccess={onImportSuccess} />
    </BlockStack>
  );
}
