import type { StoreSet, StoreGet, SalesSlice } from '../types';
import {
  createSale as dbCreateSale,
  cancelSale as dbCancelSale,
  deleteSales as dbDeleteSales,
  deleteCortes as dbDeleteCortes,
  createCorteCaja as dbCreateCorteCaja,
  createAutoCorteCaja as dbCreateAutoCorteCaja,
  fetchSaleRecords,
  fetchSalesData,
} from '@/app/actions/sales-actions';
import {
  fetchInventoryAlerts,
  fetchKPIData,
} from '@/app/actions/inventory-actions';
import {
  fetchAllProducts,
} from '@/app/actions/product-actions';
import {
  createDevolucion as dbCreateDevolucion,
} from '@/app/actions/devolucion-actions';
import {
  fetchClientes,
} from '@/app/actions/customer-actions';
import {
  createCashMovement as dbCreateCashMovement,
} from '@/app/actions/cash-movement-actions';
import {
  fetchLoyaltyTransactions as dbFetchLoyaltyTransactions,
} from '@/app/actions/loyalty-actions';

export const createSalesSlice = (set: StoreSet, get: StoreGet): SalesSlice => ({
  registerSale: async (saleData) => {
    try {
      const newSale = await dbCreateSale(saleData);
      // A sale affects: saleRecords, salesData (daily totals), products (stock), alerts, KPIs
      const [saleRecords, salesData, products, alerts, kpi] = await Promise.all([
        fetchSaleRecords(),
        fetchSalesData(),
        fetchAllProducts(),
        fetchInventoryAlerts(),
        fetchKPIData(),
      ]);
      set({ saleRecords, salesData, products, inventoryAlerts: alerts, kpiData: kpi });
      return newSale;
    } catch (error) {
      console.error('Error registering sale:', error);
      throw error;
    }
  },

  cancelSale: async (id) => {
    try {
      await dbCancelSale(id);
      const state = get();
      set({ saleRecords: state.saleRecords.filter(s => s.id !== id) });
      // Cancellation restores stock → refresh products, alerts, KPIs, salesData
      const [salesData, products, alerts, kpi] = await Promise.all([
        fetchSalesData(),
        fetchAllProducts(),
        fetchInventoryAlerts(),
        fetchKPIData(),
      ]);
      set({ salesData, products, inventoryAlerts: alerts, kpiData: kpi });
    } catch (error) {
      console.error('Error canceling sale:', error);
      throw error;
    }
  },

  deleteSales: async (ids) => {
    try {
      await dbDeleteSales(ids);
      const state = get();
      const idSet = new Set(ids);
      set({ saleRecords: state.saleRecords.filter(s => !idSet.has(s.id)) });
      const [salesData, products, alerts, kpi] = await Promise.all([
        fetchSalesData(),
        fetchAllProducts(),
        fetchInventoryAlerts(),
        fetchKPIData(),
      ]);
      set({ salesData, products, inventoryAlerts: alerts, kpiData: kpi });
    } catch (error) {
      console.error('Error deleting sales:', error);
      throw error;
    }
  },

  deleteCortes: async (ids) => {
    try {
      await dbDeleteCortes(ids);
      const state = get();
      const idSet = new Set(ids);
      set({ cortesHistory: state.cortesHistory.filter(c => !idSet.has(c.id)) });
    } catch (error) {
      console.error('Error deleting cortes:', error);
      throw error;
    }
  },

  createCorteCaja: async (data) => {
    try {
      const corte = await dbCreateCorteCaja(data);
      const state = get();
      set({ cortesHistory: [corte, ...state.cortesHistory] });
      return corte;
    } catch (error) {
      console.error('Error creating corte de caja:', error);
      throw error;
    }
  },

  checkMidnightCorte: async () => {
    try {
      await dbCreateAutoCorteCaja();
    } catch (error) {
      console.error('Error checking midnight corte:', error);
    }
  },

  registerDevolucion: async (data) => {
    try {
      const devolucion = await dbCreateDevolucion(data);
      const state = get();
      set({ devoluciones: [devolucion, ...state.devoluciones] });
      // Refresh context (stock, clientes saldo, etc)
      await Promise.all([
        fetchAllProducts().then(products => set({ products })),
        fetchInventoryAlerts().then(alerts => set({ inventoryAlerts: alerts })),
        fetchKPIData().then(kpi => set({ kpiData: kpi })),
        fetchClientes().then(clientes => set({ clientes })),
      ]);
      return devolucion;
    } catch (error) {
      console.error('Error registering devolucion:', error);
      throw error;
    }
  },

  addCashMovement: async (data) => {
    try {
      const movement = await dbCreateCashMovement(data);
      const state = get();
      set({ cashMovements: [movement, ...state.cashMovements] });
      return movement;
    } catch (error) {
      console.error('Error adding cash movement:', error);
      throw error;
    }
  },

  fetchLoyaltyTransactions: async (clienteId?: string) => {
    try {
      const transactions = await dbFetchLoyaltyTransactions(clienteId);
      set({ loyaltyTransactions: transactions });
    } catch (error) {
      console.error('Error fetching loyalty transactions:', error);
    }
  },
});
