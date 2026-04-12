'use client';

import { Page, Banner, Button, BlockStack } from '@shopify/polaris';

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Page title="Error" fullWidth>
      <BlockStack gap="400">
        <Banner tone="critical" title="Ocurrio un error">
          <p>{error.message || 'Algo salio mal al cargar esta seccion.'}</p>
        </Banner>
        <Button onClick={reset}>Reintentar</Button>
      </BlockStack>
    </Page>
  );
}
