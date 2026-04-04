'use client';

import { SkeletonPage, Layout, SkeletonBodyText, SkeletonDisplayText, BlockStack } from '@shopify/polaris';

export default function DashboardLoading() {
  return (
    <SkeletonPage title="Cargando..." fullWidth>
      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            <SkeletonDisplayText size="medium" />
            <SkeletonBodyText lines={6} />
            <SkeletonBodyText lines={4} />
          </BlockStack>
        </Layout.Section>
      </Layout>
    </SkeletonPage>
  );
}
