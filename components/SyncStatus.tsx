'use client';

import { useEffect } from 'react';
import { Check, Cloud, Loader2, WifiOff, XCircle } from 'lucide-react';
import { useSyncStatusStore } from '@/store/syncStatusStore';

const STATUS_COPY = {
  synced: { label: 'Synced', icon: Check },
  syncing: { label: 'Syncing…', icon: Loader2 },
  offline: { label: 'Offline', icon: WifiOff },
  error: { label: 'Sync error', icon: XCircle },
} as const;

export default function SyncStatus() {
  const status = useSyncStatusStore((state) => state.status);
  const lastSyncedAt = useSyncStatusStore((state) => state.lastSyncedAt);

  useEffect(() => {
    const handleOnline = () => {
      const current = useSyncStatusStore.getState().status;
      if (current === 'offline') useSyncStatusStore.getState().setStatus('synced');
    };
    const handleOffline = () => useSyncStatusStore.getState().setStatus('offline');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    if (!navigator.onLine) handleOffline();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const meta = STATUS_COPY[status];
  const Icon = meta.icon;
  const title = lastSyncedAt
    ? `Last cloud sync: ${new Date(lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    : 'Cloud sync status';

  return (
    <div
      className="mt-2 flex items-center justify-between rounded-lg border border-slate-800/80 bg-slate-950/40 px-2.5 py-2"
      title={title}
      aria-live="polite"
    >
      <div className="flex min-w-0 items-center gap-2">
        <Cloud size={13} className="shrink-0 text-slate-500" />
        <span className="truncate text-[10px] font-semibold text-slate-400">Cloud</span>
      </div>
      <div
        className={`flex items-center gap-1.5 text-[10px] font-semibold ${
          status === 'synced'
            ? 'text-emerald-400'
            : status === 'syncing'
              ? 'text-indigo-300'
              : status === 'offline'
                ? 'text-amber-400'
                : 'text-rose-400'
        }`}
      >
        <Icon size={12} className={status === 'syncing' ? 'animate-spin' : undefined} />
        <span>{meta.label}</span>
      </div>
    </div>
  );
}
