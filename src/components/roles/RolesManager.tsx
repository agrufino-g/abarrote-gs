'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Card,
  IndexTable,
  Text,
  Badge,
  BlockStack,
  InlineStack,
  Button,
  EmptyState,
  Box,
  Banner,
  Spinner,
} from '@shopify/polaris';
import { PersonAddIcon, DeleteIcon, EditIcon, PlusIcon } from '@shopify/polaris-icons';
import { useDashboardStore } from '@/store/dashboardStore';
import { useToast } from '@/components/notifications/ToastProvider';
import { useAuth } from '@/lib/auth/AuthContext';
import type { RoleDefinition, UserRoleRecord, PermissionKey } from '@/types';

import { RoleDefinitionFormModal } from './modals/RoleDefinitionFormModal';
import { DeleteRoleDefinitionModal } from './modals/DeleteRoleDefinitionModal';
import { AddUserModal } from './modals/AddUserModal';
import { EditUserModal } from './modals/EditUserModal';
import { DeactivateUserModal } from './modals/DeactivateUserModal';
import { PermissionsDetailModal } from './modals/PermissionsDetailModal';

// Color tones cycled for badges
const BADGE_TONES: Array<'info' | 'success' | 'warning' | 'critical' | 'attention' | 'new'> = [
  'critical', 'warning', 'info', 'success', 'new', 'attention',
];

function getBadgeTone(index: number) {
  return BADGE_TONES[index % BADGE_TONES.length];
}

