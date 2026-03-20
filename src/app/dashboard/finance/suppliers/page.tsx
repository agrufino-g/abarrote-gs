'use client';

import { Page } from '@shopify/polaris';
import { ProveedoresManager } from '@/components/suppliers/ProveedoresManager';

export default function SuppliersPage() {
  return (
    <Page fullWidth title="Proveedores">
      <ProveedoresManager />
    </Page>
  );
}
