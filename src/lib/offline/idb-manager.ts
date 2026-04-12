/**
 * ADMINISTRADOR DE BASE DE DATOS LOCAL (Offline Advanced)
 * Utiliza IndexedDB para persistencia masiva y rápida en el navegador.
 */

const DB_NAME = 'PosOfflineDB';
const DB_VERSION = 2;

interface CachedProduct {
  id: string;
  barcode: string;
  sku: string;
  name: string;
}

interface PendingSale {
  tempId: string;
  syncStatus: 'pending' | 'stale';
  _retries: number;
  [key: string]: unknown;
}

export class LocalPOSDB {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Almacén de productos (Caché local)
        if (!db.objectStoreNames.contains('products')) {
          const store = db.createObjectStore('products', { keyPath: 'id' });
          store.createIndex('barcode', 'barcode', { unique: false });
          store.createIndex('sku', 'sku', { unique: false });
        }

        // Cola de ventas pendientes de sincronizar
        if (!db.objectStoreNames.contains('pending_sales')) {
          const store = db.createObjectStore('pending_sales', { keyPath: 'tempId' });
          store.createIndex('syncStatus', 'syncStatus', { unique: false });
        }

        // Estado del carrito (Resiliencia de sesión)
        if (!db.objectStoreNames.contains('cart_state')) {
          db.createObjectStore('cart_state', { keyPath: 'id' });
        }
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve();
      };

      request.onerror = (event) => reject((event.target as IDBOpenDBRequest).error);
    });
  }

  // --- PRODUCTOS ---
  async syncProducts(products: readonly CachedProduct[]): Promise<void> {
    if (!this.db) return;
    const tx = this.db.transaction('products', 'readwrite');
    const store = tx.objectStore('products');
    for (const p of products) {
      store.put(p);
    }
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async findProductByBarcode(barcode: string): Promise<CachedProduct | null> {
    if (!this.db) return null;
    // Try index-based lookup first (barcode index)
    return new Promise((resolve) => {
      const tx = this.db!.transaction('products', 'readonly');
      const store = tx.objectStore('products');
      const barcodeIdx = store.index('barcode');
      const req = barcodeIdx.get(barcode);
      req.onsuccess = () => {
        if (req.result) {
          resolve(req.result as CachedProduct);
          return;
        }
        // Fallback: try by SKU index
        const skuIdx = store.index('sku');
        const skuReq = skuIdx.get(barcode);
        skuReq.onsuccess = () => resolve((skuReq.result as CachedProduct) ?? null);
        skuReq.onerror = () => resolve(null);
      };
      req.onerror = () => resolve(null);
    });
  }

  // --- VENTAS ---
  async queueSale(saleData: Record<string, unknown>): Promise<string> {
    if (!this.db) throw new Error('DB no inicializada');
    const tempId = `off-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    // Duplicate detection: check if a sale with same items+total already queued in last 30s
    const pending = await this.getPendingSales();
    const sig = JSON.stringify(saleData.items ?? []) + String(saleData.total ?? 0);
    const thirtySecondsAgo = Date.now() - 30_000;
    const duplicate = pending.find((s) => {
      const sSig = JSON.stringify(s.items ?? []) + String(s.total ?? 0);
      const sTime = typeof s.tempId === 'string' ? parseInt(s.tempId.split('-')[1] ?? '0', 10) : 0;
      return sSig === sig && sTime > thirtySecondsAgo;
    });
    if (duplicate) {
      return duplicate.tempId;
    }

    const tx = this.db.transaction('pending_sales', 'readwrite');
    tx.objectStore('pending_sales').add({ ...saleData, tempId, syncStatus: 'pending', _retries: 0 });
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(tempId);
      tx.onerror = () => reject(tx.error);
    });
  }

  async getPendingSales(): Promise<PendingSale[]> {
    if (!this.db) return [];
    return new Promise((resolve) => {
      const tx = this.db!.transaction('pending_sales', 'readonly');
      const request = tx.objectStore('pending_sales').getAll();
      request.onsuccess = () => resolve(request.result as PendingSale[]);
      request.onerror = () => resolve([]);
    });
  }

  async deletePendingSale(tempId: string): Promise<void> {
    if (!this.db) return;
    const tx = this.db.transaction('pending_sales', 'readwrite');
    tx.objectStore('pending_sales').delete(tempId);
    return new Promise((resolve) => {
      tx.oncomplete = () => resolve();
    });
  }

  async markSaleStale(tempId: string): Promise<void> {
    if (!this.db) return;
    const tx = this.db.transaction('pending_sales', 'readwrite');
    const store = tx.objectStore('pending_sales');
    const request = store.get(tempId);
    return new Promise((resolve) => {
      request.onsuccess = () => {
        if (request.result) {
          store.put({ ...request.result, syncStatus: 'stale' });
        }
        resolve();
      };
      request.onerror = () => resolve();
    });
  }

  async incrementRetry(tempId: string): Promise<number> {
    if (!this.db) return 0;
    const tx = this.db.transaction('pending_sales', 'readwrite');
    const store = tx.objectStore('pending_sales');
    const request = store.get(tempId);
    return new Promise((resolve) => {
      request.onsuccess = () => {
        if (request.result) {
          const retries = ((request.result._retries ?? 0) as number) + 1;
          store.put({ ...request.result, _retries: retries });
          resolve(retries);
        } else {
          resolve(0);
        }
      };
      request.onerror = () => resolve(0);
    });
  }

  async getStaleSales(): Promise<PendingSale[]> {
    if (!this.db) return [];
    return new Promise((resolve) => {
      const tx = this.db!.transaction('pending_sales', 'readonly');
      const store = tx.objectStore('pending_sales');
      const idx = store.index('syncStatus');
      const request = idx.getAll('stale');
      request.onsuccess = () => resolve(request.result as PendingSale[]);
      request.onerror = () => resolve([]);
    });
  }
}

export const offlineDB = new LocalPOSDB();
