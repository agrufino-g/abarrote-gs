'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  Text,
  BlockStack,
  InlineStack,
  Button,
  Banner,
  Layout,
  Page,
  Icon,
  Grid,
  Box,
} from '@shopify/polaris';
import {
  getMPConfig,
  saveMPConfig,
  getDevices,
} from '@/lib/mercadopago';
import type { MercadoPagoConfig } from '@/lib/mercadopago';
import { useDashboardStore } from '@/store/dashboardStore';
import type { StoreConfig } from '@/types';
import { uploadFile } from '@/lib/storage';
import {
  StoreIcon,
  ReceiptIcon,
  InventoryIcon,
  ChatIcon,
  CreditCardIcon,
  NoteIcon,
  PrintIcon,
  StarFilledIcon,
  SettingsFilledIcon,
} from '@shopify/polaris-icons';

import { GeneralSection } from './sections/GeneralSection';
import { FiscalSection } from './sections/FiscalSection';
import { PosSection } from './sections/PosSection';
import { HardwareSection } from './sections/HardwareSection';
import { LoyaltySection } from './sections/LoyaltySection';
import { InventorySection } from './sections/InventorySection';
import { NotificationsSection } from './sections/NotificationsSection';
import { PaymentsSection } from './sections/PaymentsSection';

const SETTINGS_CATEGORIES = [
  { id: 'general', title: 'Detalles de la tienda', description: 'Gestiona la identidad de tu negocio, dirección y preferencias básicas.', icon: StoreIcon },
  { id: 'fiscal', title: 'Fiscales e Impuestos', description: 'Configura tu RFC, régimen fiscal, moneda y tasas de IVA.', icon: NoteIcon },
  { id: 'pos', title: 'Punto de Venta y Recibos', description: 'Personaliza los tickets impresos y la estructura de códigos de barras.', icon: ReceiptIcon },
  { id: 'hardware', title: 'Hardware y Periféricos', description: 'Configura IPs de impresoras, cajones de dinero y básculas seriales.', icon: PrintIcon },
  { id: 'loyalty', title: 'Loyalty y Puntos', description: 'Configura las conversiones y recompensas para la fidelización de clientes.', icon: StarFilledIcon },
  { id: 'inventory', title: 'Inventario de productos', description: 'Establece reglas y umbrales para alertas de stock y caducidad.', icon: InventoryIcon },
  { id: 'notifications', title: 'Notificaciones', description: 'Conecta notificaciones push a tu celular mediante Telegram.', icon: ChatIcon },
  { id: 'payments', title: 'Pagos Integrados', description: 'Vincula tu terminal Point de Mercado Pago para cobros físicos.', icon: CreditCardIcon },
];

