'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  Badge,
  Banner,
  Card,
  Text,
  TextField,
  FormLayout,
  BlockStack,
  InlineStack,
  Layout,
  Checkbox,
  Button,
  DataTable,
  Spinner,
  Modal,
  Select,
} from '@shopify/polaris';
import { FormSelect } from '@/components/ui/FormSelect';
import { isValidRFC, getRFCType } from '@/lib/validation/rfc';
import { formatCurrency } from '@/lib/utils';
import type { SettingsSectionProps } from './types';
import type { CFDIRecord } from '@/types';
import { fetchCFDIRecords, cancelCFDI } from '@/app/actions/analytics-advanced-actions';

export function FiscalSection({ config, updateField }: SettingsSectionProps) {
  const rfcError =
    config.rfc && !isValidRFC(config.rfc)
      ? 'RFC inválido. Formato: 3-4 letras + 6 dígitos (AAMMDD) + 3 homoclave'
      : undefined;
  const rfcType = config.rfc ? getRFCType(config.rfc) : null;

  // ── CFDI State ──
  const [cfdiRecords, setCfdiRecords] = useState<CFDIRecord[]>([]);
  const [cfdiLoading, setCfdiLoading] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<CFDIRecord | null>(null);
  const [cancelReason, setCancelReason] = useState<'01' | '02' | '03' | '04'>('02');
  const [cancelRelatedUuid, setCancelRelatedUuid] = useState('');
  const [cancelBusy, setCancelBusy] = useState(false);

  const hasPac = Boolean(config.rfc && config.regimenFiscal);

  const loadCfdiRecords = useCallback(async () => {
    setCfdiLoading(true);
    try {
      const records = await fetchCFDIRecords();
      setCfdiRecords(records);
    } catch {
      /* non-critical */
    }
    setCfdiLoading(false);
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect -- initial data load */
  useEffect(() => {
    loadCfdiRecords();
  }, [loadCfdiRecords]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleCancelCfdi = useCallback(async () => {
    if (!cancelTarget) return;
    setCancelBusy(true);
    try {
      await cancelCFDI(cancelTarget.id, cancelReason, cancelReason === '01' ? cancelRelatedUuid : undefined);
      setCancelModalOpen(false);
      setCancelTarget(null);
      loadCfdiRecords();
    } catch {
      /* shown via toast */
    }
    setCancelBusy(false);
  }, [cancelTarget, cancelReason, cancelRelatedUuid, loadCfdiRecords]);

  const STATUS_TONE: Record<string, 'success' | 'attention' | 'critical' | 'info'> = {
    timbrada: 'success',
    pending: 'attention',
    cancelada: 'info',
    error: 'critical',
  };
  const STATUS_LABEL: Record<string, string> = {
    timbrada: 'Timbrada',
    pending: 'Pendiente',
    cancelada: 'Cancelada',
    error: 'Error',
  };

  return (
    <BlockStack gap="500">
      <Layout.AnnotatedSection
        title="Información Contable"
        description="Datos esenciales para el desglose de ventas e impuestos."
      >
        <Card>
          <FormLayout>
            <TextField
              label="Registro Federal de Contribuyentes (RFC)"
              value={config.rfc}
              onChange={(v) => updateField('rfc', v.toUpperCase())}
              autoComplete="off"
              error={rfcError}
              helpText={rfcType ? `Tipo: ${rfcType}` : 'Persona física (13 chars) o moral (12 chars)'}
              maxLength={13}
            />
            <FormLayout.Group>
              <TextField
                label="Clave del Régimen Fiscal"
                value={config.regimenFiscal}
                onChange={(v) => updateField('regimenFiscal', v)}
                autoComplete="off"
                helpText="Ej: 612, 626"
              />
              <TextField
                label="Descripción del Régimen"
                value={config.regimenDescription}
                onChange={(v) => updateField('regimenDescription', v)}
                autoComplete="off"
                helpText="Ej: RESICO"
              />
            </FormLayout.Group>
          </FormLayout>
        </Card>
      </Layout.AnnotatedSection>

      <Layout.AnnotatedSection
        title="Moneda y Tasas"
        description="Moneda por defecto y porcentaje de impuesto al valor agregado."
      >
        <Card>
          <FormLayout>
            <FormLayout.Group>
              <TextField
                label="Tasa de IVA global (%)"
                type="number"
                value={config.ivaRate}
                onChange={(v) => updateField('ivaRate', v)}
                autoComplete="off"
                suffix="%"
                helpText="Aplicado a la base gravable"
              />
              <FormSelect
                label="Moneda principal"
                options={[
                  { label: 'Peso Mexicano (MXN)', value: 'MXN' },
                  { label: 'Dólar Americano (USD)', value: 'USD' },
                ]}
                value={config.currency}
                onChange={(v) => updateField('currency', v)}
              />
            </FormLayout.Group>
            <Checkbox
              label="Los precios de los productos ya incluyen IVA"
              checked={config.pricesIncludeIva}
              onChange={(value) => updateField('pricesIncludeIva', value)}
              helpText="Si está marcado, el IVA se extraerá del total (Total / 1.16). Si no está marcado, se sumará al subtotal (Subtotal + 16%)."
            />
          </FormLayout>
        </Card>
      </Layout.AnnotatedSection>

      <Layout.AnnotatedSection
        title={
          <InlineStack gap="200" align="center" blockAlign="center">
            <Text as="h3" variant="headingMd">
              Facturación Electrónica (CFDi)
            </Text>
            <Badge tone={hasPac ? 'success' : 'attention'}>{hasPac ? 'PAC Configurado' : 'Sin PAC'}</Badge>
          </InlineStack>
        }
        description="Timbrado de facturas electrónicas ante el SAT. Configura la conexión con tu PAC autorizado."
      >
        <Card>
          <BlockStack gap="400">
            {!hasPac && (
              <Banner tone="info">
                <Text as="p" variant="bodyMd">
                  Configura las variables de entorno <code>CFDI_PAC_URL</code>, <code>CFDI_PAC_USER</code> y{' '}
                  <code>CFDI_PAC_PASSWORD</code> para habilitar el timbrado real ante el SAT. Sin PAC, los CFDIs se
                  guardan localmente.
                </Text>
              </Banner>
            )}

            {cfdiLoading ? (
              <InlineStack align="center">
                <Spinner size="small" />
              </InlineStack>
            ) : cfdiRecords.length === 0 ? (
              <Text as="p" variant="bodySm" tone="subdued">
                No hay comprobantes fiscales emitidos aún.
              </Text>
            ) : (
              <DataTable
                columnContentTypes={['text', 'text', 'text', 'numeric', 'text', 'text']}
                headings={['Folio', 'RFC Receptor', 'UUID', 'Total', 'Estado', 'Acciones']}
                rows={cfdiRecords.slice(0, 20).map((r) => [
                  r.folio,
                  r.receptorRfc,
                  r.uuid ? `${r.uuid.slice(0, 8)}…` : '—',
                  formatCurrency(r.total),
                  <Badge key={r.id} tone={STATUS_TONE[r.status] ?? 'info'}>
                    {STATUS_LABEL[r.status] ?? r.status}
                  </Badge>,
                  r.status === 'timbrada' ? (
                    <Button
                      key={`c-${r.id}`}
                      variant="plain"
                      tone="critical"
                      onClick={() => {
                        setCancelTarget(r);
                        setCancelModalOpen(true);
                      }}
                    >
                      Cancelar
                    </Button>
                  ) : (
                    '—'
                  ),
                ])}
              />
            )}
          </BlockStack>
        </Card>
      </Layout.AnnotatedSection>

      {/* ── CFDI Cancel Modal ── */}
      <Modal
        open={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        title={`Cancelar CFDI ${cancelTarget?.folio ?? ''}`}
        primaryAction={{
          content: 'Cancelar CFDI ante SAT',
          destructive: true,
          loading: cancelBusy,
          onAction: handleCancelCfdi,
        }}
        secondaryActions={[{ content: 'Cerrar', onAction: () => setCancelModalOpen(false) }]}
      >
        <Modal.Section>
          <BlockStack gap="400">
            <Select
              label="Motivo de cancelación (SAT)"
              options={[
                { label: '01 — Con relación (sustituir)', value: '01' },
                { label: '02 — Error sin relación', value: '02' },
                { label: '03 — No se llevó a cabo', value: '03' },
                { label: '04 — Nominativa en global', value: '04' },
              ]}
              value={cancelReason}
              onChange={(v) => setCancelReason(v as typeof cancelReason)}
            />
            {cancelReason === '01' && (
              <TextField
                label="UUID del CFDI sustituto"
                value={cancelRelatedUuid}
                onChange={setCancelRelatedUuid}
                autoComplete="off"
              />
            )}
          </BlockStack>
        </Modal.Section>
      </Modal>
    </BlockStack>
  );
}
