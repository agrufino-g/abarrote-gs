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
  DropZone,
  Spinner,
  TextField,
  Badge,
  InlineGrid,
  Icon,
  Checkbox,
  Divider,
  RangeSlider,
  ButtonGroup,
  Tooltip,
  Thumbnail,
  Popover,
  OptionList,
  ColorPicker,
} from '@shopify/polaris';
import {
  DesktopIcon,
  ClipboardIcon,
  DeleteIcon,
  ImageIcon,
  ExternalIcon,
  StatusActiveIcon,
  PlayIcon,
  RefreshIcon,
  ViewIcon,
  PaintBrushFlatIcon,
  ClockIcon,
  SettingsIcon,
  GiftCardIcon,
  StoreIcon,
  CashDollarIcon,
  CheckIcon,
  StarFilledIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  TextFontIcon,
  SoundIcon,
  MobileIcon,
  ColorIcon,
} from '@shopify/polaris-icons';
import { useDashboardStore } from '@/store/dashboardStore';
import { uploadFile } from '@/lib/storage';
import { parseError } from '@/lib/errors';
import type {
  CustomerDisplayAnimation,
  CustomerDisplayPromoAnimation,
  TransitionSpeed,
  CustomerDisplayTheme,
} from '@/types';
import {
  CUSTOMER_DISPLAY_ANIMATIONS,
  CUSTOMER_DISPLAY_PROMO_ANIMATIONS,
  TRANSITION_SPEEDS,
  CUSTOMER_DISPLAY_THEMES,
} from '@/types';

// ═══════════════════════════════════════════════════════════
// Color helpers (hex ↔ HSB for Polaris ColorPicker)
// ═══════════════════════════════════════════════════════════

function hexToHsb(hex: string): { hue: number; saturation: number; brightness: number } {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  let hue = 0;
  if (d !== 0) {
    if (max === r) hue = ((g - b) / d + (g < b ? 6 : 0)) * 60;
    else if (max === g) hue = ((b - r) / d + 2) * 60;
    else hue = ((r - g) / d + 4) * 60;
  }
  const saturation = max === 0 ? 0 : d / max;
  return { hue, saturation, brightness: max };
}

function hsbToHex({ hue, saturation, brightness }: { hue: number; saturation: number; brightness: number }): string {
  const c = brightness * saturation;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = brightness - c;
  let r = 0, g = 0, b = 0;
  if (hue < 60) { r = c; g = x; }
  else if (hue < 120) { r = x; g = c; }
  else if (hue < 180) { g = c; b = x; }
  else if (hue < 240) { g = x; b = c; }
  else if (hue < 300) { r = x; b = c; }
  else { r = c; b = x; }
  const toHex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// ═══════════════════════════════════════════════════════════
// Constants / Labels
// ═══════════════════════════════════════════════════════════

const IDLE_ANIM_LABELS: Record<CustomerDisplayAnimation, string> = {
  none: 'Sin animación',
  fade: 'Desvanecer (Fade)',
  slideUp: 'Deslizar arriba',
  slideDown: 'Deslizar abajo',
  slideLeft: 'Deslizar izquierda',
  slideRight: 'Deslizar derecha',
  zoom: 'Zoom',
  bounce: 'Rebote',
};

const PROMO_ANIM_LABELS: Record<CustomerDisplayPromoAnimation, string> = {
  none: 'Sin animación',
  slideUp: 'Deslizar arriba',
  slideLeft: 'Deslizar izquierda',
  slideRight: 'Deslizar derecha',
  fade: 'Desvanecer (Fade)',
  zoom: 'Zoom',
  pulse: 'Pulso (infinito)',
  kenBurns: 'Ken Burns (zoom lento)',
};

const SPEED_LABELS: Record<TransitionSpeed, string> = {
  slow: 'Lenta (1.2s)',
  normal: 'Normal (0.6s)',
  fast: 'Rápida (0.3s)',
};

const THEME_META: Record<CustomerDisplayTheme, { label: string; bg: string; text: string; accent: string }> = {
  light: { label: 'Claro', bg: '#ffffff', text: '#1a1a1a', accent: '#008060' },
  dark:  { label: 'Oscuro', bg: '#1a1c1e', text: '#f1f1f1', accent: '#36d399' },
  brand: { label: 'Marca', bg: '#0a2540', text: '#ffffff', accent: '#00d4aa' },
};

const MAX_PROMO_IMAGES = 5;

/** Parse the JSON-serialized promo images field. Backward-compatible: plain URL → [url]. */
function parsePromoImages(raw: string): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter((u): u is string => typeof u === 'string' && u.length > 0);
  } catch {
    // Not JSON → treat as single URL
  }
  return raw.startsWith('http') ? [raw] : [];
}

function serializePromoImages(urls: string[]): string {
  if (urls.length === 0) return '';
  if (urls.length === 1) return JSON.stringify(urls); // Still JSON for consistency
  return JSON.stringify(urls);
}

// ═══════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════

