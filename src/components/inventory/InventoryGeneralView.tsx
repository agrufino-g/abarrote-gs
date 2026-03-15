'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BlockStack,
  Box,
  Button,
  ButtonGroup,
  Card,
  Checkbox,
  Divider,
  Icon,
  IndexTable,
  InlineStack,
  Popover,
  Scrollable,
  Tabs,
  Text,
  TextField,
  Thumbnail,
  useIndexResourceState,
} from '@shopify/polaris';
import {
  ArrowLeftIcon,
  ExportIcon,
  FilterIcon,
  ImageIcon,
  ImportIcon,
  InventoryIcon,
  PlusIcon,
  SearchIcon,
  SortIcon,
} from '@shopify/polaris-icons';
import { Product } from '@/types';
import { ProductExportModal, ProductImportModal } from './ShopifyModals';
import { downloadFile, generateCSV, generatePDF } from '@/components/export/ExportModal';
import { updateProduct } from '@/app/actions/db-actions';
import { useToast } from '@/components/notifications/ToastProvider';
import { useDashboardStore } from '@/store/dashboardStore';

interface InventoryGeneralViewProps {
  products: Product[];
  onProductClick?: (product: Product) => void;
  onImportSuccess?: () => void;
}

type BulkColumnKey =
  | 'title'
  | 'sku'
  | 'barcode'
  | 'category'
  | 'unitPrice'
  | 'costPrice'
  | 'available'
  | 'onHand'
  | 'minStock'
  | 'expirationDate';

interface BulkEditRow {
  id: string;
  title: string;
  sku: string;
  barcode: string;
  category: string;
  unitPrice: string;
  costPrice: string;
  available: string;
  onHand: string;
  minStock: string;
  expirationDate: string;
}

interface BulkColumnDefinition {
  key: BulkColumnKey;
  label: string;
  group: 'General' | 'Precios' | 'Inventario';
  inputType: 'text' | 'number' | 'date';
  minWidth: number;
  mainTableTitle?: string;
}

const INVENTORY_TABS = [
  {
    id: 'all-items',
    content: 'Todo',
    accessibilityLabel: 'Todos los productos',
    panelID: 'all-items-content',
  },
];

const BULK_COLUMN_DEFINITIONS: BulkColumnDefinition[] = [
  { key: 'title', label: 'Titulo', group: 'General', inputType: 'text', minWidth: 280, mainTableTitle: 'Producto' },
  { key: 'sku', label: 'SKU', group: 'General', inputType: 'text', minWidth: 170, mainTableTitle: 'SKU' },
  { key: 'barcode', label: 'Codigo de barras', group: 'General', inputType: 'text', minWidth: 220, mainTableTitle: 'Codigo de barras' },
  { key: 'category', label: 'Categoria', group: 'General', inputType: 'text', minWidth: 180, mainTableTitle: 'Categoria' },
  { key: 'unitPrice', label: 'Precio unitario', group: 'Precios', inputType: 'number', minWidth: 170, mainTableTitle: 'Precio unitario' },
  { key: 'costPrice', label: 'Costo por articulo', group: 'Precios', inputType: 'number', minWidth: 170, mainTableTitle: 'Costo' },
  { key: 'available', label: 'Disponible', group: 'Inventario', inputType: 'number', minWidth: 160, mainTableTitle: 'Disponible' },
  { key: 'onHand', label: 'En existencia', group: 'Inventario', inputType: 'number', minWidth: 160, mainTableTitle: 'En existencia' },
  { key: 'minStock', label: 'Stock minimo', group: 'Inventario', inputType: 'number', minWidth: 150, mainTableTitle: 'Stock minimo' },
  { key: 'expirationDate', label: 'Caducidad', group: 'Inventario', inputType: 'date', minWidth: 170, mainTableTitle: 'Caducidad' },
];

const INITIAL_VISIBLE_COLUMNS: Record<BulkColumnKey, boolean> = {
  title: true,
  sku: true,
  barcode: false,
  category: false,
  unitPrice: false,
  costPrice: false,
  available: true,
  onHand: true,
  minStock: false,
  expirationDate: false,
};

const INVENTORY_GENERAL_COLUMNS_FALLBACK = JSON.stringify(['title', 'sku', 'available', 'onHand']);

