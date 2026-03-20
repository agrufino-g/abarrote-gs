'use client';

import { Page, Banner } from '@shopify/polaris';
import Link from 'next/link';

export default function NotFound() {
  return (
    <Page title="Pagina no encontrada" fullWidth>
      <Banner tone="warning" title="404 — No encontrado">
        <p>La pagina que buscas no existe.</p>
        <Link href="/dashboard">Ir al Dashboard</Link>
      </Banner>
    </Page>
  );
}
