'use client';

import { useEffect, useState, useCallback } from 'react';
import { Frame, Loading, Page, Banner, Button, SkeletonPage, Layout, SkeletonBodyText } from '@shopify/polaris';
import { useDashboardStore } from '@/store/dashboardStore';
import { SidebarNav } from '@/components/navigation/SidebarNav';
import { CustomTopBar } from '@/components/navigation/CustomTopBar';
import { UserMenu } from '@/components/auth/UserMenu';
import { useRequireAuth } from '@/lib/auth/useRequireAuth';
import { useRouter } from 'next/navigation';
import { Product } from '@/types';
import { ProductDetailModal } from '@/components/modals/ProductDetailModal';
import { sectionToPath } from '@/lib/navigation';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useRequireAuth();
  const router = useRouter();

  const isLoading = useDashboardStore((s) => s.isLoading);
  const error = useDashboardStore((s) => s.error);
  const fetchDashboardData = useDashboardStore((s) => s.fetchDashboardData);
  const kpiData = useDashboardStore((s) => s.kpiData);
  const inventoryAlerts = useDashboardStore((s) => s.inventoryAlerts);

  const [mobileNavActive, setMobileNavActive] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isProductDetailActive, setIsProductDetailActive] = useState(false);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user, fetchDashboardData]);

  const toggleMobileNav = useCallback(() => {
    setMobileNavActive((prev) => !prev);
  }, []);

  const handleSectionSelect = useCallback((section: string) => {
    router.push(sectionToPath(section));
    setMobileNavActive(false);
  }, [router]);

  const handleProductClick = useCallback((product: Product) => {
    setSelectedProduct(product);
    setIsProductDetailActive(true);
  }, []);

  const criticalAlerts = inventoryAlerts.filter(
    (alert) => alert.severity === 'critical'
  );

  if (authLoading || !user) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <p>Cargando...</p>
      </div>
    );
  }

  const topBarMarkup = (
    <CustomTopBar
      userMenu={<UserMenu />}
      onNavigationToggle={toggleMobileNav}
      onSectionSelect={handleSectionSelect}
      onProductClick={(product) => {
        setSelectedProduct(product);
        setIsProductDetailActive(true);
      }}
    />
  );

  const navigationMarkup = (
    <SidebarNav
      onSelect={handleSectionSelect}
      badges={{
        lowStock: kpiData?.lowStockProducts,
        notifications: criticalAlerts.length,
      }}
    />
  );

  return (
    <>
      <Frame
        topBar={topBarMarkup}
        navigation={navigationMarkup}
        showMobileNavigation={mobileNavActive}
        onNavigationDismiss={toggleMobileNav}
      >
        {isLoading && <Loading />}
        {error ? (
          <Page title="Error" fullWidth>
            <Banner tone="critical" title="Error">
              <p>{error}</p>
              <Button onClick={fetchDashboardData}>Reintentar</Button>
            </Banner>
          </Page>
        ) : isLoading ? (
          <SkeletonPage title="Dashboard" fullWidth>
            <Layout>
              <Layout.Section>
                <SkeletonBodyText lines={10} />
              </Layout.Section>
            </Layout>
          </SkeletonPage>
        ) : (
          children
        )}

        {isProductDetailActive && selectedProduct && (
          <ProductDetailModal
            product={selectedProduct}
            open={true}
            isInline={false}
            onClose={() => {
              setIsProductDetailActive(false);
              setSelectedProduct(null);
            }}
            onSave={async () => {
              setIsProductDetailActive(false);
              setSelectedProduct(null);
            }}
          />
        )}
      </Frame>
    </>
  );
}
