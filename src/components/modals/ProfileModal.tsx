'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  Modal,
  FormLayout,
  TextField,
  BlockStack,
  InlineStack,
  Text,
  Avatar,
  Button,
  Banner,
  Divider,
  Badge,
  Box,
} from '@shopify/polaris';
import { useDashboardStore } from '@/store/dashboardStore';
import { useToast } from '@/components/notifications/ToastProvider';
import { useAuth } from '@/lib/auth/AuthContext';
import { usePermissions } from '@/lib/usePermissions';

interface ProfileModalProps {
  open: boolean;
  onClose: () => void;
}

export function ProfileModal({ open, onClose }: ProfileModalProps) {
  const { user } = useAuth();
  const { currentUserRole, updateUserProfile } = useDashboardStore();
  const { roleName } = usePermissions();
  const { showSuccess, showError } = useToast();

  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && currentUserRole) {
      setDisplayName(currentUserRole.displayName || user?.displayName || '');
      setAvatarUrl(currentUserRole.avatarUrl || user?.photoURL || '');
    }
  }, [open, currentUserRole, user]);

  const handleSave = useCallback(async () => {
    if (!user || !currentUserRole) return;
    if (!displayName.trim()) {
      showError('El nombre no puede estar vacio');
      return;
    }
    setSaving(true);
    try {
      await updateUserProfile(user.uid, {
        displayName: displayName.trim(),
        avatarUrl: avatarUrl.trim(),
      });
      showSuccess('Perfil actualizado');
      onClose();
    } catch {
      showError('Error al actualizar el perfil');
    }
    setSaving(false);
  }, [user, currentUserRole, displayName, avatarUrl, updateUserProfile, showSuccess, showError, onClose]);

  const initials = displayName
    ? displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.charAt(0).toUpperCase() || 'U';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Mi Perfil"
      primaryAction={{
        content: 'Guardar Cambios',
        onAction: handleSave,
        loading: saving,
        disabled: !displayName.trim(),
      }}
      secondaryActions={[{ content: 'Cancelar', onAction: onClose }]}
    >
      <Modal.Section>
        <BlockStack gap="400">
          {/* Avatar preview */}
          <InlineStack align="center" gap="400" blockAlign="center">
            <div style={{ width: 80, height: 80 }}>
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '3px solid #e1e3e5',
                  }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <div style={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #2c6ecb 0%, #1a4b8c 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: '28px',
                  fontWeight: 700,
                  border: '3px solid #e1e3e5',
                }}>
                  {initials}
                </div>
              )}
            </div>
            <BlockStack gap="100">
              <Text as="h3" variant="headingMd">{displayName || 'Sin nombre'}</Text>
              <Text as="p" variant="bodySm" tone="subdued">{user?.email || ''}</Text>
              <InlineStack gap="200">
                <Badge tone="info">{roleName}</Badge>
                {currentUserRole?.employeeNumber && (
                  <Badge>{currentUserRole.employeeNumber}</Badge>
                )}
              </InlineStack>
            </BlockStack>
          </InlineStack>

          <Divider />

          <FormLayout>
            <TextField
              label="Nombre completo"
              value={displayName}
              onChange={setDisplayName}
              autoComplete="name"
              placeholder="Tu nombre"
              helpText="Este nombre aparecera en tickets y reportes"
            />
            <TextField
              label="URL de foto de perfil"
              value={avatarUrl}
              onChange={setAvatarUrl}
              autoComplete="off"
              placeholder="https://ejemplo.com/mi-foto.jpg"
              helpText="Pega la URL de una imagen. Puedes subir una a imgur.com u otro servicio."
            />
          </FormLayout>

          <Divider />

          {/* Read-only info */}
          <BlockStack gap="200">
            <Text as="h3" variant="headingSm">Informacion de cuenta</Text>
            <Box padding="300" background="bg-surface-secondary" borderRadius="200">
              <BlockStack gap="200">
                <InlineStack align="space-between">
                  <Text as="span" variant="bodySm" tone="subdued">Correo electronico</Text>
                  <Text as="span" variant="bodySm">{user?.email || '—'}</Text>
                </InlineStack>
                <InlineStack align="space-between">
                  <Text as="span" variant="bodySm" tone="subdued">No. Empleado</Text>
                  <Text as="span" variant="bodySm" fontWeight="bold">{currentUserRole?.employeeNumber || '—'}</Text>
                </InlineStack>
                <InlineStack align="space-between">
                  <Text as="span" variant="bodySm" tone="subdued">Rol</Text>
                  <Text as="span" variant="bodySm">{roleName}</Text>
                </InlineStack>
                <InlineStack align="space-between">
                  <Text as="span" variant="bodySm" tone="subdued">Miembro desde</Text>
                  <Text as="span" variant="bodySm">
                    {currentUserRole ? new Date(currentUserRole.createdAt).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
                  </Text>
                </InlineStack>
              </BlockStack>
            </Box>
          </BlockStack>
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
}
