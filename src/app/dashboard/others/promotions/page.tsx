'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Page,
  Layout,
  Card,
  IndexTable,
  Text,
  Badge,
  Button,
  InlineStack,
  BlockStack,
  Box,
  TextField,
  Select,
  DatePicker,
  Popover,
  InlineGrid,
  EmptyState,
  Banner,
  Spinner,
  Modal,
  Checkbox,
  Divider,
} from '@shopify/polaris';
import {
  PlusIcon,
  DeleteIcon,
  EditIcon,
  RefreshIcon,
} from '@shopify/polaris-icons';
import {
  fetchPromotions,
  createPromotion,
  updatePromotion,
  deletePromotion,
  togglePromotionActive,
} from '@/app/actions/promotion-actions';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/components/notifications/ToastProvider';
import type { Promotion, PromotionType, ApplicableTo } from '@/types';
import { PROMOTION_TYPE_LABELS } from '@/types';

const TYPE_OPTIONS = [
  { label: 'Porcentaje de descuento', value: 'percentage' },
  { label: 'Descuento fijo ($)', value: 'fixed' },
  { label: 'Compra X lleva Y (BOGO)', value: 'bogo' },
  { label: 'Paquete / combo', value: 'bundle' },
];

const APPLICABLE_OPTIONS = [
  { label: 'Todos los productos', value: 'all' },
  { label: 'Por categoría', value: 'category' },
  { label: 'Por producto', value: 'product' },
];

