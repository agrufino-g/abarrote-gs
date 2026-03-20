'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  FormLayout,
  TextField,
  Select,
  Text,
  Badge,
  Banner,
} from '@shopify/polaris';
import type { RoleDefinition, UserRoleRecord } from '@/types';

interface EditUserModalProps {
  open: boolean;
  onClose: () => void;
  selectedUser: UserRoleRecord | null;
  onSave: (data: { roleId: string; pinCode: string }) => Promise<void>;
  saving: boolean;
  roleSelectOptions: { label: string; value: string }[];
  roleMap: Map<string, RoleDefinition>;
}

export function EditUserModal({
  open,
  onClose,
  selectedUser,
  onSave,
  saving,
  roleSelectOptions,
  roleMap,
}: EditUserModalProps) {
  const [editRoleId, setEditRoleId] = useState('');
  const [editPinCode, setEditPinCode] = useState('');

  // Sync internal state when selectedUser changes
  useEffect(() => {
    if (selectedUser) {
      setEditRoleId(selectedUser.roleId);
      setEditPinCode(selectedUser.pinCode || '');
    }
  }, [selectedUser]);

  const handleSave = useCallback(() => {
    return onSave({ roleId: editRoleId, pinCode: editPinCode });
  }, [onSave, editRoleId, editPinCode]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Cambiar rol de ${selectedUser?.displayName || selectedUser?.email || ''}`}
      primaryAction={{
        content: 'Guardar cambio',
        onAction: handleSave,
        loading: saving,
      }}
      secondaryActions={[{ content: 'Cancelar', onAction: onClose }]}
    >
      <Modal.Section>
        <FormLayout>
          <Text as="p">
            Correo: <strong>{selectedUser?.email}</strong>
          </Text>
          <Text as="p">
            Rol actual: <Badge tone="info">{roleMap.get(selectedUser?.roleId ?? '')?.name || 'Sin rol'}</Badge>
          </Text>
          <Select
            label="Nuevo rol"
            options={roleSelectOptions}
            value={editRoleId}
            onChange={setEditRoleId}
          />
          <TextField
            label="Cambiar o Establecer PIN de Aprobación"
            type="password"
            value={editPinCode}
            onChange={setEditPinCode}
            autoComplete="off"
            maxLength={6}
            placeholder="Ej: 1234"
            helpText="Este usuario usará este PIN numérico para autorizar bloqueos, mermas o cortes."
          />
          {editRoleId && roleMap.get(editRoleId) && (
            <Banner tone="info">
              <p><strong>{roleMap.get(editRoleId)!.name}:</strong> {roleMap.get(editRoleId)!.description}</p>
            </Banner>
          )}
        </FormLayout>
      </Modal.Section>
    </Modal>
  );
}
