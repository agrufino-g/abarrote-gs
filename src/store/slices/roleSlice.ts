import type { StoreSet, StoreGet, RoleSlice } from '../types';
import {
  fetchRoleDefinitions as dbFetchRoleDefinitions,
  createRoleDefinition as dbCreateRoleDefinition,
  updateRoleDefinition as dbUpdateRoleDefinition,
  deleteRoleDefinition as dbDeleteRoleDefinition,
  fetchUserRoles as dbFetchUserRoles,
  ensureOwnerRole as dbEnsureOwnerRole,
  assignUserRole as dbAssignUserRole,
  createFirebaseUserWithRole as dbCreateFirebaseUserWithRole,
  updateUserRole as dbUpdateUserRole,
  updateUserPin as dbUpdateUserPin,
  removeUserRole as dbRemoveUserRole,
  getUserRoleByUid as dbGetUserRoleByUid,
  generateGlobalId as dbGenerateGlobalId,
  deactivateUser as dbDeactivateUser,
  reactivateUser as dbReactivateUser,
  updateUserProfile as dbUpdateUserProfile,
  authorizePin as dbAuthorizePin,
} from '@/app/actions/db-actions';

export const createRoleSlice = (set: StoreSet, get: StoreGet): RoleSlice => ({
  roleDefinitions: [],
  userRoles: [],
  currentUserRole: null,

  fetchRoleDefinitions: async () => {
    try {
      const defs = await dbFetchRoleDefinitions();
      set({ roleDefinitions: defs });
    } catch (error) {
      console.error('[store:role] fetchRoleDefinitions failed', error);
    }
  },

  createRoleDefinition: async (data, createdByUid) => {
    try {
      const newDef = await dbCreateRoleDefinition(data, createdByUid);
      const state = get();
      set({ roleDefinitions: [...state.roleDefinitions, newDef] });
      return newDef;
    } catch (error) {
      console.error('[store:role] createRoleDefinition failed', error);
      throw error;
    }
  },

  updateRoleDefinition: async (id, data) => {
    try {
      await dbUpdateRoleDefinition(id, data);
      const state = get();
      set({ roleDefinitions: state.roleDefinitions.map(d => d.id === id ? { ...d, ...data, updatedAt: new Date().toISOString() } : d) });
    } catch (error) {
      console.error('[store:role] updateRoleDefinition failed', error);
      throw error;
    }
  },

  deleteRoleDefinition: async (id) => {
    try {
      await dbDeleteRoleDefinition(id);
      const state = get();
      set({ roleDefinitions: state.roleDefinitions.filter(d => d.id !== id) });
    } catch (error) {
      console.error('[store:role] deleteRoleDefinition failed', error);
      throw error;
    }
  },

  fetchRoles: async () => {
    try {
      const roles = await dbFetchUserRoles();
      set({ userRoles: roles });
    } catch (error) {
      console.error('[store:role] fetchRoles failed', error);
    }
  },

  ensureOwnerRole: async (firebaseUid, email, displayName) => {
    try {
      const role = await dbEnsureOwnerRole(firebaseUid, email, displayName);
      set({ currentUserRole: role });
      return role;
    } catch (error) {
      console.error('[store:role] ensureOwnerRole failed', error);
      throw error;
    }
  },

  assignRole: async (data, assignedByUid) => {
    try {
      const newRole = await dbAssignUserRole(data, assignedByUid);
      const state = get();
      const existing = state.userRoles.find(r => r.firebaseUid === data.firebaseUid);
      if (existing) {
        set({ userRoles: state.userRoles.map(r => r.firebaseUid === data.firebaseUid ? newRole : r) });
      } else {
        set({ userRoles: [...state.userRoles, newRole] });
      }
    } catch (error) {
      console.error('[store:role] assignRole failed', error);
      throw error;
    }
  },

  createUserWithRole: async (data, assignedByUid) => {
    try {
      const newRole = await dbCreateFirebaseUserWithRole(data, assignedByUid);
      const state = get();
      set({ userRoles: [...state.userRoles, newRole] });
    } catch (error) {
      console.error('[store:role] createUserWithRole failed', error);
      throw error;
    }
  },

  updateRole: async (firebaseUid, newRoleId, assignedByUid) => {
    try {
      await dbUpdateUserRole(firebaseUid, newRoleId, assignedByUid);
      const state = get();
      set({ userRoles: state.userRoles.map(r => r.firebaseUid === firebaseUid ? { ...r, roleId: newRoleId, updatedAt: new Date().toISOString() } : r) });
    } catch (error) {
      console.error('[store:role] updateRole failed', error);
      throw error;
    }
  },

  updateUserPin: async (firebaseUid, pinCode) => {
    try {
      await dbUpdateUserPin(firebaseUid, pinCode);
      const state = get();
      set({ userRoles: state.userRoles.map(r => r.firebaseUid === firebaseUid ? { ...r, pinCode, updatedAt: new Date().toISOString() } : r) });
      if (state.currentUserRole?.firebaseUid === firebaseUid) {
        set({ currentUserRole: { ...state.currentUserRole, pinCode } });
      }
    } catch (error) {
      console.error('[store:role] updateUserPin failed', error);
      throw error;
    }
  },

  removeRole: async (firebaseUid) => {
    try {
      await dbRemoveUserRole(firebaseUid);
      const state = get();
      set({ userRoles: state.userRoles.filter(r => r.firebaseUid !== firebaseUid) });
    } catch (error) {
      console.error('[store:role] removeRole failed', error);
      throw error;
    }
  },

  getUserRole: async (firebaseUid) => {
    try {
      const role = await dbGetUserRoleByUid(firebaseUid);
      if (role) set({ currentUserRole: role });
      return role;
    } catch (error) {
      console.error('[store:role] getUserRole failed', error);
      return null;
    }
  },

  generateGlobalId: async (firebaseUid) => {
    try {
      const globalId = await dbGenerateGlobalId(firebaseUid);
      const state = get();
      set({
        userRoles: state.userRoles.map(r =>
          r.firebaseUid === firebaseUid ? { ...r, globalId, updatedAt: new Date().toISOString() } : r
        ),
      });
      return globalId;
    } catch (error) {
      console.error('[store:role] generateGlobalId failed', error);
      throw error;
    }
  },

  deactivateUser: async (firebaseUid) => {
    try {
      await dbDeactivateUser(firebaseUid);
      const state = get();
      const now = new Date().toISOString();
      set({
        userRoles: state.userRoles.map(r =>
          r.firebaseUid === firebaseUid ? { ...r, status: 'baja' as const, deactivatedAt: now, updatedAt: now } : r
        ),
      });
    } catch (error) {
      console.error('[store:role] deactivateUser failed', error);
      throw error;
    }
  },

  reactivateUser: async (firebaseUid) => {
    try {
      await dbReactivateUser(firebaseUid);
      const state = get();
      const now = new Date().toISOString();
      set({
        userRoles: state.userRoles.map(r =>
          r.firebaseUid === firebaseUid ? { ...r, status: 'activo' as const, deactivatedAt: undefined, updatedAt: now } : r
        ),
      });
    } catch (error) {
      console.error('[store:role] reactivateUser failed', error);
      throw error;
    }
  },

  updateUserProfile: async (firebaseUid, data) => {
    try {
      const updated = await dbUpdateUserProfile(firebaseUid, data);
      const state = get();
      set({
        currentUserRole: state.currentUserRole?.firebaseUid === firebaseUid ? updated : state.currentUserRole,
        userRoles: state.userRoles.map(r => r.firebaseUid === firebaseUid ? updated : r),
      });
      return updated;
    } catch (error) {
      console.error('[store:role] updateUserProfile failed', error);
      throw error;
    }
  },

  authorizePin: async (pinCode, requiredPermission) => {
    try {
      return await dbAuthorizePin(pinCode, requiredPermission);
    } catch (error) {
      console.error('[store:role] authorizePin failed', error);
      return { success: false, error: 'Network error validating PIN' };
    }
  },
});