export function RolesManager() {
  const { user } = useAuth();
  const roleDefinitions = useDashboardStore((s) => s.roleDefinitions);
  const userRoles = useDashboardStore((s) => s.userRoles);
  const currentUserRole = useDashboardStore((s) => s.currentUserRole);
  const fetchRoleDefinitions = useDashboardStore((s) => s.fetchRoleDefinitions);
  const createRoleDefinition = useDashboardStore((s) => s.createRoleDefinition);
  const updateRoleDefinition = useDashboardStore((s) => s.updateRoleDefinition);
  const deleteRoleDefinition = useDashboardStore((s) => s.deleteRoleDefinition);
  const fetchRoles = useDashboardStore((s) => s.fetchRoles);
  const createUserWithRole = useDashboardStore((s) => s.createUserWithRole);
  const updateRole = useDashboardStore((s) => s.updateRole);
  const updateUserPin = useDashboardStore((s) => s.updateUserPin);
  const removeRole = useDashboardStore((s) => s.removeRole);
  const ensureOwnerRole = useDashboardStore((s) => s.ensureOwnerRole);
  const generateGlobalId = useDashboardStore((s) => s.generateGlobalId);
  const deactivateUser = useDashboardStore((s) => s.deactivateUser);
  const reactivateUser = useDashboardStore((s) => s.reactivateUser);
  const { showSuccess, showError } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Role definition modal flags
  const [roleDefOpen, setRoleDefOpen] = useState(false);
  const [editingRoleDef, setEditingRoleDef] = useState<RoleDefinition | null>(null);
  const [deleteRoleDefOpen, setDeleteRoleDefOpen] = useState(false);
  const [deletingRoleDef, setDeletingRoleDef] = useState<RoleDefinition | null>(null);

  // User modal flags
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserRoleRecord | null>(null);

  // Permissions detail modal
  const [permDetailOpen, setPermDetailOpen] = useState(false);
  const [permDetailRole, setPermDetailRole] = useState<RoleDefinition | null>(null);

  // Build role lookup map
  const roleMap = useMemo(() => {
    const m = new Map<string, RoleDefinition>();
    roleDefinitions.forEach((d) => m.set(d.id, d));
    return m;
  }, [roleDefinitions]);

  // Current user's role definition (to check permissions)
  const currentRoleDef = useMemo(() => {
    if (!currentUserRole) return null;
    return roleMap.get(currentUserRole.roleId) ?? null;
  }, [currentUserRole, roleMap]);

  const canManageRoles = useMemo(() => {
    if (!currentRoleDef) return false;
    return currentRoleDef.permissions.includes('roles.manage');
  }, [currentRoleDef]);

  // Build role select options for user assignment (exclude owner for non-owners)
  const roleSelectOptions = useMemo(() => {
    return roleDefinitions
      .filter((d) => {
        if (currentRoleDef?.name === 'Propietario') return true;
        return d.name !== 'Propietario';
      })
      .map((d) => ({ label: d.name, value: d.id }));
  }, [roleDefinitions, currentRoleDef]);

  // Default role ID for new user form
  const defaultRoleId = useMemo(() => {
    const defaultRole = roleDefinitions.find((d) => d.name === 'Cajero') ?? roleDefinitions[0];
    return defaultRole?.id ?? '';
  }, [roleDefinitions]);

  useEffect(() => {
    const init = async () => {
      try {
        if (user) {
          await ensureOwnerRole(user.uid, user.email || '', user.displayName || '');
        }
        await Promise.all([fetchRoleDefinitions(), fetchRoles()]);
      } catch (err) {
        console.error('Error initializing roles:', err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [user, ensureOwnerRole, fetchRoleDefinitions, fetchRoles]);

  // ---- Role Definition handlers ----
  const openNewRoleDef = () => {
    setEditingRoleDef(null);
    setRoleDefOpen(true);
  };

  const openEditRoleDef = (def: RoleDefinition) => {
    setEditingRoleDef(def);
    setRoleDefOpen(true);
  };

  const openDeleteRoleDef = (def: RoleDefinition) => {
    setDeletingRoleDef(def);
    setDeleteRoleDefOpen(true);
  };

  const handleSaveRoleDef = useCallback(async (data: { name: string; description: string; permissions: PermissionKey[] }) => {
    if (!data.name.trim()) {
      showError('El nombre del rol es obligatorio');
      return;
    }
    if (data.permissions.length === 0) {
      showError('Selecciona al menos un permiso');
      return;
    }
    if (!user) return;
    setSaving(true);
    try {
      if (editingRoleDef) {
        await updateRoleDefinition(editingRoleDef.id, {
          name: data.name.trim(),
          description: data.description.trim(),
          permissions: data.permissions,
        });
        showSuccess(`Rol "${data.name.trim()}" actualizado`);
      } else {
        await createRoleDefinition(
          { name: data.name.trim(), description: data.description.trim(), permissions: data.permissions },
          user.uid
        );
        showSuccess(`Rol "${data.name.trim()}" creado`);
      }
      setRoleDefOpen(false);
    } catch {
      showError('Error al guardar el rol');
    } finally {
      setSaving(false);
    }
  }, [editingRoleDef, user, createRoleDefinition, updateRoleDefinition, showSuccess, showError]);

  const handleDeleteRoleDef = useCallback(async () => {
    if (!deletingRoleDef) return;
    setSaving(true);
    try {
      await deleteRoleDefinition(deletingRoleDef.id);
      showSuccess(`Rol "${deletingRoleDef.name}" eliminado`);
      setDeleteRoleDefOpen(false);
      setDeletingRoleDef(null);
    } catch {
      showError('Error al eliminar el rol');
    } finally {
      setSaving(false);
    }
  }, [deletingRoleDef, deleteRoleDefinition, showSuccess, showError]);

  // ---- User handlers ----
  const handleAddUser = useCallback(async (data: { email: string; displayName: string; password: string; roleId: string; pinCode: string }) => {
    if (!data.email.trim() || !data.password.trim()) {
      showError('El correo y la contraseña son obligatorios');
      return;
    }
    if (data.password.trim().length < 6) {
      showError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (!user || !data.roleId) return;
    setSaving(true);
    try {
      await createUserWithRole(
        {
          email: data.email.trim(),
          password: data.password.trim(),
          displayName: data.displayName.trim(),
          roleId: data.roleId,
          pinCode: data.pinCode.trim() || undefined,
        },
        user.uid
      );

      const roleName = roleMap.get(data.roleId)?.name ?? '';
      showSuccess(`Usuario creado y Rol ${roleName} asignado a ${data.email}`);
      setAddOpen(false);
    } catch (error: any) {
      console.error(error);
      if (error?.message?.includes('FirebaseAuthError') || error?.errorInfo?.code === 'auth/email-already-exists') {
        showError('Error: El correo electrónico ya está registrado en la base de datos.');
      } else {
        showError('Error al crear el usuario y asignar el rol');
      }
    } finally {
      setSaving(false);
    }
  }, [user, createUserWithRole, roleMap, showSuccess, showError]);

  const handleEditUser = useCallback(async (data: { roleId: string; pinCode: string }) => {
    if (!selectedUser || !user) return;
    setSaving(true);
    try {
      await updateRole(selectedUser.firebaseUid, data.roleId, user.uid);
      if (data.pinCode.trim()) {
        await updateUserPin(selectedUser.firebaseUid, data.pinCode.trim());
      }
      const roleName = roleMap.get(data.roleId)?.name ?? '';
      showSuccess(`Rol y accesos actualizados a ${roleName}`);
      setEditOpen(false);
      setSelectedUser(null);
    } catch {
      showError('Error al actualizar rol');
    } finally {
      setSaving(false);
    }
  }, [selectedUser, user, updateRole, updateUserPin, roleMap, showSuccess, showError]);

  const handleDeactivateUser = useCallback(async () => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      await deactivateUser(selectedUser.firebaseUid);
      showSuccess(`${selectedUser.displayName || selectedUser.email} ha sido dado de baja. Su Global ID queda reservado permanentemente.`);
      setDeleteOpen(false);
      setSelectedUser(null);
    } catch (e: unknown) {
      showError(e instanceof Error ? e.message : 'Error al dar de baja');
    } finally {
      setSaving(false);
    }
  }, [selectedUser, deactivateUser, showSuccess, showError]);

  const openEditUser = (record: UserRoleRecord) => {
    setSelectedUser(record);
    setEditOpen(true);
  };

  const openDeleteUser = (record: UserRoleRecord) => {
    setSelectedUser(record);
    setDeleteOpen(true);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <Card>
        <BlockStack align="center" inlineAlign="center">
          <Box padding="800">
            <BlockStack align="center" inlineAlign="center" gap="400">
              <Spinner size="large" />
              <Text as="p" variant="bodyMd" tone="subdued">Cargando roles...</Text>
            </BlockStack>
          </Box>
        </BlockStack>
      </Card>
    );
  }

  if (!canManageRoles) {
    return (
      <Card>
        <Banner tone="warning" title="Acceso restringido">
          <p>Solo usuarios con el permiso de gestión de roles pueden acceder a esta sección.</p>
        </Banner>
      </Card>
    );
  }

  // ---- Role Definitions Table Rows ----
  const roleDefRows = roleDefinitions.map((def, index) => {
    const tone = getBadgeTone(index);
    return (
      <IndexTable.Row id={def.id} key={def.id} position={index}>
        <IndexTable.Cell>
          <InlineStack gap="200" blockAlign="center">
            <Badge tone={tone}>{def.name}</Badge>
            {def.isSystem && (
              <Text variant="bodySm" as="span" tone="subdued">(Sistema)</Text>
            )}
          </InlineStack>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <Text variant="bodyMd" as="span" tone="subdued">{def.description}</Text>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <Button
            size="micro"
            variant="plain"
            onClick={() => { setPermDetailRole(def); setPermDetailOpen(true); }}
          >
            {`${def.permissions.length} permisos`}
          </Button>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <InlineStack gap="200">
            {!def.isSystem && (
              <>
                <Button size="micro" icon={EditIcon} onClick={() => openEditRoleDef(def)}>Editar</Button>
                <Button size="micro" icon={DeleteIcon} tone="critical" onClick={() => openDeleteRoleDef(def)}>Eliminar</Button>
              </>
            )}
            {def.isSystem && def.name !== 'Propietario' && (
              <Button size="micro" icon={EditIcon} onClick={() => openEditRoleDef(def)}>Editar permisos</Button>
            )}
            {def.isSystem && def.name === 'Propietario' && (
              <Text variant="bodySm" as="span" tone="subdued">Protegido</Text>
            )}
          </InlineStack>
        </IndexTable.Cell>
      </IndexTable.Row>
    );
  });

  const userRows = userRoles.map((record, index) => {
    const roleDef = roleMap.get(record.roleId);
    const roleIndex = roleDefinitions.findIndex((d) => d.id === record.roleId);
    const isOwnerUser = roleDef?.name === 'Propietario';
    const isSelf = record.firebaseUid === user?.uid;
    const isBaja = record.status === 'baja';

    return (
      <IndexTable.Row id={record.id} key={record.id} position={index} tone={isBaja ? 'subdued' : undefined}>
        <IndexTable.Cell>
          <InlineStack gap="200" blockAlign="center">
            <Text variant="bodyMd" fontWeight="bold" as="span" tone={isBaja ? 'subdued' : undefined}>
              {record.displayName || '(sin nombre)'}
            </Text>
            {isBaja && <Badge tone="critical">Baja</Badge>}
          </InlineStack>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <Text variant="bodyMd" as="span" tone={isBaja ? 'subdued' : undefined}>{record.email}</Text>
          {record.pinCode && (
            <div style={{ marginTop: '2px' }}>
              <Badge tone="info" size="small">PIN Asignado</Badge>
            </div>
          )}
        </IndexTable.Cell>
        <IndexTable.Cell>
          {record.globalId ? (
            <Badge tone="success">{record.globalId}</Badge>
          ) : (
            <Text variant="bodySm" as="span" tone="subdued">Sin Global ID</Text>
          )}
        </IndexTable.Cell>
        <IndexTable.Cell>
          <Badge tone={roleIndex >= 0 ? getBadgeTone(roleIndex) : 'new'}>
            {roleDef?.name || 'Sin rol'}
          </Badge>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <Text variant="bodyMd" as="span" tone="subdued">{formatDate(record.createdAt)}</Text>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <InlineStack gap="200">
            {!isOwnerUser && !isSelf && !isBaja && (
              <>
                {!record.globalId && (
                  <Button
                    size="micro"
                    variant="primary"
                    onClick={async () => {
                      try {
                        const gid = await generateGlobalId(record.firebaseUid);
                        showSuccess(`Global ID generado: ${gid}`);
                      } catch (e: unknown) {
                        showError(e instanceof Error ? e.message : 'Error al generar Global ID');
                      }
                    }}
                  >
                    Generar ID
                  </Button>
                )}
                <Button size="micro" icon={EditIcon} onClick={() => openEditUser(record)}>Editar</Button>
                <Button
                  size="micro"
                  tone="critical"
                  onClick={() => openDeleteUser(record)}
                >
                  Dar de baja
                </Button>
              </>
            )}
            {!isOwnerUser && !isSelf && isBaja && (
              <Button
                size="micro"
                onClick={async () => {
                  try {
                    await reactivateUser(record.firebaseUid);
                    showSuccess(`${record.displayName || record.email} ha sido reactivado`);
                  } catch (e: unknown) {
                    showError(e instanceof Error ? e.message : 'Error al reactivar');
                  }
                }}
              >
                Reactivar
              </Button>
            )}
            {isOwnerUser && (
              <>
                {!record.globalId && (
                  <Button
                    size="micro"
                    variant="primary"
                    onClick={async () => {
                      try {
                        const gid = await generateGlobalId(record.firebaseUid);
                        showSuccess(`Global ID generado: ${gid}`);
                      } catch (e: unknown) {
                        showError(e instanceof Error ? e.message : 'Error al generar Global ID');
                      }
                    }}
                  >
                    Generar ID
                  </Button>
                )}
                <Text variant="bodySm" as="span" tone="subdued">Protegido</Text>
              </>
            )}
            {isSelf && !isOwnerUser && (
              <Text variant="bodySm" as="span" tone="subdued">Tu cuenta</Text>
            )}
          </InlineStack>
        </IndexTable.Cell>
      </IndexTable.Row>
    );
  });

  return (
    <BlockStack gap="400">
      {/* Info banner */}
      <Banner title="Gestion de Roles" tone="info">
        <p>
          Define roles personalizados con los permisos que necesites y asignalos a los usuarios de tu equipo.
          El primer usuario registrado es automaticamente el Propietario del sistema.
        </p>
      </Banner>

      {/* ====== ROLE DEFINITIONS SECTION ====== */}
      <Card>
        <BlockStack gap="400">
          <InlineStack align="space-between" blockAlign="center">
            <Text variant="headingMd" as="h2">Definicion de Roles ({roleDefinitions.length})</Text>
            <Button variant="primary" icon={PlusIcon} onClick={openNewRoleDef}>
              Crear rol
            </Button>
          </InlineStack>

          {roleDefinitions.length === 0 ? (
            <EmptyState heading="Sin roles definidos" image="">
              <p>Crea tu primer rol personalizado para empezar a gestionar accesos.</p>
            </EmptyState>
          ) : (
            <IndexTable
              resourceName={{ singular: 'rol', plural: 'roles' }}
              itemCount={roleDefinitions.length}
              headings={[
                { title: 'Nombre' },
                { title: 'Descripcion' },
                { title: 'Permisos' },
                { title: 'Acciones' },
              ]}
              selectable={false}
            >
              {roleDefRows}
            </IndexTable>
          )}
        </BlockStack>
      </Card>

      {/* ====== USERS SECTION ====== */}
      <Card>
        <BlockStack gap="400">
          <InlineStack align="space-between" blockAlign="center">
            <Text variant="headingMd" as="h2">Usuarios y Roles ({userRoles.length})</Text>
            <Button variant="primary" icon={PersonAddIcon} onClick={() => setAddOpen(true)}>
              Agregar usuario
            </Button>
          </InlineStack>

          {userRoles.length === 0 ? (
            <EmptyState heading="Sin usuarios registrados" image="">
              <p>Agrega usuarios a tu tienda y asignales un rol para controlar su acceso.</p>
            </EmptyState>
          ) : (
            <IndexTable
              resourceName={{ singular: 'usuario', plural: 'usuarios' }}
              itemCount={userRoles.length}
              headings={[
                { title: 'Nombre' },
                { title: 'Correo' },
                { title: 'Global ID' },
                { title: 'Rol' },
                { title: 'Desde' },
                { title: 'Acciones' },
              ]}
              selectable={false}
            >
              {userRows}
            </IndexTable>
          )}
        </BlockStack>
      </Card>

      {/* ====== MODALS ====== */}
      <RoleDefinitionFormModal
        open={roleDefOpen}
        onClose={() => setRoleDefOpen(false)}
        editingRoleDef={editingRoleDef}
        onSave={handleSaveRoleDef}
        saving={saving}
      />

      <DeleteRoleDefinitionModal
        open={deleteRoleDefOpen}
        onClose={() => { setDeleteRoleDefOpen(false); setDeletingRoleDef(null); }}
        roleDef={deletingRoleDef}
        onDelete={handleDeleteRoleDef}
        saving={saving}
      />

      <AddUserModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSave={handleAddUser}
        saving={saving}
        roleSelectOptions={roleSelectOptions}
        roleMap={roleMap}
        defaultRoleId={defaultRoleId}
      />

      <EditUserModal
        open={editOpen}
        onClose={() => { setEditOpen(false); setSelectedUser(null); }}
        selectedUser={selectedUser}
        onSave={handleEditUser}
        saving={saving}
        roleSelectOptions={roleSelectOptions}
        roleMap={roleMap}
      />

      <DeactivateUserModal
        open={deleteOpen}
        onClose={() => { setDeleteOpen(false); setSelectedUser(null); }}
        selectedUser={selectedUser}
        onDeactivate={handleDeactivateUser}
        saving={saving}
      />

      <PermissionsDetailModal
        open={permDetailOpen}
        onClose={() => { setPermDetailOpen(false); setPermDetailRole(null); }}
        roleDef={permDetailRole}
      />
    </BlockStack>
  );
}
