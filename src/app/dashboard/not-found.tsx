'use client';

import { Page, Banner } from '@shopify/polaris';
import Link from 'next/link';

export default function DashboardNotFound() {
  return (
    <Page title="Pagina no encontrada" fullWidth>
      <Banner tone="warning" title="404 — No encontrado">
        <p>La seccion que buscas no existe.</p>
        <Link href="/dashboard">Volver al inicio</Link>
      </Banner>
    </Page>
  );
}
