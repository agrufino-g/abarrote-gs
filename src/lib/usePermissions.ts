'use client';

import { useMemo } from 'react';
import { useDashboardStore } from '@/store/dashboardStore';
import type { PermissionKey } from '@/types';

/**
 * Hook that resolves the current user's permissions from their role definition.
 * Returns helper functions to check permissions and filter UI elements.
 */
export function usePermissions() {
  const currentUserRole = useDashboardStore((s) => s.currentUserRole);
  const roleDefinitions = useDashboardStore((s) => s.roleDefinitions);

  const currentRoleDef = useMemo(() => {
    if (!currentUserRole) return null;
    return roleDefinitions.find((d) => d.id === currentUserRole.roleId) ?? null;
  }, [currentUserRole, roleDefinitions]);

  const permissions = useMemo<PermissionKey[]>(() => {
    return currentRoleDef?.permissions ?? [];
  }, [currentRoleDef]);

  const hasPermission = (key: PermissionKey): boolean => {
    return permissions.includes(key);
  };

  const hasAnyPermission = (...keys: PermissionKey[]): boolean => {
    return keys.some((k) => permissions.includes(k));
  };

  const hasAllPermissions = (...keys: PermissionKey[]): boolean => {
    return keys.every((k) => permissions.includes(k));
  };

  return {
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