export function CustomerDisplaySectionV4() {
  // ── Store ──
  const storeConfig = useDashboardStore((s) => s.storeConfig);
  const doSave = useDashboardStore((s) => s.saveStoreConfig);

  // ── Local optimistic state for ALL fields ──
  // Text fields
  const [welcome, setWelcome] = useState(storeConfig.customerDisplayWelcome ?? '');
  const [farewell, setFarewell] = useState(storeConfig.customerDisplayFarewell ?? '');
  const [promoText, setPromoText] = useState(storeConfig.customerDisplayPromoText ?? '');
  // Toggle/select fields — optimistic local state
  const [enabled, setEnabled] = useState(storeConfig.customerDisplayEnabled ?? false);
  const [promoImages, setPromoImages] = useState<string[]>(parsePromoImages(storeConfig.customerDisplayPromoImage ?? ''));
  const [idleAnim, setIdleAnim] = useState<CustomerDisplayAnimation>((storeConfig.customerDisplayIdleAnimation ?? 'fade') as CustomerDisplayAnimation);
  const [promoAnim, setPromoAnim] = useState<CustomerDisplayPromoAnimation>((storeConfig.customerDisplayPromoAnimation ?? 'slideUp') as CustomerDisplayPromoAnimation);
  const [speed, setSpeed] = useState<TransitionSpeed>((storeConfig.customerDisplayTransitionSpeed ?? 'normal') as TransitionSpeed);
  const [showClock, setShowClock] = useState(storeConfig.customerDisplayShowClock ?? true);
  const [theme, setTheme] = useState<CustomerDisplayTheme>((storeConfig.customerDisplayTheme ?? 'light') as CustomerDisplayTheme);
  const [carousel, setCarousel] = useState(storeConfig.customerDisplayIdleCarousel ?? false);
  const [carouselSec, setCarouselSec] = useState(storeConfig.customerDisplayCarouselInterval ?? '5');
  // Extended settings
  const [customLogo, setCustomLogo] = useState(storeConfig.customerDisplayLogo ?? '');
  const [fontScale, setFontScale] = useState(storeConfig.customerDisplayFontScale ?? '1');
  const [autoReturnSec, setAutoReturnSec] = useState(storeConfig.customerDisplayAutoReturnSec ?? '6');
  const [accentColor, setAccentColor] = useState(storeConfig.customerDisplayAccentColor ?? '');
  const [soundEnabled, setSoundEnabled] = useState(storeConfig.customerDisplaySoundEnabled ?? false);
  const [orientation, setOrientation] = useState(storeConfig.customerDisplayOrientation ?? 'landscape');

  // Sync ALL local state when store hydrates (initial load or external update)
  useEffect(() => {
    setWelcome(storeConfig.customerDisplayWelcome ?? '');
    setFarewell(storeConfig.customerDisplayFarewell ?? '');
    setPromoText(storeConfig.customerDisplayPromoText ?? '');
    setEnabled(storeConfig.customerDisplayEnabled ?? false);
    setPromoImages(parsePromoImages(storeConfig.customerDisplayPromoImage ?? ''));
    setIdleAnim((storeConfig.customerDisplayIdleAnimation ?? 'fade') as CustomerDisplayAnimation);
    setPromoAnim((storeConfig.customerDisplayPromoAnimation ?? 'slideUp') as CustomerDisplayPromoAnimation);
    setSpeed((storeConfig.customerDisplayTransitionSpeed ?? 'normal') as TransitionSpeed);
    setShowClock(storeConfig.customerDisplayShowClock ?? true);
    setTheme((storeConfig.customerDisplayTheme ?? 'light') as CustomerDisplayTheme);
    setCarousel(storeConfig.customerDisplayIdleCarousel ?? false);
    setCarouselSec(storeConfig.customerDisplayCarouselInterval ?? '5');
    setCustomLogo(storeConfig.customerDisplayLogo ?? '');
    setFontScale(storeConfig.customerDisplayFontScale ?? '1');
    setAutoReturnSec(storeConfig.customerDisplayAutoReturnSec ?? '6');
    setAccentColor(storeConfig.customerDisplayAccentColor ?? '');
    setSoundEnabled(storeConfig.customerDisplaySoundEnabled ?? false);
    setOrientation(storeConfig.customerDisplayOrientation ?? 'landscape');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeConfig]);

  // ── UI state ──
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [urlCopied, setUrlCopied] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [idleAnimPop, setIdleAnimPop] = useState(false);
  const [promoAnimPop, setPromoAnimPop] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);

  const displayUrl = typeof window !== 'undefined' ? `${window.location.origin}/display` : '/display';
  const isBusy = isPending || status === 'saving';

  // ── Optimistic save: update local state immediately, persist to server, rollback on error ──
  const save = useCallback(async (field: string, value: unknown, rollback?: () => void) => {
    setStatus('saving');
    setErrorMsg(null);
    try {
      await doSave({ [field]: value });
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (err) {
      rollback?.();
      setErrorMsg(parseError(err).description);
      setStatus('error');
    }
  }, [doSave]);

  const debouncedSave = useCallback((field: string, val: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => save(field, val), 800);
  }, [save]);

  // ── Optimistic handlers ──
  const toggleEnabled = useCallback(() => {
    const prev = enabled;
    setEnabled(!prev);
    startTransition(() => { save('customerDisplayEnabled', !prev, () => setEnabled(prev)); });
  }, [enabled, save]);

  const onWelcome  = useCallback((v: string) => { setWelcome(v);  debouncedSave('customerDisplayWelcome', v); }, [debouncedSave]);
  const onFarewell = useCallback((v: string) => { setFarewell(v); debouncedSave('customerDisplayFarewell', v); }, [debouncedSave]);
  const onPromo    = useCallback((v: string) => { setPromoText(v); debouncedSave('customerDisplayPromoText', v); }, [debouncedSave]);

  const onTheme = useCallback((t: CustomerDisplayTheme) => {
    const prev = theme;
    setTheme(t);
    save('customerDisplayTheme', t, () => setTheme(prev));
  }, [theme, save]);

  const onIdleAnim = useCallback((v: string) => {
    const prev = idleAnim;
    setIdleAnim(v as CustomerDisplayAnimation);
    setIdleAnimPop(false);
    save('customerDisplayIdleAnimation', v, () => setIdleAnim(prev));
  }, [idleAnim, save]);

  const onPromoAnim = useCallback((v: string) => {
    const prev = promoAnim;
    setPromoAnim(v as CustomerDisplayPromoAnimation);
    setPromoAnimPop(false);
    save('customerDisplayPromoAnimation', v, () => setPromoAnim(prev));
  }, [promoAnim, save]);

  const onSpeed = useCallback((s: TransitionSpeed) => {
    const prev = speed;
    setSpeed(s);
    save('customerDisplayTransitionSpeed', s, () => setSpeed(prev));
  }, [speed, save]);

  const onShowClock = useCallback((v: boolean) => {
    const prev = showClock;
    setShowClock(v);
    save('customerDisplayShowClock', v, () => setShowClock(prev));
  }, [showClock, save]);

  const onCarousel = useCallback((v: boolean) => {
    const prev = carousel;
    setCarousel(v);
    save('customerDisplayIdleCarousel', v, () => setCarousel(prev));
  }, [carousel, save]);

  const onCarouselSec = useCallback((v: number) => {
    const prev = carouselSec;
    const str = String(v);
    setCarouselSec(str);
    save('customerDisplayCarouselInterval', str, () => setCarouselSec(prev));
  }, [carouselSec, save]);

  const onFontScale = useCallback((v: number) => {
    const prev = fontScale;
    const str = String(v);
    setFontScale(str);
    save('customerDisplayFontScale', str, () => setFontScale(prev));
  }, [fontScale, save]);

  const onAutoReturn = useCallback((v: number) => {
    const prev = autoReturnSec;
    const str = String(v);
    setAutoReturnSec(str);
    save('customerDisplayAutoReturnSec', str, () => setAutoReturnSec(prev));
  }, [autoReturnSec, save]);

  const onAccentColor = useCallback((v: string) => {
    setAccentColor(v);
    debouncedSave('customerDisplayAccentColor', v);
  }, [debouncedSave]);

  const onSoundEnabled = useCallback((v: boolean) => {
    const prev = soundEnabled;
    setSoundEnabled(v);
    save('customerDisplaySoundEnabled', v, () => setSoundEnabled(prev));
  }, [soundEnabled, save]);

  const onOrientation = useCallback((v: string) => {
    const prev = orientation;
    setOrientation(v);
    save('customerDisplayOrientation', v, () => setOrientation(prev));
  }, [orientation, save]);

  const copyUrl = useCallback(async () => {
    try { await navigator.clipboard.writeText(displayUrl); setUrlCopied(true); setTimeout(() => setUrlCopied(false), 2500); } catch { /* noop */ }
  }, [displayUrl]);

  const openDisplay = useCallback(() => {
    const w = orientation === 'portrait' ? 768 : 1024;
    const h = orientation === 'portrait' ? 1024 : 768;
    window.open('/display', 'customer_display', `width=${w},height=${h},menubar=no,toolbar=no`);
  }, [orientation]);

  const onLogoDrop = useCallback((_a: File[], rej: File[]) => {
    if (rej.length) setErrorMsg('Solo imágenes (JPG, PNG, WebP) de máximo 2 MB.');
  }, []);

  const onLogoAccepted = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setUploading(true);
    setErrorMsg(null);
    try {
      const ext = file.name.split('.').pop() ?? 'webp';
      const url = await uploadFile(file, `display/logo-${Date.now()}.${ext}`);
      setCustomLogo(url);
      await save('customerDisplayLogo', url, () => setCustomLogo(customLogo));
    } catch (err) { setErrorMsg(parseError(err).description); }
    finally { setUploading(false); }
  }, [save, customLogo]);

  const removeLogo = useCallback(() => {
    const prev = customLogo;
    setCustomLogo('');
    save('customerDisplayLogo', '', () => setCustomLogo(prev));
  }, [customLogo, save]);

  const onImageDrop = useCallback((_a: File[], rej: File[]) => {
    if (rej.length) setErrorMsg('Solo imágenes (JPG, PNG, WebP) de máximo 2 MB.');
  }, []);

  const onImageAccepted = useCallback(async (files: File[]) => {
    if (promoImages.length >= MAX_PROMO_IMAGES) {
      setErrorMsg(`Máximo ${MAX_PROMO_IMAGES} imágenes promocionales.`);
      return;
    }
    const file = files[0];
    if (!file) return;
    setUploading(true);
    setErrorMsg(null);
    try {
      const ext = file.name.split('.').pop() ?? 'webp';
      const url = await uploadFile(file, `promo/display-${Date.now()}.${ext}`);
      const updated = [...promoImages, url];
      setPromoImages(updated);
      await save('customerDisplayPromoImage', serializePromoImages(updated), () => setPromoImages(promoImages));
    } catch (err) { setErrorMsg(parseError(err).description); }
    finally { setUploading(false); }
  }, [save, promoImages]);

  const removeImage = useCallback((index: number) => {
    const prev = [...promoImages];
    const updated = promoImages.filter((_, i) => i !== index);
    setPromoImages(updated);
    save('customerDisplayPromoImage', serializePromoImages(updated), () => setPromoImages(prev));
  }, [promoImages, save]);

  const reorderImage = useCallback((from: number, to: number) => {
    if (to < 0 || to >= promoImages.length) return;
    const prev = [...promoImages];
    const updated = [...promoImages];
    const [moved] = updated.splice(from, 1);
    updated.splice(to, 0, moved);
    setPromoImages(updated);
    save('customerDisplayPromoImage', serializePromoImages(updated), () => setPromoImages(prev));
  }, [promoImages, save]);

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────

  return (
    <BlockStack gap="400">

      {/* Banners */}
      {errorMsg && <Banner tone="critical" onDismiss={() => setErrorMsg(null)}>{errorMsg}</Banner>}
      {status === 'saved' && <Banner tone="success" onDismiss={() => setStatus('idle')}>Cambios guardados.</Banner>}

      {/* ═══════════════════════════════════════════════════
          CARD 1 — Estado y acceso rápido
          ═══════════════════════════════════════════════════ */}
      <Card>
        <BlockStack gap="400">
          <InlineStack align="space-between" blockAlign="center" wrap={false}>
            <InlineStack gap="300" blockAlign="center">
              <Box padding="200" background={enabled ? 'bg-fill-success-secondary' : 'bg-surface-secondary'} borderRadius="200">
                <Icon source={DesktopIcon} tone={enabled ? 'success' : 'subdued'} />
              </Box>
              <BlockStack gap="050">
                <Text variant="headingMd" as="h3">Pantalla del cliente</Text>
                <Text variant="bodySm" as="p" tone="subdued">Segundo monitor o tablet para mostrar la compra.</Text>
              </BlockStack>
            </InlineStack>
            <Badge tone={enabled ? 'success' : undefined}>{enabled ? 'Activa' : 'Inactiva'}</Badge>
          </InlineStack>

          <Box background="bg-surface-secondary" borderRadius="200" padding="300">
            <InlineStack align="space-between" blockAlign="center" wrap={false}>
              <InlineStack gap="200" blockAlign="center">
                <Icon source={StatusActiveIcon} tone={enabled ? 'success' : 'subdued'} />
                <Text variant="bodySm" as="span" tone="subdued">{displayUrl}</Text>
              </InlineStack>
              <ButtonGroup>
                <Tooltip content="Copiar URL">
                  <Button icon={ClipboardIcon} size="slim" onClick={copyUrl}>
                    {urlCopied ? '✓ Copiado' : 'Copiar'}
                  </Button>
                </Tooltip>
                <Tooltip content="Abrir en ventana 1024×768">
                  <Button icon={ExternalIcon} size="slim" variant="primary" onClick={openDisplay} disabled={!enabled}>
                    Abrir pantalla
                  </Button>
                </Tooltip>
              </ButtonGroup>
            </InlineStack>
          </Box>

          <InlineStack align="end">
            <Button
              onClick={toggleEnabled}
              loading={isBusy}
              variant={enabled ? 'secondary' : 'primary'}
              tone={enabled ? 'critical' : undefined}
            >
              {enabled ? 'Desactivar pantalla' : 'Activar pantalla'}
            </Button>
          </InlineStack>
        </BlockStack>
      </Card>

      {/* ═══════════════════════════════════════════════════
          CARD 2 — Mensajes
          ═══════════════════════════════════════════════════ */}
      <Card>
        <BlockStack gap="400">
          <InlineStack gap="200" blockAlign="center">
            <Text variant="headingMd" as="h3">Mensajes personalizados</Text>
            <Badge tone="info">Auto-guardado</Badge>
          </InlineStack>
          <FormLayout>
            <InlineGrid columns={{ xs: 1, md: 2 }} gap="400">
              <TextField label="Mensaje de bienvenida" placeholder="Ej: ¡Bienvenido!" value={welcome} onChange={onWelcome} maxLength={120} showCharacterCount helpText="Se muestra en pantalla de espera." autoComplete="off" />
              <TextField label="Mensaje de despedida" placeholder="Ej: ¡Gracias por su compra!" value={farewell} onChange={onFarewell} maxLength={120} showCharacterCount helpText="Se muestra al finalizar la venta." autoComplete="off" />
            </InlineGrid>
            <TextField label="Texto promocional" placeholder="Ej: 2x1 en refrescos · Solo hoy" value={promoText} onChange={onPromo} maxLength={200} showCharacterCount multiline={2} helpText="Aparece con ícono de regalo en pantalla de espera." autoComplete="off" />
          </FormLayout>
        </BlockStack>
      </Card>

      {/* ═══════════════════════════════════════════════════
          CARD 3 — Imágenes promocionales
          ═══════════════════════════════════════════════════ */}
      <Card>
        <BlockStack gap="400">
          <InlineStack align="space-between" blockAlign="center">
            <InlineStack gap="200" blockAlign="center">
              <Box padding="200" background="bg-surface-secondary" borderRadius="200">
                <Icon source={ImageIcon} tone="subdued" />
              </Box>
              <BlockStack gap="050">
                <Text variant="headingMd" as="h3">Imágenes promocionales</Text>
                <Text variant="bodySm" as="p" tone="subdued">Se muestran en pantalla de espera. Recomendado: 1200×400px.</Text>
              </BlockStack>
            </InlineStack>
            <Badge tone={promoImages.length >= MAX_PROMO_IMAGES ? 'warning' : 'info'}>
              {`${promoImages.length}/${MAX_PROMO_IMAGES}`}
            </Badge>
          </InlineStack>

          {/* Image gallery */}
          {promoImages.length > 0 && (
            <BlockStack gap="300">
              {promoImages.map((url, idx) => (
                <Box key={url} background="bg-surface-secondary" borderRadius="200" padding="300">
                  <InlineStack align="space-between" blockAlign="center" gap="300" wrap={false}>
                    <InlineStack gap="300" blockAlign="center" wrap={false}>
                      <Text variant="bodySm" as="span" tone="subdued" fontWeight="bold">{idx + 1}</Text>
                      <Thumbnail source={url} alt={`Promo ${idx + 1}`} size="small" />
                      <Text variant="bodySm" as="span" tone="subdued" truncate>
                        {url.split('/').pop() ?? 'imagen'}
                      </Text>
                    </InlineStack>
                    <InlineStack gap="100" blockAlign="center">
                      <Tooltip content="Mover izquierda">
                        <Button icon={ChevronLeftIcon} size="slim" variant="plain" disabled={idx === 0} onClick={() => reorderImage(idx, idx - 1)} accessibilityLabel="Mover izquierda" />
                      </Tooltip>
                      <Tooltip content="Mover derecha">
                        <Button icon={ChevronRightIcon} size="slim" variant="plain" disabled={idx === promoImages.length - 1} onClick={() => reorderImage(idx, idx + 1)} accessibilityLabel="Mover derecha" />
                      </Tooltip>
                      <Tooltip content="Eliminar imagen">
                        <Button icon={DeleteIcon} size="slim" variant="plain" tone="critical" onClick={() => removeImage(idx)} accessibilityLabel="Eliminar" />
                      </Tooltip>
                    </InlineStack>
                  </InlineStack>
                </Box>
              ))}
            </BlockStack>
          )}

          {/* Upload zone (hidden when max reached) */}
          {promoImages.length < MAX_PROMO_IMAGES && (
            <DropZone accept="image/*" type="image" allowMultiple={false} onDrop={onImageDrop} onDropAccepted={onImageAccepted}>
              {uploading ? (
                <Box padding="600">
                  <BlockStack gap="200" inlineAlign="center">
                    <Spinner size="small" />
                    <Text variant="bodySm" as="span" tone="subdued">Subiendo...</Text>
                  </BlockStack>
                </Box>
              ) : (
                <DropZone.FileUpload actionHint="JPG, PNG o WebP · Máximo 2 MB" />
              )}
            </DropZone>
          )}

          {promoImages.length >= MAX_PROMO_IMAGES && (
            <Banner tone="warning">Has alcanzado el límite de {MAX_PROMO_IMAGES} imágenes. Elimina una para subir más.</Banner>
          )}
        </BlockStack>
      </Card>

      {/* ═══════════════════════════════════════════════════
          CARD 4 — Tema visual
          ═══════════════════════════════════════════════════ */}
      <Card>
        <BlockStack gap="400">
          <InlineStack gap="200" blockAlign="center">
            <Box padding="200" background="bg-surface-secondary" borderRadius="200">
              <Icon source={PaintBrushFlatIcon} tone="info" />
            </Box>
            <BlockStack gap="050">
              <Text variant="headingMd" as="h3">Tema visual</Text>
              <Text variant="bodySm" as="p" tone="subdued">Selecciona la paleta de colores de la pantalla.</Text>
            </BlockStack>
          </InlineStack>

          <InlineStack gap="300" blockAlign="stretch">
            {CUSTOMER_DISPLAY_THEMES.map((t) => {
              const mt = THEME_META[t];
              const active = theme === t;
              return (
                <div key={t} role="button" tabIndex={0} onClick={() => onTheme(t)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onTheme(t); }} style={{ cursor: 'pointer', border: active ? `2px solid ${mt.accent}` : '2px solid transparent', borderRadius: 12, padding: 12, background: active ? 'var(--p-color-bg-surface-selected)' : 'var(--p-color-bg-surface-secondary)' }}>
                  <BlockStack gap="200" inlineAlign="center">
                    <div style={{
                      width: 40, height: 40, borderRadius: 8,
                      background: mt.bg, border: `2px solid ${mt.accent}`,
                    }} />
                    <Text variant="bodySm" as="span" fontWeight={active ? 'bold' : undefined}>{mt.label}</Text>
                    {active && <Icon source={CheckIcon} tone="success" />}
                  </BlockStack>
                </div>
              );
            })}
          </InlineStack>
        </BlockStack>
      </Card>

      {/* ═══════════════════════════════════════════════════
          CARD 5 — Animaciones
          ═══════════════════════════════════════════════════ */}
      <Card>
        <BlockStack gap="500">
          <InlineStack gap="200" blockAlign="center">
            <Box padding="200" background="bg-surface-secondary" borderRadius="200">
              <Icon source={PlayIcon} tone="info" />
            </Box>
            <BlockStack gap="050">
              <Text variant="headingMd" as="h3">Animaciones</Text>
              <Text variant="bodySm" as="p" tone="subdued">Configura cómo aparecen los elementos en la pantalla.</Text>
            </BlockStack>
          </InlineStack>

          <Divider />

          <InlineGrid columns={{ xs: 1, md: 2 }} gap="400">
            {/* Idle animation — Popover + OptionList */}
            <BlockStack gap="200">
              <Text variant="bodySm" as="p" fontWeight="semibold">Animación de entrada</Text>
              <Popover
                active={idleAnimPop}
                activator={
                  <Button onClick={() => setIdleAnimPop((p) => !p)} disclosure fullWidth textAlign="left">
                    {IDLE_ANIM_LABELS[idleAnim]}
                  </Button>
                }
                onClose={() => setIdleAnimPop(false)}
                fullWidth
              >
                <OptionList
                  onChange={(sel) => { onIdleAnim(sel[0]); }}
                  options={CUSTOMER_DISPLAY_ANIMATIONS.map((v) => ({ label: IDLE_ANIM_LABELS[v], value: v }))}
                  selected={[idleAnim]}
                />
              </Popover>
              <Text variant="bodySm" as="p" tone="subdued">Cómo entran los elementos al iniciar.</Text>
            </BlockStack>

            {/* Promo animation — Popover + OptionList */}
            <BlockStack gap="200">
              <Text variant="bodySm" as="p" fontWeight="semibold">Animación de promoción</Text>
              <Popover
                active={promoAnimPop}
                activator={
                  <Button onClick={() => setPromoAnimPop((p) => !p)} disclosure fullWidth textAlign="left">
                    {PROMO_ANIM_LABELS[promoAnim]}
                  </Button>
                }
                onClose={() => setPromoAnimPop(false)}
                fullWidth
              >
                <OptionList
                  onChange={(sel) => { onPromoAnim(sel[0]); }}
                  options={CUSTOMER_DISPLAY_PROMO_ANIMATIONS.map((v) => ({ label: PROMO_ANIM_LABELS[v], value: v }))}
                  selected={[promoAnim]}
                />
              </Popover>
              <Text variant="bodySm" as="p" tone="subdued">Efecto para la imagen/texto de promo.</Text>
            </BlockStack>
          </InlineGrid>

          <Divider />

          {/* Speed — segmented buttons */}
          <BlockStack gap="200">
            <Text variant="bodySm" as="p" fontWeight="semibold">Velocidad de transición</Text>
            <ButtonGroup variant="segmented">
              {TRANSITION_SPEEDS.map((s) => (
                <Button key={s} pressed={speed === s} onClick={() => onSpeed(s)}>
                  {SPEED_LABELS[s]}
                </Button>
              ))}
            </ButtonGroup>
          </BlockStack>
        </BlockStack>
      </Card>

      {/* ═══════════════════════════════════════════════════
          CARD 6 — Reloj y carrusel
          ═══════════════════════════════════════════════════ */}
      <Card>
        <BlockStack gap="400">
          <InlineStack gap="200" blockAlign="center">
            <Box padding="200" background="bg-surface-secondary" borderRadius="200">
              <Icon source={ClockIcon} tone="subdued" />
            </Box>
            <BlockStack gap="050">
              <Text variant="headingMd" as="h3">Reloj y carrusel</Text>
              <Text variant="bodySm" as="p" tone="subdued">Controla el reloj digital y la rotación de contenido.</Text>
            </BlockStack>
          </InlineStack>

          <Divider />

          <InlineGrid columns={{ xs: 1, md: 2 }} gap="400">
            <BlockStack gap="300">
              <Checkbox
                label="Mostrar reloj digital"
                checked={showClock}
                onChange={onShowClock}
                helpText="Hora y fecha en la pantalla de espera."
              />
              <Checkbox
                label="Carrusel automático"
                checked={carousel}
                onChange={onCarousel}
                helpText="Alterna bienvenida → promo → imagen."
              />
            </BlockStack>

            {carousel && (
              <BlockStack gap="200">
                <Text variant="bodySm" as="p" fontWeight="semibold">Intervalo del carrusel</Text>
                <RangeSlider
                  label={`${carouselSec} segundos`}
                  value={Number(carouselSec)}
                  min={3}
                  max={15}
                  step={1}
                  onChange={(v) => onCarouselSec(v as number)}
                  output
                />
                <Text variant="bodySm" as="p" tone="subdued">Tiempo entre cada slide.</Text>
              </BlockStack>
            )}
          </InlineGrid>
        </BlockStack>
      </Card>

      {/* ═══════════════════════════════════════════════════
          CARD 6.1 — Logo personalizado
          ═══════════════════════════════════════════════════ */}
      <Card>
        <BlockStack gap="400">
          <InlineStack gap="200" blockAlign="center">
            <Box padding="200" background="bg-surface-secondary" borderRadius="200">
              <Icon source={ImageIcon} tone="info" />
            </Box>
            <BlockStack gap="050">
              <Text variant="headingMd" as="h3">Logo de pantalla</Text>
              <Text variant="bodySm" as="p" tone="subdued">Logo que aparece en la pantalla de espera. Si no se configura, se usa el logo general.</Text>
            </BlockStack>
          </InlineStack>

          {customLogo ? (
            <InlineStack gap="400" blockAlign="center">
              <Thumbnail source={customLogo} alt="Logo display" size="large" />
              <Button icon={DeleteIcon} tone="critical" variant="plain" onClick={removeLogo}>Eliminar logo</Button>
            </InlineStack>
          ) : (
            <DropZone accept="image/*" type="image" allowMultiple={false} onDrop={onLogoDrop} onDropAccepted={onLogoAccepted}>
              {uploading ? (
                <Box padding="400"><BlockStack gap="200" inlineAlign="center"><Spinner size="small" /><Text variant="bodySm" as="span" tone="subdued">Subiendo...</Text></BlockStack></Box>
              ) : (
                <DropZone.FileUpload actionHint="JPG, PNG o WebP · Recomendado: cuadrado 200×200px" />
              )}
            </DropZone>
          )}
        </BlockStack>
      </Card>

      {/* ═══════════════════════════════════════════════════
          CARD 6.2 — Personalización avanzada
          ═══════════════════════════════════════════════════ */}
      <Card>
        <BlockStack gap="500">
          <InlineStack gap="200" blockAlign="center">
            <Box padding="200" background="bg-surface-secondary" borderRadius="200">
              <Icon source={TextFontIcon} tone="info" />
            </Box>
            <BlockStack gap="050">
              <Text variant="headingMd" as="h3">Personalización avanzada</Text>
              <Text variant="bodySm" as="p" tone="subdued">Tipografía, colores y comportamiento.</Text>
            </BlockStack>
          </InlineStack>

          <Divider />

          <InlineGrid columns={{ xs: 1, md: 2 }} gap="400">
            {/* Font scale */}
            <BlockStack gap="200">
              <Text variant="bodySm" as="p" fontWeight="semibold">Tamaño de fuente</Text>
              <RangeSlider
                label={`${Number(fontScale).toFixed(1)}x`}
                value={Number(fontScale) * 10}
                min={7}
                max={15}
                step={1}
                onChange={(v) => onFontScale((v as number) / 10)}
                output
              />
              <Text variant="bodySm" as="p" tone="subdued">Escala del texto: 0.7x (pequeño) → 1.5x (grande).</Text>
            </BlockStack>

            {/* Auto return */}
            <BlockStack gap="200">
              <Text variant="bodySm" as="p" fontWeight="semibold">Tiempo auto-retorno</Text>
              <RangeSlider
                label={`${autoReturnSec} segundos`}
                value={Number(autoReturnSec)}
                min={3}
                max={30}
                step={1}
                onChange={(v) => onAutoReturn(v as number)}
                output
              />
              <Text variant="bodySm" as="p" tone="subdued">Segundos para volver a pantalla de espera después de una venta.</Text>
            </BlockStack>
          </InlineGrid>

          <Divider />

          <InlineGrid columns={{ xs: 1, md: 2 }} gap="400">
            {/* Accent color */}
            <BlockStack gap="200">
              <InlineStack gap="200" blockAlign="center">
                <Icon source={ColorIcon} tone="subdued" />
                <Text variant="bodySm" as="p" fontWeight="semibold">Color de acento personalizado</Text>
              </InlineStack>
              <InlineStack gap="300" blockAlign="center">
                <Popover
                  active={colorPickerOpen}
                  onClose={() => setColorPickerOpen(false)}
                  activator={
                    <div
                      style={{ width: 36, height: 36, borderRadius: 8, background: accentColor || THEME_META[theme].accent, border: '2px solid var(--p-color-border)', cursor: 'pointer' }}
                      onClick={() => setColorPickerOpen(true)}
                      role="button"
                      tabIndex={0}
                      title="Clic para elegir color"
                    />
                  }
                >
                  <Box padding="300">
                    <ColorPicker
                      color={hexToHsb(accentColor || THEME_META[theme].accent)}
                      onChange={(hsb) => onAccentColor(hsbToHex(hsb))}
                    />
                  </Box>
                </Popover>
                <div style={{ flex: 1 }}>
                  <TextField
                    label=""
                    labelHidden
                    value={accentColor}
                    onChange={onAccentColor}
                    placeholder="#00d4aa"
                    maxLength={9}
                    autoComplete="off"
                    helpText="Hex (ej. #FF6B00). Vacío = color del tema."
                  />
                </div>
              </InlineStack>
            </BlockStack>

            {/* Sound */}
            <BlockStack gap="200">
              <InlineStack gap="200" blockAlign="center">
                <Icon source={SoundIcon} tone="subdued" />
                <Text variant="bodySm" as="p" fontWeight="semibold">Sonido de notificación</Text>
              </InlineStack>
              <Checkbox
                label="Reproducir sonido al iniciar venta"
                checked={soundEnabled}
                onChange={onSoundEnabled}
                helpText="Un beep corto cuando se agrega el primer producto."
              />
            </BlockStack>
          </InlineGrid>
        </BlockStack>
      </Card>

      {/* ═══════════════════════════════════════════════════
          CARD 6.3 — Orientación de pantalla
          ═══════════════════════════════════════════════════ */}
      <Card>
        <BlockStack gap="400">
          <InlineStack gap="200" blockAlign="center">
            <Box padding="200" background="bg-surface-secondary" borderRadius="200">
              <Icon source={MobileIcon} tone="info" />
            </Box>
            <BlockStack gap="050">
              <Text variant="headingMd" as="h3">Orientación de pantalla</Text>
              <Text variant="bodySm" as="p" tone="subdued">Selecciona según la posición de tu monitor o tablet.</Text>
            </BlockStack>
          </InlineStack>

          <InlineStack gap="300" blockAlign="stretch">
            {[
              { value: 'landscape', label: 'Horizontal', desc: 'Monitor estándar', width: 64, height: 40 },
              { value: 'portrait', label: 'Vertical', desc: 'Tablet o pantalla girada', width: 40, height: 64 },
            ].map((opt) => {
              const active = orientation === opt.value;
              return (
                <div key={opt.value} role="button" tabIndex={0} onClick={() => onOrientation(opt.value)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onOrientation(opt.value); }} style={{ cursor: 'pointer', border: active ? '2px solid var(--p-color-border-emphasis)' : '2px solid transparent', borderRadius: 12, padding: 16, background: active ? 'var(--p-color-bg-surface-selected)' : 'var(--p-color-bg-surface-secondary)', minWidth: 140 }}>
                  <BlockStack gap="200" inlineAlign="center">
                    <div style={{ width: opt.width, height: opt.height, borderRadius: 6, border: '2px solid var(--p-color-border)', background: active ? 'var(--p-color-bg-fill-info)' : 'var(--p-color-bg-surface)' }} />
                    <Text variant="bodySm" as="span" fontWeight={active ? 'bold' : undefined}>{opt.label}</Text>
                    <Text variant="bodySm" as="span" tone="subdued">{opt.desc}</Text>
                    {active && <Icon source={CheckIcon} tone="success" />}
                  </BlockStack>
                </div>
              );
            })}
          </InlineStack>
        </BlockStack>
      </Card>

      {/* ═══════════════════════════════════════════════════
          CARD 7 — Vista previa
          ═══════════════════════════════════════════════════ */}
      <PreviewCard
        theme={theme}
        welcome={welcome}
        farewell={farewell}
        promoText={promoText}
        promoImages={promoImages}
        showClock={showClock}
        storeName={storeConfig.storeName ?? 'Tu Tienda'}
      />

      {/* ═══════════════════════════════════════════════════
          CARD 8 — Info técnica
          ═══════════════════════════════════════════════════ */}
      <Card>
        <BlockStack gap="400">
          <InlineStack gap="200" blockAlign="center">
            <Box padding="200" background="bg-surface-secondary" borderRadius="200">
              <Icon source={SettingsIcon} tone="subdued" />
            </Box>
            <Text variant="headingMd" as="h3">Información técnica</Text>
          </InlineStack>
          <Divider />
          <BlockStack gap="300">
            <InlineStack align="space-between" blockAlign="center">
              <BlockStack gap="050">
                <Text variant="bodyMd" as="p" fontWeight="semibold">Sincronización en tiempo real</Text>
                <Text variant="bodySm" as="p" tone="subdued">Cambios se reflejan al instante en /display via BroadcastChannel.</Text>
              </BlockStack>
              <Badge tone="success">Activa</Badge>
            </InlineStack>
            <Divider />
            <InlineStack align="space-between" blockAlign="center">
              <BlockStack gap="050">
                <Text variant="bodyMd" as="p" fontWeight="semibold">Auto-retorno a espera</Text>
                <Text variant="bodySm" as="p" tone="subdued">Después de cada venta, la pantalla vuelve al modo espera automáticamente.</Text>
              </BlockStack>
              <Badge tone="info">{autoReturnSec} segundos</Badge>
            </InlineStack>
            <Divider />
            <InlineStack align="space-between" blockAlign="center">
              <BlockStack gap="050">
                <Text variant="bodyMd" as="p" fontWeight="semibold">Modo pantalla completa</Text>
                <Text variant="bodySm" as="p" tone="subdued">Oculta la navegación del navegador automáticamente. Usa F11 para máximo efecto.</Text>
              </BlockStack>
              <Badge tone="info">Automático</Badge>
            </InlineStack>
          </BlockStack>
        </BlockStack>
      </Card>
    </BlockStack>
  );
}

