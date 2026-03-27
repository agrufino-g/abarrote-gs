'use client';

import { useState } from 'react';
import { Page, Layout, Tabs } from '@shopify/polaris';
import { ABCAnalysisView } from '@/components/analytics/ABCAnalysisView';
import { SmartReorderView } from '@/components/analytics/SmartReorderView';
import { RFMAnalysisView } from '@/components/analytics/RFMAnalysisView';
import { DemandForecastView } from '@/components/analytics/DemandForecastView';

const TABS = [
  { id: 'abc', content: 'ABC Inventario', panelID: 'abc-panel' },
  { id: 'reorder', content: 'Reorden Inteligente', panelID: 'reorder-panel' },
  { id: 'rfm', content: 'Segmentación Clientes', panelID: 'rfm-panel' },
  { id: 'forecast', content: 'Pronóstico Demanda', panelID: 'forecast-panel' },
];

export default function AdvancedAnalyticsPage() {
  const [selected, setSelected] = useState(0);

  return (
    <Page
      title="Analítica Avanzada"
      subtitle="Clasificación ABC, reorden inteligente, segmentación RFM y pronóstico de demanda"
      backAction={{ content: 'Analytics', url: '/dashboard/analytics' }}
    >
      <Layout>
        <Layout.Section>
          <Tabs tabs={TABS} selected={selected} onSelect={setSelected}>
            {selected === 0 && <ABCAnalysisView />}
            {selected === 1 && <SmartReorderView />}
            {selected === 2 && <RFMAnalysisView />}
            {selected === 3 && <DemandForecastView />}
          </Tabs>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
