'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  Page,
  Layout,
  Card,
  Text,
  Button,
  TextField,
  InlineStack,
  BlockStack,
  Box,
  Divider,
  Icon,
  Badge,
  Modal,
  Tooltip,
  ProgressBar,
  InlineGrid,
  Popover,
  ActionList,
} from '@shopify/polaris';
import {
  DeleteIcon,
  CollectionIcon,
  PlusIcon,
  EditIcon,
  SearchIcon,
  SortIcon,
  MenuHorizontalIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
} from '@shopify/polaris-icons';
import { useDashboardStore } from '@/store/dashboardStore';
import { useToast } from '@/components/notifications/ToastProvider';

// ────────────────────────────────────────────────────
// Color palette for category avatars
// ────────────────────────────────────────────────────
const CATEGORY_COLORS = [
  { bg: '#E3F5FF', text: '#0969DA', border: '#B6E3FF' },
  { bg: '#E8F5E9', text: '#1B7F37', border: '#A7E8A7' },
  { bg: '#FFF3E0', text: '#BF5600', border: '#FFD699' },
  { bg: '#F3E8FF', text: '#6F42C1', border: '#D8B9FF' },
  { bg: '#FCE4EC', text: '#C2185B', border: '#F48FB1' },
  { bg: '#E0F7FA', text: '#006064', border: '#80DEEA' },
  { bg: '#FFF9C4', text: '#9E6E06', border: '#FFE082' },
  { bg: '#EFEBE9', text: '#5D4037', border: '#BCAAA4' },
];

function getCategoryColor(index: number) {
  return CATEGORY_COLORS[index % CATEGORY_COLORS.length];
}

function getCategoryInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export default function CategoriesPage() {
  const categories = useDashboardStore((s) => s.categories);
  const products = useDashboardStore((s) => s.products);
  const createCategory = useDashboardStore((s) => s.createCategory);
  const updateCategory = useDashboardStore((s) => s.updateCategory);
  const deleteCategory = useDashboardStore((s) => s.deleteCategory);
  const { showSuccess, showError } = useToast();

  // ── Form state ──
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Edit modal state ──
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // ── Delete confirmation modal ──
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ── Search & filter ──
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'products' | 'recent'>('recent');

  // ── Popover for actions ──
  const [activePopover, setActivePopover] = useState<string | null>(null);

  // ── Computed data ──
  const productCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of products) {
      const cat = p.category || '';
      if (cat) counts.set(cat, (counts.get(cat) ?? 0) + 1);
    }
    return counts;
  }, [products]);

  const uncategorizedCount = useMemo(
    () => products.filter((p) => !p.category).length,
    [products],
  );

  const totalCategorized = products.length - uncategorizedCount;
  const coveragePercent = products.length > 0
    ? Math.round((totalCategorized / products.length) * 100)
    : 0;

  const filteredCategories = useMemo(() => {
    let list = [...categories];

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.description && c.description.toLowerCase().includes(q)),
      );
    }

    // Sort
    switch (sortBy) {
      case 'name':
        list.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'products':
        list.sort((a, b) => {
          const countA = productCounts.get(a.id) ?? productCounts.get(a.name) ?? 0;
          const countB = productCounts.get(b.id) ?? productCounts.get(b.name) ?? 0;
          return countB - countA;
        });
        break;
      case 'recent':
        // Already sorted by createdAt DESC from server
        break;
    }

    return list;
  }, [categories, searchQuery, sortBy, productCounts]);

  // ── Handlers ──
  const handleCreate = useCallback(async () => {
    if (!newName.trim()) return;
    setIsSubmitting(true);
    try {
      await createCategory({
        name: newName.trim(),
        description: newDescription.trim() || null,
        icon: null,
      });
      setNewName('');
      setNewDescription('');
      showSuccess('Categoría creada correctamente');
    } catch {
      showError('Error al crear la categoría');
    } finally {
      setIsSubmitting(false);
    }
  }, [newName, newDescription, createCategory, showSuccess, showError]);

  const openEditModal = useCallback(
    (cat: { id: string; name: string; description?: string | null }) => {
      setEditId(cat.id);
      setEditName(cat.name);
      setEditDescription(cat.description || '');
      setEditModalOpen(true);
      setActivePopover(null);
    },
    [],
  );

  const handleUpdate = useCallback(async () => {
    if (!editId || !editName.trim()) return;
    setIsUpdating(true);
    try {
      await updateCategory(editId, {
        name: editName.trim(),
        description: editDescription.trim() || null,
      });
      setEditModalOpen(false);
      showSuccess('Categoría actualizada');
    } catch {
      showError('Error al actualizar la categoría');
    } finally {
      setIsUpdating(false);
    }
  }, [editId, editName, editDescription, updateCategory, showSuccess, showError]);

  const openDeleteModal = useCallback(
    (id: string, name: string) => {
      setDeleteTarget({ id, name });
      setDeleteModalOpen(true);
      setActivePopover(null);
    },
    [],
  );

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    const count =
      productCounts.get(deleteTarget.id) ??
      productCounts.get(deleteTarget.name) ??
      0;
    if (count > 0) {
      showError(
        `No se puede eliminar "${deleteTarget.name}" porque tiene ${count} productos asignados`,
      );
      setDeleteModalOpen(false);
      return;
    }
    setIsDeleting(true);
    try {
      await deleteCategory(deleteTarget.id);
      showSuccess('Categoría eliminada');
      setDeleteModalOpen(false);
    } catch {
      showError('No se pudo eliminar la categoría');
    } finally {
      setIsDeleting(false);
    }
  }, [deleteTarget, deleteCategory, showSuccess, showError, productCounts]);

  // ── KPI Cards ──
  const kpiCards = (
    <InlineGrid columns={{ xs: 2, md: 4 }} gap="400">
      {/* Total Categories */}
      <Card>
        <BlockStack gap="200">
          <InlineStack align="space-between" blockAlign="center">
            <Text as="span" variant="bodySm" tone="subdued">Categorías</Text>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: '#E3F5FF', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon source={CollectionIcon} tone="info" />
            </div>
          </InlineStack>
          <Text as="p" variant="headingLg" fontWeight="bold">
            {String(categories.length)}
          </Text>
        </BlockStack>
      </Card>

      {/* Cataloged Products */}
      <Card>
        <BlockStack gap="200">
          <InlineStack align="space-between" blockAlign="center">
            <Text as="span" variant="bodySm" tone="subdued">Catalogados</Text>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: '#E8F5E9', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon source={CheckCircleIcon} tone="success" />
            </div>
          </InlineStack>
          <Text as="p" variant="headingLg" fontWeight="bold">
            {String(totalCategorized)}
          </Text>
        </BlockStack>
      </Card>

      {/* Uncategorized */}
      <Card>
        <BlockStack gap="200">
          <InlineStack align="space-between" blockAlign="center">
            <Text as="span" variant="bodySm" tone="subdued">Sin categoría</Text>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: uncategorizedCount > 0 ? '#FFF3E0' : '#E8F5E9',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon
                source={uncategorizedCount > 0 ? AlertTriangleIcon : CheckCircleIcon}
                tone={uncategorizedCount > 0 ? 'caution' : 'success'}
              />
            </div>
          </InlineStack>
          <Text as="p" variant="headingLg" fontWeight="bold">
            {String(uncategorizedCount)}
          </Text>
        </BlockStack>
      </Card>

      {/* Coverage */}
      <Card>
        <BlockStack gap="200">
          <InlineStack align="space-between" blockAlign="center">
            <Text as="span" variant="bodySm" tone="subdued">Cobertura</Text>
            <Badge tone={coveragePercent >= 80 ? 'success' : coveragePercent >= 50 ? 'warning' : 'critical'}>
              {`${coveragePercent}%`}
            </Badge>
          </InlineStack>
          <ProgressBar
            progress={coveragePercent}
            tone={coveragePercent >= 80 ? 'success' : coveragePercent >= 50 ? 'highlight' : 'critical'}
            size="small"
          />
          <Text as="span" variant="bodySm" tone="subdued">
            {`${totalCategorized} de ${products.length} productos`}
          </Text>
        </BlockStack>
      </Card>
    </InlineGrid>
  );

  // ── Category Card Component ──
  const renderCategoryCard = (cat: typeof categories[number], index: number) => {
    const count = productCounts.get(cat.id) ?? productCounts.get(cat.name) ?? 0;
    const color = getCategoryColor(index);
    const initials = getCategoryInitials(cat.name);
    const isPopoverActive = activePopover === cat.id;

    return (
      <div key={cat.id} style={{ breakInside: 'avoid' }}>
        <Card>
          <InlineStack align="space-between" blockAlign="start">
            <InlineStack gap="400" blockAlign="center">
              {/* Avatar */}
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: color.bg,
                  border: `1.5px solid ${color.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Text as="span" variant="headingSm" fontWeight="bold">
                  <span style={{ color: color.text }}>{initials}</span>
                </Text>
              </div>

              {/* Info */}
              <BlockStack gap="100">
                <Text variant="headingSm" as="h3" fontWeight="semibold">
                  {cat.name}
                </Text>
                {cat.description && (
                  <Text variant="bodySm" as="p" tone="subdued">
                    {cat.description}
                  </Text>
                )}
                <InlineStack gap="200" blockAlign="center">
                  <Badge tone={count > 0 ? 'info' : undefined}>
                    {count === 1 ? '1 producto' : `${count} productos`}
                  </Badge>
                  {count === 0 && (
                    <Text variant="bodySm" as="span" tone="caution">
                      Vacía
                    </Text>
                  )}
                </InlineStack>
              </BlockStack>
            </InlineStack>

            {/* Actions */}
            <Popover
              active={isPopoverActive}
              activator={
                <Button
                  icon={MenuHorizontalIcon}
                  variant="tertiary"
                  accessibilityLabel="Acciones de categoría"
                  onClick={() =>
                    setActivePopover(isPopoverActive ? null : cat.id)
                  }
                />
              }
              onClose={() => setActivePopover(null)}
              preferredAlignment="right"
            >
              <ActionList
                items={[
                  {
                    content: 'Editar',
                    icon: EditIcon,
                    onAction: () => openEditModal(cat),
                  },
                  {
                    content: 'Eliminar',
                    icon: DeleteIcon,
                    destructive: true,
                    disabled: count > 0,
                    helpText: count > 0 ? `Tiene ${count} productos` : undefined,
                    onAction: () => openDeleteModal(cat.id, cat.name),
                  },
                ]}
              />
            </Popover>
          </InlineStack>
        </Card>
      </div>
    );
  };

  return (
    <Page
      title="Categorías"
      subtitle="Organiza tu inventario en grupos para facilitar búsquedas y reportes"
      backAction={{ content: 'Dashboard', url: '/dashboard' }}
      primaryAction={{
        content: 'Nueva categoría',
        icon: PlusIcon,
        onAction: () => {
          const el = document.getElementById('new-category-name');
          el?.focus();
        },
      }}
    >
      <BlockStack gap="600">
        {/* KPI Cards */}
        {kpiCards}

        <Layout>
          {/* Create form */}
          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="h2" variant="headingMd">Nueva categoría</Text>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      background: '#F3E8FF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon source={PlusIcon} tone="magic" />
                  </div>
                </InlineStack>
                <Divider />
                <TextField
                  id="new-category-name"
                  label="Nombre"
                  value={newName}
                  onChange={setNewName}
                  placeholder="Ej: Abarrotes, Limpieza, Lácteos..."
                  autoComplete="off"
                  disabled={isSubmitting}
                  maxLength={100}
                  showCharacterCount
                />
                <TextField
                  label="Descripción (opcional)"
                  value={newDescription}
                  onChange={setNewDescription}
                  placeholder="Breve descripción de esta categoría"
                  autoComplete="off"
                  multiline={2}
                  disabled={isSubmitting}
                  maxLength={255}
                  showCharacterCount
                />
                <Button
                  variant="primary"
                  icon={PlusIcon}
                  onClick={handleCreate}
                  loading={isSubmitting}
                  disabled={!newName.trim()}
                  fullWidth
                  size="large"
                >
                  Crear categoría
                </Button>
              </BlockStack>
            </Card>

            {/* Quick tips */}
            {categories.length === 0 && (
              <Box paddingBlockStart="400">
                <Card>
                  <BlockStack gap="300">
                    <Text as="h3" variant="headingSm">Consejos</Text>
                    <Divider />
                    <BlockStack gap="200">
                      <InlineStack gap="200" blockAlign="center">
                        <Text as="span" variant="bodySm">•</Text>
                        <Text as="span" variant="bodySm" tone="subdued">
                          Nombres claros y cortos: "Abarrotes", "Lácteos", "Snacks"
                        </Text>
                      </InlineStack>
                      <InlineStack gap="200" blockAlign="center">
                        <Text as="span" variant="bodySm">•</Text>
                        <Text as="span" variant="bodySm" tone="subdued">
                          Usa 5-15 categorías. Ni pocas ni demasiadas.
                        </Text>
                      </InlineStack>
                      <InlineStack gap="200" blockAlign="center">
                        <Text as="span" variant="bodySm">•</Text>
                        <Text as="span" variant="bodySm" tone="subdued">
                          Asigna categorías desde la página de productos.
                        </Text>
                      </InlineStack>
                    </BlockStack>
                  </BlockStack>
                </Card>
              </Box>
            )}
          </Layout.Section>

          {/* Categories list */}
          <Layout.Section>
            <BlockStack gap="400">
              {/* Search + Sort */}
              <InlineStack gap="300" align="space-between" blockAlign="end">
                <div style={{ flex: 1, maxWidth: 400 }}>
                  <TextField
                    label=""
                    labelHidden
                    placeholder="Buscar categoría..."
                    value={searchQuery}
                    onChange={setSearchQuery}
                    prefix={<Icon source={SearchIcon} />}
                    autoComplete="off"
                    clearButton
                    onClearButtonClick={() => setSearchQuery('')}
                  />
                </div>
                <InlineStack gap="200">
                  <Tooltip content="Ordenar">
                    <Button
                      icon={SortIcon}
                      variant={sortBy !== 'recent' ? 'primary' : 'tertiary'}
                      onClick={() => {
                        const order: Array<'recent' | 'name' | 'products'> = [
                          'recent',
                          'name',
                          'products',
                        ];
                        const idx = order.indexOf(sortBy);
                        setSortBy(order[(idx + 1) % order.length]);
                      }}
                      accessibilityLabel="Cambiar orden"
                    >
                      {sortBy === 'name'
                        ? 'A-Z'
                        : sortBy === 'products'
                          ? 'Más productos'
                          : 'Recientes'}
                    </Button>
                  </Tooltip>
                </InlineStack>
              </InlineStack>

              {/* Empty state */}
              {filteredCategories.length === 0 && categories.length === 0 && (
                <Card>
                  <Box padding="800">
                    <BlockStack gap="400" inlineAlign="center">
                      <div
                        style={{
                          width: 80,
                          height: 80,
                          borderRadius: 20,
                          background: '#F3E8FF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto',
                        }}
                      >
                        <Icon source={CollectionIcon} tone="magic" />
                      </div>
                      <Text variant="headingMd" as="h2" alignment="center">
                        Organiza tu inventario
                      </Text>
                      <Text as="p" tone="subdued" alignment="center">
                        Crea categorías para agrupar productos y generar reportes más claros.
                      </Text>
                    </BlockStack>
                  </Box>
                </Card>
              )}

              {/* No search results */}
              {filteredCategories.length === 0 && categories.length > 0 && (
                <Card>
                  <Box padding="600">
                    <BlockStack gap="200" inlineAlign="center">
                      <Text variant="headingSm" as="h3" alignment="center">
                        Sin resultados
                      </Text>
                      <Text as="p" tone="subdued" alignment="center">
                        {`No hay categorías que coincidan con "${searchQuery}"`}
                      </Text>
                      <Button onClick={() => setSearchQuery('')} variant="plain">
                        Limpiar búsqueda
                      </Button>
                    </BlockStack>
                  </Box>
                </Card>
              )}

              {/* Category cards grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                  gap: '12px',
                }}
              >
                {filteredCategories.map((cat, i) => renderCategoryCard(cat, i))}
              </div>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </BlockStack>

      {/* ── Edit Modal ── */}
      <Modal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Editar categoría"
        primaryAction={{
          content: 'Guardar cambios',
          onAction: handleUpdate,
          loading: isUpdating,
          disabled: !editName.trim(),
        }}
        secondaryActions={[
          { content: 'Cancelar', onAction: () => setEditModalOpen(false) },
        ]}
      >
        <Modal.Section>
          <BlockStack gap="400">
            <TextField
              label="Nombre"
              value={editName}
              onChange={setEditName}
              autoComplete="off"
              maxLength={100}
              showCharacterCount
            />
            <TextField
              label="Descripción (opcional)"
              value={editDescription}
              onChange={setEditDescription}
              autoComplete="off"
              multiline={2}
              maxLength={255}
              showCharacterCount
            />
          </BlockStack>
        </Modal.Section>
      </Modal>

      {/* ── Delete Confirmation Modal ── */}
      <Modal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Eliminar categoría"
        primaryAction={{
          content: 'Eliminar',
          onAction: handleDelete,
          loading: isDeleting,
          destructive: true,
        }}
        secondaryActions={[
          { content: 'Cancelar', onAction: () => setDeleteModalOpen(false) },
        ]}
      >
        <Modal.Section>
          <BlockStack gap="300">
            <Text as="p">
              {`¿Estás seguro de eliminar la categoría "${deleteTarget?.name}"?`}
            </Text>
            <Text as="p" tone="subdued" variant="bodySm">
              Esta acción no se puede deshacer. Los productos asignados quedarán sin categoría.
            </Text>
          </BlockStack>
        </Modal.Section>
      </Modal>
    </Page>
  );
}
