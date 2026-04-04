'use client';

import { Page } from '@shopify/polaris';
import { RolesManager } from '@/components/roles/RolesManager';

export default function RolesPage() {
  return (
    <Page fullWidth title="Usuarios y Accesos">
      <RolesManager />
    </Page>
  );
}