function parseInventoryGeneralColumns(serializedColumns?: string): Record<BulkColumnKey, boolean> {
  const nextColumns = { ...INITIAL_VISIBLE_COLUMNS };

  if (!serializedColumns) {
    return nextColumns;
  }

  try {
    const parsed = JSON.parse(serializedColumns);
    if (!Array.isArray(parsed)) {
      return nextColumns;
    }

    for (const value of parsed) {
      if (typeof value === 'string' && value in nextColumns) {
        nextColumns[value as BulkColumnKey] = true;
      }
    }

    return nextColumns;
  } catch {
    return nextColumns;
  }
}

function serializeInventoryGeneralColumns(columns: Record<BulkColumnKey, boolean>): string {
  const enabledColumns = BULK_COLUMN_DEFINITIONS
    .map((column) => column.key)
    .filter((key) => columns[key]);

  return JSON.stringify(enabledColumns.length > 0 ? enabledColumns : JSON.parse(INVENTORY_GENERAL_COLUMNS_FALLBACK));
}

export function InventoryGeneralView({ products, onProductClick, onImportSuccess }: InventoryGeneralViewProps) {
  const [selectedTab, setSelectedTab] = useState(0);
  const [queryValue, setQueryValue] = useState('');
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isBulkEditing, setIsBulkEditing] = useState(false);
  const [isColumnsPopoverOpen, setIsColumnsPopoverOpen] = useState(false);
  const [isSavingBulkEdit, setIsSavingBulkEdit] = useState(false);
  const [bulkRows, setBulkRows] = useState<BulkEditRow[]>([]);
  const [columnQuery, setColumnQuery] = useState('');
  const [activeCell, setActiveCell] = useState<{ rowId: string; column: BulkColumnKey } | null>(null);
  const storeConfig = useDashboardStore((state) => state.storeConfig);
  const saveStoreConfig = useDashboardStore((state) => state.saveStoreConfig);
  const [appliedVisibleColumns, setAppliedVisibleColumns] = useState<Record<BulkColumnKey, boolean>>(
    parseInventoryGeneralColumns(INVENTORY_GENERAL_COLUMNS_FALLBACK)
  );
  const [draftVisibleColumns, setDraftVisibleColumns] = useState<Record<BulkColumnKey, boolean>>(
    parseInventoryGeneralColumns(INVENTORY_GENERAL_COLUMNS_FALLBACK)
  );
  const toast = useToast();

  const handlePersistColumns = useCallback(async (nextColumns: Record<BulkColumnKey, boolean>) => {
    setAppliedVisibleColumns(nextColumns);
    try {
      await saveStoreConfig({
        inventoryGeneralColumns: serializeInventoryGeneralColumns(nextColumns),
      });
    } catch {
      toast.showError('No se pudieron guardar las columnas de inventario');
    }
  }, [saveStoreConfig, toast]);

  useEffect(() => {
    const persistedColumns = parseInventoryGeneralColumns(storeConfig.inventoryGeneralColumns);
    setAppliedVisibleColumns(persistedColumns);
    if (!isBulkEditing) {
      setDraftVisibleColumns(persistedColumns);
    }
  }, [isBulkEditing, storeConfig.inventoryGeneralColumns]);

  const filteredProducts = useMemo(() => {
    const query = queryValue.trim().toLowerCase();
    if (!query) return products;

    return products.filter((product) =>
      product.name.toLowerCase().includes(query) ||
      product.sku.toLowerCase().includes(query) ||
      product.barcode.toLowerCase().includes(query)
    );
  }, [products, queryValue]);

  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(filteredProducts);

  const selectedProducts = useMemo(
    () => filteredProducts.filter((product) => selectedResources.includes(product.id)),
    [filteredProducts, selectedResources]
  );

  const appliedColumnDefinitions = useMemo(
    () => BULK_COLUMN_DEFINITIONS.filter((column) => appliedVisibleColumns[column.key]),
    [appliedVisibleColumns]
  );

  const visibleColumnDefinitions = useMemo(
    () => BULK_COLUMN_DEFINITIONS.filter((column) => draftVisibleColumns[column.key]),
    [draftVisibleColumns]
  );

  const filteredColumnDefinitions = useMemo(() => {
    const normalizedQuery = columnQuery.trim().toLowerCase();
    if (!normalizedQuery) return BULK_COLUMN_DEFINITIONS;

    return BULK_COLUMN_DEFINITIONS.filter((column) =>
      column.label.toLowerCase().includes(normalizedQuery) ||
      column.group.toLowerCase().includes(normalizedQuery)
    );
  }, [columnQuery]);

  const groupedColumnDefinitions = useMemo(
    () => ['General', 'Precios', 'Inventario'].map((group) => ({
      group,
      columns: filteredColumnDefinitions.filter((column) => column.group === group),
    })).filter((entry) => entry.columns.length > 0),
    [filteredColumnDefinitions]
  );

  useEffect(() => {
    if (!isBulkEditing) return;

    setBulkRows(
      selectedProducts.map((product) => ({
        id: product.id,
        title: product.name,
        sku: product.sku || '',
        barcode: product.barcode || '',
        category: product.category || '',
        unitPrice: String(product.unitPrice),
        costPrice: String(product.costPrice),
        available: String(product.currentStock),
        onHand: String(product.currentStock),
        minStock: String(product.minStock),
        expirationDate: product.expirationDate || '',
      }))
    );
  }, [isBulkEditing, selectedProducts]);

  const handleBulkFieldChange = useCallback((id: string, field: BulkColumnKey, value: string) => {
    setBulkRows((currentRows) =>
      currentRows.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  }, []);

  const handleDraftColumnChange = useCallback((columnKey: BulkColumnKey, checked: boolean) => {
    setDraftVisibleColumns((current) => ({
      ...current,
      [columnKey]: checked,
    }));
  }, []);

  const handleAppliedColumnChange = useCallback((columnKey: BulkColumnKey, checked: boolean) => {
    const nextColumns = {
      ...appliedVisibleColumns,
      [columnKey]: checked,
    };
    void handlePersistColumns(nextColumns);
  }, [appliedVisibleColumns, handlePersistColumns]);

  const renderColumnsPopover = useCallback((mode: 'main' | 'bulk', activator: React.ReactElement) => {
    const selectedColumns = mode === 'bulk' ? draftVisibleColumns : appliedVisibleColumns;
    const handleChange = mode === 'bulk' ? handleDraftColumnChange : handleAppliedColumnChange;

    return (
      <Popover
        active={isColumnsPopoverOpen}
        activator={activator}
        onClose={() => setIsColumnsPopoverOpen(false)}
        preferredAlignment="right"
      >
        <Box padding="0" minWidth="260px">
          <BlockStack gap="0">
            <Box padding="300">
              <TextField
                label="Buscar campos"
                labelHidden
                autoComplete="off"
                value={columnQuery}
                onChange={setColumnQuery}
                prefix={<Icon source={SearchIcon} tone="subdued" />}
                placeholder="Buscar campos"
              />
            </Box>
            <Divider />
            <Scrollable shadow style={{ maxHeight: '420px' }}>
              <Box padding="300">
                <BlockStack gap="400">
                  {groupedColumnDefinitions.map(({ group, columns }) => (
                    <BlockStack gap="200" key={group}>
                      <Text as="p" variant="bodyMd" fontWeight="semibold">
                        {group}
                      </Text>
                      {columns.map((column) => (
                        <Checkbox
                          key={column.key}
                          label={column.label}
                          checked={selectedColumns[column.key]}
                          onChange={(checked) => handleChange(column.key, checked)}
                        />
                      ))}
                    </BlockStack>
                  ))}
                </BlockStack>
              </Box>
            </Scrollable>
          </BlockStack>
        </Box>
      </Popover>
    );
  }, [appliedVisibleColumns, columnQuery, draftVisibleColumns, groupedColumnDefinitions, handleAppliedColumnChange, handleDraftColumnChange, isColumnsPopoverOpen]);

  const handleOpenBulkEdit = useCallback(() => {
    if (selectedProducts.length === 0) {
      toast.showError('Selecciona al menos un producto para usar edicion masiva');
      return;
    }

    setDraftVisibleColumns(appliedVisibleColumns);

    setBulkRows(
      selectedProducts.map((product) => ({
        id: product.id,
        title: product.name,
        sku: product.sku || '',
        barcode: product.barcode || '',
        category: product.category || '',
        unitPrice: String(product.unitPrice),
        costPrice: String(product.costPrice),
        available: String(product.currentStock),
        onHand: String(product.currentStock),
        minStock: String(product.minStock),
        expirationDate: product.expirationDate || '',
      }))
    );
    setIsBulkEditing(true);
  }, [appliedVisibleColumns, selectedProducts, toast]);

  const handleCloseBulkEdit = useCallback(() => {
    setIsBulkEditing(false);
    setIsColumnsPopoverOpen(false);
    setColumnQuery('');
    setActiveCell(null);
    setDraftVisibleColumns(appliedVisibleColumns);
  }, [appliedVisibleColumns]);

  const handleSaveBulkEdit = useCallback(async () => {
    if (bulkRows.length === 0) {
      setIsBulkEditing(false);
      return;
    }

    setIsSavingBulkEdit(true);
    try {
      await Promise.all(
        bulkRows.map(async (row) => {
          const product = products.find((item) => item.id === row.id);
          if (!product) return;

          const parsedOnHand = Number.parseInt(row.onHand, 10);
          const parsedAvailable = Number.parseInt(row.available, 10);
          const parsedMinStock = Number.parseInt(row.minStock, 10);
          const parsedUnitPrice = Number.parseFloat(row.unitPrice);
          const parsedCostPrice = Number.parseFloat(row.costPrice);

          await updateProduct(product.id, {
            name: row.title.trim() || product.name,
            sku: row.sku.trim(),
            barcode: row.barcode.trim(),
            category: row.category.trim() || product.category,
            currentStock: Number.isNaN(parsedOnHand)
              ? Number.isNaN(parsedAvailable)
                ? product.currentStock
                : parsedAvailable
              : parsedOnHand,
            minStock: Number.isNaN(parsedMinStock) ? product.minStock : parsedMinStock,
            unitPrice: Number.isNaN(parsedUnitPrice) ? product.unitPrice : parsedUnitPrice,
            costPrice: Number.isNaN(parsedCostPrice) ? product.costPrice : parsedCostPrice,
            expirationDate: row.expirationDate.trim() || null,
          });
        })
      );

      const serializedColumns = serializeInventoryGeneralColumns(draftVisibleColumns);
      await saveStoreConfig({ inventoryGeneralColumns: serializedColumns });

      toast.showSuccess(`Se actualizaron ${bulkRows.length} producto(s)`);
      setAppliedVisibleColumns(draftVisibleColumns);
      setIsBulkEditing(false);
      onImportSuccess?.();
    } catch (error) {
      toast.showError('No se pudo guardar la edicion masiva');
    } finally {
      setIsSavingBulkEdit(false);
    }
  }, [bulkRows, draftVisibleColumns, onImportSuccess, products, saveStoreConfig, toast]);

  const promotedBulkActions = useMemo(
    () => [
      { content: 'Edicion masiva', onAction: handleOpenBulkEdit },
      { content: 'Actualizar cantidades', onAction: () => {} },
      { content: 'Crear transferencia', onAction: () => {} },
      { content: 'Crear orden de compra', onAction: () => {} },
    ],
    [handleOpenBulkEdit]
  );

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

  const bulkEditMarkup = (
    <Card padding="0">
      <BlockStack gap="0">
        <Box padding="400">
          <InlineStack align="space-between" blockAlign="center">
            <InlineStack gap="300" blockAlign="center">
              <Button icon={ArrowLeftIcon} variant="plain" onClick={handleCloseBulkEdit}>
                Volver
              </Button>
              <BlockStack gap="025">
                <Text as="h3" variant="headingMd" fontWeight="semibold">
                  Editando {bulkRows.length} producto{bulkRows.length === 1 ? '' : 's'}
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  Hoja de edicion masiva con scroll y columnas configurables.
                </Text>
              </BlockStack>
            </InlineStack>

            <InlineStack gap="200" blockAlign="center">
              {renderColumnsPopover(
                'bulk',
                <Button icon={SortIcon} onClick={() => setIsColumnsPopoverOpen((current) => !current)}>
                  Columnas
                </Button>
              )}
              <Button variant="primary" onClick={handleSaveBulkEdit} loading={isSavingBulkEdit} disabled={visibleColumnDefinitions.length === 0}>
                Guardar
              </Button>
            </InlineStack>
          </InlineStack>
        </Box>

        <Divider />

        <div
          style={{
            overflow: 'auto',
            maxHeight: 'calc(100vh - 260px)',
            background: '#fff',
          }}
        >
          <table style={{ width: '100%', minWidth: '1080px', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <thead>
              <tr style={{ background: '#f6f6f7' }}>
                {visibleColumnDefinitions.map((column) => (
                  <th
                    key={column.key}
                    style={{
                      position: 'sticky',
                      top: 0,
                      zIndex: 2,
                      textAlign: 'left',
                      padding: '10px 8px',
                      borderRight: '1px solid #e3e3e3',
                      borderBottom: '1px solid #d9d9d9',
                      minWidth: `${column.minWidth}px`,
                      background: '#f6f6f7',
                    }}
                  >
                    <Text as="span" variant="bodySm" tone="subdued">{column.label}</Text>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bulkRows.map((row) => (
                <tr key={row.id}>
                  {visibleColumnDefinitions.map((column) => {
                    const isActive = activeCell?.rowId === row.id && activeCell.column === column.key;
                    const cellStyle = {
                      padding: 0,
                      borderRight: '1px solid #e3e3e3',
                      borderBottom: '1px solid #e3e3e3',
                      background: isActive ? '#f2f7ff' : '#ffffff',
                    } as const;

                    if (column.key === 'title') {
                      const product = products.find((item) => item.id === row.id);
                      return (
                        <td key={column.key} style={cellStyle}>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              padding: '6px 8px',
                              boxShadow: isActive ? 'inset 0 0 0 2px #0a66e2' : 'none',
                            }}
                          >
                            <Thumbnail size="small" source={product?.imageUrl || ImageIcon} alt={row.title} />
                            <input
                              value={row.title}
                              onChange={(event) => handleBulkFieldChange(row.id, 'title', event.target.value)}
                              onFocus={() => setActiveCell({ rowId: row.id, column: 'title' })}
                              style={{
                                width: '100%',
                                border: 'none',
                                outline: 'none',
                                background: 'transparent',
                                fontSize: '13px',
                                color: '#303030',
                              }}
                            />
                          </div>
                        </td>
                      );
                    }

                    const inputValue = row[column.key];
                    return (
                      <td key={column.key} style={cellStyle}>
                        <div
                          style={{
                            padding: '6px 8px',
                            boxShadow: isActive ? 'inset 0 0 0 2px #0a66e2' : 'none',
                          }}
                        >
                          <input
                            value={inputValue}
                            type={column.inputType}
                            onChange={(event) => handleBulkFieldChange(row.id, column.key, event.target.value)}
                            onFocus={() => setActiveCell({ rowId: row.id, column: column.key })}
                            style={{
                              width: '100%',
                              border: 'none',
                              outline: 'none',
                              background: 'transparent',
                              fontSize: '13px',
                              color: '#303030',
                            }}
                          />
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </BlockStack>
    </Card>
  );

  return (
    <BlockStack gap="400">
      <InlineStack align="space-between" blockAlign="center">
        <InlineStack gap="200" blockAlign="center">
          <Icon source={InventoryIcon} tone="base" />
          <Text as="h2" variant="headingLg" fontWeight="bold">
            Inventario
          </Text>
        </InlineStack>

        <InlineStack gap="200">
          <Button icon={ExportIcon} onClick={() => setIsExportOpen(true)}>Exportar</Button>
          <Button icon={ImportIcon} onClick={() => setIsImportOpen(true)}>Importar</Button>
        </InlineStack>
      </InlineStack>

      {isBulkEditing ? bulkEditMarkup : (
        <Card padding="0">
          <BlockStack gap="0">
            <div style={{ padding: '8px 12px' }}>
              <InlineStack align="space-between" blockAlign="center">
                <InlineStack gap="200" blockAlign="center">
                  <Tabs tabs={INVENTORY_TABS} selected={selectedTab} onSelect={setSelectedTab} />
                  <Button icon={PlusIcon} accessibilityLabel="Crear nueva vista" variant="plain" />
                </InlineStack>

                <InlineStack gap="100" blockAlign="center">
                  <Box minWidth="360px">
                    <TextField
                      label="Buscar inventario"
                      labelHidden
                      autoComplete="off"
                      value={queryValue}
                      onChange={setQueryValue}
                      prefix={<Icon source={SearchIcon} tone="subdued" />}
                      placeholder="Buscar"
                      connectedRight={renderColumnsPopover(
                        'main',
                        <Button onClick={() => setIsColumnsPopoverOpen((current) => !current)}>
                          Columnas
                        </Button>
                      )}
                    />
                  </Box>
                  <ButtonGroup>
                    <Button icon={FilterIcon} accessibilityLabel="Filtrar inventario" />
                    <Button icon={SortIcon} accessibilityLabel="Ordenar inventario" />
                  </ButtonGroup>
                </InlineStack>
              </InlineStack>
            </div>

            <Divider />

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
          </BlockStack>
        </Card>
      )}

      <ProductExportModal
        open={isExportOpen}
        onClose={() => setIsExportOpen(false)}
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
        onClose={() => setIsImportOpen(false)}
        onImportSuccess={onImportSuccess}
      />
    </BlockStack>
  );
}