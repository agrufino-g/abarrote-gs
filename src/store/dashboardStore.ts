import { create } from 'zustand';
import { DEFAULT_STORE_CONFIG } from '@/types';
import type { DashboardStore } from './types';
import {
  fetchDashboardFromDB,
  saveStoreConfig as dbSaveStoreConfig,
} from '@/app/actions/db-actions';
import { logger } from '@/lib/logger';
import { parseError } from '@/lib/errors';

// Slices
import { createSalesSlice } from './slices/salesSlice';
import { createInventorySlice } from './slices/inventorySlice';
import { createCustomerSlice } from './slices/customerSlice';
import { createFinanceSlice } from './slices/financeSlice';
import { createRoleSlice } from './slices/roleSlice';

// Re-export the full store type for external consumers
export type { DashboardStore } from './types';

export const useDashboardStore = create<DashboardStore>((set, get) => {
  return {
    // ── Initial state ──
    layoutSelectedProduct: null,
    isProductDetailActive: false,
    openProductDetail: (product) => set({ layoutSelectedProduct: product, isProductDetailActive: true }),
    closeProductDetail: () => set({ layoutSelectedProduct: null, isProductDetailActive: false }),
    kpiData: null,
    inventoryAlerts: [],
    products: [],
    categories: [],
    salesData: [],
    saleRecords: [],
    mermaRecords: [],
    pedidos: [],
    clientes: [],
    fiadoTransactions: [],
    gastos: [],
    proveedores: [],
    cortesHistory: [],
    storeConfig: DEFAULT_STORE_CONFIG,
    inventoryAudits: [],
    devoluciones: [],
    cashMovements: [],
    loyaltyTransactions: [],
    hourlySalesData: [],
    isLoading: false,
    error: null,
    lastSyncAt: 0,

    // ── Core setters ──
    setKPIData: (data) => set({ kpiData: data }),
    setInventoryAlerts: (alerts) => set({ inventoryAlerts: alerts }),
    setSalesData: (data) => set({ salesData: data }),
    setHourlySalesData: (data) => set({ hourlySalesData: data }),
    setLoading: (loading) => set({ isLoading: loading }),
    setError: (error) => set({ error }),

    // ── Fetch all dashboard data ──
    // Shows loading spinner only on initial load (when kpiData is null).
    // Background refreshes (SyncEngine polling, visibility, cross-tab) are silent.
    fetchDashboardData: async () => {
      const isInitialLoad = get().kpiData === null;
      if (isInitialLoad) {
        set({ isLoading: true, error: null });
      }
      try {
        const data = await fetchDashboardFromDB();
        set({
          kpiData: data.kpiData,
          products: data.products,
          inventoryAlerts: data.inventoryAlerts,
          salesData: data.salesData,
          saleRecords: data.saleRecords,
          mermaRecords: data.mermaRecords,
          pedidos: data.pedidos,
          clientes: data.clientes,
          fiadoTransactions: data.fiadoTransactions,
          gastos: data.gastos,
          proveedores: data.proveedores,
          cortesHistory: data.cortesHistory,
          inventoryAudits: data.inventoryAudits,
          storeConfig: data.storeConfig,
          devoluciones: data.devoluciones,
          cashMovements: data.cashMovements,
          loyaltyTransactions: data.loyaltyTransactions,
          hourlySalesData: data.hourlySalesData,
          categories: data.categories || [],
          isLoading: false,
          lastSyncAt: Date.now(),
        });

        // ── ERROR HANDLING NIVEL 200% ──
        // Mostrar en la UI usando Sileo cada módulo que falló
        if (data.partialErrors && Array.isArray(data.partialErrors)) {
          // Import sileo dynamically or just use global if available. We can import sileo.
          import('sileo').then(({ sileo }) => {
            data.partialErrors!.forEach((err) => {
              sileo.error({
                title: err.title,
                description: err.description,
                duration: 6000,
              });
            });
          });
        }
      } catch (error) {
        // En caso de que falle toda la llamada fetchDashboardFromDB
        const { title, description } = parseError(error);
        
        logger.error('Dashboard fatal fetch failed', {
          error: error instanceof Error ? error.message : String(error),
          action: 'fetchDashboardData',
        });
        
        if (isInitialLoad) {
          set({
            error: `${title}: ${description}`,
            isLoading: false,
          });
        }
        
        // Notify user via Sileo instead of just setting internal state
        import('sileo').then(({ sileo }) => {
           sileo.error({ title, description, duration: 10000 });
        });
      }
    },

    saveStoreConfig: async (data) => {
      try {
        const updatedConfig = await dbSaveStoreConfig(data);
        set({ storeConfig: updatedConfig });
      } catch (error) {
        console.error('Error saving store config:', error);
      }
    },

    // ── Domain slices ──
    ...createSalesSlice(set, get),
    ...createInventorySlice(set, get),
    ...createCustomerSlice(set, get),
    ...createFinanceSlice(set, get),
    ...createRoleSlice(set, get),
  };
});
