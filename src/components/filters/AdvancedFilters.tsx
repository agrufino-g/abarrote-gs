'use client';

import { useState, useCallback } from 'react';
import {
  Card,
  Filters,
  ChoiceList,
  TextField,
  BlockStack,
  InlineStack,
  Text,
  Button,
  DatePicker,
  Popover,
  Badge,
} from '@shopify/polaris';
import { FilterIcon, CalendarIcon } from '@shopify/polaris-icons';

interface AdvancedFiltersProps {
  onFiltersChange: (filters: FilterState) => void;
}

export interface FilterState {
  search: string;
  categories: string[];
  alertTypes: string[];
  stockStatus: string[];
  dateRange: { start: Date; end: Date } | null;
}

const categoryOptions = [
  { label: 'Lácteos', value: 'lacteos' },
  { label: 'Panadería', value: 'panaderia' },
  { label: 'Carnes y Embutidos', value: 'carnes' },
  { label: 'Frutas y Verduras', value: 'frutas' },
  { label: 'Abarrotes Secos', value: 'abarrotes' },
  { label: 'Bebidas', value: 'bebidas' },
  { label: 'Limpieza', value: 'limpieza' },
  { label: 'Higiene Personal', value: 'higiene' },
];

const alertTypeOptions = [
  { label: 'Stock Bajo', value: 'low_stock' },
  { label: 'Por Vencer', value: 'expiration' },
  { label: 'Vencido', value: 'expired' },
  { label: 'Merma', value: 'merma' },
];

const stockStatusOptions = [
  { label: 'Crítico (< 25%)', value: 'critical' },
  { label: 'Bajo (25-50%)', value: 'warning' },
  { label: 'Normal (> 50%)', value: 'normal' },
];

