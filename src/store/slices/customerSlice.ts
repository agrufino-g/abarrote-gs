import type { StoreSet, StoreGet, CustomerSlice } from '../types';
import {
  createCliente as dbCreateCliente,
  updateCliente as dbUpdateCliente,
  deleteCliente as dbDeleteCliente,
  createFiado as dbCreateFiado,
  createAbono as dbCreateAbono,
  fetchClientes,
  fetchFiadoTransactions,
} from '@/app/actions/db-actions';

export const createCustomerSlice = (set: StoreSet, get: StoreGet): CustomerSlice => ({
  addCliente: async (clienteData) => {
    try {
      const newCliente = await dbCreateCliente(clienteData);
      const state = get();
      set({ clientes: [...state.clientes, newCliente] });
    } catch (error) {
      console.error('Error adding cliente:', error);
    }
  },

  updateCliente: async (id, data) => {
    try {
      await dbUpdateCliente(id, data);
      const state = get();
      set({ clientes: state.clientes.map(c => c.id === id ? { ...c, ...data } : c) });
    } catch (error) {
      console.error('Error updating cliente:', error);
      throw error;
    }
  },

  deleteCliente: async (id) => {
    try {
      await dbDeleteCliente(id);
      const state = get();
      set({
        clientes: state.clientes.filter(c => c.id !== id),
        fiadoTransactions: state.fiadoTransactions.filter(t => t.clienteId !== id),
      });
    } catch (error) {
      console.error('Error deleting cliente:', error);
      throw error;
    }
  },

  registerFiado: async (clienteId, amount, description, saleFolio, items) => {
    try {
      await dbCreateFiado(clienteId, amount, description, saleFolio, items);
      const [clientes, fiadoTxns] = await Promise.all([
        fetchClientes(),
        fetchFiadoTransactions(),
      ]);
      set({ clientes, fiadoTransactions: fiadoTxns });
    } catch (error) {
      console.error('Error registering fiado:', error);
    }
  },

  registerAbono: async (clienteId, amount, description) => {
    try {
      await dbCreateAbono(clienteId, amount, description);
      const [clientes, fiadoTxns] = await Promise.all([
        fetchClientes(),
        fetchFiadoTransactions(),
      ]);
      set({ clientes, fiadoTransactions: fiadoTxns });
    } catch (error) {
      console.error('Error registering abono:', error);
    }
  },
});
