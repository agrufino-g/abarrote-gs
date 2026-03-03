import { create } from 'zustand';
import {
  DashboardState, KPIData, InventoryAlert, SalesData, MermaRecord, PedidoRecord,
  Product, SaleRecord, SaleItem, CorteCaja, Cliente, FiadoTransaction, Gasto, GastoCategoria,
  Proveedor,
} from '@/types';
import {
  fetchDashboardFromDB,
  createProduct as dbCreateProduct,
  createSale as dbCreateSale,
  createMerma as dbCreateMerma,
  createPedido as dbCreatePedido,
  createCliente as dbCreateCliente,
  createFiado as dbCreateFiado,
  createAbono as dbCreateAbono,
  createGasto as dbCreateGasto,
  createProveedor as dbCreateProveedor,
  updateProveedor as dbUpdateProveedor,
  createCorteCaja as dbCreateCorteCaja,
  updateProductStock as dbUpdateProductStock,
  fetchInventoryAlerts,
  fetchKPIData,
} from '@/app/actions/db-actions';

interface DashboardStore extends DashboardState {
  setKPIData: (data: KPIData) => void;
  setInventoryAlerts: (alerts: InventoryAlert[]) => void;
  setSalesData: (data: SalesData[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  fetchDashboardData: () => Promise<void>;
  registerMerma: (merma: Omit<MermaRecord, 'id'>) => Promise<void>;
  adjustStock: (productId: string, newStock: number, reason: string) => Promise<void>;
  createPedido: (pedido: Omit<PedidoRecord, 'id' | 'fecha' | 'estado'>) => Promise<void>;
  registerProduct: (product: Omit<Product, 'id'>) => Promise<void>;
  registerSale: (sale: Omit<SaleRecord, 'id' | 'folio' | 'date'>) => Promise<SaleRecord>;
  getAllProducts: () => Product[];
  // Corte de Caja
  createCorteCaja: (data: { cajero: string; efectivoContado: number; fondoInicial: number; notas: string }) => Promise<CorteCaja>;
  // Fiado / Crédito
  addCliente: (cliente: Omit<Cliente, 'id' | 'balance' | 'createdAt' | 'lastTransaction'>) => Promise<void>;
  registerFiado: (clienteId: string, amount: number, description: string, saleFolio?: string, items?: SaleItem[]) => Promise<void>;
  registerAbono: (clienteId: string, amount: number, description: string) => Promise<void>;
  // Gastos
  registerGasto: (gasto: Omit<Gasto, 'id'>) => Promise<void>;
  // Proveedores
  addProveedor: (proveedor: Omit<Proveedor, 'id' | 'ultimoPedido'>) => Promise<void>;
  updateProveedor: (id: string, data: Partial<Proveedor>) => Promise<void>;
}

export const useDashboardStore = create<DashboardStore>((set, get) => ({
  kpiData: null,
  inventoryAlerts: [],
  products: [],
  salesData: [],
  saleRecords: [],
  mermaRecords: [],
  pedidos: [],
  clientes: [],
  fiadoTransactions: [],
  gastos: [],
  proveedores: [],
  cortesHistory: [],
  isLoading: false,
  error: null,

  setKPIData: (data) => set({ kpiData: data }),
  setInventoryAlerts: (alerts) => set({ inventoryAlerts: alerts }),
  setSalesData: (data) => set({ salesData: data }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  // ==================== FETCH FROM DATABASE ====================
  fetchDashboardData: async () => {
    set({ isLoading: true, error: null });
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
        isLoading: false,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      set({
        error: 'Error al cargar los datos del dashboard. Verifica tu conexión a la base de datos.',
        isLoading: false,
      });
    }
  },

  // ==================== MERMAS ====================
  registerMerma: async (merma) => {
    try {
      const newRecord = await dbCreateMerma(merma);
      const state = get();

      // Optimistic update + refresh from DB
      set({ mermaRecords: [newRecord, ...state.mermaRecords] });

      const [alerts, kpi] = await Promise.all([fetchInventoryAlerts(), fetchKPIData()]);
      set({ inventoryAlerts: alerts, kpiData: kpi });
    } catch (error) {
      console.error('Error registering merma:', error);
    }
  },

  // ==================== AJUSTAR STOCK ====================
  adjustStock: async (productId, newStock, _reason) => {
    try {
      await dbUpdateProductStock(productId, newStock);

      const [alerts, kpi] = await Promise.all([fetchInventoryAlerts(), fetchKPIData()]);
      set({ inventoryAlerts: alerts, kpiData: kpi });
    } catch (error) {
      console.error('Error adjusting stock:', error);
    }
  },

  // ==================== PEDIDOS ====================
  createPedido: async (pedido) => {
    try {
      const newPedido = await dbCreatePedido(pedido);
      const state = get();
      set({ pedidos: [newPedido, ...state.pedidos] });
    } catch (error) {
      console.error('Error creating pedido:', error);
    }
  },

  // ==================== REGISTRAR PRODUCTO ====================
  registerProduct: async (productData) => {
    try {
      const newProduct = await dbCreateProduct(productData);
      const state = get();

      set({ products: [...state.products, newProduct] });

      const alerts = await fetchInventoryAlerts();
      set({ inventoryAlerts: alerts });
    } catch (error) {
      console.error('Error registering product:', error);
    }
  },

  // ==================== REGISTRAR VENTA ====================
  registerSale: async (saleData) => {
    try {
      const newSale = await dbCreateSale(saleData);
      const state = get();

      set({ saleRecords: [newSale, ...state.saleRecords] });

      const [alerts, kpi] = await Promise.all([fetchInventoryAlerts(), fetchKPIData()]);
      set({ inventoryAlerts: alerts, kpiData: kpi });

      return newSale;
    } catch (error) {
      console.error('Error registering sale:', error);
      throw error;
    }
  },

  getAllProducts: () => {
    const state = get();
    const alertProducts = state.inventoryAlerts.map((a) => a.product);
    const allProducts = [...alertProducts];
    state.products.forEach((p) => {
      if (!allProducts.find((ap) => ap.id === p.id)) {
        allProducts.push(p);
      }
    });
    return allProducts;
  },

  // ==================== CORTE DE CAJA ====================
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

  // ==================== FIADO / CRÉDITO ====================
  addCliente: async (clienteData) => {
    try {
      const newCliente = await dbCreateCliente(clienteData);
      const state = get();
      set({ clientes: [...state.clientes, newCliente] });
    } catch (error) {
      console.error('Error adding cliente:', error);
    }
  },

  registerFiado: async (clienteId, amount, description, saleFolio, items) => {
    try {
      await dbCreateFiado(clienteId, amount, description, saleFolio, items);

      // Refresh from DB to get updated balances
      const dashData = await fetchDashboardFromDB();
      set({
        clientes: dashData.clientes,
        fiadoTransactions: dashData.fiadoTransactions,
      });
    } catch (error) {
      console.error('Error registering fiado:', error);
    }
  },

  registerAbono: async (clienteId, amount, description) => {
    try {
      await dbCreateAbono(clienteId, amount, description);

      const dashData = await fetchDashboardFromDB();
      set({
        clientes: dashData.clientes,
        fiadoTransactions: dashData.fiadoTransactions,
      });
    } catch (error) {
      console.error('Error registering abono:', error);
    }
  },

  // ==================== GASTOS ====================
  registerGasto: async (gastoData) => {
    try {
      const newGasto = await dbCreateGasto(gastoData);
      const state = get();
      set({ gastos: [newGasto, ...state.gastos] });
    } catch (error) {
      console.error('Error registering gasto:', error);
    }
  },

  // ==================== PROVEEDORES ====================
  addProveedor: async (proveedorData) => {
    try {
      const newProveedor = await dbCreateProveedor(proveedorData);
      const state = get();
      set({ proveedores: [...state.proveedores, newProveedor] });
    } catch (error) {
      console.error('Error adding proveedor:', error);
    }
  },

  updateProveedor: async (id, data) => {
    try {
      await dbUpdateProveedor(id, data);
      const state = get();
      const updated = state.proveedores.map(p =>
        p.id === id ? { ...p, ...data } : p
      );
      set({ proveedores: updated });
    } catch (error) {
      console.error('Error updating proveedor:', error);
    }
  },
}));