export function AdvancedFilters({ onFiltersChange }: AdvancedFiltersProps) {
  const [search, setSearch] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [alertTypes, setAlertTypes] = useState<string[]>([]);
  const [stockStatus, setStockStatus] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date } | null>(null);
  
  const [datePickerActive, setDatePickerActive] = useState(false);
  const [{ month, year }, setDate] = useState({
    month: new Date().getMonth(),
    year: new Date().getFullYear(),
  });
  const [selectedDates, setSelectedDates] = useState<{ start: Date; end: Date }>({
    start: new Date(),
    end: new Date(),
  });

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    onFiltersChange({ search: value, categories, alertTypes, stockStatus, dateRange });
  }, [categories, alertTypes, stockStatus, dateRange, onFiltersChange]);

  const handleCategoriesChange = useCallback((value: string[]) => {
    setCategories(value);
    onFiltersChange({ search, categories: value, alertTypes, stockStatus, dateRange });
  }, [search, alertTypes, stockStatus, dateRange, onFiltersChange]);

  const handleAlertTypesChange = useCallback((value: string[]) => {
    setAlertTypes(value);
    onFiltersChange({ search, categories, alertTypes: value, stockStatus, dateRange });
  }, [search, categories, stockStatus, dateRange, onFiltersChange]);

  const handleStockStatusChange = useCallback((value: string[]) => {
    setStockStatus(value);
    onFiltersChange({ search, categories, alertTypes, stockStatus: value, dateRange });
  }, [search, categories, alertTypes, dateRange, onFiltersChange]);

  const handleDateSelection = useCallback((range: { start: Date; end: Date }) => {
    setSelectedDates(range);
    setDateRange(range);
    onFiltersChange({ search, categories, alertTypes, stockStatus, dateRange: range });
  }, [search, categories, alertTypes, stockStatus, onFiltersChange]);

  const handleClearAll = useCallback(() => {
    setSearch('');
    setCategories([]);
    setAlertTypes([]);
    setStockStatus([]);
    setDateRange(null);
    onFiltersChange({
      search: '',
      categories: [],
      alertTypes: [],
      stockStatus: [],
      dateRange: null,
    });
  }, [onFiltersChange]);

  const handleRemoveCategory = useCallback((value: string) => {
    const newCategories = categories.filter((c) => c !== value);
    setCategories(newCategories);
    onFiltersChange({ search, categories: newCategories, alertTypes, stockStatus, dateRange });
  }, [search, categories, alertTypes, stockStatus, dateRange, onFiltersChange]);

  const handleRemoveAlertType = useCallback((value: string) => {
    const newAlertTypes = alertTypes.filter((a) => a !== value);
    setAlertTypes(newAlertTypes);
    onFiltersChange({ search, categories, alertTypes: newAlertTypes, stockStatus, dateRange });
  }, [search, categories, alertTypes, stockStatus, dateRange, onFiltersChange]);

  const handleRemoveStockStatus = useCallback((value: string) => {
    const newStockStatus = stockStatus.filter((s) => s !== value);
    setStockStatus(newStockStatus);
    onFiltersChange({ search, categories, alertTypes, stockStatus: newStockStatus, dateRange });
  }, [search, categories, alertTypes, stockStatus, dateRange, onFiltersChange]);

  const appliedFiltersCount =
    categories.length + alertTypes.length + stockStatus.length + (dateRange ? 1 : 0);

  const filters = [
    {
      key: 'categories',
      label: 'Categorías',
      filter: (
        <ChoiceList
          title="Categorías"
          titleHidden
          choices={categoryOptions}
          selected={categories}
          onChange={handleCategoriesChange}
          allowMultiple
        />
      ),
      shortcut: true,
    },
    {
      key: 'alertTypes',
      label: 'Tipo de Alerta',
      filter: (
        <ChoiceList
          title="Tipo de Alerta"
          titleHidden
          choices={alertTypeOptions}
          selected={alertTypes}
          onChange={handleAlertTypesChange}
          allowMultiple
        />
      ),
      shortcut: true,
    },
    {
      key: 'stockStatus',
      label: 'Estado del Stock',
      filter: (
        <ChoiceList
          title="Estado del Stock"
          titleHidden
          choices={stockStatusOptions}
          selected={stockStatus}
          onChange={handleStockStatusChange}
          allowMultiple
        />
      ),
      shortcut: true,
    },
  ];

  const appliedFilters = [
    ...categories.map((category) => ({
      key: `category-${category}`,
      label: `Categoría: ${categoryOptions.find((c) => c.value === category)?.label}`,
      onRemove: () => handleRemoveCategory(category),
    })),
    ...alertTypes.map((alertType) => ({
      key: `alert-${alertType}`,
      label: `Alerta: ${alertTypeOptions.find((a) => a.value === alertType)?.label}`,
      onRemove: () => handleRemoveAlertType(alertType),
    })),
    ...stockStatus.map((status) => ({
      key: `stock-${status}`,
      label: `Stock: ${stockStatusOptions.find((s) => s.value === status)?.label}`,
      onRemove: () => handleRemoveStockStatus(status),
    })),
    ...(dateRange
      ? [
          {
            key: 'dateRange',
            label: `Fechas: ${dateRange.start.toLocaleDateString('es-MX')} - ${dateRange.end.toLocaleDateString('es-MX')}`,
            onRemove: () => {
              setDateRange(null);
              onFiltersChange({ search, categories, alertTypes, stockStatus, dateRange: null });
            },
          },
        ]
      : []),
  ];

  return (
    <Card>
      <BlockStack gap="400">
        <InlineStack align="space-between" blockAlign="center">
          <InlineStack gap="200" blockAlign="center">
            <Text as="h3" variant="headingMd">
              Filtros Avanzados
            </Text>
            {appliedFiltersCount > 0 && (
              <Badge tone="info">{`${appliedFiltersCount} activos`}</Badge>
            )}
          </InlineStack>
          
          <InlineStack gap="200">
            <Popover
              active={datePickerActive}
              activator={
                <Button
                  icon={CalendarIcon}
                  onClick={() => setDatePickerActive(!datePickerActive)}
                >
                  Rango de Fechas
                </Button>
              }
              onClose={() => setDatePickerActive(false)}
            >
              <div style={{ padding: '16px' }}>
                <DatePicker
                  month={month}
                  year={year}
                  onChange={handleDateSelection}
                  onMonthChange={(month, year) => setDate({ month, year })}
                  selected={selectedDates}
                  allowRange
                />
              </div>
            </Popover>
            
            {appliedFiltersCount > 0 && (
              <Button onClick={handleClearAll} variant="plain">
                Limpiar filtros
              </Button>
            )}
          </InlineStack>
        </InlineStack>

        <Filters
          queryValue={search}
          queryPlaceholder="Buscar por nombre, SKU o categoría..."
          onQueryChange={handleSearchChange}
          onQueryClear={() => handleSearchChange('')}
          filters={filters}
          appliedFilters={appliedFilters}
          onClearAll={handleClearAll}
        />
      </BlockStack>
    </Card>
  );
}
