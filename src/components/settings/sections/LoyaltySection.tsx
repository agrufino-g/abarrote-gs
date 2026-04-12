'use client';

import { Card, TextField, FormLayout, BlockStack, Checkbox, Box, Banner, Layout } from '@shopify/polaris';
import type { SettingsSectionProps } from './types';

export function LoyaltySection({ config, updateField }: SettingsSectionProps) {
  return (
    <BlockStack gap="500">
      <Layout.AnnotatedSection
        title="Motor de Recompensas"
        description="Habilita un monedero electrónico para retener a tus clientes con beneficios en cada compra del abarrote."
      >
        <Card>
          <BlockStack gap="400">
            <Checkbox
              label="Habilitar sistema CashBack (Puntos en Cartera)"
              helpText="Permite que los usuarios registrados acumulen un porcentaje de su compra para volver a gastarlo luego."
              checked={config.loyaltyEnabled}
              onChange={(v) => updateField('loyaltyEnabled', v)}
            />

            {config.loyaltyEnabled && (
              <Box paddingBlockStart="300">
                <FormLayout>
                  <FormLayout.Group>
                    <TextField
                      label="Pesos a Puntos"
                      type="number"
                      prefix="Cada $"
                      suffix=" = 1 Pto."
                      value={String(config.pointsPerPeso || 100)}
                      onChange={(v) => updateField('pointsPerPeso', Number(v) || 100)}
                      autoComplete="off"
                      helpText="¿Cuánto debe gastar el cliente en pesos para generar 1 punto?"
                    />
                    <TextField
                      label="Valor del Punto"
                      type="number"
                      prefix="1 Pto. = $"
                      value={String(config.pointsValue || 1)}
                      onChange={(v) => updateField('pointsValue', Number(v) || 1)}
                      autoComplete="off"
                      helpText="¿A cuántos pesos de descuento equivale 1 punto cuando lo canjea?"
                    />
                  </FormLayout.Group>
                  <Banner tone="info">
                    <p>
                      <strong>Configuración actual:</strong> Por cada ${config.pointsPerPeso} gastados, el cliente gana
                      1 punto. A su vez, 1 punto equivale a ${config.pointsValue} de descuento en el futuro.
                    </p>
                  </Banner>
                </FormLayout>
              </Box>
            )}
          </BlockStack>
        </Card>
      </Layout.AnnotatedSection>
    </BlockStack>
  );
}
