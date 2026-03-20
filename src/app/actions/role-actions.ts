'use server';

import { requireOwner, requirePermission, requireAuth, validateId } from '@/lib/auth/guard';
import { adminAuth } from '@/lib/firebase-admin';
import { db } from '@/db';
import { userRoles, roleDefinitions } from '@/db/schema';
import { eq, isNotNull } from 'drizzle-orm';
import type { UserRoleRecord, RoleDefinition, PermissionKey } from '@/types';
import { DEFAULT_SYSTEM_ROLES } from '@/types';
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

// ==================== PIN HASHING (scrypt) ====================

function hashPin(pin: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(pin, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPin(pin: string, stored: string): boolean {
  // Support legacy unhashed PINs (no colon = plaintext)
  if (!stored.includes(':')) {
    return pin === stored;
  }
  const [salt, hash] = stored.split(':');
  const hashBuf = Buffer.from(hash, 'hex');
  const supplied = scryptSync(pin, salt, 64);
  return timingSafeEqual(hashBuf, supplied);
}

// ==================== ROLE DEFINITIONS ====================

async function seedSystemRoles(): Promise<void> {
  const existing = await db.select().from(roleDefinitions);
  if (existing.length > 0) return;

  const now = new Date();
  for (const role of DEFAULT_SYSTEM_ROLES) {
    await db.insert(roleDefinitions).values({
      id: crypto.randomUUID(),
      name: role.name,
      description: role.description,
      permissions: JSON.stringify(role.permissions),
      isSystem: role.isSystem,
      createdBy: role.createdBy,
      createdAt: now,
      updatedAt: now,
    });
  }
}

function mapRoleDef(r: typeof roleDefinitions.$inferSelect): RoleDefinition {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    permissions: JSON.parse(r.permissions) as PermissionKey[],
    isSystem: r.isSystem,
    createdBy: r.createdBy,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

export async function fetchRoleDefinitions(): Promise<RoleDefinition[]> {
  await requirePermission('roles.manage');
  await seedSystemRoles();
  const rows = await db.select().from(roleDefinitions).orderBy(roleDefinitions.createdAt);
  return rows.map(mapRoleDef);
}

export async function createRoleDefinition(
  data: { name: string; description: string; permissions: PermissionKey[] },
  createdByUid: string
): Promise<RoleDefinition> {
  await requirePermission('roles.manage');
  const id = crypto.randomUUID();
  const now = new Date();
  await db.insert(roleDefinitions).values({
    id,
    name: data.name,
    description: data.description,
    permissions: JSON.stringify(data.permissions),
    isSystem: false,
    createdBy: createdByUid,
    createdAt: now,
    updatedAt: now,
  });
  return {
    id,
    name: data.name,
    description: data.description,
    permissions: data.permissions,
    isSystem: false,
    createdBy: createdByUid,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

export async function updateRoleDefinition(
  id: string,
  data: { name?: string; description?: string; permissions?: PermissionKey[] }
): Promise<void> {
  await requirePermission('roles.manage');
  validateId(id, 'Role ID');
  const now = new Date();
  const updates: Record<string, unknown> = { updatedAt: now };
  if (data.name !== undefined) updates.name = data.name;
  if (data.description !== undefined) updates.description = data.description;
  if (data.permissions !== undefined) updates.permissions = JSON.stringify(data.permissions);
  await db.update(roleDefinitions).set(updates).where(eq(roleDefinitions.id, id));
}

export async function deleteRoleDefinition(id: string): Promise<void> {
  await requireOwner();
  validateId(id, 'Role ID');
  const rows = await db.select().from(roleDefinitions).where(eq(roleDefinitions.id, id));
  if (rows.length > 0 && rows[0].isSystem) {
    throw new Error('No se pueden eliminar roles del sistema');
  }
  await db.delete(roleDefinitions).where(eq(roleDefinitions.id, id));
}

// ==================== USER ROLES ====================

function mapUserRole(r: typeof userRoles.$inferSelect): UserRoleRecord {
  return {
    id: r.id,
    firebaseUid: r.firebaseUid,
    email: r.email,
    displayName: r.displayName,
    avatarUrl: r.avatarUrl,
    employeeNumber: r.employeeNumber,
    globalId: r.globalId ?? undefined,
    status: (r.status as 'activo' | 'baja') || 'activo',
    deactivatedAt: r.deactivatedAt?.toISOString(),
    pinCode: r.pinCode ? '••••' : undefined,
    roleId: r.roleId,
    assignedBy: r.assignedBy,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

export async function fetchUserRoles(): Promise<UserRoleRecord[]> {
  await requirePermission('roles.manage');
  const rows = await db.select().from(userRoles).orderBy(userRoles.createdAt);
  return rows.map(mapUserRole);
}

export async function getUserRoleByUid(firebaseUid: string): Promise<UserRoleRecord | null> {
  await requireAuth();
  const rows = await db.select().from(userRoles).where(eq(userRoles.firebaseUid, firebaseUid));
  if (rows.length === 0) return null;
  return mapUserRole(rows[0]);
}

export async function ensureOwnerRole(firebaseUid: string, email: string, displayName: string): Promise<UserRoleRecord> {
  await seedSystemRoles();

  const allDefs = await db.select().from(roleDefinitions);
  const ownerDef = allDefs.find(d => d.isSystem && d.name === 'Propietario');
  const viewerDef = allDefs.find(d => d.isSystem && d.name === 'Solo lectura');

  if (!ownerDef || !viewerDef) throw new Error('System roles not found');

  const existing = await db.select().from(userRoles);

  const nextNum = existing.length + 1;
  const employeeNumber = `3226${String(nextNum).padStart(2, '0')}`;

  if (existing.length === 0) {
    const id = crypto.randomUUID();
    const now = new Date();
    await db.insert(userRoles).values({
      id, firebaseUid, email,
      displayName: displayName || '', employeeNumber,
      roleId: ownerDef.id, assignedBy: firebaseUid,
      createdAt: now, updatedAt: now,
    });
    return {
      id, firebaseUid, email, displayName: displayName || '',
      avatarUrl: '', employeeNumber,
      status: 'activo' as const,
      roleId: ownerDef.id, assignedBy: firebaseUid,
      createdAt: now.toISOString(), updatedAt: now.toISOString(),
    };
  }

  const userRow = existing.find((r) => r.firebaseUid === firebaseUid);
  if (userRow) {
    if (!userRow.employeeNumber) {
      const idx = existing.indexOf(userRow) + 1;
      const empNum = `3226${String(idx).padStart(2, '0')}`;
      await db.update(userRoles).set({ employeeNumber: empNum, updatedAt: new Date() }).where(eq(userRoles.id, userRow.id));
      userRow.employeeNumber = empNum;
    }
    return mapUserRole(userRow);
  }

  const id = crypto.randomUUID();
  const now = new Date();
  await db.insert(userRoles).values({
    id, firebaseUid, email,
    displayName: displayName || '', employeeNumber,
    roleId: viewerDef.id, assignedBy: 'system',
    createdAt: now, updatedAt: now,
  });
  return {
    id, firebaseUid, email, displayName: displayName || '',
    avatarUrl: '', employeeNumber,
    status: 'activo' as const,
    roleId: viewerDef.id, assignedBy: 'system',
    createdAt: now.toISOString(), updatedAt: now.toISOString(),
  };
}

export async function assignUserRole(
  data: { firebaseUid: string; email: string; displayName: string; roleId: string },
  assignedByUid: string
): Promise<UserRoleRecord> {
  await requirePermission('roles.manage');
  const existingRows = await db.select().from(userRoles).where(eq(userRoles.firebaseUid, data.firebaseUid));

  if (existingRows.length > 0) {
    const now = new Date();
    await db.update(userRoles)
      .set({ roleId: data.roleId, displayName: data.displayName, email: data.email, updatedAt: now, assignedBy: assignedByUid })
      .where(eq(userRoles.firebaseUid, data.firebaseUid));
    return {
      id: existingRows[0].id, firebaseUid: data.firebaseUid,
      email: data.email, displayName: data.displayName,
      avatarUrl: existingRows[0].avatarUrl, employeeNumber: existingRows[0].employeeNumber,
      status: (existingRows[0].status as 'activo' | 'baja') || 'activo',
      roleId: data.roleId, assignedBy: assignedByUid,
      createdAt: existingRows[0].createdAt.toISOString(), updatedAt: now.toISOString(),
    };
  }

  const allUsers = await db.select().from(userRoles);
  const empNum = `3226${String(allUsers.length + 1).padStart(2, '0')}`;

  const id = crypto.randomUUID();
  const now = new Date();
  await db.insert(userRoles).values({
    id, firebaseUid: data.firebaseUid, email: data.email,
    displayName: data.displayName || '', employeeNumber: empNum, roleId: data.roleId,
    status: 'activo',
    assignedBy: assignedByUid, createdAt: now, updatedAt: now,
  });
  return {
    id, firebaseUid: data.firebaseUid, email: data.email,
    displayName: data.displayName || '', avatarUrl: '', employeeNumber: empNum,
    status: 'activo' as const,
    roleId: data.roleId, assignedBy: assignedByUid,
    createdAt: now.toISOString(), updatedAt: now.toISOString(),
  };
}

export async function createFirebaseUserWithRole(
  data: { email: string; password?: string; displayName: string; roleId: string; pinCode?: string },
  assignedByUid: string
): Promise<UserRoleRecord> {
  await requirePermission('roles.manage');

  const userRecord = await adminAuth.createUser({
    email: data.email,
    password: data.password || 'Temp1234!',
    displayName: data.displayName,
  });

  const newRole = await assignUserRole(
    {
      firebaseUid: userRecord.uid,
      email: data.email,
      displayName: data.displayName,
      roleId: data.roleId,
    },
    assignedByUid
  );

  if (data.pinCode) {
    await updateUserPin(userRecord.uid, data.pinCode);
  }

  return newRole;
}

export async function updateUserPin(firebaseUid: string, pinCode: string): Promise<void> {
  await requirePermission('roles.manage');
  const hashed = hashPin(pinCode);
  const now = new Date();
  await db.update(userRoles)
    .set({ pinCode: hashed, updatedAt: now })
    .where(eq(userRoles.firebaseUid, firebaseUid));
}

export async function updateUserRole(
  firebaseUid: string,
  newRoleId: string,
  assignedByUid: string
): Promise<void> {
  await requirePermission('roles.manage');
  const now = new Date();
  await db.update(userRoles)
    .set({ roleId: newRoleId, updatedAt: now, assignedBy: assignedByUid })
    .where(eq(userRoles.firebaseUid, firebaseUid));
}

export async function removeUserRole(firebaseUid: string): Promise<void> {
  await requireOwner();
  await db.delete(userRoles).where(eq(userRoles.firebaseUid, firebaseUid));
}

export async function generateGlobalId(firebaseUid: string): Promise<string> {
  await requirePermission('roles.manage');
  const rows = await db.select().from(userRoles).where(eq(userRoles.firebaseUid, firebaseUid));
  if (rows.length === 0) throw new Error('Usuario no encontrado');
  if (rows[0].globalId) throw new Error('Este usuario ya tiene un Global ID asignado. No se puede generar otro.');

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const allWithGlobalId = await db.select().from(userRoles);
  const existingIds = new Set(allWithGlobalId.map(r => r.globalId).filter(Boolean));
  let seq = existingIds.size + 1;
  let globalId = `GID-${dateStr}-${String(seq).padStart(4, '0')}`;
  while (existingIds.has(globalId)) {
    seq++;
    globalId = `GID-${dateStr}-${String(seq).padStart(4, '0')}`;
  }

  await db.update(userRoles)
    .set({ globalId, updatedAt: now })
    .where(eq(userRoles.firebaseUid, firebaseUid));

  return globalId;
}

export async function deactivateUser(firebaseUid: string): Promise<void> {
  await requireOwner();
  const rows = await db.select().from(userRoles).where(eq(userRoles.firebaseUid, firebaseUid));
  if (rows.length === 0) throw new Error('Usuario no encontrado');
  if (rows[0].status === 'baja') throw new Error('Este usuario ya está dado de baja');

  const now = new Date();
  await db.update(userRoles)
    .set({ status: 'baja', deactivatedAt: now, updatedAt: now })
    .where(eq(userRoles.firebaseUid, firebaseUid));
}

export async function reactivateUser(firebaseUid: string): Promise<void> {
  await requireOwner();
  const rows = await db.select().from(userRoles).where(eq(userRoles.firebaseUid, firebaseUid));
  if (rows.length === 0) throw new Error('Usuario no encontrado');
  if (rows[0].status === 'activo') throw new Error('Este usuario ya está activo');

  const now = new Date();
  await db.update(userRoles)
    .set({ status: 'activo', deactivatedAt: null, updatedAt: now })
    .where(eq(userRoles.firebaseUid, firebaseUid));
}

export async function updateUserProfile(
  firebaseUid: string,
  data: { displayName?: string; avatarUrl?: string }
): Promise<UserRoleRecord> {
  await requireAuth();
  const now = new Date();
  await db.update(userRoles)
    .set({ ...data, updatedAt: now })
    .where(eq(userRoles.firebaseUid, firebaseUid));
  const rows = await db.select().from(userRoles).where(eq(userRoles.firebaseUid, firebaseUid));
  if (rows.length === 0) throw new Error('User not found');
  return mapUserRole(rows[0]);
}

export async function authorizePin(
  pinCode: string,
  requiredPermission: PermissionKey
): Promise<{ success: boolean; authorizedByUid?: string; userDisplayName?: string; error?: string }> {
  try {
    // Load all users that have a PIN set and compare hashes
    const rows = await db.select().from(userRoles).where(isNotNull(userRoles.pinCode));
    const matchedUser = rows.find(r => r.pinCode && verifyPin(pinCode, r.pinCode));
    if (!matchedUser) {
      return { success: false, error: 'PIN incorrecto' };
    }

    const roles = await db.select().from(roleDefinitions).where(eq(roleDefinitions.id, matchedUser.roleId));
    if (roles.length === 0) {
      return { success: false, error: 'Rol Invalido' };
    }

    const userRoleDef = roles[0];

    let perms: PermissionKey[] = [];
    if (typeof userRoleDef.permissions === 'string') {
      try {
        perms = JSON.parse(userRoleDef.permissions) as PermissionKey[];
      } catch {
        perms = [];
      }
    } else if (Array.isArray(userRoleDef.permissions)) {
      perms = userRoleDef.permissions as PermissionKey[];
    }

    const hasPermission = perms.includes(requiredPermission) || userRoleDef.name === 'Propietario';

    if (!hasPermission) {
      return { success: false, error: 'Usuario no tiene permisos para esta acción' };
    }

    return {
      success: true,
      authorizedByUid: matchedUser.firebaseUid,
      userDisplayName: matchedUser.displayName || matchedUser.email,
    };
  } catch (error) {
    console.error('Error authorizing PIN:', error);
    return { success: false, error: 'Error del servidor al validar PIN' };
  }
}
