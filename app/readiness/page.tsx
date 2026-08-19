'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, CircleAlert, FileCheck2, WalletCards, Brain, Map } from 'lucide-react';
import { useJourneyStore } from '@/store/useJourneyStore';
import { buildApplicationReadiness } from '@/lib/applicationReadiness';

const metricIcons = { roadmap: Map, documents: FileCheck2, skills: Brain, budget: WalletCards };
const statusLabel = { 'not-ready': 'Not ready', building: 'Building', 'nearly-ready': 'Nearly ready', ready: 'Ready' };

function scoreTone(score: number) {
  if (score >= 80) return 'text-emerald-300';
  if (score >= 50) return 'text-amber-300';
  return 'text-rose-300';
}

export default function ApplicationReadinessPage() {
  const [hydrated, setHydrated] = useState(false);
  const phases = useJourneyStore((state) => state.phases);
  const documents = useJourneyStore((state) => state.documents);
  const skills = useJourneyStore((state) => state.skills);
  const budget = useJourneyStore((state) => state.budget);

  useEffect(() => setHydrated(true), []);

  const model = useMemo(
    () => hydrated ? buildApplicationReadiness(phases, documents, skills, budget) : null,
    [budget, documents, hydrated, phases, skills]
  );

  if (!model) {
    return <main className="min-h-screen bg-slate-950 p-8 text-slate-100" />;
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto max-w-6xl">
        <header className="mb-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-indigo-400">K-ROADMAP / PREPARATION INTELLIGENCE</p>
            <h1 className="text-4xl font-bold tracking-tight text-white">Application Readiness</h1>
            <p className="mt-3 max-w-3xl text-slate-400">A deterministic snapshot of how prepared your current roadmap is for an actual application. No AI and no hidden weighting.</p>
          </div>
          <Link href="/" className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-900">← Dashboard</Link>
        </header>

        <section className="mb-8 rounded-2xl border border-indigo-500/30 bg-indigo-500/5 p-7">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-indigo-300">Overall readiness</p>
              <div className="mt-2 flex items-end gap-3"><span className="text-6xl font-bold text-white">{model.overall}</span><span className="mb-2 text-lg text-slate-500">/100</span></div>
              <p className="mt-2 text-sm text-slate-400">{statusLabel[model.status]} — the four preparation dimensions are weighted equally.</p>
            </div>
            <div className="w-full max-w-md"><div className="mb-2 flex justify-between text-xs text-slate-500"><span>Application readiness</span><span>{model.overall}%</span></div><div className="h-3 overflow-hidden rounded-full bg-slate-900"><div className="h-full rounded-full bg-indigo-400 transition-all" style={{ width: `${model.overall}%` }} /></div></div>
          </div>
        </section>

        <section className="mb-8 grid gap-5 md:grid-cols-2">
          {model.metrics.map((metric) => {
            const Icon = metricIcons[metric.id];
            return <article key={metric.id} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
              <div className="flex items-start justify-between gap-4"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-indigo-300"><Icon size={19} /></div><div><h2 className="font-bold text-white">{metric.label}</h2><p className="mt-1 text-xs text-slate-500">{metric.detail}</p></div></div><span className={`text-2xl font-bold ${scoreTone(metric.score)}`}>{metric.score}</span></div>
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-950"><div className="h-full rounded-full bg-indigo-400" style={{ width: `${metric.score}%` }} /></div>
              <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">{metric.status === 'ready' ? <CheckCircle2 size={14} className="text-emerald-400" /> : <CircleAlert size={14} className="text-amber-400" />}<span className="capitalize">{metric.status.replace('-', ' ')}</span></div>
            </article>;
          })}
        </section>

        <section className="mb-8 grid gap-5 lg:grid-cols-2">
          <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6"><h2 className="text-lg font-bold text-white">What is already strong?</h2>{model.strengths.length ? <ul className="mt-4 space-y-3">{model.strengths.map((item) => <li key={item} className="rounded-xl bg-emerald-500/5 px-4 py-3 text-sm text-slate-300">✓ {item}</li>)}</ul> : <p className="mt-4 text-sm text-slate-500">No readiness dimension is above 75% yet. Keep building preparation.</p>}</article>
          <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6"><h2 className="text-lg font-bold text-white">What is holding readiness back?</h2>{model.blockers.length ? <ul className="mt-4 space-y-3">{model.blockers.map((item) => <li key={item} className="rounded-xl bg-amber-500/5 px-4 py-3 text-sm text-slate-300">→ {item}</li>)}</ul> : <p className="mt-4 text-sm text-emerald-300">No major blocker detected. All four dimensions are at least 75%.</p>}</article>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <div className="mb-5"><h2 className="text-lg font-bold text-white">Readiness inputs</h2><p className="mt-1 text-sm text-slate-500">Each number comes directly from an existing K-ROADMAP system.</p></div>
          <div className="grid gap-3 text-sm md:grid-cols-4">
            <Link href="/roadmap" className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 hover:border-slate-700"><p className="font-semibold text-white">Roadmap</p><p className="mt-1 text-xs text-slate-500">Task completion</p></Link>
            <Link href="/documents" className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 hover:border-slate-700"><p className="font-semibold text-white">Documents</p><p className="mt-1 text-xs text-slate-500">Verified documents</p></Link>
            <Link href="/skills" className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 hover:border-slate-700"><p className="font-semibold text-white">Skills</p><p className="mt-1 text-xs text-slate-500">Completed skills</p></Link>
            <Link href="/budget" className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 hover:border-slate-700"><p className="font-semibold text-white">Budget</p><p className="mt-1 text-xs text-slate-500">Savings coverage</p></Link>
          </div>
        </section>
      </div>
    </main>
  );
}
