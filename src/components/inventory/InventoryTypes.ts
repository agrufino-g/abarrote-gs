export type BulkColumnKey =
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

export interface BulkEditRow {
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

export interface BulkColumnDefinition {
  key: BulkColumnKey;
  label: string;
  group: 'General' | 'Precios' | 'Inventario';
  inputType: 'text' | 'number' | 'date';
  minWidth: number;
  mainTableTitle?: string;
}

export const INVENTORY_TABS = [
  {
    id: 'all-items',
    content: 'Todo',
    accessibilityLabel: 'Todos los productos',
    panelID: 'all-items-content',
  },
];

export const BULK_COLUMN_DEFINITIONS: BulkColumnDefinition[] = [
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

export const INITIAL_VISIBLE_COLUMNS: Record<BulkColumnKey, boolean> = {
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

export const INVENTORY_GENERAL_COLUMNS_FALLBACK = JSON.stringify(['title', 'sku', 'available', 'onHand']);

export function parseInventoryGeneralColumns(serializedColumns?: string): Record<BulkColumnKey, boolean> {
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

export function serializeInventoryGeneralColumns(columns: Record<BulkColumnKey, boolean>): string {
  const enabledColumns = BULK_COLUMN_DEFINITIONS
    .map((column) => column.key)
    .filter((key) => columns[key]);

  return JSON.stringify(enabledColumns.length > 0 ? enabledColumns : JSON.parse(INVENTORY_GENERAL_COLUMNS_FALLBACK));
}
