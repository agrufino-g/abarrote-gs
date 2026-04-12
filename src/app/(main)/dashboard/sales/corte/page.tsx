'use client';

import { useState } from 'react';
import { BlockStack, InlineStack, Button, Page } from '@shopify/polaris';
import { OrderFilledIcon } from '@shopify/polaris-icons';
import { Icon } from '@shopify/polaris';
import { CorteCajaModal } from '@/components/caja/CorteCajaModal';
import { CortesHistory } from '@/components/caja/CortesHistory';

export default function CortePage() {
  const [corteModalOpen, setCorteModalOpen] = useState(false);

  const _fancyTitle = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <Icon source={OrderFilledIcon} tone="base" />
      <span>Corte de Caja</span>
    </div>
  );

  return (
    <>
      <Page fullWidth title="Corte de Caja">
        <BlockStack gap="400">
          <InlineStack align="end">
            <Button variant="primary" onClick={() => setCorteModalOpen(true)}>
              Nuevo Corte de Caja
            </Button>
          </InlineStack>
          <CortesHistory />
        </BlockStack>
      </Page>
      <CorteCajaModal open={corteModalOpen} onClose={() => setCorteModalOpen(false)} />
    </>
  );
}
