'use client';

import { create } from 'zustand';

export type SyncStatus = 'synced' | 'syncing' | 'offline';

type SyncStatusState = {
  status: SyncStatus;
  lastSyncedAt: number | null;
  setStatus: (status: SyncStatus) => void;
  markSynced: () => void;
};

export const useSyncStatusStore = create<SyncStatusState>((set) => ({
  status: 'synced',
  lastSyncedAt: null,
  setStatus: (status) => set({ status }),
  markSynced: () => set({ status: 'synced', lastSyncedAt: Date.now() }),
}));