export function ConfiguracionPage() {
  const storeConfig = useDashboardStore((s) => s.storeConfig);
  const saveStoreConfig = useDashboardStore((s) => s.saveStoreConfig);
  const [config, setConfig] = useState<StoreConfig>(storeConfig);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    setConfig(storeConfig);
  }, [storeConfig]);

  const isDirty = JSON.stringify(config) !== JSON.stringify(storeConfig);

  // Mercado Pago config
  const [mpConfig, setMpConfig] = useState<MercadoPagoConfig>({ publicKey: '', deviceId: '', enabled: false });
  const [mpSaved, setMpSaved] = useState(false);
  const [mpTesting, setMpTesting] = useState(false);
  const [mpTestResult, setMpTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [mpDevices, setMpDevices] = useState<{ id: string; operating_mode: string }[]>([]);

  // Telegram config
  const [tgTesting, setTgTesting] = useState(false);
  const [tgTestResult, setTgTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Logo upload
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);

  useEffect(() => {
    setMpConfig(getMPConfig());
  }, []);

  const updateField = useCallback(<K extends keyof StoreConfig>(field: K, value: StoreConfig[K]) => {
    setConfig(prev => ({ ...prev, [field]: value }));
    setSaved(false);
  }, []);

  const handleLogoDrop = useCallback((_accepted: File[], rejected: File[]) => {
    if (rejected.length > 0) {
      setLogoError('Solo se aceptan imágenes (JPG, PNG, WebP, SVG) de máximo 5 MB.');
    }
  }, []);

  const handleLogoDropAccepted = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setLogoUploading(true);
    setLogoError(null);
    try {
      const path = `logos/store-logo-${Date.now()}.${file.name.split('.').pop()}`;
      const url = await uploadFile(file, path);
      updateField('logoUrl', url);
    } catch {
      setLogoError('No se pudo subir el logo. Intenta de nuevo.');
    } finally {
      setLogoUploading(false);
    }
  }, [updateField]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await saveStoreConfig(config);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Error saving config:', err);
    }
    setSaving(false);
  }, [config, saveStoreConfig]);

  const handleMPSave = useCallback(() => {
    saveMPConfig(mpConfig);
    setMpSaved(true);
    setTimeout(() => setMpSaved(false), 3000);
  }, [mpConfig]);

  const handleMPTest = useCallback(async () => {
    setMpTesting(true);
    setMpTestResult(null);
    try {
      const devices = await getDevices();
      setMpDevices(devices);
      if (devices.length > 0) {
        setMpTestResult({ success: true, message: `Conexión exitosa. ${devices.length} terminal(es) encontrada(s).` });
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
  }, [mpConfig.deviceId]);

  const handleTGTest = useCallback(async () => {
    if (!config.telegramToken || !config.telegramChatId) {
      setTgTestResult({ success: false, message: 'Ingresa Token y Chat ID primero' });
      return;
    }
    setTgTesting(true);
    setTgTestResult(null);
    try {
      const url = `https://api.telegram.org/bot${config.telegramToken}/sendMessage`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: config.telegramChatId,
          text: '✅ <b>PRUEBA DE CONEXIÓN</b>\n\nTu consola de abarrotes está conectada correctamente a Telegram.',
          parse_mode: 'HTML',
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setTgTestResult({ success: true, message: 'Notificación enviada con éxito' });
      } else {
        setTgTestResult({ success: false, message: `Error de Telegram: ${data.description}` });
      }
    } catch (err) {
      setTgTestResult({ success: false, message: 'Error al conectar con Telegram API' });
    }
    setTgTesting(false);
  }, [config.telegramToken, config.telegramChatId]);

  // ================= MAIN RENDER ================= //

  const getActiveView = () => {
    switch (selectedCategory) {
      case 'general':
        return (
          <GeneralSection
            config={config}
            updateField={updateField}
            logoUploading={logoUploading}
            logoError={logoError}
            handleLogoDrop={handleLogoDrop}
            handleLogoDropAccepted={handleLogoDropAccepted}
            setLogoError={setLogoError}
          />
        );
      case 'fiscal':
        return <FiscalSection config={config} updateField={updateField} />;
      case 'pos':
        return <PosSection config={config} updateField={updateField} />;
      case 'hardware':
        return <HardwareSection config={config} updateField={updateField} />;
      case 'loyalty':
        return <LoyaltySection config={config} updateField={updateField} />;
      case 'inventory':
        return <InventorySection config={config} updateField={updateField} />;
      case 'notifications':
        return (
          <NotificationsSection
            config={config}
            updateField={updateField}
            tgTesting={tgTesting}
            tgTestResult={tgTestResult}
            handleTGTest={handleTGTest}
          />
        );
      case 'payments':
        return (
          <PaymentsSection
            mpConfig={mpConfig}
            setMpConfig={setMpConfig}
            mpSaved={mpSaved}
            setMpSaved={setMpSaved}
            mpTesting={mpTesting}
            mpTestResult={mpTestResult}
            mpDevices={mpDevices}
            handleMPTest={handleMPTest}
            handleMPSave={handleMPSave}
          />
        );
      default:
        return null;
    }
  };

  const activeCategory = SETTINGS_CATEGORIES.find(c => c.id === selectedCategory);

  if (selectedCategory !== null) {
    return (
      <BlockStack gap="400">
        {saved && (
          <Banner tone="success" title="Cambios guardados" onDismiss={() => setSaved(false)}>
            <p>Tu configuración se ha actualizado correctamente en todos los módulos del sistema.</p>
          </Banner>
        )}
        <Page
          backAction={{ content: 'Configuración', onAction: () => setSelectedCategory(null) }}
          title={activeCategory?.title || 'Configuración'}
          subtitle={activeCategory?.description}
          primaryAction={isDirty ? {
            content: 'Guardar cambios',
            onAction: handleSave,
            loading: saving,
          } : undefined}
          secondaryActions={isDirty ? [{
            content: 'Descartar',
            onAction: () => setConfig(storeConfig),
            destructive: true,
          }] : []}
        >
          <Box paddingBlockEnd="1200">
            {getActiveView()}
          </Box>
        </Page>
      </BlockStack>
    );
  }

  return (
    <Page
      title={(
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Icon source={SettingsFilledIcon} tone="base" />
          <span>Configuración</span>
        </div>
      ) as any}
      subtitle="Administra las políticas operativas, la identidad fiscal y la infraestructura de tu negocio."
    >
      {saved && (
        <Box paddingBlockEnd="400">
          <Banner tone="success" title="Cambios guardados" onDismiss={() => setSaved(false)}>
            <p>Tu configuración se ha actualizado correctamente.</p>
          </Banner>
        </Box>
      )}

      <Layout>
        <Layout.Section>
          <Grid>
            {SETTINGS_CATEGORIES.map((cat) => (
              <Grid.Cell key={cat.id} columnSpan={{ xs: 6, sm: 3, md: 3, lg: 4, xl: 4 }}>
                <Box
                  background="bg-surface"
                  borderWidth="025"
                  borderColor="border"
                  borderRadius="300"
                  padding="500"
                  shadow="100"
                  minHeight="160px"
                >
                  <BlockStack gap="400">
                    <InlineStack align="space-between" blockAlign="start">
                      <Box
                        background="bg-fill-secondary"
                        borderRadius="200"
                        padding="200"
                      >
                        <Icon source={cat.icon} tone="base" />
                      </Box>
                      <Button
                        variant="plain"
                        onClick={() => setSelectedCategory(cat.id)}
                      >
                        Abrir
                      </Button>
                    </InlineStack>
                    <BlockStack gap="100">
                      <Text as="h3" variant="headingSm" fontWeight="semibold">
                        {cat.title}
                      </Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        {cat.description}
                      </Text>
                    </BlockStack>
                  </BlockStack>
                </Box>
              </Grid.Cell>
            ))}
          </Grid>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
