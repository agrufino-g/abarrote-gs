'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  Card,
  Text,
  TextField,
  Select,
  FormLayout,
  BlockStack,
  InlineStack,
  Button,
  Banner,
  Layout,
  Checkbox,
  Badge,
  Spinner,
} from '@shopify/polaris';
import {
  getMPConfig,
  saveMPConfig,
  getDevices,
} from '@/lib/mercadopago';
import type { MercadoPagoConfig } from '@/lib/mercadopago';

interface StoreConfig {
  storeName: string;
  storeAddress: string;
  phone: string;
  rfc: string;
  ivaRate: string;
  currency: string;
  lowStockThreshold: string;
  expirationWarningDays: string;
  printReceipts: boolean;
  autoBackup: boolean;
}

const DEFAULT_CONFIG: StoreConfig = {
  storeName: 'Abarrotes Don José',
  storeAddress: 'Calle Principal #123, Col. Centro, CP 12345',
  phone: '(555) 123-4567',
  rfc: 'XAXX010101000',
  ivaRate: '16',
  currency: 'MXN',
  lowStockThreshold: '25',
  expirationWarningDays: '7',
  printReceipts: true,
  autoBackup: false,
};

export function ConfiguracionPage() {
  const [config, setConfig] = useState<StoreConfig>(DEFAULT_CONFIG);
  const [saved, setSaved] = useState(false);

  // Mercado Pago config
  const [mpConfig, setMpConfig] = useState<MercadoPagoConfig>({ accessToken: '', deviceId: '', enabled: false });
  const [mpSaved, setMpSaved] = useState(false);
  const [mpTesting, setMpTesting] = useState(false);
  const [mpTestResult, setMpTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [mpDevices, setMpDevices] = useState<{ id: string; operating_mode: string }[]>([]);

  useEffect(() => {
    setMpConfig(getMPConfig());
  }, []);

  const updateField = useCallback(<K extends keyof StoreConfig>(field: K, value: StoreConfig[K]) => {
    setConfig(prev => ({ ...prev, [field]: value }));
    setSaved(false);
  }, []);

  const handleSave = useCallback(() => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }, []);

  const handleMPSave = useCallback(() => {
    saveMPConfig(mpConfig);
    setMpSaved(true);
    setTimeout(() => setMpSaved(false), 3000);
  }, [mpConfig]);

  const handleMPTest = useCallback(async () => {
    if (!mpConfig.accessToken) {
      setMpTestResult({ success: false, message: 'Ingresa un Access Token primero' });
      return;
    }
    setMpTesting(true);
    setMpTestResult(null);
    try {
      const devices = await getDevices(mpConfig.accessToken);
      setMpDevices(devices);
      if (devices.length > 0) {
        setMpTestResult({ success: true, message: `Conexión exitosa. ${devices.length} terminal(es) encontrada(s).` });
        // Auto-fill first device if empty
        if (!mpConfig.deviceId && devices.length > 0) {
          setMpConfig(prev => ({ ...prev, deviceId: devices[0].id }));
        }
      } else {
        setMpTestResult({ success: false, message: 'Conexión exitosa pero no se encontraron terminales vinculadas.' });
      }
    } catch (err) {
      setMpTestResult({ success: false, message: err instanceof Error ? err.message : 'Error al conectar con Mercado Pago' });
    }
    setMpTesting(false);
  }, [mpConfig.accessToken, mpConfig.deviceId]);

  return (
    <BlockStack gap="400">
      {saved && (
        <Banner tone="success" title="Configuración guardada" onDismiss={() => setSaved(false)}>
          <p>Los cambios se han guardado correctamente.</p>
        </Banner>
      )}

      <Layout>
        <Layout.AnnotatedSection
          title="Información de la tienda"
          description="Datos generales de tu negocio que aparecen en tickets y reportes."
        >
          <Card>
            <FormLayout>
              <TextField
                label="Nombre de la tienda"
                value={config.storeName}
                onChange={(v) => updateField('storeName', v)}
                autoComplete="off"
              />
              <TextField
                label="Dirección"
                value={config.storeAddress}
                onChange={(v) => updateField('storeAddress', v)}
                autoComplete="off"
                multiline={2}
              />
              <FormLayout.Group>
                <TextField
                  label="Teléfono"
                  value={config.phone}
                  onChange={(v) => updateField('phone', v)}
                  autoComplete="tel"
                />
                <TextField
                  label="RFC"
                  value={config.rfc}
                  onChange={(v) => updateField('rfc', v)}
                  autoComplete="off"
                />
              </FormLayout.Group>
            </FormLayout>
          </Card>
        </Layout.AnnotatedSection>

        <Layout.AnnotatedSection
          title="Impuestos y moneda"
          description="Configura la tasa de IVA y la moneda que se usa en tu negocio."
        >
          <Card>
            <FormLayout>
              <FormLayout.Group>
                <TextField
                  label="Tasa de IVA (%)"
                  type="number"
                  value={config.ivaRate}
                  onChange={(v) => updateField('ivaRate', v)}
                  autoComplete="off"
                  suffix="%"
                />
                <Select
                  label="Moneda"
                  options={[
                    { label: 'Peso Mexicano (MXN)', value: 'MXN' },
                    { label: 'Dólar Americano (USD)', value: 'USD' },
                  ]}
                  value={config.currency}
                  onChange={(v) => updateField('currency', v)}
                />
              </FormLayout.Group>
            </FormLayout>
          </Card>
        </Layout.AnnotatedSection>

        <Layout.AnnotatedSection
          title="Alertas de inventario"
          description="Define los umbrales para recibir alertas de stock bajo y productos por vencer."
        >
          <Card>
            <FormLayout>
              <FormLayout.Group>
                <TextField
                  label="Umbral de stock bajo (%)"
                  type="number"
                  value={config.lowStockThreshold}
                  onChange={(v) => updateField('lowStockThreshold', v)}
                  autoComplete="off"
                  suffix="%"
                  helpText="Alerta cuando el stock baje de este porcentaje del mínimo"
                />
                <TextField
                  label="Aviso de vencimiento (días)"
                  type="number"
                  value={config.expirationWarningDays}
                  onChange={(v) => updateField('expirationWarningDays', v)}
                  autoComplete="off"
                  suffix="días"
                  helpText="Días antes del vencimiento para mostrar alerta"
                />
              </FormLayout.Group>
            </FormLayout>
          </Card>
        </Layout.AnnotatedSection>

        <Layout.AnnotatedSection
          title="Preferencias"
          description="Opciones generales del sistema."
        >
          <Card>
            <BlockStack gap="400">
              <Checkbox
                label="Imprimir tickets automáticamente"
                helpText="Imprime un ticket de venta al completar cada transacción"
                checked={config.printReceipts}
                onChange={(v) => updateField('printReceipts', v)}
              />
              <Checkbox
                label="Respaldo automático"
                helpText="Realiza un respaldo de datos diario automáticamente"
                checked={config.autoBackup}
                onChange={(v) => updateField('autoBackup', v)}
              />
            </BlockStack>
          </Card>
        </Layout.AnnotatedSection>

        <Layout.AnnotatedSection
          title="Terminal Mercado Pago"
          description="Conecta tu terminal Point de Mercado Pago para cobrar con tarjeta directamente desde el punto de venta."
        >
          <Card>
            <BlockStack gap="400">
              <Checkbox
                label="Habilitar cobro con terminal Mercado Pago"
                helpText="Permite enviar cobros a tu terminal Point al seleccionar pago con tarjeta"
                checked={mpConfig.enabled}
                onChange={(v) => setMpConfig(prev => ({ ...prev, enabled: v }))}
              />

              {mpConfig.enabled && (
                <FormLayout>
                  <TextField
                    label="Access Token"
                    value={mpConfig.accessToken}
                    onChange={(v) => setMpConfig(prev => ({ ...prev, accessToken: v }))}
                    autoComplete="off"
                    type="password"
                    placeholder="APP_USR-..."
                    helpText="Lo encuentras en Mercado Pago → Tu negocio → Configuración → Gestión y administración → Credenciales → Access Token de producción"
                  />
                  <TextField
                    label="Device ID (Terminal)"
                    value={mpConfig.deviceId}
                    onChange={(v) => setMpConfig(prev => ({ ...prev, deviceId: v }))}
                    autoComplete="off"
                    placeholder="Ej: PAX_A910__SMARTPOS1234567890"
                    helpText="Identificador de tu terminal Point. Usa 'Probar conexión' para detectarlo automáticamente."
                  />

                  <InlineStack gap="200">
                    <Button onClick={handleMPTest} loading={mpTesting}>
                      Probar conexión
                    </Button>
                    <Button variant="primary" onClick={handleMPSave}>
                      Guardar configuración MP
                    </Button>
                  </InlineStack>

                  {mpSaved && (
                    <Banner tone="success" onDismiss={() => setMpSaved(false)}>
                      <p>Configuración de Mercado Pago guardada.</p>
                    </Banner>
                  )}

                  {mpTesting && (
                    <InlineStack gap="200" blockAlign="center">
                      <Spinner size="small" />
                      <Text as="p" variant="bodySm">Conectando con Mercado Pago...</Text>
                    </InlineStack>
                  )}

                  {mpTestResult && (
                    <Banner tone={mpTestResult.success ? 'success' : 'critical'}>
                      <p>{mpTestResult.message}</p>
                    </Banner>
                  )}

                  {mpDevices.length > 0 && (
                    <BlockStack gap="200">
                      <Text as="h3" variant="headingSm">Terminales detectadas:</Text>
                      {mpDevices.map((d) => (
                        <InlineStack key={d.id} gap="200" blockAlign="center">
                          <Badge tone={d.id === mpConfig.deviceId ? 'success' : undefined}>
                            {d.id === mpConfig.deviceId ? 'Seleccionada' : 'Disponible'}
                          </Badge>
                          <Text as="p" variant="bodySm">{d.id}</Text>
                          {d.id !== mpConfig.deviceId && (
                            <Button size="slim" onClick={() => setMpConfig(prev => ({ ...prev, deviceId: d.id }))}>
                              Usar esta
                            </Button>
                          )}
                        </InlineStack>
                      ))}
                    </BlockStack>
                  )}

                  <Banner tone="info">
                    <p>
                      <strong>¿Cómo funciona?</strong> Al cobrar una venta con Tarjeta, el sistema envía el monto a tu
                      terminal Point. El cliente pasa su tarjeta en la terminal y el cobro se confirma automáticamente.
                      La comisión de Mercado Pago (2.5% + IVA) se agrega al total de la venta.
                    </p>
                  </Banner>
                </FormLayout>
              )}
            </BlockStack>
          </Card>
        </Layout.AnnotatedSection>
      </Layout>

      <InlineStack align="end">
        <Button variant="primary" onClick={handleSave}>
          Guardar cambios
        </Button>
      </InlineStack>
    </BlockStack>
  );
}
