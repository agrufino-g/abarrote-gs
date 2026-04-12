'use client';

import { useState } from 'react';
import { Page, Layout, Tabs } from '@shopify/polaris';
import { ABCAnalysisView } from '@/components/analytics/ABCAnalysisView';
import { SmartReorderView } from '@/components/analytics/SmartReorderView';
import { RFMAnalysisView } from '@/components/analytics/RFMAnalysisView';
import { DemandForecastView } from '@/components/analytics/DemandForecastView';
import { InventoryAgingView } from '@/components/analytics/InventoryAgingView';
import { ProductMarginsView } from '@/components/analytics/ProductMarginsView';

const TABS = [
  { id: 'abc', content: 'ABC Inventario', panelID: 'abc-panel' },
  { id: 'reorder', content: 'Reorden Inteligente', panelID: 'reorder-panel' },
  { id: 'rfm', content: 'Segmentación Clientes', panelID: 'rfm-panel' },
  { id: 'forecast', content: 'Pronóstico Demanda', panelID: 'forecast-panel' },
  { id: 'aging', content: 'Aging Inventario', panelID: 'aging-panel' },
  { id: 'margins', content: 'Márgenes Producto', panelID: 'margins-panel' },
];

export default function AdvancedAnalyticsPage() {
  const [selected, setSelected] = useState(0);

  return (
    <Page
      title="Analítica Avanzada"
      subtitle="Clasificación ABC, reorden inteligente, segmentación RFM, pronóstico, aging y márgenes"
      backAction={{ content: 'Analytics', url: '/dashboard/analytics' }}
    >
      <Layout>
        <Layout.Section>
          <Tabs tabs={TABS} selected={selected} onSelect={setSelected}>
            {selected === 0 && <ABCAnalysisView />}
            {selected === 1 && <SmartReorderView />}
            {selected === 2 && <RFMAnalysisView />}
            {selected === 3 && <DemandForecastView />}
            {selected === 4 && <InventoryAgingView />}
            {selected === 5 && <ProductMarginsView />}
          </Tabs>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
