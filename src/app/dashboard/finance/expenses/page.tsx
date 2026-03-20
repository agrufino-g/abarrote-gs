'use client';

import { Page } from '@shopify/polaris';
import { GastosManager } from '@/components/gastos/GastosManager';

export default function ExpensesPage() {
  return (
    <Page fullWidth title="Gastos">
      <GastosManager />
    </Page>
  );
}
