'use client';

import { useState } from 'react';
import {
  Modal,
  BlockStack,
  InlineStack,
  Text,
  Badge,
  ProgressBar,
  Divider,
  Button,
  TextField,
  Select,
  Banner,
} from '@shopify/polaris';
import { DeleteIcon } from '@shopify/polaris-icons';
import { Product } from '@/types';
import { formatCurrency, formatDate, getDaysUntil, getStockStatus } from '@/lib/utils';
import { useDashboardStore } from '@/store/dashboardStore';

interface ProductDetailModalProps {
  product: Product | null;
  open: boolean;
  onClose: () => void;
  onSave?: (product: Product, changes: ProductChanges) => void;
}

interface ProductChanges {
  newStock?: number;
  reason?: string;
}

export function ProductDetailModal({
  product,
  open,
  onClose,
  onSave,
}: ProductDetailModalProps) {
  const [editMode, setEditMode] = useState(false);
  const [newStock, setNewStock] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const deleteProduct = useDashboardStore((s) => s.deleteProduct);

  if (!product) return null;

  const stockStatus = getStockStatus(product.currentStock, product.minStock);
  const daysUntil = product.expirationDate ? getDaysUntil(product.expirationDate) : null;

  const handleSave = () => {
    if (onSave && newStock) {
      onSave(product, {
        newStock: parseInt(newStock, 10),
        reason: adjustmentReason,
      });
    }
    setEditMode(false);
    setNewStock('');
    setAdjustmentReason('');
    onClose();
  };

  const handleDelete = async () => {
    if (!product) return;
    setDeleting(true);
    try {
      await deleteProduct(product.id);
      setShowDeleteConfirm(false);
      setDeleting(false);
      onClose();
    } catch {
      setDeleting(false);
    }
  };

  const getExpirationBadge = () => {
    if (!daysUntil) return null;
    if (daysUntil <= 0) return <Badge tone="critical">Vencido</Badge>;
    if (daysUntil <= 2) return <Badge tone="critical">{`Vence en ${daysUntil} días`}</Badge>;
    if (daysUntil <= 7) return <Badge tone="warning">{`Vence en ${daysUntil} días`}</Badge>;
    return <Badge tone="success">{`Vence en ${daysUntil} días`}</Badge>;
  };

  const adjustmentReasons = [
    { label: 'Seleccionar razón...', value: '' },
    { label: 'Recuento físico', value: 'recount' },
    { label: 'Recepción de mercancía', value: 'reception' },
    { label: 'Devolución de cliente', value: 'return' },
    { label: 'Merma/Robo', value: 'shrinkage' },
    { label: 'Error de sistema', value: 'system_error' },
    { label: 'Otro', value: 'other' },
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={product.name}
      primaryAction={
        editMode
          ? {
              content: 'Guardar Cambios',
              onAction: handleSave,
              disabled: !newStock || !adjustmentReason,
            }
          : {
              content: 'Ajustar Stock',
              onAction: () => setEditMode(true),
            }
      }
      secondaryActions={[
        {
          content: editMode ? 'Cancelar' : 'Cerrar',
          onAction: () => {
            if (editMode) {
              setEditMode(false);
              setNewStock('');
              setAdjustmentReason('');
            } else {
              onClose();
            }
          },
        },
      ]}
      size="large"
    >
      <Modal.Section>
        <BlockStack gap="400">
          {/* Header con info básica */}
          <InlineStack align="space-between">
            <BlockStack gap="100">
              <Text as="p" variant="bodySm" tone="subdued">
                SKU: {product.sku}
              </Text>
              <Text as="p" variant="bodySm" tone="subdued">
                Categoría: {product.category}
              </Text>
            </BlockStack>
            <InlineStack gap="200">
              {product.isPerishable && <Badge>Perecedero</Badge>}
              {getExpirationBadge()}
            </InlineStack>
          </InlineStack>

          <Divider />

          {/* Estado del Stock */}
          <BlockStack gap="200">
            <Text as="h4" variant="headingSm">
              Estado del Inventario
            </Text>
            <InlineStack gap="400">
              <BlockStack gap="100">
                <Text as="p" variant="bodySm" tone="subdued">
                  Stock Actual
                </Text>
                <Text as="p" variant="headingLg">
                  {product.currentStock} unidades
                </Text>
              </BlockStack>
              <BlockStack gap="100">
                <Text as="p" variant="bodySm" tone="subdued">
                  Stock Mínimo
                </Text>
                <Text as="p" variant="headingLg">
                  {product.minStock} unidades
                </Text>
              </BlockStack>
              <BlockStack gap="100">
                <Text as="p" variant="bodySm" tone="subdued">
                  Nivel
                </Text>
                <Badge
                  tone={
                    stockStatus.status === 'critical'
                      ? 'critical'
                      : stockStatus.status === 'warning'
                      ? 'warning'
                      : 'success'
                  }
                >
                  {`${Math.round(stockStatus.percentage)}%`}
                </Badge>
              </BlockStack>
            </InlineStack>
            <ProgressBar
              progress={stockStatus.percentage}
              tone={stockStatus.status === 'critical' ? 'critical' : undefined}
              size="small"
            />
          </BlockStack>

          <Divider />

          {/* Información de Precio */}
          <BlockStack gap="200">
            <Text as="h4" variant="headingSm">
              Información de Precio
            </Text>
            <InlineStack gap="400">
              <BlockStack gap="100">
                <Text as="p" variant="bodySm" tone="subdued">
                  Precio Unitario
                </Text>
                <Text as="p" variant="headingLg">
                  {formatCurrency(product.unitPrice)}
                </Text>
              </BlockStack>
              <BlockStack gap="100">
                <Text as="p" variant="bodySm" tone="subdued">
                  Valor en Inventario
                </Text>
                <Text as="p" variant="headingLg">
                  {formatCurrency(product.unitPrice * product.currentStock)}
                </Text>
              </BlockStack>
            </InlineStack>
          </BlockStack>

          {product.expirationDate && (
            <>
              <Divider />
              <BlockStack gap="200">
                <Text as="h4" variant="headingSm">
                  Información de Caducidad
                </Text>
                <InlineStack gap="400">
                  <BlockStack gap="100">
                    <Text as="p" variant="bodySm" tone="subdued">
                      Fecha de Vencimiento
                    </Text>
                    <Text as="p" variant="bodyMd">
                      {formatDate(product.expirationDate)}
                    </Text>
                  </BlockStack>
                </InlineStack>
                {daysUntil !== null && daysUntil <= 7 && (
                  <Banner
                    tone={daysUntil <= 2 ? 'critical' : 'warning'}
                    title={daysUntil <= 0 ? 'Producto Vencido' : 'Próximo a Vencer'}
                  >
                    <p>
                      {daysUntil <= 0
                        ? 'Este producto ya venció y debe ser retirado del inventario.'
                        : `Quedan ${daysUntil} día(s) para el vencimiento. Considera aplicar promociones.`}
                    </p>
                  </Banner>
                )}
              </BlockStack>
            </>
          )}

          {/* Modo de edición */}
          {editMode && (
            <>
              <Divider />
              <BlockStack gap="300">
                <Text as="h4" variant="headingSm">
                  Ajustar Inventario
                </Text>
                <Banner tone="warning">
                  <p>Los ajustes de inventario quedarán registrados en el historial.</p>
                </Banner>
                <InlineStack gap="400">
                  <TextField
                    label="Nueva Cantidad"
                    type="number"
                    value={newStock}
                    onChange={setNewStock}
                    autoComplete="off"
                    placeholder={product.currentStock.toString()}
                  />
                  <div style={{ minWidth: 250 }}>
                    <Select
                      label="Razón del Ajuste"
                      options={adjustmentReasons}
                      value={adjustmentReason}
                      onChange={setAdjustmentReason}
                    />
                  </div>
                </InlineStack>
                {newStock && (
                  <Text as="p" variant="bodySm" tone="subdued">
                    Diferencia: {parseInt(newStock, 10) - product.currentStock} unidades
                  </Text>
                )}
              </BlockStack>
            </>
          )}

          {/* Eliminar Producto */}
          <Divider />
          {showDeleteConfirm ? (
            <Banner
              tone="critical"
              title="¿Estás seguro de eliminar este producto?"
              onDismiss={() => setShowDeleteConfirm(false)}
            >
              <p style={{ marginBottom: 12 }}>
                Se eliminará <strong>{product.name}</strong> permanentemente del inventario. Esta acción no se puede deshacer.
              </p>
              <InlineStack gap="200">
                <Button
                  variant="primary"
                  tone="critical"
                  onClick={handleDelete}
                  loading={deleting}
                >
                  Sí, Eliminar
                </Button>
                <Button onClick={() => setShowDeleteConfirm(false)}>
                  Cancelar
                </Button>
              </InlineStack>
            </Banner>
          ) : (
            <InlineStack align="end">
              <Button
                variant="plain"
                tone="critical"
                icon={DeleteIcon}
                onClick={() => setShowDeleteConfirm(true)}
              >
                Eliminar Producto
              </Button>
            </InlineStack>
          )}
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
}
