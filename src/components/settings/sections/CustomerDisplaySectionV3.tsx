'use client';

import { useCallback, useState, useEffect, useRef } from 'react';
import {
  Card,
  FormLayout,
  BlockStack,
  Banner,
  Button,
  InlineStack,
  Text,
  Box,
  Badge,
  Divider,
  DropZone,
  Spinner,
  TextField,
} from '@shopify/polaris';
import { useDashboardStore } from '@/store/dashboardStore';
import { uploadFile } from '@/lib/storage';
import { parseError } from '@/lib/errors';

/**
 * CustomerDisplaySection — Simplified, production-ready component.
 *
 * Key design decisions:
 * - NO Layout.AnnotatedSection (causes unnecessary scroll and duplicate titles)
 * - Single Card for main toggle with inline content
 * - Lightweight auto-save for text fields
 * - Direct store connection (no form system dependency)
 */
export function CustomerDisplaySectionV3() {
  const storeConfig = useDashboardStore((s) => s.storeConfig);
  const saveStoreConfig = useDashboardStore((s) => s.saveStoreConfig);

  // Local state for optimistic toggle
  const [isEnabled, setIsEnabled] = useState(storeConfig.customerDisplayEnabled);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Text fields local state (for controlled inputs with debounced save)
  const [welcomeMsg, setWelcomeMsg] = useState(storeConfig.customerDisplayWelcome || '');
  const [farewellMsg, setFarewellMsg] = useState(storeConfig.customerDisplayFarewell || '');
  const [promoText, setPromoText] = useState(storeConfig.customerDisplayPromoText || '');

  // Image upload state
  const [promoUploading, setPromoUploading] = useState(false);
  const [promoUploadError, setPromoUploadError] = useState<string | null>(null);
  const [urlCopied, setUrlCopied] = useState(false);

  // Debounce timers
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync with store when it changes externally
  useEffect(() => {
    setIsEnabled(storeConfig.customerDisplayEnabled);
    setWelcomeMsg(storeConfig.customerDisplayWelcome || '');
    setFarewellMsg(storeConfig.customerDisplayFarewell || '');
    setPromoText(storeConfig.customerDisplayPromoText || '');
  }, [
    storeConfig.customerDisplayEnabled,
    storeConfig.customerDisplayWelcome,
    storeConfig.customerDisplayFarewell,
    storeConfig.customerDisplayPromoText,
  ]);

  const displayUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/display` : '/display';

  // ─────────────────────────────────────────────────────────────────────────
  // Toggle handler (instant save)
  // ─────────────────────────────────────────────────────────────────────────
  const handleToggle = useCallback(async () => {
    const newValue = !isEnabled;
    setIsEnabled(newValue); // Optimistic
    setIsSaving(true);
    setSaveError(null);

    try {
      await saveStoreConfig({ customerDisplayEnabled: newValue });
    } catch (error) {
      // Rollback on error
      setIsEnabled(!newValue);
      const { description } = parseError(error);
      setSaveError(description);
    } finally {
      setIsSaving(false);
    }
  }, [isEnabled, saveStoreConfig]);

  // ─────────────────────────────────────────────────────────────────────────
  // Auto-save text fields with debounce
  // ─────────────────────────────────────────────────────────────────────────
  const debouncedSave = useCallback(
    (field: string, value: string) => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      saveTimerRef.current = setTimeout(async () => {
        try {
          await saveStoreConfig({ [field]: value });
        } catch {
          // Silent fail for text fields - user can retry
        }
      }, 1000);
    },
    [saveStoreConfig],
  );

  const handleWelcomeChange = useCallback(
    (value: string) => {
      setWelcomeMsg(value);
      debouncedSave('customerDisplayWelcome', value);
    },
    [debouncedSave],
  );

  const handleFarewellChange = useCallback(
    (value: string) => {
      setFarewellMsg(value);
      debouncedSave('customerDisplayFarewell', value);
    },
    [debouncedSave],
  );

  const handlePromoTextChange = useCallback(
    (value: string) => {
      setPromoText(value);
      debouncedSave('customerDisplayPromoText', value);
    },
    [debouncedSave],
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Other handlers
  // ─────────────────────────────────────────────────────────────────────────
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
      // Silent
    }
  }, [displayUrl]);

  const handlePromoImageDrop = useCallback(
    (_accepted: File[], rejected: File[]) => {
      if (rejected.length > 0) {
        setPromoUploadError('Solo se aceptan imágenes de máximo 5 MB.');
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
      } catch (error) {
        const { description } = parseError(error);
        setPromoUploadError(description || 'Error al subir imagen.');
      } finally {
        setPromoUploading(false);
      }
    },
    [saveStoreConfig],
  );

  const handleRemovePromoImage = useCallback(async () => {
    try {
      await saveStoreConfig({ customerDisplayPromoImage: '' });
    } catch {
      // Silent
    }
  }, [saveStoreConfig]);

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <BlockStack gap="400">
      {/* Error banner */}
      {saveError && (
        <Banner tone="critical" onDismiss={() => setSaveError(null)}>
          <p>{saveError}</p>
        </Banner>
      )}

      {/* Main toggle card */}
      <Card>
        <BlockStack gap="400">
          <InlineStack align="space-between" blockAlign="center" wrap={false}>
            <BlockStack gap="100">
              <Text variant="headingMd" as="h2">
                Activar pantalla del cliente
              </Text>
              <Text variant="bodySm" as="p" tone="subdued">
                Muestra productos y totales en un segundo monitor o tablet.
              </Text>
            </BlockStack>
            <Box minWidth="120px">
              <Button
                role="switch"
                ariaChecked={isEnabled ? "true" : "false"}
                onClick={handleToggle}
                loading={isSaving}
                disabled={isSaving}
                variant={isEnabled ? 'primary' : undefined}
                size="slim"
                fullWidth
              >
                {isEnabled ? 'Activada' : 'Desactivada'}
              </Button>
            </Box>
          </InlineStack>

          {/* Content shown when enabled */}
          {isEnabled && (
            <>
              <Divider />
              <BlockStack gap="300">
                <Text as="p" variant="bodySm" tone="subdued">
                  Abre la pantalla en un segundo monitor, tablet o navegador.
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
            </>
          )}
        </BlockStack>
      </Card>

      {/* Additional settings (only when enabled) */}
      {isEnabled && (
        <>
          {/* Messages */}
          <Card>
            <BlockStack gap="400">
              <Text variant="headingSm" as="h3">
                Mensajes personalizados
              </Text>
              <Text variant="bodySm" as="p" tone="subdued">
                Los cambios se guardan automáticamente.
              </Text>
              <FormLayout>
                <TextField
                  label="Mensaje de bienvenida"
                  value={welcomeMsg}
                  onChange={handleWelcomeChange}
                  autoComplete="off"
                  placeholder="Ej: ¡Bienvenido! Gracias por visitarnos"
                  helpText="Se muestra cuando no hay venta activa."
                  maxLength={120}
                  showCharacterCount
                />
                <TextField
                  label="Mensaje de despedida"
                  value={farewellMsg}
                  onChange={handleFarewellChange}
                  autoComplete="off"
                  placeholder="Ej: ¡Gracias por su compra!"
                  helpText="Se muestra al finalizar la venta."
                  maxLength={120}
                  showCharacterCount
                />
                <TextField
                  label="Texto promocional"
                  value={promoText}
                  onChange={handlePromoTextChange}
                  autoComplete="off"
                  placeholder="Ej: 2x1 en refrescos"
                  helpText="Se muestra en la pantalla de espera."
                  maxLength={200}
                  showCharacterCount
                  multiline={2}
                />
              </FormLayout>
            </BlockStack>
          </Card>

          {/* Promo image */}
          <Card>
            <BlockStack gap="400">
              <Text variant="headingSm" as="h3">
                Imagen promocional
              </Text>

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
                  <Button size="slim" tone="critical" onClick={handleRemovePromoImage}>
                    Quitar imagen
                  </Button>
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
                    <Box padding="600">
                      <InlineStack align="center" gap="200">
                        <Spinner size="small" />
                        <Text as="span" variant="bodySm" tone="subdued">
                          Subiendo…
                        </Text>
                      </InlineStack>
                    </Box>
                  ) : (
                    <DropZone.FileUpload
                      actionTitle="Subir imagen"
                      actionHint="JPG, PNG o WebP"
                    />
                  )}
                </DropZone>
              )}
            </BlockStack>
          </Card>

          {/* Instructions */}
          <Card>
            <BlockStack gap="300">
              <Text variant="headingSm" as="h3">
                Instrucciones de uso
              </Text>

              <InlineStack gap="200" blockAlign="start">
                <Badge>1</Badge>
                <BlockStack gap="100">
                  <Text as="p" variant="bodyMd" fontWeight="semibold">
                    Segundo monitor
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Abre la pantalla y arrástrala al segundo monitor. Usa F11 para pantalla
                    completa.
                  </Text>
                </BlockStack>
              </InlineStack>

              <Divider />

              <InlineStack gap="200" blockAlign="start">
                <Badge>2</Badge>
                <BlockStack gap="100">
                  <Text as="p" variant="bodyMd" fontWeight="semibold">
                    Tablet / Celular
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Abre la URL en un dispositivo conectado a la misma red Wi-Fi.
                  </Text>
                </BlockStack>
              </InlineStack>
            </BlockStack>
          </Card>
        </>
      )}
    </BlockStack>
  );
}
