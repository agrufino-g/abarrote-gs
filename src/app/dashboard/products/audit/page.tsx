'use client';

import { Page } from '@shopify/polaris';
import { InventoryAuditView } from '@/components/inventory/InventoryAuditView';

export default function AuditPage() {
  return (
    <Page fullWidth title="Auditorías de Inventario">
      <InventoryAuditView />
    </Page>
  );
}
