'use client';

import { Card, BlockStack, InlineStack, Text, Box, Button, TextField, Divider, Banner } from '@shopify/polaris';
import { FormSelect } from '@/components/ui/FormSelect';
import { formatCurrency } from '@/lib/utils';
import { usePermissions } from '@/hooks/usePermissions';

export interface SaleTotalsCardProps {
  subtotal: number;
  discountType: 'amount' | 'percent';
  discount: string;
  discountAmount: number;
  discountPending: boolean;
  iva: number;
  cardSurcharge: number;
  total: number;
  onDiscountTypeChange: (type: 'amount' | 'percent') => void;
  onDiscountChange: (value: string) => void;
  onApplyDiscount: () => void;
  onRemoveDiscount: () => void;
}

export function SaleTotalsCard({
  subtotal,
  discountType,
  discount,
  discountAmount,
  discountPending,
  iva,
  cardSurcharge,
  total,
  onDiscountTypeChange,
  onDiscountChange,
  onApplyDiscount,
  onRemoveDiscount,
}: SaleTotalsCardProps) {
  const { hasPermission } = usePermissions();
  return (
    <Card>
      <BlockStack gap="200">
        <InlineStack align="space-between">
          <Text as="span">Subtotal:</Text>
          <Text as="span">{formatCurrency(subtotal)}</Text>
        </InlineStack>

        {/* Discount section */}
        <Divider />
        <Text as="h3" variant="headingSm">
          Descuento
        </Text>
        <InlineStack gap="200" blockAlign="end">
          <Box minWidth="80px">
            <FormSelect
              label="Tipo"
              options={[
                { label: '$', value: 'amount' },
                { label: '%', value: 'percent' },
              ]}
              value={discountType}
              onChange={(v) => onDiscountTypeChange(v as 'amount' | 'percent')}
            />
          </Box>
          <Box minWidth="160px">
            <TextField
              label="Monto de descuento"
              labelHidden
              type="number"
              value={discount}
              onChange={onDiscountChange}
              autoComplete="off"
              prefix={discountType === 'amount' ? '$' : undefined}
              suffix={discountType === 'percent' ? '%' : undefined}
              placeholder={discountType === 'amount' ? '0.00' : '0'}
              min={0}
              max={discountType === 'percent' ? 100 : undefined}
            />
          </Box>
          <Button variant="secondary" onClick={onApplyDiscount} disabled={!discount || parseFloat(discount) <= 0}>
            {hasPermission('sales.discount') ? 'Aplicar' : 'Solicitar'}
          </Button>
          {discountAmount > 0 && (
            <Button variant="plain" tone="critical" onClick={onRemoveDiscount}>
              Quitar
            </Button>
          )}
        </InlineStack>
        {discountPending && (
          <Banner tone="warning">
            <p>Se requiere autorización de un supervisor para aplicar descuentos.</p>
          </Banner>
        )}
        {discountAmount > 0 && !discountPending && (
          <InlineStack align="space-between">
            <Text as="span" tone="success">
              Descuento aplicado ({discountType === 'percent' ? `${discount}%` : formatCurrency(discountAmount)}):
            </Text>
            <Text as="span" tone="success">
              - {formatCurrency(discountAmount)}
            </Text>
          </InlineStack>
        )}
        <Divider />

        <InlineStack align="space-between">
          <Text as="span">IVA (16%):</Text>
          <Text as="span">{formatCurrency(iva)}</Text>
        </InlineStack>
        {cardSurcharge > 0 && (
          <InlineStack align="space-between">
            <Text as="span" tone="caution">
              Comisión tarjeta (2.5% + IVA):
            </Text>
            <Text as="span" tone="caution">
              {formatCurrency(cardSurcharge)}
            </Text>
          </InlineStack>
        )}
        <Divider />
        <InlineStack align="space-between">
          <Text as="span" variant="headingMd" fontWeight="bold">
            TOTAL:
          </Text>
          <Text as="span" variant="headingMd" fontWeight="bold">
            {formatCurrency(total)}
          </Text>
        </InlineStack>
      </BlockStack>
    </Card>
  );
}
