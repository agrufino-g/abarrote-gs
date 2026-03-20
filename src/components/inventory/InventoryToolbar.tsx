'use client';

import { useState } from 'react';
import {
  Button,
  Divider,
  Icon,
  Tabs,
} from '@shopify/polaris';
import {
  FilterIcon,
  LayoutColumns3Icon,
  PlusIcon,
  SearchIcon,
  SortIcon,
} from '@shopify/polaris-icons';
import { BulkColumnKey, INVENTORY_TABS } from './InventoryTypes';
import { InventoryColumnsPopover } from './InventoryColumnsPopover';

interface InventoryToolbarProps {
  selectedTab: number;
  onTabSelect: (index: number) => void;
  isColumnsPopoverOpen: boolean;
  onColumnsPopoverToggle: () => void;
  onColumnsPopoverClose: () => void;
  columnQuery: string;
  onColumnQueryChange: (value: string) => void;
  appliedVisibleColumns: Record<BulkColumnKey, boolean>;
  onAppliedColumnChange: (columnKey: BulkColumnKey, checked: boolean) => void;
}

export function InventoryToolbar({
  selectedTab,
  onTabSelect,
  isColumnsPopoverOpen,
  onColumnsPopoverToggle,
  onColumnsPopoverClose,
  columnQuery,
  onColumnQueryChange,
  appliedVisibleColumns,
  onAppliedColumnChange,
}: InventoryToolbarProps) {
  return (
    <div style={{ 
      padding: '8px 12px', 
      borderBottom: '1px solid #ebebeb',
      backgroundColor: '#f9fafb',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: '100%',
    }}>
      {/* Lado izquierdo: Tabs + boton agregar vista */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0' }}>
        <Tabs tabs={INVENTORY_TABS} selected={selectedTab} onSelect={onTabSelect} />
        <div style={{ borderLeft: '1px solid #d1d1d1', height: '20px', margin: '0 8px' }} />
        <Button icon={PlusIcon} variant="plain" accessibilityLabel="Mas vistas" />
      </div>

      {/* Lado derecho: Search/Filter, Columnas, Sort */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          padding: '4px 8px',
          border: '1px solid #dcdfe3',
          borderRadius: '8px',
          cursor: 'pointer',
          backgroundColor: 'white',
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
        }} onClick={() => {}}>
          <Icon source={SearchIcon} tone="base" />
          <div style={{ width: '1px', height: '14px', backgroundColor: '#e1e3e5' }} />
          <Icon source={FilterIcon} tone="base" />
        </div>

        <InventoryColumnsPopover
          active={isColumnsPopoverOpen}
          activator={
            <Button 
              icon={LayoutColumns3Icon} 
              onClick={onColumnsPopoverToggle}
            />
          }
          onClose={onColumnsPopoverClose}
          columnQuery={columnQuery}
          onColumnQueryChange={onColumnQueryChange}
          selectedColumns={appliedVisibleColumns}
          onColumnChange={onAppliedColumnChange}
        />

        <Button icon={SortIcon} onClick={() => {}} />
      </div>
    </div>
  );
}
