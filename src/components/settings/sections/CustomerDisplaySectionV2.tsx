'use client';

import { useCallback, useState } from 'react';
import {
  Card,
  FormLayout,
  BlockStack,
  Layout,
  Banner,
  Button,
  InlineStack,
  Text,
  Box,
  Badge,
  Divider,
  DropZone,
  Spinner,
} from '@shopify/polaris';
import { useDashboardStore } from '@/store/dashboardStore';
import { uploadFile } from '@/lib/storage';
import { parseError } from '@/lib/errors';
import { SettingsToggleCard, AutoSaveTextField } from '../primitives';

/**
 * Self-sufficient CustomerDisplaySection.
 *
 * This component manages its own state and persistence using the Zustand store
 * directly. It does NOT rely on ConfiguracionPage's form system, which was
 * causing state desynchronization bugs.
 *
 * Architecture:
 * - Toggle: Optimistic UI via SettingsToggleCard
 * - Text fields: Auto-save with debounce via AutoSaveTextField
 * - Image upload: Direct upload + immediate save
 * - Each field saves independently — no global form submission
 */
export function CustomerDisplaySectionV2() {
  const storeConfig = useDashboardStore((s) => s.storeConfig);
  const saveStoreConfig = useDashboardStore((s) => s.saveStoreConfig);

  // Status feedback state (using Banner instead of Toast to avoid Frame dependency)
  const [statusMessage, setStatusMessage] = useState<{ text: string; error: boolean } | null>(null);

  // Image upload state
  const [promoUploading, setPromoUploading] = useState(false);
  const [promoUploadError, setPromoUploadError] = useState<string | null>(null);

  // URL state
  const [urlCopied, setUrlCopied] = useState(false);

  const displayUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/display` : '/display';

  // ─────────────────────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────────────────────

  /** Persist toggle — throws on error (SettingsToggleCard handles rollback) */
  const handleToggle = useCallback(
    async (enabled: boolean) => {
      await saveStoreConfig({ customerDisplayEnabled: enabled });
      setStatusMessage({
        text: enabled ? 'Pantalla del cliente activada' : 'Pantalla del cliente desactivada',
        error: false,
      });
      // Auto-dismiss after 3s
      setTimeout(() => setStatusMessage(null), 3000);
    },
    [saveStoreConfig],
  );

  /** Persist any text field — throws on error (AutoSaveTextField handles UI) */
  const handleSaveField = useCallback(
    (field: 'customerDisplayWelcome' | 'customerDisplayFarewell' | 'customerDisplayPromoText') =>
      async (value: string) => {
        try {
          await saveStoreConfig({ [field]: value });
        } catch (error) {
          const { description } = parseError(error);
          setStatusMessage({ text: description, error: true });
          setTimeout(() => setStatusMessage(null), 5000);
          throw error; // Re-throw so AutoSaveTextField shows error state
        }
      },
    [saveStoreConfig],
  );

  const handleOpenDisplay = useCallback(() => {
    window.open(
      '/display',
      'customer_display',
      'width=1024,height=768,menubar=no,toolbar=no,location=no,status=no',
    );
  }, []);

  const handleCopyUrl = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(displayUrl);
      setUrlCopied(true);
      setTimeout(() => setUrlCopied(false), 2500);
    } catch {
      // Silent fail
    }
  }, [displayUrl]);

  const handlePromoImageDrop = useCallback(
    (_accepted: File[], rejected: File[]) => {
      if (rejected.length > 0) {
        setPromoUploadError('Solo se aceptan imágenes (JPG, PNG, WebP) de máximo 5 MB.');
      }
    },
    [],
  );

  const handlePromoImageAccepted = useCallback(
    async (files: File[]) => {
      const file = files[0];
      if (!file) return;

      setPromoUploading(true);
      setPromoUploadError(null);

      try {
        const ext = file.name.split('.').pop() || 'jpg';
        const path = `display/promo-${Date.now()}.${ext}`;
        const url = await uploadFile(file, path);
        await saveStoreConfig({ customerDisplayPromoImage: url });
        setStatusMessage({ text: 'Imagen promocional guardada', error: false });
        setTimeout(() => setStatusMessage(null), 3000);
      } catch (error) {
        const { description } = parseError(error);
        setPromoUploadError(description || 'No se pudo subir la imagen. Intenta de nuevo.');
      } finally {
        setPromoUploading(false);
      }
    },
    [saveStoreConfig],
  );

  const handleRemovePromoImage = useCallback(async () => {
    try {
      await saveStoreConfig({ customerDisplayPromoImage: '' });
      setStatusMessage({ text: 'Imagen promocional eliminada', error: false });
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (error) {
      const { description } = parseError(error);
      setStatusMessage({ text: description, error: true });
      setTimeout(() => setStatusMessage(null), 5000);
    }
  }, [saveStoreConfig]);

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  const isEnabled = storeConfig.customerDisplayEnabled;

  return (
    <BlockStack gap="500">
        {/* ─── Main Toggle ─── */}
        <Layout.AnnotatedSection
          title="Pantalla del cliente"
          description="Muestra a tus clientes los productos que están comprando en tiempo real desde un segundo monitor o tablet."
        >
          <SettingsToggleCard
            title="Pantalla del cliente"
            description="Habilita la pantalla secundaria que muestra la compra actual al cliente."
            enabled={isEnabled}
            onToggle={handleToggle}
            enabledLabel="Activada"
            disabledLabel="Desactivada"
          >
            {/* Content shown when enabled */}
            <Divider />
            <BlockStack gap="300">
              <Text as="p" variant="bodySm" tone="subdued">
                Abre la pantalla en un segundo monitor, tablet o navegador. Se sincroniza
                automáticamente con la caja.
              </Text>
              <InlineStack gap="200">
                <Button size="slim" variant="primary" onClick={handleOpenDisplay}>
                  Abrir pantalla
                </Button>
                <Button size="slim" onClick={handleCopyUrl}>
                  {urlCopied ? '✓ Copiada' : 'Copiar URL'}
                </Button>
              </InlineStack>
              <Text as="p" variant="bodySm" tone="subdued">
                {displayUrl}
              </Text>
            </BlockStack>
          </SettingsToggleCard>
        </Layout.AnnotatedSection>

        {/* ─── Custom Messages (only when enabled) ─── */}
        {isEnabled && (
          <>
            <Layout.AnnotatedSection
              title="Mensajes personalizados"
              description="Textos que verá el cliente en la pantalla de bienvenida y al finalizar su compra. Los cambios se guardan automáticamente."
            >
              <Card>
                <FormLayout>
                  <AutoSaveTextField
                    label="Mensaje de bienvenida"
                    value={storeConfig.customerDisplayWelcome || ''}
                    onSave={handleSaveField('customerDisplayWelcome')}
                    autoComplete="off"
                    placeholder="Ej: ¡Bienvenido! Gracias por visitarnos"
                    helpText="Se muestra cuando no hay venta activa. Si se deja vacío se usa el predeterminado."
                    maxLength={120}
                    showCharacterCount
                  />

                  <AutoSaveTextField
                    label="Mensaje de despedida"
                    value={storeConfig.customerDisplayFarewell || ''}
                    onSave={handleSaveField('customerDisplayFarewell')}
                    autoComplete="off"
                    placeholder="Ej: ¡Gracias por su compra! Vuelva pronto"
                    helpText="Se muestra al finalizar la venta junto con el total y folio."
                    maxLength={120}
                    showCharacterCount
                  />

                  <AutoSaveTextField
                    label="Texto promocional"
                    value={storeConfig.customerDisplayPromoText || ''}
                    onSave={handleSaveField('customerDisplayPromoText')}
                    autoComplete="off"
                    placeholder="Ej: 2x1 en refrescos · 10% en lácteos"
                    helpText="Se muestra en la pantalla de espera. Ideal para ofertas del día."
                    maxLength={200}
                    showCharacterCount
                    multiline={2}
                  />
                </FormLayout>
              </Card>
            </Layout.AnnotatedSection>

            {/* ─── Promo Image Upload ─── */}
            <Layout.AnnotatedSection
              title="Imagen promocional"
              description="Sube una imagen que se mostrará en la pantalla de espera. Ideal para banners de ofertas o promociones."
            >
              <Card>
                <BlockStack gap="400">
                  {promoUploadError && (
                    <Banner tone="critical" onDismiss={() => setPromoUploadError(null)}>
                      <p>{promoUploadError}</p>
                    </Banner>
                  )}

                  {storeConfig.customerDisplayPromoImage ? (
                    <BlockStack gap="300">
                      <Box borderRadius="200">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={storeConfig.customerDisplayPromoImage}
                          alt="Imagen promocional"
                          style={{
                            width: '100%',
                            maxHeight: 200,
                            objectFit: 'contain',
                            borderRadius: 8,
                            border: '1px solid var(--p-color-border)',
                          }}
                        />
                      </Box>
                      <InlineStack gap="200">
                        <Button size="slim" tone="critical" onClick={handleRemovePromoImage}>
                          Quitar imagen
                        </Button>
                      </InlineStack>
                    </BlockStack>
                  ) : (
                    <DropZone
                      accept="image/*"
                      type="image"
                      allowMultiple={false}
                      onDrop={handlePromoImageDrop}
                      onDropAccepted={handlePromoImageAccepted}
                    >
                      {promoUploading ? (
                        <Box padding="800">
                          <InlineStack align="center" gap="200">
                            <Spinner size="small" />
                            <Text as="span" variant="bodySm" tone="subdued">
                              Subiendo imagen…
                            </Text>
                          </InlineStack>
                        </Box>
                      ) : (
                        <DropZone.FileUpload
                          actionTitle="Subir imagen promocional"
                          actionHint="JPG, PNG o WebP — máximo 5 MB"
                        />
                      )}
                    </DropZone>
                  )}
                </BlockStack>
              </Card>
            </Layout.AnnotatedSection>

            {/* ─── Instructions ─── */}
            <Layout.AnnotatedSection
              title="Instrucciones de uso"
              description="Cómo configurar la pantalla del cliente."
            >
              <Card>
                <BlockStack gap="400">
                  <BlockStack gap="200">
                    <InlineStack gap="200" blockAlign="center">
                      <Badge>1</Badge>
                      <Text as="p" variant="bodyMd" fontWeight="semibold">
                        Segundo monitor
                      </Text>
                    </InlineStack>
                    <Text as="p" variant="bodySm" tone="subdued">
                      Conecta un segundo monitor. Abre la pantalla del cliente y arrástrala al
                      segundo monitor. Ponla en pantalla completa con F11.
                    </Text>
                  </BlockStack>

                  <Divider />

                  <BlockStack gap="200">
                    <InlineStack gap="200" blockAlign="center">
                      <Badge>2</Badge>
                      <Text as="p" variant="bodyMd" fontWeight="semibold">
                        Tablet / Celular
                      </Text>
                    </InlineStack>
                    <Text as="p" variant="bodySm" tone="subdued">
                      Abre la URL en el navegador de una tablet o celular conectado a la misma red
                      Wi-Fi. Colócala frente al cliente.
                    </Text>
                  </BlockStack>

                  <Divider />

                  <BlockStack gap="200">
                    <InlineStack gap="200" blockAlign="center">
                      <Badge>3</Badge>
                      <Text as="p" variant="bodyMd" fontWeight="semibold">
                        Sincronización automática
                      </Text>
                    </InlineStack>
                    <Text as="p" variant="bodySm" tone="subdued">
                      La pantalla se actualiza automáticamente cuando agregas productos a la venta.
                      No necesitas hacer nada más.
                    </Text>
                  </BlockStack>
                </BlockStack>
              </Card>
            </Layout.AnnotatedSection>
          </>
        )}

        {/* ─── Status feedback (inline banner, no Frame dependency) ─── */}
        {statusMessage && (
          <Banner
            tone={statusMessage.error ? 'critical' : 'success'}
            onDismiss={() => setStatusMessage(null)}
          >
            <p>{statusMessage.text}</p>
          </Banner>
        )}
      </BlockStack>
  );
}
