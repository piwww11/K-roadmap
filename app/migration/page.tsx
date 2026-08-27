'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ArrowLeft, CheckCircle2, Cloud, Database, Loader2, ShieldCheck, XCircle } from 'lucide-react';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { buildMigrationPreview } from '@/lib/migration/validator';
import { importMigrationData } from '@/lib/migration/importer';
import { verifyMigration, type MigrationVerificationResult } from '@/lib/migration/verifier';
import { normalizeLocalSnapshot, readLocalStorageSnapshot, type NormalizedMigrationData } from '@/lib/migration/normalizer';
import { MIGRATION_STATUS_VERSION, clearVerifiedMigrationStatus, fingerprintMigrationSnapshot, readVerifiedMigrationStatus, saveVerifiedMigrationStatus } from '@/lib/migration/status';

type Preview = ReturnType<typeof buildMigrationPreview>;

type ImportState = 'idle' | 'confirming' | 'importing' | 'verifying' | 'success' | 'error';

const emptyPreview: Preview = {
  status: 'READY',
  counts: {
    phases: 0,
    months: 0,
    goals: 0,
    tasks: 0,
    majors: 0,
    skills: 0,
    journalEntries: 0,
    documents: 0,
    achievements: 0,
    majorDecisions: 0,
    budgetItems: 0,
    savingTransactions: 0,
    experiments: 0,
    experimentAttempts: 0,
    experimentReflections: 0,
    applications: 0,
  },
  errors: [],
  warnings: [],
  canImport: false,
};

function CountCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

