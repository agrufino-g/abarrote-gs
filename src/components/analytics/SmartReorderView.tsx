'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  BlockStack,
  InlineStack,
  Text,
  Badge,
  Button,
  IndexTable,
  Spinner,
  Box,
  InlineGrid,
  Banner,
} from '@shopify/polaris';
import { OrderIcon } from '@shopify/polaris-icons';
import { fetchReorderSuggestions, createAutoReorderPedido } from '@/app/actions/analytics-advanced-actions';
import { formatCurrency } from '@/lib/utils';
import type { ReorderSuggestion } from '@/types';

export function SmartReorderView() {
  const [suggestions, setSuggestions] = useState<ReorderSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchReorderSuggestions();
      setSuggestions(result);
    } catch (err) {
      console.error('Reorder suggestions error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleAutoOrder = async (supplierName: string) => {
    setCreating(supplierName);
    try {
      const result = await createAutoReorderPedido(supplierName);
      setToast(`Pedido creado con ${result.itemCount} productos para ${supplierName}`);
      setTimeout(() => setToast(null), 4000);
    } catch (err) {
      console.error('Auto reorder error:', err);
    } finally {
      setCreating(null);
    }
  };

  // Group by supplier
  const suppliers = new Map<string, ReorderSuggestion[]>();
  for (const s of suggestions) {
    const key = s.supplier ?? 'Sin proveedor';
    if (!suppliers.has(key)) suppliers.set(key, []);
    suppliers.get(key)!.push(s);
  }

  const urgencyTone = (u: string) => (u === 'critical' ? 'critical' : u === 'warning' ? 'warning' : 'info');

  const urgencyLabel = (u: string) => (u === 'critical' ? 'Urgente' : u === 'warning' ? 'Pronto' : 'Normal');

  const totalCost = suggestions.reduce((s, r) => s + r.estimatedCost, 0);

  return (
    <BlockStack gap="400">
      {toast && (
        <Banner tone="success" onDismiss={() => setToast(null)}>
          {toast}
        </Banner>
      )}

      {/* Summary */}
      <InlineGrid columns={3} gap="400">
        <Card>
          <BlockStack gap="100">
            <Text variant="bodySm" as="p" tone="subdued">
              Productos por reordenar
            </Text>
            <Text variant="headingLg" as="p">
              {suggestions.length}
            </Text>
          </BlockStack>
        </Card>
        <Card>
          <BlockStack gap="100">
            <Text variant="bodySm" as="p" tone="subdued">
              Costo estimado total
            </Text>
            <Text variant="headingLg" as="p">
              {formatCurrency(totalCost)}
            </Text>
          </BlockStack>
        </Card>
        <Card>
          <BlockStack gap="100">
            <Text variant="bodySm" as="p" tone="subdued">
              Urgentes
            </Text>
            <Text variant="headingLg" as="p" tone="critical">
              {suggestions.filter((s) => s.urgency === 'critical').length}
            </Text>
          </BlockStack>
        </Card>
      </InlineGrid>

      {/* Per supplier sections */}
      {loading && suggestions.length === 0 ? (
        <Card>
          <Box padding="800">
            <InlineStack align="center">
              <Spinner />
            </InlineStack>
          </Box>
        </Card>
      ) : (
        Array.from(suppliers.entries()).map(([supplier, items]) => {
          const supplierCost = items.reduce((s, r) => s + r.estimatedCost, 0);
          return (
            <Card key={supplier}>
              <BlockStack gap="300">
                <InlineStack align="space-between">
                  <BlockStack gap="100">
                    <Text variant="headingMd" as="h3">
                      {supplier}
                    </Text>
                    <Text variant="bodySm" as="p" tone="subdued">
                      {items.length} productos — Costo est.: {formatCurrency(supplierCost)}
                    </Text>
                  </BlockStack>
                  {supplier !== 'Sin proveedor' && (
                    <Button
                      icon={OrderIcon}
                      variant="primary"
                      loading={creating === supplier}
                      onClick={() => handleAutoOrder(supplier)}
                    >
                      Generar pedido
                    </Button>
                  )}
                </InlineStack>

                <IndexTable
                  resourceName={{ singular: 'producto', plural: 'productos' }}
                  itemCount={items.length}
                  selectable={false}
                  headings={[
                    { title: 'Producto' },
                    { title: 'Stock', alignment: 'end' },
                    { title: 'Mín.', alignment: 'end' },
                    { title: 'Venta/día', alignment: 'end' },
                    { title: 'Días restantes', alignment: 'end' },
                    { title: 'Pedir', alignment: 'end' },
                    { title: 'Costo est.', alignment: 'end' },
                    { title: 'Urgencia' },
                  ]}
                >
                  {items.map((item, i) => (
                    <IndexTable.Row id={item.productId} key={item.productId} position={i}>
                      <IndexTable.Cell>
                        <Text variant="bodyMd" as="span" fontWeight="semibold">
                          {item.productName}
                        </Text>
                      </IndexTable.Cell>
                      <IndexTable.Cell>
                        <Text as="span" alignment="end" tone={item.currentStock === 0 ? 'critical' : undefined}>
                          {item.currentStock}
                        </Text>
                      </IndexTable.Cell>
                      <IndexTable.Cell>
                        <Text as="span" alignment="end">
                          {item.minStock}
                        </Text>
                      </IndexTable.Cell>
                      <IndexTable.Cell>
                        <Text as="span" alignment="end">
                          {item.avgDailySales}
                        </Text>
                      </IndexTable.Cell>
                      <IndexTable.Cell>
                        <Text as="span" alignment="end" tone={item.daysUntilStockout <= 3 ? 'critical' : undefined}>
                          {item.daysUntilStockout === 999 ? '—' : `${item.daysUntilStockout}d`}
                        </Text>
                      </IndexTable.Cell>
                      <IndexTable.Cell>
                        <Text as="span" alignment="end" fontWeight="bold">
                          {item.suggestedQuantity}
                        </Text>
                      </IndexTable.Cell>
                      <IndexTable.Cell>
                        <Text as="span" alignment="end">
                          {formatCurrency(item.estimatedCost)}
                        </Text>
                      </IndexTable.Cell>
                      <IndexTable.Cell>
                        <Badge tone={urgencyTone(item.urgency)}>{urgencyLabel(item.urgency)}</Badge>
                      </IndexTable.Cell>
                    </IndexTable.Row>
                  ))}
                </IndexTable>
              </BlockStack>
            </Card>
          );
        })
      )}

      {!loading && suggestions.length === 0 && (
        <Banner tone="success">Todos los productos están bien abastecidos. No hay sugerencias de reorden.</Banner>
      )}
    </BlockStack>
  );
}
