'use client';

import { InlineStack, Button } from '@shopify/polaris';

interface DeleteConfirmationProps {
  isConfirming: boolean;
  isDeleting?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  triggerLabel?: string;
  confirmLabel?: string;
}

export function DeleteConfirmation({
  isConfirming,
  isDeleting = false,
  onConfirm,
  onCancel,
  triggerLabel = 'Eliminar',
  confirmLabel = 'Confirmar',
}: DeleteConfirmationProps) {
  if (isConfirming) {
    return (
      <InlineStack gap="100">
        <Button variant="plain" tone="critical" onClick={onConfirm} loading={isDeleting}>
          {confirmLabel}
        </Button>
        <Button variant="plain" onClick={onCancel}>
          Cancelar
        </Button>
      </InlineStack>
    );
  }

  return (
    <Button variant="plain" tone="critical" onClick={onCancel}>
      {triggerLabel}
    </Button>
  );
}
