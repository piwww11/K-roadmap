'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, CheckCircle2, Cloud, Database, Loader2, ShieldCheck, XCircle } from 'lucide-react';
import Link from 'next/link';
import { buildMigrationPreview } from '@/lib/migration/validator';
import { normalizeLocalSnapshot, readLocalStorageSnapshot, type NormalizedMigrationData } from '@/lib/migration/normalizer';

const emptyPreview = {
  status: 'READY' as const,
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
    experiments: 0,
    experimentAttempts: 0,
    experimentReflections: 0,
    applications: 0,
  },
  errors: [] as { path: string; message: string }[],
  warnings: [] as { path: string; message: string }[],
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
  const [preview, setPreview] = useState<typeof emptyPreview>(emptyPreview);
  const [scanning, setScanning] = useState(true);
  const [hasLocalData, setHasLocalData] = useState(false);

  const scan = () => {
    setScanning(true);
    try {
      const snapshot = readLocalStorageSnapshot();
      const normalized = normalizeLocalSnapshot(snapshot);
      setData(normalized);
      setHasLocalData(Boolean(snapshot.journey || snapshot.experiments || snapshot.applications));
      setPreview(buildMigrationPreview(normalized));
    } finally {
      setScanning(false);
    }
  };

  useEffect(() => {
    scan();
  }, []);

  const totalRecords = useMemo(() => {
    const c = preview.counts;
    return Object.values(c).reduce((sum, value) => sum + value, 0);
  }, [preview.counts]);

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

  return (
    <main className="min-h-screen px-6 py-10 text-white">
      <div className="mx-auto max-w-4xl">
        <Link href="/" className="mb-8 inline-flex items-center gap-2 text-sm text-slate-500 transition hover:text-white">
          <ArrowLeft size={16} /> Back to K-Roadmap
        </Link>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl shadow-black/20 backdrop-blur sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-300">
                <Cloud size={24} />
              </div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-400">Phase 2 · Migration Preview</p>
              <h1 className="mt-2 text-3xl font-bold">Review your local progress.</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
                K-Roadmap found the data currently stored in this browser. This screen only reads and validates it. Nothing is uploaded, overwritten, or deleted here.
              </p>
            </div>
            <button
              type="button"
              onClick={scan}
              disabled={scanning}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-2.5 text-xs font-semibold text-slate-300 transition hover:border-slate-600 hover:text-white disabled:opacity-50"
            >
              {scanning ? <Loader2 size={14} className="animate-spin" /> : <Database size={14} />}
              {scanning ? 'Scanning...' : 'Scan again'}
            </button>
          </div>

          {scanning ? (
            <div className="mt-8 flex items-center justify-center rounded-2xl border border-slate-800 bg-slate-950/40 p-12 text-sm text-slate-500">
              <Loader2 size={18} className="mr-2 animate-spin" /> Reading local progress safely...
            </div>
          ) : !hasLocalData ? (
            <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-950/40 p-8 text-center">
              <ShieldCheck className="mx-auto text-emerald-400" size={28} />
              <h2 className="mt-3 font-semibold text-white">No local progress detected</h2>
              <p className="mt-2 text-sm text-slate-500">There is nothing to prepare for cloud migration in this browser yet.</p>
            </div>
          ) : (
            <>
              <div className={`mt-8 flex items-center gap-3 rounded-2xl border px-4 py-3 ${statusStyles[preview.status]}`}>
                {statusIcon[preview.status]}
                <div>
                  <p className="text-sm font-bold">Migration status: {preview.status}</p>
                  <p className="mt-0.5 text-xs opacity-80">
                    {preview.status === 'BLOCKED'
                      ? 'Fix the errors below before any future cloud import can proceed.'
                      : preview.status === 'WARNING'
                        ? 'Data is structurally valid, but some values require explicit review.'
                        : 'Local data passed the safety checks.'}
                  </p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <CountCard label="Phases" value={preview.counts.phases} />
                <CountCard label="Goals" value={preview.counts.goals} />
                <CountCard label="Tasks" value={preview.counts.tasks} />
                <CountCard label="Majors" value={preview.counts.majors} />
                <CountCard label="Skills" value={preview.counts.skills} />
                <CountCard label="Journal" value={preview.counts.journalEntries} />
                <CountCard label="Documents" value={preview.counts.documents} />
                <CountCard label="Experiments" value={preview.counts.experiments} />
                <CountCard label="Attempts" value={preview.counts.experimentAttempts} />
                <CountCard label="Reflections" value={preview.counts.experimentReflections} />
                <CountCard label="Applications" value={preview.counts.applications} />
                <CountCard label="Total records" value={totalRecords} />
              </div>

              {data && data.journey.budget.legacyCurrentSavings !== 0 && (
                <div className="mt-6 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
                  <p className="text-sm font-semibold text-amber-300">Legacy savings needs review</p>
                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    Your local currentSavings value is preserved for review, but it will not become the cloud balance source of truth. Saving transactions will determine the cloud balance.
                  </p>
                </div>
              )}

              {(preview.errors.length > 0 || preview.warnings.length > 0) && (
                <div className="mt-6 space-y-3">
                  {preview.errors.map((issue, index) => (
                    <div key={`error-${index}`} className="rounded-2xl border border-rose-500/15 bg-rose-500/5 p-4">
                      <p className="text-xs font-semibold text-rose-300">Error · {issue.path}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-400">{issue.message}</p>
                    </div>
                  ))}
                  {preview.warnings.map((issue, index) => (
                    <div key={`warning-${index}`} className="rounded-2xl border border-amber-500/15 bg-amber-500/5 p-4">
                      <p className="text-xs font-semibold text-amber-300">Warning · {issue.path}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-400">{issue.message}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 shrink-0 text-emerald-400" size={19} />
                  <div>
                    <p className="text-sm font-semibold text-white">Safe preview only</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Cloud import is intentionally disabled in this step. Your localStorage remains untouched. The next implementation will add an explicit confirmation and a separate cloud write transaction after this preview is verified.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
