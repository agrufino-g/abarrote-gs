'use client';

import { Card, TextField, FormLayout, BlockStack, Layout } from '@shopify/polaris';
import type { SettingsSectionProps } from './types';

export function HardwareSection({ config, updateField }: SettingsSectionProps) {
  return (
    <BlockStack gap="500">
      <Layout.AnnotatedSection
        title="Dispositivos Locales"
        description="Parametriza los puertos de conexión física si corres el software con hardware avanzado."
      >
        <Card>
          <FormLayout>
            <TextField
              label="Dirección IP Impresora Térmica"
              placeholder="Ej: 192.168.1.100"
              value={config.printerIp || ''}
              onChange={(v) => updateField('printerIp', v)}
              autoComplete="off"
              helpText="Solo necesario si usas impresoras de red o WiFi para despachar comandas o tickets extra."
            />
            <FormLayout.Group>
              <TextField
                label="Puerto Cajón de Dinero"
                placeholder="Ej: COM1 o USB"
                value={config.cashDrawerPort || ''}
                onChange={(v) => updateField('cashDrawerPort', v)}
                autoComplete="off"
                helpText="Envía el pulso de apertura."
              />
              <TextField
                label="Puerto Báscula Serial"
                placeholder="Ej: COM2"
                value={config.scalePort || ''}
                onChange={(v) => updateField('scalePort', v)}
                autoComplete="off"
                helpText="Para lecturas directas en checkout."
              />
            </FormLayout.Group>
          </FormLayout>
        </Card>
      </Layout.AnnotatedSection>
    </BlockStack>
  );
}
