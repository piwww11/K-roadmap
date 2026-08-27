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

  useEffect(() => {
    cancelledRef.current = false;
    const supabase = getSupabaseClient();

    const transition = (userId: string | null) => {
      transitionQueueRef.current = transitionQueueRef.current.then(async () => {
        if (cancelledRef.current) return;

        const changed = activateAccountScope(userId);
        if (!changed && readyRef.current) return;

        syncRef.current?.stop();
        syncRef.current = null;
        readyRef.current = false;
        setReady(false);

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

        // Local account-scoped data is loaded first. If this account already
        // has cloud data, the cloud snapshot becomes the authenticated source
        // for this hydration pass. An empty cloud account leaves local/guest
        // data untouched so first-time migration remains possible.
        if (userId) {
          const cloud = await readCloudHydrationSnapshot(supabase);
          if (cancelledRef.current) return;
          cloudSnapshot = cloud.data;
          if (cloud.data) applyCloudHydrationSnapshot(cloud.data);
        }

        syncCurrentScopeToLegacyKeys();

        if (cancelledRef.current) return;

        // Automatic writes are enabled only after an explicit migration has
        // been verified for this account, or when this account already has
        // cloud data that has just been hydrated. A brand-new signed-in user
        // must still use the explicit migration flow before local guest data
        // can begin writing to the cloud automatically.
        if (userId && typeof window !== 'undefined') {
          const migrationVerified = Boolean(readVerifiedMigrationStatus(window.localStorage, userId));
          if (migrationVerified || hasCloudData(cloudSnapshot)) {
            syncRef.current = startAutomaticCloudSync(supabase, userId, cloudSnapshot);
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
