'use client';

import { useMemo } from 'react';
import { BlockStack, Box, Checkbox, Divider, Icon, Popover, Scrollable, Text, TextField } from '@shopify/polaris';
import { SearchIcon } from '@shopify/polaris-icons';
import { BulkColumnKey, BULK_COLUMN_DEFINITIONS } from './InventoryTypes';

interface InventoryColumnsPopoverProps {
  active: boolean;
  activator: React.ReactElement;
  onClose: () => void;
  columnQuery: string;
  onColumnQueryChange: (value: string) => void;
  selectedColumns: Record<BulkColumnKey, boolean>;
  onColumnChange: (columnKey: BulkColumnKey, checked: boolean) => void;
}

export function InventoryColumnsPopover({
  active,
  activator,
  onClose,
  columnQuery,
  onColumnQueryChange,
  selectedColumns,
  onColumnChange,
}: InventoryColumnsPopoverProps) {
  const filteredColumnDefinitions = useMemo(() => {
    const normalizedQuery = columnQuery.trim().toLowerCase();
    if (!normalizedQuery) return BULK_COLUMN_DEFINITIONS;

    return BULK_COLUMN_DEFINITIONS.filter(
      (column) =>
        column.label.toLowerCase().includes(normalizedQuery) || column.group.toLowerCase().includes(normalizedQuery),
    );
  }, [columnQuery]);

  const groupedColumnDefinitions = useMemo(
    () =>
      ['General', 'Precios', 'Inventario']
        .map((group) => ({
          group,
          columns: filteredColumnDefinitions.filter((column) => column.group === group),
        }))
        .filter((entry) => entry.columns.length > 0),
    [filteredColumnDefinitions],
  );

  return (
    <Popover active={active} activator={activator} onClose={onClose} preferredAlignment="right">
      <Box padding="0" minWidth="260px">
        <BlockStack gap="0">
          <Box padding="300">
            <TextField
              label="Buscar campos"
              labelHidden
              autoComplete="off"
              value={columnQuery}
              onChange={onColumnQueryChange}
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
                        onChange={(checked) => onColumnChange(column.key, checked)}
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
}
