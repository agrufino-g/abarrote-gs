'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useDashboardStore } from '@/store/dashboardStore';
import { OfflineQueue } from '@/lib/sync/offline-queue';

export type ConnectivityStatus = 'Connected' | 'Disconnected';

/**
 * Offline-aware hook for the POS system.
 *
 * - Caches product catalog in localStorage for instant barcode lookups offline
 * - Queues sales in IDB when offline (with exponential backoff retry)
 * - Syncs pending operations on reconnection
 * - Reports connectivity status for UI indicators
 */
export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(true);
  const [connectivity, setConnectivity] = useState<ConnectivityStatus>('Connected');
  const [pendingCount, setPendingCount] = useState(0);
  const products = useDashboardStore((s) => s.products);
  const queueRef = useRef<OfflineQueue | null>(null);

  // 1. Initialize IDB-backed offline queue
  useEffect(() => {
    const queue = new OfflineQueue();
    queueRef.current = queue;
    queue.init().then(() => {
      queue.getPendingCount().then(setPendingCount);
    });
    return () => {
      queue.destroy();
      queueRef.current = null;
    };
  }, []);

  // 2. Cache product catalog locally for offline barcode lookup
  useEffect(() => {
    if (products.length > 0) {
      try {
        localStorage.setItem('pos_offline_products', JSON.stringify(products));
      } catch {
        // localStorage full — degrade gracefully
      }
    }
  }, [products]);

  // 3. Network status monitor
  useEffect(() => {
    const updateNetStatus = () => {
      const online = navigator.onLine;
      setIsOnline(online);
      setConnectivity(online ? 'Connected' : 'Disconnected');

      if (online) {
        // Trigger queue sync on reconnection
        queueRef.current?.sync().then((result) => {
          if (result) setPendingCount(result.remaining);
        });
      }
    };

    window.addEventListener('online', updateNetStatus);
    window.addEventListener('offline', updateNetStatus);
    updateNetStatus();

    return () => {
      window.removeEventListener('online', updateNetStatus);
      window.removeEventListener('offline', updateNetStatus);
    };
  }, []);

  // 4. Enqueue sale for offline processing
  const saveSaleOffline = useCallback(
    async (saleData: Omit<Record<string, unknown>, 'id'>) => {
      const queue = queueRef.current;
      if (!queue) return null;

      const id = await queue.enqueue('createSale', saleData);
      const count = await queue.getPendingCount();
      setPendingCount(count);
      return { ...saleData, tempId: id, isOffline: true };
    },
    [],
  );

  // 5. Manual sync trigger
  const syncPendingSales = useCallback(async () => {
    const queue = queueRef.current;
    if (!queue || !navigator.onLine) return;

    const result = await queue.sync();
    setPendingCount(result.remaining);
  }, []);

  return {
    isOnline,
    connectivity,
    saveSaleOffline,
    syncPendingSales,
    hasPendingSales: pendingCount > 0,
    pendingCount,
  };
}
