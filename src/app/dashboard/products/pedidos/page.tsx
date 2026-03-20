'use client';

import { useState } from 'react';
import { Page } from '@shopify/polaris';
import { OrderIcon } from '@shopify/polaris-icons';
import { PedidosManager } from '@/components/pedidos/PedidosManager';
import { CrearOrdenDeCompra } from '@/components/pedidos/CrearOrdenDeCompra';

export default function PedidosPage() {
  const [view, setView] = useState<'list' | 'create'>('list');

  if (view === 'create') {
    return <CrearOrdenDeCompra onBack={() => setView('list')} />;
  }

  return (
    <Page
      fullWidth
      title="Órdenes de compra"
      titleMetadata={<OrderIcon />}
      primaryAction={{
        content: 'Crear orden de compra',
        onAction: () => setView('create'),
      }}
    >
      <PedidosManager onCreateOrder={() => setView('create')} />
    </Page>
  );
}
