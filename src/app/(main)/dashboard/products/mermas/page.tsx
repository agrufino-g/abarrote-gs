'use client';

import { Page } from '@shopify/polaris';
import { MermasManager } from '@/components/inventory/MermasManager';

export default function MermasPage() {
  return (
    <Page fullWidth title="Mermas (Pérdidas y Daños)">
      <MermasManager />
    </Page>
  );
}
