import { useMemo, useCallback } from 'react';
import { useDashboardStore } from '@/store/dashboardStore';
import type { PermissionKey, RoleDefinition } from '@/types';

/**
 * Consolidated permissions hook.
 * Uses a Map for O(1) role lookups and auto-grants all permissions to Propietario.
 */
export function usePermissions() {
  const currentUserRole = useDashboardStore((s) => s.currentUserRole);
  const roleDefinitions = useDashboardStore((s) => s.roleDefinitions);

  const roleMap = useMemo(() => {
    const m = new Map<string, RoleDefinition>();
    roleDefinitions.forEach((d) => m.set(d.id, d));
    return m;
  }, [roleDefinitions]);

  const currentRoleDef = useMemo(() => {
    if (!currentUserRole) return null;
    return roleMap.get(currentUserRole.roleId) ?? null;
  }, [currentUserRole, roleMap]);

  const isOwner = currentRoleDef?.name === 'Propietario';

  const permissions = useMemo<PermissionKey[]>(() => {
    return currentRoleDef?.permissions ?? [];
  }, [currentRoleDef]);

  const hasPermission = useCallback(
    (perm: PermissionKey) => {
      if (!currentRoleDef) return false;
      if (isOwner) return true;
      return permissions.includes(perm);
    },
    [currentRoleDef, isOwner, permissions],
  );

  const hasAnyPermission = useCallback(
    (...keys: PermissionKey[]) => {
      if (!currentRoleDef) return false;
      if (isOwner) return true;
      return keys.some((k) => permissions.includes(k));
    },
    [currentRoleDef, isOwner, permissions],
  );

  const hasAllPermissions = useCallback(
    (...keys: PermissionKey[]) => {
      if (!currentRoleDef) return false;
      if (isOwner) return true;
      return keys.every((k) => permissions.includes(k));
    },
    [currentRoleDef, isOwner, permissions],
  );

  return {
    roleMap,
    currentRoleDef,
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    roleName: currentRoleDef?.name ?? 'Sin rol',
    isLoaded: currentUserRole !== null && roleDefinitions.length > 0,
  };
}

/**
 * Maps each navigation section to the permission(s) required to see it.
 * If ANY of the listed permissions is present, the section is visible.
 */
export const SECTION_PERMISSIONS: Record<string, PermissionKey[]> = {
  overview: ['dashboard.view'],
  sales: ['sales.create', 'sales.view'],
  'sales-history': ['sales.view'],
  'sales-corte': ['corte.create', 'corte.view'],
  inventory: ['inventory.view'],
  catalog: ['inventory.view'],
  customers: ['customers.view'],
  fiado: ['fiado.view', 'fiado.create'],
  expenses: ['expenses.view'],
  suppliers: ['suppliers.view'],
  pedidos: ['pedidos.view'],
  analytics: ['analytics.view'],
  reports: ['reports.view'],
  roles: ['roles.manage'],
  settings: ['settings.view'],
};
