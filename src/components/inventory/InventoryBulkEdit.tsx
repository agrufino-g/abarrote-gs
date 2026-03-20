'use client';

import { useState } from 'react';
import {
  BlockStack,
  Box,
  Button,
  Card,
  Divider,
  InlineStack,
  Text,
  Thumbnail,
} from '@shopify/polaris';
import { ArrowLeftIcon, ImageIcon, SortIcon } from '@shopify/polaris-icons';
import { Product } from '@/types';
import { BulkColumnKey, BulkColumnDefinition, BulkEditRow } from './InventoryTypes';
import { InventoryColumnsPopover } from './InventoryColumnsPopover';

interface InventoryBulkEditProps {
  bulkRows: BulkEditRow[];
  products: Product[];
  visibleColumnDefinitions: BulkColumnDefinition[];
  draftVisibleColumns: Record<BulkColumnKey, boolean>;
  isSavingBulkEdit: boolean;
  isColumnsPopoverOpen: boolean;
  columnQuery: string;
  onColumnsPopoverToggle: () => void;
  onColumnsPopoverClose: () => void;
  onColumnQueryChange: (value: string) => void;
  onDraftColumnChange: (columnKey: BulkColumnKey, checked: boolean) => void;
  onBulkFieldChange: (id: string, field: BulkColumnKey, value: string) => void;
  onClose: () => void;
  onSave: () => void;
}

export function InventoryBulkEdit({
  bulkRows,
  products,
  visibleColumnDefinitions,
  draftVisibleColumns,
  isSavingBulkEdit,
  isColumnsPopoverOpen,
  columnQuery,
  onColumnsPopoverToggle,
  onColumnsPopoverClose,
  onColumnQueryChange,
  onDraftColumnChange,
  onBulkFieldChange,
  onClose,
  onSave,
}: InventoryBulkEditProps) {
  const [activeCell, setActiveCell] = useState<{ rowId: string; column: BulkColumnKey } | null>(null);

  return (
    <Card padding="0">
      <BlockStack gap="0">
        <Box padding="400">
          <InlineStack align="space-between" blockAlign="center">
            <InlineStack gap="300" blockAlign="center">
              <Button icon={ArrowLeftIcon} variant="plain" onClick={onClose}>
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
              <InventoryColumnsPopover
                active={isColumnsPopoverOpen}
                activator={
                  <Button icon={SortIcon} onClick={onColumnsPopoverToggle}>
                    Columnas
                  </Button>
                }
                onClose={onColumnsPopoverClose}
                columnQuery={columnQuery}
                onColumnQueryChange={onColumnQueryChange}
                selectedColumns={draftVisibleColumns}
                onColumnChange={onDraftColumnChange}
              />
              <Button variant="primary" onClick={onSave} loading={isSavingBulkEdit} disabled={visibleColumnDefinitions.length === 0}>
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
                              onChange={(event) => onBulkFieldChange(row.id, 'title', event.target.value)}
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
                            onChange={(event) => onBulkFieldChange(row.id, column.key, event.target.value)}
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
}
