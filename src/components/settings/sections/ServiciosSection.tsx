'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Text,
  TextField,
  FormLayout,
  BlockStack,
  InlineStack,
  Button,
  Select,
  Checkbox,
  Box,
  Banner,
  Badge,
  Divider,
} from '@shopify/polaris';
import { useDashboardStore } from '@/store/dashboardStore';
import { getAvailableProviders } from '@/infrastructure/servicios/provider-registry';
import { parseError } from '@/lib/errors';

export function ServiciosSection() {
  const storeConfig = useDashboardStore((s) => s.storeConfig);
  const saveStoreConfig = useDashboardStore((s) => s.saveStoreConfig);

  const [provider, setProvider] = useState(storeConfig.serviciosProvider || 'local');
  const [apiKey, setApiKey] = useState(storeConfig.serviciosApiKey || '');
  const [apiSecret, setApiSecret] = useState(storeConfig.serviciosApiSecret || '');
  const [sandbox, setSandbox] = useState(storeConfig.serviciosSandbox ?? true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setProvider(storeConfig.serviciosProvider || 'local');
    setApiKey(storeConfig.serviciosApiKey || '');
    setApiSecret(storeConfig.serviciosApiSecret || '');
    setSandbox(storeConfig.serviciosSandbox ?? true);
  }, [storeConfig]);

  const providers = getAvailableProviders();
  const providerOptions = providers.map((p) => ({
    label: `${p.name}${p.status === 'disponible' ? '' : ' (Próximamente)'}`,
    value: p.id,
    disabled: p.status !== 'disponible',
  }));

  const selectedProvider = providers.find((p) => p.id === provider);
  const isExternal = provider !== 'local';

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      await saveStoreConfig({
        serviciosProvider: provider,
        serviciosApiKey: apiKey || undefined,
        serviciosApiSecret: apiSecret || undefined,
        serviciosSandbox: sandbox,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      const { description } = parseError(err);
      setError(description);
    } finally {
      setSaving(false);
    }
  }, [provider, apiKey, apiSecret, sandbox, saveStoreConfig]);

  return (
    <BlockStack gap="400">
      <Card>
        <BlockStack gap="400">
          <InlineStack align="space-between" blockAlign="center">
            <BlockStack gap="100">
              <Text as="h2" variant="headingMd">
                Proveedor de Servicios
              </Text>
              <Text as="p" variant="bodyMd" tone="subdued">
                Configura el proveedor externo para recargas telefónicas y pagos de servicios (luz, agua, internet).
              </Text>
            </BlockStack>
            <Badge tone={isExternal ? 'success' : 'info'}>{isExternal ? 'Proveedor Externo' : 'Local'}</Badge>
          </InlineStack>

          <Divider />

          <FormLayout>
            <Select
              label="Proveedor"
              options={providerOptions}
              value={provider}
              onChange={setProvider}
              helpText="Selecciona el proveedor que procesará las recargas y pagos de servicios."
            />
          </FormLayout>

          {isExternal && (
            <>
              <Banner tone="warning" title="Configuración requerida">
                Para usar {selectedProvider?.name ?? provider} necesitas ingresar las credenciales API proporcionadas
                por el proveedor.
              </Banner>

              <FormLayout>
                <TextField
                  label="API Key"
                  value={apiKey}
                  onChange={setApiKey}
                  autoComplete="off"
                  helpText="Clave pública o identificador de tu cuenta con el proveedor."
                />
                <TextField
                  label="API Secret"
                  value={apiSecret}
                  onChange={setApiSecret}
                  type="password"
                  autoComplete="off"
                  helpText="Clave secreta. Se almacena de forma segura."
                />
                <Checkbox
                  label="Modo Sandbox (pruebas)"
                  checked={sandbox}
                  onChange={setSandbox}
                  helpText="Activa el modo de pruebas para validar la integración sin transacciones reales."
                />
              </FormLayout>
            </>
          )}

          {!isExternal && (
            <Banner tone="info">
              Sin proveedor externo, las recargas y pagos de servicios se registran manualmente. Cuando vincules un
              proveedor, las transacciones se procesarán automáticamente.
            </Banner>
          )}

          {error && (
            <Banner tone="critical" onDismiss={() => setError(null)}>
              {error}
            </Banner>
          )}

          {saved && <Banner tone="success">Configuración de servicios guardada correctamente.</Banner>}

          <InlineStack align="end">
            <Button variant="primary" onClick={handleSave} loading={saving}>
              Guardar configuración
            </Button>
          </InlineStack>
        </BlockStack>
      </Card>

      <Card>
        <BlockStack gap="300">
          <Text as="h2" variant="headingMd">
            Proveedores Disponibles
          </Text>
          <Text as="p" variant="bodyMd" tone="subdued">
            Próximamente podrás elegir entre varios proveedores de recargas y pagos de servicios.
          </Text>
          <Divider />
          <BlockStack gap="200">
            {providers.map((p) => (
              <Box key={p.id} paddingBlockStart="100" paddingBlockEnd="100">
                <InlineStack align="space-between" blockAlign="center">
                  <BlockStack gap="050">
                    <Text as="span" variant="bodyMd" fontWeight="semibold">
                      {p.name}
                    </Text>
                    <Text as="span" variant="bodySm" tone="subdued">
                      {p.description}
                    </Text>
                  </BlockStack>
                  <Badge tone={p.status === 'disponible' ? (provider === p.id ? 'success' : undefined) : 'attention'}>
                    {p.status === 'disponible' ? (provider === p.id ? 'Activo' : 'Disponible') : 'Próximamente'}
                  </Badge>
                </InlineStack>
              </Box>
            ))}
          </BlockStack>
        </BlockStack>
      </Card>
    </BlockStack>
  );
}
