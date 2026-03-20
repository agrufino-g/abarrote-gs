'use client';

import {
  Card,
  BlockStack,
  Text,
  IndexTable,
  Badge,
} from '@shopify/polaris';
import { useDashboardStore } from '@/store/dashboardStore';
import { formatCurrency } from '@/lib/utils';

export function CortesHistory() {
  const cortesHistory = useDashboardStore((s) => s.cortesHistory);

  if (cortesHistory.length === 0) {
    return null;
  }

  return (
    <Card>
      <BlockStack gap="300">
        <Text as="h2" variant="headingMd">Historial de Cortes</Text>
        <IndexTable
          resourceName={{ singular: 'corte', plural: 'cortes' }}
          itemCount={cortesHistory.length}
          headings={[
            { title: 'Fecha' },
            { title: 'Cajero' },
            { title: 'Total Ventas' },
            { title: 'Esperado' },
            { title: 'Contado' },
            { title: 'Diferencia' },
          ]}
          selectable={false}
        >
          {[...cortesHistory].reverse().map((c, idx) => (
            <IndexTable.Row id={c.id} key={c.id} position={idx}>
              <IndexTable.Cell>
                <Text as="span" variant="bodySm">{new Date(c.fecha).toLocaleDateString('es-MX')}</Text>
              </IndexTable.Cell>
              <IndexTable.Cell>{c.cajero}</IndexTable.Cell>
              <IndexTable.Cell><Text as="span" fontWeight="semibold">{formatCurrency(c.totalVentas)}</Text></IndexTable.Cell>
              <IndexTable.Cell>{formatCurrency(c.efectivoEsperado)}</IndexTable.Cell>
              <IndexTable.Cell>{formatCurrency(c.efectivoContado)}</IndexTable.Cell>
              <IndexTable.Cell>
                <Badge tone={Math.abs(c.diferencia) <= 10 ? 'success' : 'critical'}>{`${c.diferencia >= 0 ? '+' : ''}${formatCurrency(c.diferencia)}`}</Badge>
              </IndexTable.Cell>
            </IndexTable.Row>
          ))}
        </IndexTable>
      </BlockStack>
    </Card>
  );
}
