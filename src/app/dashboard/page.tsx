'use client';

import { useCallback, useState } from 'react';
import {
  Page,
  Layout,
  InlineStack,
  Button,
  BlockStack,
} from '@shopify/polaris';
import {
  MoneyIcon,
  InventoryIcon,
  CalendarIcon,
  CartIcon,
  ExportIcon,
  RefreshIcon,
  HomeFilledIcon,
} from '@shopify/polaris-icons';
import { Icon } from '@shopify/polaris';
import { useDashboardStore } from '@/store/dashboardStore';
import { KPICard } from '@/components/kpi/KPICard';
import { SalesChart } from '@/components/charts/SalesChart';
import { HourlySalesChart } from '@/components/charts/HourlySalesChart';
import { InventoryTable } from '@/components/inventory/InventoryTable';
import { QuickActions } from '@/components/actions/QuickActions';
import { TopProducts } from '@/components/metrics/TopProducts';
import { ExportModal, exportDashboardData } from '@/components/export/ExportModal';
import { Product } from '@/types';

export default function DashboardOverviewPage() {
  const kpiData = useDashboardStore((s) => s.kpiData);
  const inventoryAlerts = useDashboardStore((s) => s.inventoryAlerts);
  const salesData = useDashboardStore((s) => s.salesData);
  const fetchDashboardData = useDashboardStore((s) => s.fetchDashboardData);

  const [exportModalOpen, setExportModalOpen] = useState(false);

  const handleProductClick = useCallback((product: Product) => {
    // TODO: integrate with layout's product detail modal via context or URL
  }, []);

  const handleExport = useCallback((options: Parameters<typeof exportDashboardData>[0]) => {
    const exportData = {
      inventory: inventoryAlerts.map(a => a.product),
      lowStock: inventoryAlerts.filter(a => a.alertType === 'low_stock').map(a => a.product),
      expiring: inventoryAlerts.filter(a => a.alertType === 'expiration').map(a => a.product),
      dailySales: salesData,
    };
    exportDashboardData(options, exportData);
  }, [inventoryAlerts, salesData]);

  const fancyTitle = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <Icon source={HomeFilledIcon} tone="base" />
      <span>Inicio</span>
    </div>
  );

  return (
    <>
      <Page
        fullWidth
        title={fancyTitle as any}
        secondaryActions={[
          { content: 'Actualizar', icon: RefreshIcon, onAction: fetchDashboardData },
          { content: 'Exportar', icon: ExportIcon, onAction: () => setExportModalOpen(true) },
        ]}
      >
        <Layout>
          <Layout.Section>
            <InlineStack gap="400" wrap={true}>
              <div style={{ flex: '1 1 240px' }}>
                <KPICard title="Ventas Hoy" value={kpiData?.dailySales || 0} type="currency" icon={<MoneyIcon />} />
              </div>
              <div style={{ flex: '1 1 240px' }}>
                <KPICard title="Stock Bajo" value={kpiData?.lowStockProducts || 0} type="number" icon={<InventoryIcon />} />
              </div>
              <div style={{ flex: '1 1 240px' }}>
                <KPICard title="Por Vencer" value={kpiData?.expiringProducts || 0} type="number" icon={<CalendarIcon />} />
              </div>
              <div style={{ flex: '1 1 240px' }}>
                <KPICard title="Tasa Merma" value={kpiData?.mermaRate || 0} type="percentage" icon={<CartIcon />} />
              </div>
            </InlineStack>
          </Layout.Section>
          <Layout.Section>
            <BlockStack gap="400">
              <QuickActions />
              <Layout>
                <Layout.Section variant="oneHalf">
                  <SalesChart data={salesData} />
                </Layout.Section>
                <Layout.Section variant="oneHalf">
                  <HourlySalesChart />
                </Layout.Section>
              </Layout>
              <Layout>
                <Layout.Section variant="oneHalf">
                  <InventoryTable alerts={inventoryAlerts} onProductClick={handleProductClick} />
                </Layout.Section>
                <Layout.Section variant="oneHalf">
                  <TopProducts />
                </Layout.Section>
              </Layout>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </Page>
      <ExportModal open={exportModalOpen} onClose={() => setExportModalOpen(false)} onExport={handleExport} />
    </>
  );
}
