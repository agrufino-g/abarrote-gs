import type { StoreSet, StoreGet, FinanceSlice } from '../types';
import {
  createGasto as dbCreateGasto,
  updateGasto as dbUpdateGasto,
  deleteGasto as dbDeleteGasto,
  createProveedor as dbCreateProveedor,
  updateProveedor as dbUpdateProveedor,
  deleteProveedor as dbDeleteProveedor,
  createPedido as dbCreatePedido,
  updatePedidoStatus as dbUpdatePedidoStatus,
  receivePedido as dbReceivePedido,
  fetchAllProducts,
  fetchInventoryAlerts,
  fetchKPIData,
} from '@/app/actions/db-actions';

export const createFinanceSlice = (set: StoreSet, get: StoreGet): FinanceSlice => ({
  registerGasto: async (gastoData) => {
    try {
      const newGasto = await dbCreateGasto(gastoData);
      const state = get();
      set({ gastos: [newGasto, ...state.gastos] });
    } catch (error) {
      console.error('Error registering gasto:', error);
    }
  },

  updateGasto: async (id, data) => {
    try {
      await dbUpdateGasto(id, data);
      const state = get();
      set({ gastos: state.gastos.map(g => g.id === id ? { ...g, ...data } : g) });
    } catch (error) {
      console.error('Error updating gasto:', error);
      throw error;
    }
  },

  deleteGasto: async (id) => {
    try {
      await dbDeleteGasto(id);
      const state = get();
      set({ gastos: state.gastos.filter(g => g.id !== id) });
    } catch (error) {
      console.error('Error deleting gasto:', error);
      throw error;
    }
  },

  addProveedor: async (proveedorData) => {
    try {
      const newProveedor = await dbCreateProveedor(proveedorData);
      const state = get();
      set({ proveedores: [...state.proveedores, newProveedor] });
      return newProveedor;
    } catch (error) {
      console.error('Error adding proveedor:', error);
      throw error;
    }
  },

  updateProveedor: async (id, data) => {
    try {
      await dbUpdateProveedor(id, data);
      const state = get();
      set({ proveedores: state.proveedores.map(p => p.id === id ? { ...p, ...data } : p) });
    } catch (error) {
      console.error('Error updating proveedor:', error);
    }
  },

  deleteProveedor: async (id) => {
    try {
      await dbDeleteProveedor(id);
      const state = get();
      set({ proveedores: state.proveedores.filter(p => p.id !== id) });
    } catch (error) {
      console.error('Error deleting proveedor:', error);
      throw error;
    }
  },

  createPedido: async (pedido) => {
    try {
      const newPedido = await dbCreatePedido(pedido);
      const state = get();
      set({ pedidos: [newPedido, ...state.pedidos] });
      return newPedido;
    } catch (error) {
      console.error('Error creating pedido:', error);
      throw error;
    }
  },

  updatePedidoStatus: async (id, estado) => {
    try {
      await dbUpdatePedidoStatus(id, estado);
      const state = get();
      set({ pedidos: state.pedidos.map(p => p.id === id ? { ...p, estado } : p) });
    } catch (error) {
      console.error('Error updating pedido status:', error);
      throw error;
    }
  },

  receivePedido: async (id) => {
    try {
      await dbReceivePedido(id);
      const state = get();
      set({ pedidos: state.pedidos.map(p => p.id === id ? { ...p, estado: 'recibido' as const } : p) });
      // Receiving a pedido updates stock → refresh products, alerts, KPIs
      const [newProducts, newAlerts, newKPI] = await Promise.all([
        fetchAllProducts(),
        fetchInventoryAlerts(),
        fetchKPIData(),
      ]);
      set({ products: newProducts, inventoryAlerts: newAlerts, kpiData: newKPI });
    } catch (error) {
      console.error('Error receiving pedido:', error);
      throw error;
    }
  },
});