export default function MigrationPage() {
  const [data, setData] = useState<NormalizedMigrationData | null>(null);
  const [preview, setPreview] = useState<Preview>(emptyPreview);
  const [scanning, setScanning] = useState(true);
  const [hasLocalData, setHasLocalData] = useState(false);
  const [importState, setImportState] = useState<ImportState>('idle');
  const [importError, setImportError] = useState<string | null>(null);
  const [verification, setVerification] = useState<MigrationVerificationResult | null>(null);
  const [checkingPersistedVerification, setCheckingPersistedVerification] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const scanRun = useRef(0);

  const scan = () => {
    const run = ++scanRun.current;
    setScanning(true);
    setImportError(null);
    setVerification(null);
    setStatusNotice(null);
    setImportState('idle');
    try {
      const snapshot = readLocalStorageSnapshot();
      const normalized = normalizeLocalSnapshot(snapshot);
      setData(normalized);
      setHasLocalData(Boolean(snapshot.journey || snapshot.experiments || snapshot.applications));
      setPreview(buildMigrationPreview(normalized));
      void restoreVerifiedStatus(normalized, run);
    } finally {
      setScanning(false);
    }
  };

  async function restoreVerifiedStatus(normalized: NormalizedMigrationData, run: number) {
    setCheckingPersistedVerification(true);
    try {
      const supabase = getSupabaseClient();
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user || run !== scanRun.current) return;

      const fingerprint = await fingerprintMigrationSnapshot(normalized);
      if (run !== scanRun.current) return;
      const stored = readVerifiedMigrationStatus(window.localStorage, authData.user.id);
      if (!stored) return;
      if (stored.snapshotFingerprint !== fingerprint) {
        clearVerifiedMigrationStatus(window.localStorage, authData.user.id);
        setStatusNotice('Your local snapshot changed since the last verified migration. Review and import the new snapshot when ready.');
        return;
      }

      const verified = await verifyMigration(supabase, normalized);
      if (run !== scanRun.current) return;
      if (verified.verified) {
        setVerification(verified);
        setImportState('success');
      } else {
        clearVerifiedMigrationStatus(window.localStorage, authData.user.id);
        setStatusNotice('The previous cloud verification no longer matches this snapshot. Your local data is unchanged; review and re-import when ready.');
      }
    } catch {
      if (run === scanRun.current) {
        setStatusNotice('Could not re-check the saved migration status. Your local data is unchanged; retry when the cloud connection is available.');
      }
    } finally {
      if (run === scanRun.current) setCheckingPersistedVerification(false);
    }
  }

  useEffect(() => {
    scan();
  }, []);

  const totalRecords = useMemo(() => Object.values(preview.counts).reduce((sum, value) => sum + value, 0), [preview.counts]);

  const statusStyles = {
    READY: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300',
    WARNING: 'border-amber-500/20 bg-amber-500/10 text-amber-300',
    BLOCKED: 'border-rose-500/20 bg-rose-500/10 text-rose-300',
  } as const;

  const statusIcon = {
    READY: <CheckCircle2 size={18} />,
    WARNING: <AlertTriangle size={18} />,
    BLOCKED: <XCircle size={18} />,
  } as const;

  const isBusy = importState === 'importing' || importState === 'verifying';

  async function startImport() {
    if (!data || !preview.canImport || isBusy) return;
    setImportState('confirming');
  }

  async function confirmImport() {
    if (!data || !preview.canImport) return;
    setImportState('importing');
    setImportError(null);
    setVerification(null);

    try {
      const supabase = getSupabaseClient();
      const result = await importMigrationData(supabase, data);
      if (!result.success) {
        throw new Error(result.errors.join('\n') || 'Cloud import failed. No local data was deleted.');
      }

      setImportState('verifying');
      const verified = await verifyMigration(supabase, data);
      setVerification(verified);
      if (!verified.verified) {
        throw new Error(verified.errors.join('\n') || 'Cloud verification failed. You can safely retry the import.');
      }

      const fingerprint = await fingerprintMigrationSnapshot(data);
      if (!result.userId) throw new Error('Cloud import succeeded but did not return the authenticated user identity. Local data was not changed.');
      saveVerifiedMigrationStatus(window.localStorage, {
        version: MIGRATION_STATUS_VERSION,
        userId: result.userId,
        snapshotFingerprint: fingerprint,
        verifiedAt: new Date().toISOString(),
        verification: { expected: verified.expected, actual: verified.actual },
      });
      setImportState('success');
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Cloud import failed.');
      setImportState('error');
    }
  }

  return (
    <main className="min-h-screen px-6 py-10 text-white">
      <div className="mx-auto max-w-4xl">
        <Link href="/" className="mb-8 inline-flex items-center gap-2 text-sm text-slate-500 transition hover:text-white">
          <ArrowLeft size={16} /> Back to K-Roadmap
        </Link>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl shadow-black/20 backdrop-blur sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-300"><Cloud size={24} /></div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-400">Phase 2 · Migration Preview</p>
              <h1 className="mt-2 text-3xl font-bold">Review your local progress.</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">K-Roadmap found the data currently stored in this browser. Import is explicit and idempotent. Your local data is never deleted by this migration.</p>
            </div>
            <button type="button" onClick={scan} disabled={scanning || isBusy || checkingPersistedVerification} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-2.5 text-xs font-semibold text-slate-300 transition hover:border-slate-600 hover:text-white disabled:opacity-50">
              {scanning ? <Loader2 size={14} className="animate-spin" /> : <Database size={14} />}
              {scanning ? 'Scanning...' : 'Scan again'}
            </button>
          </div>

          {scanning ? (
            <div className="mt-8 flex items-center justify-center rounded-2xl border border-slate-800 bg-slate-950/40 p-12 text-sm text-slate-500"><Loader2 size={18} className="mr-2 animate-spin" /> Reading local progress safely...</div>
          ) : !hasLocalData ? (
            <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-950/40 p-8 text-center"><ShieldCheck className="mx-auto text-emerald-400" size={28} /><h2 className="mt-3 font-semibold text-white">No local progress detected</h2><p className="mt-2 text-sm text-slate-500">There is nothing to prepare for cloud migration in this browser yet.</p></div>
          ) : (
            <>
              <div className={`mt-8 flex items-center gap-3 rounded-2xl border px-4 py-3 ${statusStyles[preview.status]}`}>
                {statusIcon[preview.status]}
                <div>
                  <p className="text-sm font-bold">Migration status: {preview.status}</p>
                  <p className="mt-0.5 text-xs opacity-80">{preview.status === 'BLOCKED' ? 'Fix the errors below before cloud import can proceed.' : preview.status === 'WARNING' ? 'Data is structurally valid, but some values require explicit review.' : 'Local data passed the safety checks.'}</p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <CountCard label="Phases" value={preview.counts.phases} /><CountCard label="Goals" value={preview.counts.goals} /><CountCard label="Tasks" value={preview.counts.tasks} /><CountCard label="Majors" value={preview.counts.majors} />
                <CountCard label="Skills" value={preview.counts.skills} /><CountCard label="Journal" value={preview.counts.journalEntries} /><CountCard label="Documents" value={preview.counts.documents} /><CountCard label="Experiments" value={preview.counts.experiments} />
                <CountCard label="Attempts" value={preview.counts.experimentAttempts} /><CountCard label="Reflections" value={preview.counts.experimentReflections} /><CountCard label="Applications" value={preview.counts.applications} /><CountCard label="Saving transactions" value={preview.counts.savingTransactions} /><CountCard label="Total records" value={totalRecords} />
              </div>

              {data && data.journey.budget.legacyCurrentSavings !== 0 && (
                <div className="mt-6 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4"><p className="text-sm font-semibold text-amber-300">Legacy savings needs review</p><p className="mt-1 text-xs leading-5 text-slate-400">Your local currentSavings value is preserved as legacyCurrentSavings in the cloud budget payload for audit only. It creates no saving transaction and never becomes the cloud balance source of truth. The cloud balance is the signed sum of saving transactions.</p></div>
              )}

              {(preview.errors.length > 0 || preview.warnings.length > 0) && (
                <div className="mt-6 space-y-3">
                  {preview.errors.map((issue, index) => <div key={`error-${index}`} className="rounded-2xl border border-rose-500/15 bg-rose-500/5 p-4"><p className="text-xs font-semibold text-rose-300">Error · {issue.path}</p><p className="mt-1 text-xs leading-5 text-slate-400">{issue.message}</p></div>)}
                  {preview.warnings.map((issue, index) => <div key={`warning-${index}`} className="rounded-2xl border border-amber-500/15 bg-amber-500/5 p-4"><p className="text-xs font-semibold text-amber-300">Warning · {issue.path}</p><p className="mt-1 text-xs leading-5 text-slate-400">{issue.message}</p></div>)}
                </div>
              )}

              {checkingPersistedVerification && (
                <div className="mt-6 flex items-center gap-2 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-4 text-xs text-indigo-200"><Loader2 size={15} className="animate-spin" /> Re-checking the saved migration status against your cloud account...</div>
              )}

              {statusNotice && (
                <div className="mt-6 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-xs leading-5 text-amber-200">{statusNotice}</div>
              )}

              {importState === 'confirming' && (
                <div className="mt-8 rounded-2xl border border-indigo-500/25 bg-indigo-500/5 p-5">
                  <p className="text-sm font-bold text-white">Ready to import {totalRecords} local records?</p>
                  <p className="mt-2 text-xs leading-5 text-slate-400">This copies your local progress into the signed-in K-Roadmap cloud account. Existing cloud rows with the same stable IDs are safely updated rather than duplicated. Your localStorage will not be deleted or overwritten.</p>
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <button type="button" onClick={confirmImport} className="rounded-xl bg-indigo-500 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-indigo-400">Confirm import</button>
                    <button type="button" onClick={() => setImportState('idle')} className="rounded-xl border border-slate-700 px-4 py-2.5 text-xs font-semibold text-slate-300 transition hover:text-white">Cancel</button>
                  </div>
                </div>
              )}

              {importState === 'idle' && preview.canImport && !checkingPersistedVerification && (
                <button type="button" onClick={startImport} className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-500 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-indigo-400"><Cloud size={18} /> Import {totalRecords} records to Cloud</button>
              )}

              {isBusy && (
                <div className="mt-8 flex items-center justify-center rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-5 text-sm text-indigo-200"><Loader2 size={18} className="mr-2 animate-spin" /> {importState === 'importing' ? 'Importing local progress safely...' : 'Verifying cloud records...'}</div>
              )}

              {importState === 'success' && verification?.verified && (
                <div className="mt-8 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5"><div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 text-emerald-400" size={20} /><div><p className="text-sm font-bold text-emerald-300">Cloud migration verified</p><p className="mt-1 text-xs leading-5 text-slate-400">Every migrated record count matches the local snapshot. Your localStorage remains intact. It is now safe to proceed to cloud-aware Zustand sync.</p></div></div></div>
              )}

              {(importState === 'error' || importError) && (
                <div className="mt-8 rounded-2xl border border-rose-500/20 bg-rose-500/5 p-5"><div className="flex items-start gap-3"><XCircle className="mt-0.5 text-rose-400" size={20} /><div><p className="text-sm font-bold text-rose-300">Cloud migration did not complete</p><p className="mt-1 whitespace-pre-line text-xs leading-5 text-slate-400">{importError}</p><button type="button" onClick={() => setImportState('idle')} className="mt-4 rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white">Retry import</button></div></div></div>
              )}

              {importState === 'idle' && !preview.canImport && (
                <div className="mt-8 rounded-2xl border border-rose-500/15 bg-rose-500/5 p-5 text-sm text-rose-300">Cloud import is blocked until the migration validator reports no errors.</div>
              )}

              <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-950/40 p-5"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 shrink-0 text-emerald-400" size={19} /><div><p className="text-sm font-semibold text-white">Migration safety rules</p><p className="mt-1 text-xs leading-5 text-slate-500">Import is authenticated, scoped by Supabase RLS, idempotent by stable local IDs, verified by post-import counts, and never deletes localStorage.</p></div></div></div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
