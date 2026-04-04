'use client';

/**
 * useSyncEngine — React hook that connects the SyncEngine + OfflineQueue
 * to the Zustand dashboard store.
 *
 * What it does:
 * 1. Initializes SyncEngine on mount (visibility, BroadcastChannel, polling)
 * 2. Initializes OfflineQueue (IDB-backed)
 * 3. On online event → triggers queue sync + data refresh
 * 4. Exposes sync status for UI (banners, indicators)
 * 5. Cleans up everything on unmount
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { SyncEngine, OfflineQueue } from '@/lib/sync';
import type { SyncDomain, SyncStatus } from '@/lib/sync';
import { useDashboardStore } from '@/store/dashboardStore';

const INITIAL_STATUS: SyncStatus = {
  isOnline: true,
  lastSyncAt: 0,
  isStale: true,
  isSyncing: false,
  pendingOfflineOps: 0,
  consecutiveErrors: 0,
  circuitOpen: false,
};

export function useSyncEngine(enabled: boolean = true) {
  const engineRef = useRef<SyncEngine | null>(null);
  const queueRef = useRef<OfflineQueue | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(INITIAL_STATUS);
  const initialLoadDone = useRef(false);

  const fetchDashboardData = useDashboardStore((s) => s.fetchDashboardData);

  // ── Refresh handler: called by SyncEngine when data needs refresh ──
  const handleRefresh = useCallback(
    async (_domain: SyncDomain) => {
      // For now, full refresh. In the future, domain-specific refresh
      // can be implemented by splitting fetchDashboardFromDB.
      await fetchDashboardData();
    },
    [fetchDashboardData],
  );

  // ── Status handler: called by SyncEngine when status changes ──
  const handleStatusChange = useCallback((status: SyncStatus) => {
    setSyncStatus(status);
  }, []);

  // ── Initialize engine + queue on mount ──
  useEffect(() => {
    // Don't initialize until enabled (user is authenticated)
    if (!enabled) return;
    
    const engine = new SyncEngine({
      pollingIntervalMs: 30_000,
      staleThresholdMs: 45_000,
      channelName: 'pos-sync-v1',
      visibilityDebounceMs: 500,
      maxConsecutiveErrors: 5,
      circuitBreakerCooldownMs: 60_000,
    });

    const queue = new OfflineQueue();

    engineRef.current = engine;
    queueRef.current = queue;

    // Initialize IDB queue, then start engine
    queue.init().then(() => {
      engine.start(handleRefresh, handleStatusChange);

      // Initial data load — only once per mount, after engine starts
      if (!initialLoadDone.current) {
        initialLoadDone.current = true;
        engine.forceRefresh('all');
      }

      // Sync any pending offline operations immediately
      if (navigator.onLine) {
        queue.sync();
      }
    });

    // Online listener to trigger queue sync
    const handleOnline = () => {
      queue.sync();
    };
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('online', handleOnline);
      engine.stop();
      queue.destroy();
      engineRef.current = null;
      queueRef.current = null;
      initialLoadDone.current = false;
    };
  }, [enabled, handleRefresh, handleStatusChange]);

  // ── Exposed APIs ──

  /** Notify other tabs that a mutation happened in a domain */
  const notifyMutation = useCallback((domain: SyncDomain) => {
    engineRef.current?.notifyMutation(domain);
  }, []);

  /** Enqueue an operation for offline sync (when offline) */
  const enqueueOffline = useCallback(
    async (action: string, payload: unknown): Promise<string | null> => {
      if (!queueRef.current) return null;
      return queueRef.current.enqueue(action, payload);
    },
    [],
  );

  /** Force immediate data refresh */
  const forceRefresh = useCallback(
    async (domain: SyncDomain = 'all') => {
      await engineRef.current?.forceRefresh(domain);
    },
    [],
  );

  return {
    syncStatus,
    notifyMutation,
    enqueueOffline,
    forceRefresh,
  };
}
