'use client';

import { Page, Banner, Button, BlockStack } from '@shopify/polaris';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Page title="Error" fullWidth>
      <BlockStack gap="400">
        <Banner tone="critical" title="Error inesperado">
          <p>{error.message || 'Algo salio mal. Intenta de nuevo.'}</p>
        </Banner>
        <Button onClick={reset}>Reintentar</Button>
      </BlockStack>
    </Page>
  );
}
