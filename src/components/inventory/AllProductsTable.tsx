'use client';

import { useState, useCallback } from 'react';
import {
  Card,
  IndexTable,
  Text,
  Badge,
  BlockStack,
  InlineStack,
  Button,
  Icon,
  Thumbnail,
  IndexFilters,
  useSetIndexFiltersMode,
  IndexFiltersMode,
  TabProps,
  ChoiceList,
  RangeSlider,
  useIndexResourceState,
  Box,
  Popover,
  ActionList,
} from '@shopify/polaris';
import { ProductIcon, ImageIcon, ViewIcon, EmailIcon, CalendarIcon } from '@shopify/polaris-icons';
import { Product } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ProductExportModal, ProductImportModal } from './ShopifyModals';
import { generateCSV, downloadFile, generatePDF } from '@/components/export/ExportModal';

interface AllProductsTableProps {
  products: Product[];
  onProductClick?: (product: Product) => void;
  onRegisterProduct?: () => void;
  onCreatePedido?: () => void;
  onDeleteProduct?: (product: Product) => void;
  onUpdateProduct?: (product: Product) => void;
  onImportSuccess?: () => void;
}

export function AllProductsTable({ products, onProductClick, onRegisterProduct, onCreatePedido, onDeleteProduct, onUpdateProduct, onImportSuccess }: AllProductsTableProps) {
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [showInsights, setShowInsights] = useState(false);

  const toggleActions = useCallback(() => setIsActionsOpen((active) => !active), []);
  const toggleInsights = useCallback(() => {
    setShowInsights((active) => !active);
    setIsActionsOpen(false);
  }, []);
  const [itemStrings, setItemStrings] = useState([
    'Todos',
    'Activos',
    'Borradores',
    'Archivados',
  ]);
  const [selected, setSelected] = useState(0);

  const tabs: TabProps[] = itemStrings.map((item, index) => ({
    content: item,
    index,
    onAction: () => { },
    id: `${item}-${index}`,
    isLocked: index === 0,
    actions:
      index === 0
        ? []
        : [
          {
            type: 'rename',
            onAction: () => { },
            onPrimaryAction: async (value: string): Promise<boolean> => {
              const newItemsStrings = tabs.map((item, idx) => {
                if (idx === index) return value;
                return item.content;
              });
              setItemStrings(newItemsStrings);
              return true;
            },
          },
          {
            type: 'delete',
            onPrimaryAction: async () => {
              setItemStrings((prev) => prev.filter((_, idx) => idx !== index));
              setSelected(0);
              return true;
            },
          },
        ],
  }));

  const [sortSelected, setSortSelected] = useState(['Producto asc']);
  const { mode, setMode } = useSetIndexFiltersMode(IndexFiltersMode.Filtering);
  const [queryValue, setQueryValue] = useState('');

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(queryValue.toLowerCase()) ||
    product.sku.toLowerCase().includes(queryValue.toLowerCase()) ||
    product.barcode.includes(queryValue)
  );

  const resourceName = {
    singular: 'producto',
    plural: 'productos',
  };

  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(filteredProducts as any);

  const getStockBadge = (product: Product) => {
    if (product.currentStock === 0) {
      return <Badge tone="critical">Sin stock</Badge>;
    }
    if (product.currentStock <= product.minStock) {
      return <Badge tone="warning">Stock bajo</Badge>;
    }
    return <Badge tone="success">OK</Badge>;
  };

  const rowMarkup = filteredProducts.map((product, index) => (
    <IndexTable.Row
      id={product.id}
      key={product.id}
      position={index}
      selected={selectedResources.includes(product.id)}
      onClick={() => onProductClick?.(product)}
    >
      <IndexTable.Cell>
        <InlineStack gap="300" blockAlign="center">
          <Thumbnail
            size="small"
            source={product.imageUrl || ImageIcon}
            alt={product.name}
          />
          <div>
            <Text as="p" variant="bodyMd" fontWeight="semibold">
              {product.name}
            </Text>
            <Text as="p" variant="bodySm" tone="subdued">
              {product.sku}
            </Text>
          </div>
        </InlineStack>
      </IndexTable.Cell>

      <IndexTable.Cell>
        <Text as="p" variant="bodyMd" tone="subdued">
          {product.barcode}
        </Text>
      </IndexTable.Cell>

      <IndexTable.Cell>
        <Text as="p" variant="bodyMd">
          {product.category}
        </Text>
      </IndexTable.Cell>

      <IndexTable.Cell>
        <InlineStack gap="200" blockAlign="center">
          <Text as="p" variant="bodyMd" fontWeight="semibold">
            {product.currentStock}
          </Text>
          <Text as="p" variant="bodySm" tone="subdued">
            / {product.minStock} mín
          </Text>
        </InlineStack>
      </IndexTable.Cell>

      <IndexTable.Cell>
        <BlockStack gap="050">
          <Text as="p" variant="bodySm" tone="subdued">
            Costo: {formatCurrency(product.costPrice)}
          </Text>
          <Text as="p" variant="bodyMd" fontWeight="semibold">
            Venta: {formatCurrency(product.unitPrice)}
          </Text>
        </BlockStack>
      </IndexTable.Cell>

      <IndexTable.Cell>
        {product.expirationDate ? (
          <Text as="p" variant="bodyMd">
            {formatDate(product.expirationDate)}
          </Text>
        ) : (
          <Text as="p" variant="bodyMd" tone="subdued">
            N/A
          </Text>
        )}
      </IndexTable.Cell>

      <IndexTable.Cell>
        {getStockBadge(product)}
      </IndexTable.Cell>

      <IndexTable.Cell>
        <div onClick={(e) => e.stopPropagation()}>
          <InlineStack gap="200">
            <Button size="slim" onClick={() => onUpdateProduct?.(product)}>Actualizar</Button>
            <Button size="slim" tone="critical" onClick={() => onDeleteProduct?.(product)}>Eliminar</Button>
          </InlineStack>
        </div>
      </IndexTable.Cell>
    </IndexTable.Row>
  ));

  return (
    <BlockStack gap="500">
      {/* HEADER IDÉNTICO A SHOPIFY */}
      <InlineStack align="space-between" blockAlign="center">
        <InlineStack gap="200" blockAlign="center">
          <Icon source={ProductIcon} tone="base" />
          <Text as="h2" variant="headingLg" fontWeight="bold">
            Productos
          </Text>
        </InlineStack>

        <InlineStack gap="200">
          <Button onClick={() => setIsExportOpen(true)}>Exportar</Button>
          <Button onClick={() => setIsImportOpen(true)}>Importar</Button>
          <Popover
            active={isActionsOpen}
            activator={<Button onClick={toggleActions} disclosure>Más acciones</Button>}
            onClose={toggleActions}
            autofocusTarget="first-node"
          >
            <ActionList
              actionRole="menuitem"
              items={[
                {
                  content: showInsights ? 'Ocultar barra de informes y estadísticas' : 'Mostrar barra de informes y estadísticas',
                  icon: ViewIcon,
                  onAction: toggleInsights,
                },
                {
                  content: 'Crear campaña por correo electrónico',
                  icon: EmailIcon,
                },
              ]}
            />
          </Popover>
          {onRegisterProduct && (
            <Button variant="primary" tone="success" onClick={onRegisterProduct}>
              Agregar producto
            </Button>
          )}
        </InlineStack>
      </InlineStack>

      {showInsights && (
        <Box
          background="bg-surface"
          padding="0"
          borderRadius="300"
          borderWidth="025"
          borderColor="border"
          overflowX="hidden"
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, auto) 1fr 1fr 1fr' }}>
            {/* 30 days section */}
            <div style={{
              padding: '16px',
              borderRight: '1px solid var(--p-color-border)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'var(--p-color-bg-surface-secondary)'
            }}>
              <Icon source={CalendarIcon} tone="subdued" />
              <Text as="span" variant="bodyMd" tone="subdued">30 días</Text>
            </div>

            {/* Sales Rate */}
            <div style={{ padding: '12px 20px', borderRight: '1px solid var(--p-color-border)' }}>
              <BlockStack gap="100">
                <Text as="p" variant="bodySm" fontWeight="semibold" tone="base">
                  Tasa media de ventas directas
                </Text>
                <Text as="p" variant="bodyMd" fontWeight="bold">
                  0 % <Text as="span" tone="subdued">—</Text>
                </Text>
              </BlockStack>
            </div>

            {/* Inventory Health */}
            <div style={{ padding: '12px 20px', borderRight: '1px solid var(--p-color-border)' }}>
              <BlockStack gap="100">
                <Text as="p" variant="bodySm" fontWeight="semibold" tone="base">
                  Productos por días de inventario restante
                </Text>
                <Text as="p" variant="bodyMd" tone="subdued">
                  Sin datos
                </Text>
              </BlockStack>
            </div>

            {/* ABC Analysis */}
            <div style={{ padding: '12px 20px', position: 'relative' }}>
              <BlockStack gap="100">
                <Text as="p" variant="bodySm" fontWeight="semibold" tone="base">
                  Análisis ABC de productos
                </Text>
                <div style={{ display: 'inline-block', position: 'relative', width: 'fit-content', paddingBottom: '4px' }}>
                  <Text as="p" variant="bodyMd" fontWeight="bold">
                    0,00 MXN C
                  </Text>
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '2px',
                    backgroundColor: 'var(--p-color-text-info)',
                    borderRadius: '1px'
                  }} />
                </div>
              </BlockStack>
            </div>
          </div>
        </Box>
      )}

      <Card padding="0">
        <IndexFilters
          sortOptions={[
            { label: 'Producto', value: 'Producto asc', directionLabel: 'A-Z' },
            { label: 'Producto', value: 'Producto desc', directionLabel: 'Z-A' },
            { label: 'Categoría', value: 'Categoría asc', directionLabel: 'A-Z' },
          ]}
          sortSelected={sortSelected}
          queryValue={queryValue}
          queryPlaceholder="Buscar productos..."
          onQueryChange={setQueryValue}
          onQueryClear={() => setQueryValue('')}
          onSort={setSortSelected}
          cancelAction={{
            onAction: () => { },
            disabled: false,
            loading: false,
          }}
          tabs={tabs}
          selected={selected}
          onSelect={setSelected}
          canCreateNewView
          onCreateNewView={async (value) => {
            setItemStrings([...itemStrings, value]);
            setSelected(itemStrings.length);
            return true;
          }}
          mode={mode}
          setMode={setMode}
          filters={[]}
          appliedFilters={[]}
          onClearAll={() => { }}
        />

        <IndexTable
          resourceName={resourceName}
          itemCount={filteredProducts.length}
          selectedItemsCount={
            allResourcesSelected ? 'All' : selectedResources.length
          }
          onSelectionChange={handleSelectionChange}
          headings={[
            { title: 'Producto' },
            { title: 'Código de Barras' },
            { title: 'Categoría' },
            { title: 'Stock' },
            { title: 'Precios' },
            { title: 'Vencimiento' },
            { title: 'Estado' },
            { title: 'Acciones' },
          ]}
        >
          {rowMarkup}
        </IndexTable>
      </Card>

      <InlineStack align="center">
        <Button variant="monochromePlain">Más información sobre productos</Button>
      </InlineStack>

      {/* MODALES DE SHOPIFY */}
      <ProductExportModal
        open={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        onExport={(format) => {
          const exportData = filteredProducts.map(p => ({
            "Nombre Corto": p.name,
            "SKU": p.sku,
            "Código de Barras": p.barcode,
            "Categoría": p.category,
            "Inventario Actual": p.currentStock,
            "Inventario Mínimo": p.minStock,
            "Costo Inicial": p.costPrice,
            "Precio Público": p.unitPrice,
            "Vencimiento": p.expirationDate ? formatDate(p.expirationDate) : 'N/A'
          }));

          const filename = `Inventario_Productos_${new Date().toISOString().split('T')[0]}`;

          if (format === 'pdf') {
            generatePDF('Reporte de Inventario Kiosco', exportData as Record<string, unknown>[], `${filename}.pdf`);
          } else {
            const csvContent = generateCSV(exportData as Record<string, unknown>[], true);
            const mime = format === 'csv' ? 'text/csv;charset=utf-8;' : 'application/vnd.ms-excel;charset=utf-8;';
            downloadFile(csvContent, `${filename}.csv`, mime);
          }
        }}
      />

      <ProductImportModal
        open={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImportSuccess={onImportSuccess}
      />
    </BlockStack>
  );
}
