'use client';

import { useMemo } from 'react';
import {
  Card,
  Text,
  BlockStack,
  InlineStack,
  DataTable,
  Layout,
  Badge,
} from '@shopify/polaris';
import { useDashboardStore } from '@/store/dashboardStore';
import { formatCurrency } from '@/lib/utils';

export function ReportesView() {
  const { saleRecords, gastos, inventoryAlerts, cortesHistory, clientes } = useDashboardStore();

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todaySales = saleRecords.filter(s => s.date.startsWith(today));
    const todayGastos = gastos.filter(g => g.fecha.startsWith(today));

    const totalSalesDay = todaySales.reduce((sum, s) => sum + s.total, 0);
    const totalSalesAll = saleRecords.reduce((sum, s) => sum + s.total, 0);
    const totalGastosDay = todayGastos.reduce((sum, g) => sum + g.monto, 0);
    const totalGastosAll = gastos.reduce((sum, g) => sum + g.monto, 0);
    const totalFiado = clientes.reduce((sum, c) => sum + c.balance, 0);
    const lowStock = inventoryAlerts.filter(a => a.product.currentStock < a.product.minStock).length;
    const criticalItems = inventoryAlerts.filter(a => a.severity === 'critical').length;

    return {
      totalSalesDay,
      totalSalesAll,
      totalGastosDay,
      totalGastosAll,
      utilidadDia: totalSalesDay - totalGastosDay,
      totalTransaccionesHoy: todaySales.length,
      totalTransacciones: saleRecords.length,
      totalFiado,
      lowStock,
      criticalItems,
      totalCortes: cortesHistory.length,
      totalClientes: clientes.length,
    };
  }, [saleRecords, gastos, inventoryAlerts, cortesHistory, clientes]);

  const salesByMethod = useMemo(() => {
    const methods: Record<string, number> = { efectivo: 0, tarjeta: 0, transferencia: 0, fiado: 0 };
    saleRecords.forEach(s => { methods[s.paymentMethod] = (methods[s.paymentMethod] || 0) + s.total; });
    return [
      ['Efectivo', formatCurrency(methods.efectivo), `${saleRecords.filter(s => s.paymentMethod === 'efectivo').length}`],
      ['Tarjeta', formatCurrency(methods.tarjeta), `${saleRecords.filter(s => s.paymentMethod === 'tarjeta').length}`],
      ['Transferencia', formatCurrency(methods.transferencia), `${saleRecords.filter(s => s.paymentMethod === 'transferencia').length}`],
      ['Fiado', formatCurrency(methods.fiado), `${saleRecords.filter(s => s.paymentMethod === 'fiado').length}`],
    ];
  }, [saleRecords]);

  const gastosByCategory = useMemo(() => {
    const categories: Record<string, number> = {};
    gastos.forEach(g => {
      categories[g.categoria] = (categories[g.categoria] || 0) + g.monto;
    });
    const labels: Record<string, string> = {
      renta: 'Renta', servicios: 'Servicios', proveedores: 'Proveedores',
      salarios: 'Salarios', mantenimiento: 'Mantenimiento', impuestos: 'Impuestos', otro: 'Otros',
    };
    return Object.entries(categories).map(([cat, monto]) => [
      labels[cat] || cat, formatCurrency(monto),
    ]);
  }, [gastos]);

  const topDebtors = useMemo(() => {
    return clientes
      .filter(c => c.balance > 0)
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 5)
      .map(c => [c.name, formatCurrency(c.balance), formatCurrency(c.creditLimit)]);
  }, [clientes]);

  return (
    <BlockStack gap="400">
      <Layout>
        <Layout.Section variant="oneThird">
          <Card>
            <BlockStack gap="200">
              <Text variant="headingSm" as="h3">Ventas del Día</Text>
              <Text variant="headingLg" as="p">{formatCurrency(stats.totalSalesDay)}</Text>
              <Text variant="bodySm" tone="subdued" as="p">
                {stats.totalTransaccionesHoy} transacciones
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>
        <Layout.Section variant="oneThird">
          <Card>
            <BlockStack gap="200">
              <Text variant="headingSm" as="h3">Gastos del Día</Text>
              <Text variant="headingLg" as="p">{formatCurrency(stats.totalGastosDay)}</Text>
            </BlockStack>
          </Card>
        </Layout.Section>
        <Layout.Section variant="oneThird">
          <Card>
            <BlockStack gap="200">
              <Text variant="headingSm" as="h3">Utilidad del Día</Text>
              <Text variant="headingLg" as="p">{formatCurrency(stats.utilidadDia)}</Text>
              <Badge tone={stats.utilidadDia >= 0 ? 'success' : 'critical'}>
                {stats.utilidadDia >= 0 ? 'Ganancia' : 'Pérdida'}
              </Badge>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>

      <Layout>
        <Layout.Section variant="oneThird">
          <Card>
            <BlockStack gap="200">
              <Text variant="headingSm" as="h3">Ventas Totales</Text>
              <Text variant="headingLg" as="p">{formatCurrency(stats.totalSalesAll)}</Text>
              <Text variant="bodySm" tone="subdued" as="p">
                {stats.totalTransacciones} transacciones
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>
        <Layout.Section variant="oneThird">
          <Card>
            <BlockStack gap="200">
              <Text variant="headingSm" as="h3">Deuda por Fiado</Text>
              <Text variant="headingLg" as="p">{formatCurrency(stats.totalFiado)}</Text>
              <Text variant="bodySm" tone="subdued" as="p">
                {stats.totalClientes} clientes
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>
        <Layout.Section variant="oneThird">
          <Card>
            <BlockStack gap="200">
              <Text variant="headingSm" as="h3">Inventario</Text>
              <InlineStack gap="200">
                <Badge tone="warning">{`${stats.lowStock} stock bajo`}</Badge>
                <Badge tone="critical">{`${stats.criticalItems} críticos`}</Badge>
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>

      <Layout>
        <Layout.Section variant="oneHalf">
          <Card>
            <BlockStack gap="300">
              <Text variant="headingSm" as="h3">Ventas por Método de Pago</Text>
              {saleRecords.length > 0 ? (
                <DataTable
                  columnContentTypes={['text', 'numeric', 'numeric']}
                  headings={['Método', 'Total', 'Operaciones']}
                  rows={salesByMethod}
                />
              ) : (
                <Text variant="bodySm" tone="subdued" as="p">Sin ventas registradas</Text>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
        <Layout.Section variant="oneHalf">
          <Card>
            <BlockStack gap="300">
              <Text variant="headingSm" as="h3">Gastos por Categoría</Text>
              {gastosByCategory.length > 0 ? (
                <DataTable
                  columnContentTypes={['text', 'numeric']}
                  headings={['Categoría', 'Total']}
                  rows={gastosByCategory}
                />
              ) : (
                <Text variant="bodySm" tone="subdued" as="p">Sin gastos registrados</Text>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>

      {topDebtors.length > 0 && (
        <Card>
          <BlockStack gap="300">
            <Text variant="headingSm" as="h3">Principales Deudores</Text>
            <DataTable
              columnContentTypes={['text', 'numeric', 'numeric']}
              headings={['Cliente', 'Deuda', 'Límite']}
              rows={topDebtors}
            />
          </BlockStack>
        </Card>
      )}
    </BlockStack>
  );
}
