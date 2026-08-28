'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createJSONStorage } from 'zustand/middleware';
import { getSupabaseClient } from '@/lib/supabaseClient';
import {
  activateAccountScope,
  createScopedStateStorage,
  syncCurrentScopeToLegacyKeys,
  JOURNEY_STORAGE_KEY,
  EXPERIMENT_STORAGE_KEY,
  APPLICATION_STORAGE_KEY,
} from '@/lib/accountStorage';
import { readCloudHydrationSnapshot, type CloudHydrationSnapshot } from '@/lib/cloud/hydration';
import { applyCloudHydrationSnapshot } from '@/lib/cloud/applyHydration';
import { startAutomaticCloudSync, type AutomaticCloudSync } from '@/lib/cloud/automaticSync';
import { readVerifiedMigrationStatus } from '@/lib/migration/status';
import { useJourneyStore } from '@/store/useJourneyStore';
import { useExperimentStore } from '@/store/experimentStore';
import { useApplicationTrackerStore } from '@/store/applicationTrackerStore';
import { useSyncStatusStore } from '@/store/syncStatusStore';

const SYNC_STATUS_MIN_VISIBLE_MS = 450;

const volatileStorage = createJSONStorage<any>(() => ({
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
}))!;

const journeyStorage = createJSONStorage<any>(() => createScopedStateStorage(JOURNEY_STORAGE_KEY))!;
const experimentStorage = createJSONStorage<any>(() => createScopedStateStorage(EXPERIMENT_STORAGE_KEY))!;
const applicationStorage = createJSONStorage<any>(() => createScopedStateStorage(APPLICATION_STORAGE_KEY))!;

function configureVolatileStorage() {
  useJourneyStore.persist.setOptions({ storage: volatileStorage });
  useExperimentStore.persist.setOptions({ storage: volatileStorage });
  useApplicationTrackerStore.persist.setOptions({ storage: volatileStorage });
}

function configureScopedStorage() {
  useJourneyStore.persist.setOptions({ storage: journeyStorage });
  useExperimentStore.persist.setOptions({ storage: experimentStorage });
  useApplicationTrackerStore.persist.setOptions({ storage: applicationStorage });
}

function hasCloudData(snapshot: CloudHydrationSnapshot | null) {
  if (!snapshot) return false;
  return Object.values(snapshot).some((rows) => Array.isArray(rows) && rows.length > 0);
}

export default function AccountSessionBoundary({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const cancelledRef = useRef(false);
  const transitionQueueRef = useRef(Promise.resolve());
  const readyRef = useRef(false);
  const syncRef = useRef<AutomaticCloudSync | null>(null);
  const syncingSinceRef = useRef<number | null>(null);

  const clearSyncStatusWatchers = () => {
    syncingSinceRef.current = null;
  };

  const setSyncing = () => {
    syncingSinceRef.current ??= Date.now();
    const current = useSyncStatusStore.getState();
    if (current.status !== 'syncing') current.setStatus('syncing');
  };

  const markSyncSuccess = () => {
    const syncingSince = syncingSinceRef.current;
    const elapsed = syncingSince === null ? SYNC_STATUS_MIN_VISIBLE_MS : Date.now() - syncingSince;
    const finish = () => {
      syncingSinceRef.current = null;
      useSyncStatusStore.getState().markSynced();
    };

    if (elapsed >= SYNC_STATUS_MIN_VISIBLE_MS) {
      finish();
      return;
    }

    window.setTimeout(finish, SYNC_STATUS_MIN_VISIBLE_MS - elapsed);
  };

  const markSyncFailure = () => {
    syncingSinceRef.current = null;
    useSyncStatusStore.getState().setStatus('offline');
  };

  const handleCloudConnectionChange = (connected: boolean) => {
    if (!connected) {
      markSyncFailure();
      return;
    }

    const current = useSyncStatusStore.getState();
    if (current.status === 'offline' && syncRef.current) {
      setSyncing();
      syncRef.current.requestSync();
    }
  };

  const startSyncStatusWatchers = () => {
    clearSyncStatusWatchers();

    const markMutation = () => setSyncing();
    const handleOffline = () => markSyncFailure();

    const unsubscribers = [
      useJourneyStore.subscribe(markMutation),
      useExperimentStore.subscribe(markMutation),
      useApplicationTrackerStore.subscribe(markMutation),
    ];

    window.addEventListener('offline', handleOffline);

    return () => {
      for (const unsubscribe of unsubscribers) unsubscribe();
      window.removeEventListener('offline', handleOffline);
      clearSyncStatusWatchers();
    };
  };

  useEffect(() => {
    cancelledRef.current = false;
    const supabase = getSupabaseClient();
    let stopStatusWatchers: (() => void) | null = null;

    const transition = (userId: string | null) => {
      transitionQueueRef.current = transitionQueueRef.current.then(async () => {
        if (cancelledRef.current) return;

        const changed = activateAccountScope(userId);
        if (!changed && readyRef.current) return;

        stopStatusWatchers?.();
        stopStatusWatchers = null;
        syncRef.current?.stop();
        syncRef.current = null;
        readyRef.current = false;
        setReady(false);

        useSyncStatusStore.getState().setStatus('synced');
        syncingSinceRef.current = null;

        configureVolatileStorage();
        useJourneyStore.getState().resetData();
        useExperimentStore.getState().resetExperiments();
        useApplicationTrackerStore.setState({ applications: [] });

        if (cancelledRef.current) return;

        configureScopedStorage();

        await Promise.all([
          useJourneyStore.persist.rehydrate(),
          useExperimentStore.persist.rehydrate(),
          useApplicationTrackerStore.persist.rehydrate(),
        ]);

        if (cancelledRef.current) return;

        let cloudSnapshot: CloudHydrationSnapshot | null = null;

        if (userId) {
          const cloud = await readCloudHydrationSnapshot(supabase);
          if (cancelledRef.current) return;
          cloudSnapshot = cloud.data;
          if (cloud.data) applyCloudHydrationSnapshot(cloud.data);
        }

        syncCurrentScopeToLegacyKeys();

        if (cancelledRef.current) return;

        if (userId && typeof window !== 'undefined') {
          const migrationVerified = Boolean(readVerifiedMigrationStatus(window.localStorage, userId));
          if (migrationVerified || hasCloudData(cloudSnapshot)) {
            stopStatusWatchers = startSyncStatusWatchers();
            syncRef.current = startAutomaticCloudSync(supabase, userId, cloudSnapshot, {
              onSyncStart: setSyncing,
              onSyncSuccess: markSyncSuccess,
              onSyncFailure: markSyncFailure,
              onCloudConnectionChange: handleCloudConnectionChange,
            });
          }
        }

        readyRef.current = true;
        setReady(true);
      });
    };

    void supabase.auth.getSession().then(({ data }) => {
      transition(data.session?.user.id ?? null);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      queueMicrotask(() => transition(session?.user.id ?? null));
    });

    return () => {
      cancelledRef.current = true;
      stopStatusWatchers?.();
      syncRef.current?.stop();
      syncRef.current = null;
      subscription.subscription.unsubscribe();
    };
  }, []);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-sm text-slate-500">
        Loading your private journey...
      </div>
    );
  }

  return children;
}
