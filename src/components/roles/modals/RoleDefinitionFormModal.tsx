'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  FormLayout,
  TextField,
  Text,
  BlockStack,
  InlineStack,
  Button,
  Divider,
  Box,
  Checkbox,
  InlineGrid,
} from '@shopify/polaris';
import type { RoleDefinition, PermissionKey } from '@/types';
import { PERMISSION_LABELS, PERMISSION_GROUPS } from '@/types';

interface RoleDefinitionFormModalProps {
  open: boolean;
  onClose: () => void;
  editingRoleDef: RoleDefinition | null;
  onSave: (data: { name: string; description: string; permissions: PermissionKey[] }) => Promise<void>;
  saving: boolean;
}

export function RoleDefinitionFormModal({
  open,
  onClose,
  editingRoleDef,
  onSave,
  saving,
}: RoleDefinitionFormModalProps) {
  const [roleDefName, setRoleDefName] = useState('');
  const [roleDefDesc, setRoleDefDesc] = useState('');
  const [roleDefPerms, setRoleDefPerms] = useState<PermissionKey[]>([]);

  // Sync internal state when editingRoleDef changes
  /* eslint-disable react-hooks/set-state-in-effect -- prop-derived state sync */
  useEffect(() => {
    if (editingRoleDef) {
      setRoleDefName(editingRoleDef.name);
      setRoleDefDesc(editingRoleDef.description);
      setRoleDefPerms([...editingRoleDef.permissions]);
    } else {
      setRoleDefName('');
      setRoleDefDesc('');
      setRoleDefPerms([]);
    }
  }, [editingRoleDef]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const togglePermission = useCallback((perm: PermissionKey) => {
    setRoleDefPerms((prev) => (prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]));
  }, []);

  const handleSave = useCallback(() => {
    return onSave({
      name: roleDefName,
      description: roleDefDesc,
      permissions: roleDefPerms,
    });
  }, [onSave, roleDefName, roleDefDesc, roleDefPerms]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editingRoleDef ? `Editar rol: ${editingRoleDef.name}` : 'Crear nuevo rol'}
      primaryAction={{
        content: editingRoleDef ? 'Guardar cambios' : 'Crear rol',
        onAction: handleSave,
        loading: saving,
        disabled: !roleDefName.trim() || roleDefPerms.length === 0,
      }}
      secondaryActions={[{ content: 'Cancelar', onAction: onClose }]}
    >
      <Modal.Section>
        <FormLayout>
          <TextField
            label="Nombre del rol"
            value={roleDefName}
            onChange={setRoleDefName}
            autoComplete="off"
            placeholder="Ej: Cajero Senior"
            disabled={editingRoleDef?.isSystem && editingRoleDef?.name === 'Propietario'}
          />
          <TextField
            label="Descripcion"
            value={roleDefDesc}
            onChange={setRoleDefDesc}
            autoComplete="off"
            multiline={2}
            placeholder="Descripcion breve de lo que puede hacer este rol"
          />
        </FormLayout>
      </Modal.Section>
      <Modal.Section>
        <BlockStack gap="400">
          <InlineStack align="space-between" blockAlign="center">
            <Text variant="headingSm" as="h3">
              Permisos ({roleDefPerms.length} seleccionados)
            </Text>
            <InlineStack gap="200">
              <Button
                size="micro"
                onClick={() => {
                  const all = PERMISSION_GROUPS.flatMap((g) => g.permissions);
                  setRoleDefPerms(all);
                }}
              >
                Seleccionar todos
              </Button>
              <Button size="micro" onClick={() => setRoleDefPerms([])}>
                Limpiar
              </Button>
            </InlineStack>
          </InlineStack>
          <Divider />
          {PERMISSION_GROUPS.map((group) => {
            const allInGroup = group.permissions.every((p) => roleDefPerms.includes(p));
            const activeCount = group.permissions.filter((p) => roleDefPerms.includes(p)).length;
            return (
              <Box key={group.title}>
                <BlockStack gap="200">
                  <InlineStack gap="200" blockAlign="center">
                    <Checkbox
                      label={
                        <Text variant="headingSm" as="span">
                          {group.title} ({activeCount}/{group.permissions.length})
                        </Text>
                      }
                      checked={allInGroup}
                      onChange={() => {
                        if (allInGroup) {
                          setRoleDefPerms((prev) => prev.filter((p) => !group.permissions.includes(p)));
                        } else {
                          setRoleDefPerms((prev) => [...new Set([...prev, ...group.permissions])]);
                        }
                      }}
                    />
                  </InlineStack>
                  <Box paddingInlineStart="400">
                    <InlineGrid columns={{ xs: 1, sm: 2 }} gap="100">
                      {group.permissions.map((perm) => (
                        <Checkbox
                          key={perm}
                          label={PERMISSION_LABELS[perm]}
                          checked={roleDefPerms.includes(perm)}
                          onChange={() => togglePermission(perm)}
                        />
                      ))}
                    </InlineGrid>
                  </Box>
                </BlockStack>
              </Box>
            );
          })}
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
}
