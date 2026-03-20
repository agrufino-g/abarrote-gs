'use client';

import {
  Card,
  Text,
  BlockStack,
  InlineStack,
  DataTable,
  Divider,
} from '@shopify/polaris';
import { formatCurrency } from '@/lib/utils';
import type { FlujoMensualItem } from '@/hooks/useFinancialReports';

interface CashFlowCardProps {
  flujoMensual: FlujoMensualItem[];
  maxFlujo: number;
}

export function CashFlowCard({ flujoMensual, maxFlujo }: CashFlowCardProps) {
  return (
    <Card>
      <BlockStack gap="300">
        <InlineStack align="space-between">
          <Text variant="headingMd" as="h3">Flujo de Efectivo — Últimos 6 Meses</Text>
          <InlineStack gap="300">
            <InlineStack gap="100" blockAlign="center">
              <div style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: '#008060' }} />
              <Text variant="bodySm" tone="subdued" as="span">Ingresos</Text>
            </InlineStack>
            <InlineStack gap="100" blockAlign="center">
              <div style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: '#d82c0d' }} />
              <Text variant="bodySm" tone="subdued" as="span">Egresos</Text>
            </InlineStack>
            <InlineStack gap="100" blockAlign="center">
              <div style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: '#005bd3' }} />
              <Text variant="bodySm" tone="subdued" as="span">Utilidad</Text>
            </InlineStack>
          </InlineStack>
        </InlineStack>
        <Divider />
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', minHeight: 160, paddingBottom: 8 }}>
          {flujoMensual.map((m) => (
            <div key={m.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 120 }}>
                {/* Ingresos */}
                <div
                  title={`Ingresos: ${formatCurrency(m.ingresos)}`}
                  style={{
                    width: 16,
                    height: `${maxFlujo > 0 ? Math.max(2, (m.ingresos / maxFlujo) * 120) : 2}px`,
                    backgroundColor: '#008060',
                    borderRadius: '2px 2px 0 0',
                    cursor: 'default',
                  }}
                />
                {/* Egresos */}
                <div
                  title={`Egresos: ${formatCurrency(m.egresos)}`}
                  style={{
                    width: 16,
                    height: `${maxFlujo > 0 ? Math.max(2, (m.egresos / maxFlujo) * 120) : 2}px`,
                    backgroundColor: '#d82c0d',
                    borderRadius: '2px 2px 0 0',
                    cursor: 'default',
                  }}
                />
                {/* Utilidad */}
                <div
                  title={`Utilidad: ${formatCurrency(m.utilidad)}`}
                  style={{
                    width: 16,
                    height: `${maxFlujo > 0 ? Math.max(2, (Math.abs(m.utilidad) / maxFlujo) * 120) : 2}px`,
                    backgroundColor: m.utilidad >= 0 ? '#005bd3' : '#f49342',
                    borderRadius: '2px 2px 0 0',
                    cursor: 'default',
                  }}
                />
              </div>
              <Text variant="bodySm" tone="subdued" as="span">{m.label}</Text>
            </div>
          ))}
        </div>
        {/* Tabla resumen del flujo */}
        <DataTable
          columnContentTypes={['text', 'numeric', 'numeric', 'numeric']}
          headings={['Mes', 'Ingresos', 'Egresos', 'Utilidad']}
          rows={flujoMensual.map(m => [
            m.label,
            formatCurrency(m.ingresos),
            formatCurrency(m.egresos),
            <Text
              key={m.label}
              as="span"
              variant="bodySm"
              tone={m.utilidad >= 0 ? 'success' : 'critical'}
            >
              {formatCurrency(m.utilidad)}
            </Text>,
          ])}
          totalsName={{ singular: 'Total', plural: 'Total' }}
        />
      </BlockStack>
    </Card>
  );
}
