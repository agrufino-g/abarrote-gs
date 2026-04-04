'use client';

import { useCallback, useState, useRef, useTransition, useEffect } from 'react';
import {
  Card,
  FormLayout,
  BlockStack,
  Banner,
  Button,
  InlineStack,
  Text,
  Box,
  Divider,
  DropZone,
  Spinner,
  TextField,
} from '@shopify/polaris';
import { useDashboardStore } from '@/store/dashboardStore';
import { uploadFile } from '@/lib/storage';
import { parseError } from '@/lib/errors';

/**
 * CustomerDisplaySectionV4 — Complete redesign with:
 * - useTransition for non-blocking updates
 * - Local state for inputs with store sync
 * - Clear visual feedback on save
 * - Explicit error handling with console logs
 */
export function CustomerDisplaySectionV4() {
  // ─────────────────────────────────────────────────────────────────────────
  // Store connection
  // ─────────────────────────────────────────────────────────────────────────
  const storeConfig = useDashboardStore((s) => s.storeConfig);
  const saveStoreConfig = useDashboardStore((s) => s.saveStoreConfig);

  // Local state for text inputs (needed for controlled inputs with debounce)
  const [welcomeMsg, setWelcomeMsg] = useState(storeConfig.customerDisplayWelcome || '');
  const [farewellMsg, setFarewellMsg] = useState(storeConfig.customerDisplayFarewell || '');
  const [promoText, setPromoText] = useState(storeConfig.customerDisplayPromoText || '');

  // Sync local state when store changes externally
  useEffect(() => {
    setWelcomeMsg(storeConfig.customerDisplayWelcome || '');
    setFarewellMsg(storeConfig.customerDisplayFarewell || '');
    setPromoText(storeConfig.customerDisplayPromoText || '');
  }, [storeConfig.customerDisplayWelcome, storeConfig.customerDisplayFarewell, storeConfig.customerDisplayPromoText]);

  // Read toggle directly from store (no local state needed - button handles it)
  const isEnabled = storeConfig.customerDisplayEnabled;
  const promoImage = storeConfig.customerDisplayPromoImage || '';

  // UI state
  const [isPending, startTransition] = useTransition();
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [urlCopied, setUrlCopied] = useState(false);
  const [promoUploading, setPromoUploading] = useState(false);
  
  // Debounce refs for text fields
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const displayUrl = typeof window !== 'undefined' ? `${window.location.origin}/display` : '/display';

  // ─────────────────────────────────────────────────────────────────────────
  // Save helper with feedback
  // ─────────────────────────────────────────────────────────────────────────
  const saveField = useCallback(async (field: string, value: unknown) => {
    setSaveStatus('saving');
    setErrorMessage(null);

    try {
      console.log(`[CustomerDisplay] Saving ${field}:`, value);
      await saveStoreConfig({ [field]: value });
      console.log(`[CustomerDisplay] Saved ${field} successfully`);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error(`[CustomerDisplay] Error saving ${field}:`, error);
      const { description } = parseError(error);
      setErrorMessage(description);
      setSaveStatus('error');
    }
  }, [saveStoreConfig]);

  // ─────────────────────────────────────────────────────────────────────────
  // Toggle handler - immediate save
  // ─────────────────────────────────────────────────────────────────────────
  const handleToggle = useCallback(() => {
    const newValue = !isEnabled;
    startTransition(() => {
      saveField('customerDisplayEnabled', newValue);
    });
  }, [isEnabled, saveField]);

  // ─────────────────────────────────────────────────────────────────────────
  // Text field handlers with debounce - update local state immediately, save after delay
  // ─────────────────────────────────────────────────────────────────────────
  const debouncedSave = useCallback((field: string, value: string) => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(() => {
      saveField(field, value);
    }, 800);
  }, [saveField]);

  const handleWelcomeChange = useCallback((value: string) => {
    setWelcomeMsg(value);
    debouncedSave('customerDisplayWelcome', value);
  }, [debouncedSave]);

  const handleFarewellChange = useCallback((value: string) => {
    setFarewellMsg(value);
    debouncedSave('customerDisplayFarewell', value);
  }, [debouncedSave]);

  const handlePromoTextChange = useCallback((value: string) => {
    setPromoText(value);
    debouncedSave('customerDisplayPromoText', value);
  }, [debouncedSave]);

  // ─────────────────────────────────────────────────────────────────────────
  // Actions
  // ─────────────────────────────────────────────────────────────────────────
  const handleOpenDisplay = useCallback(() => {
    window.open('/display', 'customer_display', 'width=1024,height=768,menubar=no,toolbar=no');
  }, []);

  const handleCopyUrl = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(displayUrl);
      setUrlCopied(true);
      setTimeout(() => setUrlCopied(false), 2500);
    } catch {
      // Fallback
    }
  }, [displayUrl]);

  const handlePromoImageDrop = useCallback(async (_accepted: File[], rejected: File[]) => {
    if (rejected.length > 0) {
      setErrorMessage('Solo se aceptan imágenes (JPG, PNG, WebP) de máximo 2 MB.');
      return;
    }
  }, []);

  const handlePromoImageAccepted = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setPromoUploading(true);
    setErrorMessage(null);
    try {
      const url = await uploadFile(file, 'promo');
      await saveField('customerDisplayPromoImage', url);
    } catch (error) {
      const { description } = parseError(error);
      setErrorMessage(description);
    } finally {
      setPromoUploading(false);
    }
  }, [saveField]);

  const handleRemovePromoImage = useCallback(() => {
    saveField('customerDisplayPromoImage', '');
  }, [saveField]);

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <BlockStack gap="400">
      {/* Error banner */}
      {errorMessage && (
        <Banner tone="critical" onDismiss={() => setErrorMessage(null)}>
          {errorMessage}
        </Banner>
      )}

      {/* Success banner */}
      {saveStatus === 'saved' && (
        <Banner tone="success" onDismiss={() => setSaveStatus('idle')}>
          Cambios guardados correctamente
        </Banner>
      )}

      {/* Main toggle card */}
      <Card>
        <BlockStack gap="400">
          <InlineStack align="space-between" blockAlign="center">
            <BlockStack gap="100">
              <Text variant="headingMd" as="h3">Activar pantalla del cliente</Text>
              <Text variant="bodySm" tone="subdued">
                Muestra productos y totales en un segundo monitor o tablet.
              </Text>
            </BlockStack>
            
            <Button
              variant={isEnabled ? 'primary' : 'secondary'}
              onClick={handleToggle}
              loading={isPending || saveStatus === 'saving'}
              tone={isEnabled ? 'success' : undefined}
            >
              {isEnabled ? 'Activada' : 'Desactivada'}
            </Button>
          </InlineStack>

          <Divider />

          <BlockStack gap="200">
            <Text variant="bodySm" tone="subdued">
              Abre la pantalla en un segundo monitor, tablet o navegador.
            </Text>
            <InlineStack gap="200">
              <Button onClick={handleOpenDisplay} disabled={!isEnabled}>
                Abrir pantalla
              </Button>
              <Button variant="plain" onClick={handleCopyUrl}>
                {urlCopied ? '¡Copiado!' : 'Copiar URL'}
              </Button>
            </InlineStack>
            <Text variant="bodySm" tone="subdued">{displayUrl}</Text>
          </BlockStack>
        </BlockStack>
      </Card>

      {/* Custom messages card */}
      <Card>
        <BlockStack gap="400">
          <BlockStack gap="100">
            <Text variant="headingMd" as="h3">Mensajes personalizados</Text>
            <Text variant="bodySm" tone="subdued">
              Los cambios se guardan automáticamente.
            </Text>
          </BlockStack>

          <FormLayout>
            <TextField
              label="Mensaje de bienvenida"
              placeholder="Ej: ¡Bienvenido! Gracias por visitarnos"
              value={welcomeMsg}
              onChange={handleWelcomeChange}
              maxLength={120}
              showCharacterCount
              helpText="Se muestra cuando no hay venta activa."
              autoComplete="off"
            />

            <TextField
              label="Mensaje de despedida"
              placeholder="Ej: ¡Gracias por su compra!"
              value={farewellMsg}
              onChange={handleFarewellChange}
              maxLength={120}
              showCharacterCount
              helpText="Se muestra al finalizar la venta."
              autoComplete="off"
            />

            <TextField
              label="Texto promocional"
              placeholder="Ej: 2x1 en refrescos"
              value={promoText}
              onChange={handlePromoTextChange}
              maxLength={200}
              showCharacterCount
              multiline={2}
              helpText="Se muestra en la pantalla de espera."
              autoComplete="off"
            />
          </FormLayout>
        </BlockStack>
      </Card>

      {/* Promo image card */}
      <Card>
        <BlockStack gap="400">
          <Text variant="headingMd" as="h3">Imagen promocional</Text>

          {promoImage ? (
            <BlockStack gap="300">
              <Box borderRadius="200" overflow="hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={promoImage} 
                  alt="Promoción" 
                  style={{ maxWidth: '100%', maxHeight: 200, objectFit: 'contain' }} 
                />
              </Box>
              <Button variant="plain" tone="critical" onClick={handleRemovePromoImage}>
                Eliminar imagen
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
                <Box padding="400">
                  <InlineStack align="center" gap="200">
                    <Spinner size="small" />
                    <Text variant="bodySm">Subiendo imagen...</Text>
                  </InlineStack>
                </Box>
              ) : (
                <DropZone.FileUpload actionHint="JPG, PNG o WebP" />
              )}
            </DropZone>
          )}
          <Text variant="bodySm" tone="subdued">
            Se muestra en la pantalla de espera junto al texto promocional.
          </Text>
        </BlockStack>
      </Card>
    </BlockStack>
  );
}