function getStatusBadge(promo: Promotion) {
  const now = new Date();
  const start = new Date(promo.startDate);
  const end = new Date(promo.endDate);
  if (!promo.active) return <Badge tone="critical">Inactiva</Badge>;
  if (now < start) return <Badge tone="info">Programada</Badge>;
  if (now > end) return <Badge>Expirada</Badge>;
  if (promo.usageLimit != null && promo.usageCount >= promo.usageLimit) return <Badge tone="warning">Límite alcanzado</Badge>;
  return <Badge tone="success">Activa</Badge>;
}

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null);
  const { showSuccess, showError } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchPromotions();
      setPromotions(data);
    } catch (err) {
      showError('Error al cargar promociones');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar la promoción "${name}"?`)) return;
    try {
      await deletePromotion(id);
      setPromotions((prev) => prev.filter((p) => p.id !== id));
      showSuccess('Promoción eliminada');
    } catch {
      showError('Error al eliminar');
    }
  };

  const handleToggle = async (id: string, active: boolean) => {
    try {
      await togglePromotionActive(id, !active);
      setPromotions((prev) => prev.map((p) => p.id === id ? { ...p, active: !active } : p));
    } catch {
      showError('Error al cambiar estado');
    }
  };

  const handleEdit = (promo: Promotion) => {
    setEditingPromo(promo);
    setModalOpen(true);
  };

  const handleNew = () => {
    setEditingPromo(null);
    setModalOpen(true);
  };

  const active = promotions.filter((p) => {
    const now = new Date();
    return p.active && new Date(p.startDate) <= now && new Date(p.endDate) >= now;
  });

  return (
    <Page
      title="Promociones"
      subtitle={`${promotions.length} promociones — ${active.length} activas ahora`}
      backAction={{ content: 'Dashboard', url: '/dashboard' }}
      primaryAction={{ content: 'Nueva promoción', icon: PlusIcon, onAction: handleNew }}
      secondaryActions={[
        { content: 'Actualizar', icon: RefreshIcon, onAction: load },
      ]}
    >
      <Layout>
        {/* KPI cards */}
        <Layout.Section>
          <InlineGrid columns={3} gap="400">
            <Card>
              <BlockStack gap="100">
                <Text variant="bodySm" as="p" tone="subdued">Total promociones</Text>
                <Text variant="headingLg" as="p">{String(promotions.length)}</Text>
              </BlockStack>
            </Card>
            <Card>
              <BlockStack gap="100">
                <Text variant="bodySm" as="p" tone="subdued">Activas ahora</Text>
                <Text variant="headingLg" as="p" tone="success">{String(active.length)}</Text>
              </BlockStack>
            </Card>
            <Card>
              <BlockStack gap="100">
                <Text variant="bodySm" as="p" tone="subdued">Usos totales</Text>
                <Text variant="headingLg" as="p">
                  {String(promotions.reduce((s, p) => s + p.usageCount, 0))}
                </Text>
              </BlockStack>
            </Card>
          </InlineGrid>
        </Layout.Section>

        {/* Table */}
        <Layout.Section>
          <Card padding="0">
            {loading ? (
              <Box padding="800"><InlineStack align="center"><Spinner /></InlineStack></Box>
            ) : promotions.length === 0 ? (
              <Box padding="800">
                <BlockStack gap="400" align="center">
                  <Text variant="headingMd" as="h2">Sin promociones</Text>
                  <Text as="p" tone="subdued">Crea tu primera promoción para atraer más ventas.</Text>
                  <Button variant="primary" onClick={handleNew}>Crear primera promoción</Button>
                </BlockStack>
              </Box>
            ) : (
              <IndexTable
                resourceName={{ singular: 'promoción', plural: 'promociones' }}
                itemCount={promotions.length}
                selectable={false}
                headings={[
                  { title: 'Promoción' },
                  { title: 'Tipo' },
                  { title: 'Descuento' },
                  { title: 'Vigencia' },
                  { title: 'Usos' },
                  { title: 'Estado' },
                  { title: 'Acciones' },
                ]}
              >
                {promotions.map((promo, i) => (
                  <IndexTable.Row id={promo.id} key={promo.id} position={i}>
                    <IndexTable.Cell>
                      <BlockStack gap="050">
                        <Text variant="bodyMd" as="span" fontWeight="semibold">{promo.name}</Text>
                        {promo.description && (
                          <Text variant="bodySm" as="span" tone="subdued">{promo.description}</Text>
                        )}
                      </BlockStack>
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                      <Badge>{PROMOTION_TYPE_LABELS[promo.type]}</Badge>
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                      <Text as="span" fontWeight="bold">
                        {promo.type === 'percentage' ? `${promo.value}%` : formatCurrency(promo.value)}
                      </Text>
                      {promo.minPurchase > 0 && (
                        <Text variant="bodySm" as="p" tone="subdued">
                          {`Min: ${formatCurrency(promo.minPurchase)}`}
                        </Text>
                      )}
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                      <Text variant="bodySm" as="span">
                        {new Date(promo.startDate).toLocaleDateString('es-MX')}
                      </Text>
                      <Text variant="bodySm" as="span" tone="subdued"> → </Text>
                      <Text variant="bodySm" as="span">
                        {new Date(promo.endDate).toLocaleDateString('es-MX')}
                      </Text>
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                      <Text as="span">
                        {promo.usageLimit
                          ? `${promo.usageCount}/${promo.usageLimit}`
                          : `${promo.usageCount}`}
                      </Text>
                    </IndexTable.Cell>
                    <IndexTable.Cell>{getStatusBadge(promo)}</IndexTable.Cell>
                    <IndexTable.Cell>
                      <InlineStack gap="100">
                        <Button
                          size="micro"
                          onClick={() => handleToggle(promo.id, promo.active)}
                        >
                          {promo.active ? 'Desactivar' : 'Activar'}
                        </Button>
                        <Button size="micro" icon={EditIcon} onClick={() => handleEdit(promo)} />
                        <Button size="micro" icon={DeleteIcon} tone="critical" onClick={() => handleDelete(promo.id, promo.name)} />
                      </InlineStack>
                    </IndexTable.Cell>
                  </IndexTable.Row>
                ))}
              </IndexTable>
            )}
          </Card>
        </Layout.Section>
      </Layout>

      {/* Create / Edit modal */}
      <PromotionFormModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingPromo(null); }}
        editing={editingPromo}
        onSave={load}
      />
    </Page>
  );
}

// ==================== FORM MODAL ====================

function PromotionFormModal({
  open,
  onClose,
  editing,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  editing: Promotion | null;
  onSave: () => void;
}) {
  const { showSuccess, showError } = useToast();
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<PromotionType>('percentage');
  const [value, setValue] = useState('');
  const [minPurchase, setMinPurchase] = useState('0');
  const [maxDiscount, setMaxDiscount] = useState('');
  const [applicableTo, setApplicableTo] = useState<ApplicableTo>('all');
  const [active, setActive] = useState(true);
  const [usageLimit, setUsageLimit] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });

  useEffect(() => {
    if (editing) {
      setName(editing.name);
      setDescription(editing.description);
      setType(editing.type);
      setValue(String(editing.value));
      setMinPurchase(String(editing.minPurchase));
      setMaxDiscount(editing.maxDiscount != null ? String(editing.maxDiscount) : '');
      setApplicableTo(editing.applicableTo);
      setActive(editing.active);
      setUsageLimit(editing.usageLimit != null ? String(editing.usageLimit) : '');
      setStartDate(editing.startDate.split('T')[0]);
      setEndDate(editing.endDate.split('T')[0]);
    } else {
      setName(''); setDescription(''); setType('percentage'); setValue('');
      setMinPurchase('0'); setMaxDiscount(''); setApplicableTo('all');
      setActive(true); setUsageLimit('');
      setStartDate(new Date().toISOString().split('T')[0]);
      const d = new Date(); d.setDate(d.getDate() + 7);
      setEndDate(d.toISOString().split('T')[0]);
    }
  }, [editing, open]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = {
        name,
        description,
        type,
        value: parseFloat(value) || 0,
        minPurchase: parseFloat(minPurchase) || 0,
        maxDiscount: maxDiscount ? parseFloat(maxDiscount) : null,
        applicableTo,
        applicableIds: [] as string[],
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        active,
        usageLimit: usageLimit ? parseInt(usageLimit) : null,
      };

      if (editing) {
        await updatePromotion(editing.id, data);
        showSuccess('Promoción actualizada');
      } else {
        await createPromotion(data);
        showSuccess('Promoción creada');
      }

      onSave();
      onClose();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Editar promoción' : 'Nueva promoción'}
      primaryAction={{
        content: editing ? 'Guardar cambios' : 'Crear promoción',
        onAction: handleSave,
        loading: saving,
        disabled: !name.trim() || !value,
      }}
      secondaryActions={[{ content: 'Cancelar', onAction: onClose }]}
      size="large"
    >
      <Modal.Section>
        <BlockStack gap="400">
          <TextField
            label="Nombre de la promoción"
            value={name}
            onChange={setName}
            placeholder="Ej: 2x1 en lácteos, 20% Fin de Semana..."
            autoComplete="off"
          />
          <TextField
            label="Descripción (opcional)"
            value={description}
            onChange={setDescription}
            placeholder="Detalles de la promoción"
            multiline={2}
            autoComplete="off"
          />

          <Divider />

          <InlineGrid columns={2} gap="400">
            <Select
              label="Tipo de descuento"
              options={TYPE_OPTIONS}
              value={type}
              onChange={(v) => setType(v as PromotionType)}
            />
            <TextField
              label={type === 'percentage' ? 'Porcentaje (%)' : 'Monto ($)'}
              type="number"
              value={value}
              onChange={setValue}
              placeholder={type === 'percentage' ? '15' : '50'}
              autoComplete="off"
              suffix={type === 'percentage' ? '%' : 'MXN'}
            />
          </InlineGrid>

          <InlineGrid columns={2} gap="400">
            <TextField
              label="Compra mínima ($)"
              type="number"
              value={minPurchase}
              onChange={setMinPurchase}
              autoComplete="off"
              prefix="$"
            />
            {type === 'percentage' && (
              <TextField
                label="Descuento máximo ($)"
                type="number"
                value={maxDiscount}
                onChange={setMaxDiscount}
                placeholder="Sin límite"
                autoComplete="off"
                prefix="$"
                helpText="Tope máximo de descuento"
              />
            )}
          </InlineGrid>

          <Select
            label="Aplicable a"
            options={APPLICABLE_OPTIONS}
            value={applicableTo}
            onChange={(v) => setApplicableTo(v as ApplicableTo)}
          />

          <Divider />

          <InlineGrid columns={2} gap="400">
            <TextField
              label="Fecha inicio"
              type="date"
              value={startDate}
              onChange={setStartDate}
              autoComplete="off"
            />
            <TextField
              label="Fecha fin"
              type="date"
              value={endDate}
              onChange={setEndDate}
              autoComplete="off"
            />
          </InlineGrid>

          <InlineGrid columns={2} gap="400">
            <TextField
              label="Límite de usos (opcional)"
              type="number"
              value={usageLimit}
              onChange={setUsageLimit}
              placeholder="Ilimitado"
              autoComplete="off"
              helpText="Dejar vacío para uso ilimitado"
            />
            <Box paddingBlockStart="600">
              <Checkbox
                label="Promoción activa"
                checked={active}
                onChange={setActive}
              />
            </Box>
          </InlineGrid>
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
}
