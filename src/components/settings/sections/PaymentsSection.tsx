'use client';

import {
  Card,
  Text,
  TextField,
  FormLayout,
  BlockStack,
  InlineStack,
  Button,
  Checkbox,
  Box,
  Banner,
  Badge,
  Divider,
  Layout,
} from '@shopify/polaris';
import type { MercadoPagoConfig } from '@/lib/mercadopago';

interface PaymentsSectionProps {
  mpConfig: MercadoPagoConfig;
  setMpConfig: React.Dispatch<React.SetStateAction<MercadoPagoConfig>>;
  mpSaved: boolean;
  setMpSaved: (v: boolean) => void;
  mpTesting: boolean;
  mpTestResult: { success: boolean; message: string } | null;
  mpDevices: { id: string; operating_mode: string }[];
  handleMPTest: () => void;
  handleMPSave: () => void;
}

export function PaymentsSection({
  mpConfig,
  setMpConfig,
  mpSaved,
  setMpSaved,
  mpTesting,
  mpTestResult,
  mpDevices,
  handleMPTest,
  handleMPSave,
}: PaymentsSectionProps) {
  return (
    <BlockStack gap="500">
      <Layout.AnnotatedSection title="Mercado Pago Smart POS" description="Reemplaza los pagos no integrados conectando directamente tu lector físico. Esto elimina errores de cobro y agiliza las filas.">
        <Card>
          <BlockStack gap="400">
            <InlineStack gap="300" blockAlign="center">
              <img src="https://http2.mlstatic.com/frontend-assets/ui-navigation/5.23.0/mercadopago/logo__small@2x.png" alt="Mercado Pago" width="30" />
              <Checkbox label="Procesar transacciones con tarjeta vía Point" checked={mpConfig.enabled} onChange={(v) => setMpConfig(prev => ({ ...prev, enabled: v }))} />
            </InlineStack>

            {mpConfig.enabled && (
              <Box paddingBlockStart="300">
                <FormLayout>
                  <Banner tone="info">
                    <p>El Access Token se configura en el servidor (variable de entorno <code>MP_ACCESS_TOKEN</code>). No se expone al navegador.</p>
                  </Banner>
                  <TextField label="Public Key (Checkout & QR)" value={mpConfig.publicKey || ''} onChange={(v) => setMpConfig(prev => ({ ...prev, publicKey: v }))} autoComplete="off" placeholder="APP_USR-..." helpText="Llave Pública para renderizar Tarjetas e invocar Checkouts web." />
                  <TextField label="Device ID (Hardware)" value={mpConfig.deviceId} onChange={(v) => setMpConfig(prev => ({ ...prev, deviceId: v }))} autoComplete="off" placeholder="Ej: PAX_A910__..." helpText="ID interno del lector físico. Usa el botón de descubrir para detectarlo automáticamente en tu misma red WiFi." />

                  <Divider />
                  <InlineStack gap="300" blockAlign="center">
                    <Button onClick={handleMPTest} loading={mpTesting}>Descubrir Terminales</Button>
                    <Button variant="primary" onClick={handleMPSave}>Sincronizar Integración MP</Button>
                  </InlineStack>

                  {mpSaved && (
                    <Banner tone="success" onDismiss={() => setMpSaved(false)}>
                      <p>Hardware sincronizado. Los cobros ahora se dispararán al dispositivo configurado.</p>
                    </Banner>
                  )}

                  {mpTestResult && (
                    <Banner tone={mpTestResult.success ? 'success' : 'critical'}>
                      <p>{mpTestResult.message}</p>
                    </Banner>
                  )}

                  {mpDevices.length > 0 && (
                    <Box paddingBlockStart="200">
                      <BlockStack gap="300">
                        <Text as="h3" variant="headingSm">Dispositivos en línea detectados:</Text>
                        <Card>
                          <BlockStack gap="200">
                            {mpDevices.map((d) => (
                              <InlineStack key={d.id} gap="400" blockAlign="center" align="space-between">
                                <InlineStack gap="300" blockAlign="center">
                                  <Badge tone={d.id === mpConfig.deviceId ? 'success' : 'info'}>
                                    {d.id === mpConfig.deviceId ? 'Enlazada' : 'Detectada'}
                                  </Badge>
                                  <Text as="p" variant="bodyMd" fontWeight="medium">{d.id}</Text>
                                </InlineStack>
                                {d.id !== mpConfig.deviceId && (
                                  <Button size="slim" onClick={() => setMpConfig(prev => ({ ...prev, deviceId: d.id }))}>
                                    Enlazar esta terminal
                                  </Button>
                                )}
                              </InlineStack>
                            ))}
                          </BlockStack>
                        </Card>
                      </BlockStack>
                    </Box>
                  )}
                </FormLayout>
              </Box>
            )}
          </BlockStack>
        </Card>
      </Layout.AnnotatedSection>
    </BlockStack>
  );
}
