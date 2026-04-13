'use client';

import { useCallback } from 'react';
import { Page } from '@shopify/polaris';
import { useDashboardStore } from '@/store/dashboardStore';
import { NotificationsCenter } from '@/components/notifications/NotificationsCenter';
import { useRouter } from 'next/navigation';
import { Product } from '@/types';

export default function NotificationsPage() {
  const inventoryAlerts = useDashboardStore((s) => s.inventoryAlerts);
  const storeConfig = useDashboardStore((s) => s.storeConfig);
  const router = useRouter();

  const handleProductClick = useCallback((product: Product) => {
    useDashboardStore.getState().openProductDetail(product);
  }, []);

  return (
    <Page
      fullWidth
      title="Alertas y Notificaciones"
      subtitle="Monitoreo centralizado de inventario · Canal sugerido: Telegram"
    >
      <NotificationsCenter
        alerts={inventoryAlerts}
        storeConfig={storeConfig}
        onProductClick={handleProductClick}
        onOpenSettings={() => router.push('/dashboard/settings')}
      />
    </Page>
  );
}
