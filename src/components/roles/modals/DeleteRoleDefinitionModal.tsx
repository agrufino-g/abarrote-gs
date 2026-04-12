'use client';

import { Modal, Text, BlockStack } from '@shopify/polaris';
import type { RoleDefinition } from '@/types';

interface DeleteRoleDefinitionModalProps {
  open: boolean;
  onClose: () => void;
  roleDef: RoleDefinition | null;
  onDelete: () => Promise<void>;
  saving: boolean;
}

export function DeleteRoleDefinitionModal({
  open,
  onClose,
  roleDef,
  onDelete,
  saving,
}: DeleteRoleDefinitionModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Eliminar rol"
      primaryAction={{
        content: 'Eliminar',
        destructive: true,
        onAction: onDelete,
        loading: saving,
      }}
      secondaryActions={[{ content: 'Cancelar', onAction: onClose }]}
    >
      <Modal.Section>
        <BlockStack gap="200">
          <Text as="p">
            Se eliminara el rol <strong>{roleDef?.name}</strong> del sistema.
          </Text>
          <Text as="p" tone="subdued">
            Los usuarios que tengan este rol asignado perderan sus permisos asociados.
          </Text>
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
}