// ═══════════════════════════════════════════════════════════
// Preview sub-component (keeps main component clean)
// ═══════════════════════════════════════════════════════════

interface PreviewProps {
  theme: CustomerDisplayTheme;
  welcome: string;
  farewell: string;
  promoText: string;
  promoImages: string[];
  showClock: boolean;
  storeName: string;
}

function PreviewCard({ theme, welcome, farewell, promoText, promoImages, showClock, storeName }: PreviewProps) {
  const [previewMode, setPreviewMode] = useState<'idle' | 'sale' | 'done'>('idle');
  const [key, setKey] = useState(0);
  const [previewImgIdx, setPreviewImgIdx] = useState(0);
  const replay = useCallback(() => setKey((k) => k + 1), []);
  const m = THEME_META[theme];
  const previewImg = promoImages[previewImgIdx % promoImages.length] ?? '';

  return (
    <Card>
      <BlockStack gap="400">
        <InlineStack align="space-between" blockAlign="center">
          <InlineStack gap="200" blockAlign="center">
            <Box padding="200" background="bg-surface-secondary" borderRadius="200">
              <Icon source={ViewIcon} tone="info" />
            </Box>
            <BlockStack gap="050">
              <Text variant="headingMd" as="h3">Vista previa</Text>
              <Text variant="bodySm" as="p" tone="subdued">Así se verá cada estado de la pantalla.</Text>
            </BlockStack>
          </InlineStack>
          <ButtonGroup>
            <Button size="slim" pressed={previewMode === 'idle'}  onClick={() => { setPreviewMode('idle');  replay(); }}>Espera</Button>
            <Button size="slim" pressed={previewMode === 'sale'}  onClick={() => { setPreviewMode('sale');  replay(); }}>Venta</Button>
            <Button size="slim" pressed={previewMode === 'done'}  onClick={() => { setPreviewMode('done');  replay(); }}>Finalizada</Button>
            <Tooltip content="Reproducir animación">
              <Button icon={RefreshIcon} size="slim" onClick={replay} />
            </Tooltip>
          </ButtonGroup>
        </InlineStack>

        <div style={{ borderRadius: 12, border: '1px solid var(--p-color-border)', overflow: 'hidden' }}>
          <div key={key} style={{ background: previewMode === 'idle' ? m.bg : undefined, minHeight: 250, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 }}>

            {previewMode === 'idle' && (
              <>
                <Box padding="300" borderRadius="300" background="bg-fill-success">
                  <div style={{ color: '#fff' }}><Icon source={StoreIcon} /></div>
                </Box>
                <Text variant="headingLg" as="p" alignment="center">
                  <span style={{ color: m.text }}>{welcome || '¡Bienvenido!'}</span>
                </Text>
                <Text variant="bodySm" as="p" alignment="center">
                  <span style={{ color: m.accent }}>Estamos a su servicio</span>
                </Text>
                {promoText && (
                  <Box padding="200" borderRadius="200">
                    <InlineStack gap="100" blockAlign="center" align="center">
                      <Icon source={GiftCardIcon} tone="success" />
                      <Text variant="bodySm" as="span" tone="success">{promoText}</Text>
                    </InlineStack>
                  </Box>
                )}
                {previewImg && (
                  <BlockStack gap="100" inlineAlign="center">
                    <Thumbnail source={previewImg} alt="Promo" size="large" />
                    {promoImages.length > 1 && (
                      <InlineStack gap="200" blockAlign="center" align="center">
                        <Button size="slim" variant="plain" icon={ChevronLeftIcon} onClick={() => setPreviewImgIdx((i) => (i - 1 + promoImages.length) % promoImages.length)} accessibilityLabel="Anterior" />
                        <Text variant="bodySm" as="span" tone="subdued">{(previewImgIdx % promoImages.length) + 1}/{promoImages.length}</Text>
                        <Button size="slim" variant="plain" icon={ChevronRightIcon} onClick={() => setPreviewImgIdx((i) => (i + 1) % promoImages.length)} accessibilityLabel="Siguiente" />
                      </InlineStack>
                    )}
                  </BlockStack>
                )}
                {showClock && (
                  <InlineStack gap="100" blockAlign="center">
                    <Icon source={ClockIcon} tone="subdued" />
                    <Text variant="headingSm" as="span" tone="subdued">
                      {new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </InlineStack>
                )}
              </>
            )}

            {previewMode === 'sale' && (
              <Box width="100%">
                <BlockStack gap="300">
                  <Box padding="200" background="bg-surface" borderRadius="200">
                    <InlineStack align="space-between" blockAlign="center">
                      <InlineStack gap="200" blockAlign="center">
                        <Box padding="100" background="bg-fill-success" borderRadius="100"><div style={{ color: '#fff' }}><Icon source={StoreIcon} /></div></Box>
                        <Text variant="bodySm" as="span" fontWeight="bold">{storeName}</Text>
                      </InlineStack>
                      <Badge tone="success">3 artículos</Badge>
                    </InlineStack>
                  </Box>
                  <InlineGrid columns={2} gap="300">
                    <Card>
                      <BlockStack gap="100">
                        <InlineStack align="space-between"><InlineStack gap="100"><Badge tone="success" size="small">2</Badge><Text variant="bodySm" as="span">Coca-Cola 600ml</Text></InlineStack><Text variant="bodySm" as="span" fontWeight="bold">$30.00</Text></InlineStack>
                        <InlineStack align="space-between"><InlineStack gap="100"><Badge tone="success" size="small">1</Badge><Text variant="bodySm" as="span">Pan Bimbo</Text></InlineStack><Text variant="bodySm" as="span" fontWeight="bold">$52.00</Text></InlineStack>
                      </BlockStack>
                    </Card>
                    <Card>
                      <BlockStack gap="200">
                        <InlineStack align="space-between"><Text variant="bodySm" as="span" tone="subdued">Subtotal</Text><Text variant="bodySm" as="span">$82.00</Text></InlineStack>
                        <Divider />
                        <InlineStack align="space-between"><Text variant="headingSm" as="span">TOTAL</Text><Text variant="headingMd" as="span" fontWeight="bold">$82.00</Text></InlineStack>
                        <Divider />
                        <InlineStack gap="100" blockAlign="center" align="center"><Icon source={CashDollarIcon} tone="subdued" /><Text variant="bodySm" as="span" fontWeight="bold">Efectivo</Text></InlineStack>
                      </BlockStack>
                    </Card>
                  </InlineGrid>
                </BlockStack>
              </Box>
            )}

            {previewMode === 'done' && (
              <>
                <Box padding="300" background="bg-fill-success-secondary" borderRadius="full"><Icon source={CheckIcon} tone="success" /></Box>
                <Text variant="headingLg" as="p" alignment="center" tone="success">¡Gracias por su compra!</Text>
                <Box maxWidth="280px" width="100%">
                  <Card>
                    <BlockStack gap="200">
                      <InlineStack align="space-between"><Text variant="bodySm" as="span" tone="subdued">Total</Text><Text variant="headingSm" as="span" fontWeight="bold">$82.00</Text></InlineStack>
                      <Divider />
                      <InlineStack align="space-between"><Text variant="bodySm" as="span" tone="subdued">Método</Text><Badge>Efectivo</Badge></InlineStack>
                      <InlineStack align="space-between"><Text variant="bodySm" as="span" tone="subdued">Cambio</Text><Text variant="bodySm" as="span" tone="caution" fontWeight="bold">$18.00</Text></InlineStack>
                    </BlockStack>
                  </Card>
                </Box>
                <InlineStack gap="100" blockAlign="center">
                  <Icon source={StarFilledIcon} tone="warning" />
                  <Text variant="bodySm" as="p" tone="subdued">{farewell || 'Gracias por su preferencia'}</Text>
                  <Icon source={StarFilledIcon} tone="warning" />
                </InlineStack>
              </>
            )}
          </div>
        </div>

        <InlineStack align="center">
          <Badge tone="info">
            {previewMode === 'idle' ? 'Pantalla de espera' : previewMode === 'sale' ? 'Venta activa' : 'Venta finalizada'}
          </Badge>
        </InlineStack>
      </BlockStack>
    </Card>
  );
}
