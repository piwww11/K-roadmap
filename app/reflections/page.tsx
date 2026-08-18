'use client';

import { useEffect, useMemo, useState } from 'react';
import { useExperimentStore } from '@/store/experimentStore';
import { analyzeReflections } from '@/lib/reflectionIntelligence';

export default function ReflectionsPage() {
  const [hydrated, setHydrated] = useState(false);
  const experiments = useExperimentStore((state) => state.experiments);
  useEffect(() => setHydrated(true), []);
  const analysis = useMemo(() => analyzeReflections(hydrated ? experiments : []), [experiments, hydrated]);

  return (
    <main className="min-h-screen bg-slate-950 p-8 text-slate-100">
      <div className="mx-auto max-w-6xl">
        <header className="mb-10">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-cyan-400">K-ROADMAP / INTELLIGENCE</p>
          <h1 className="text-4xl font-bold text-white">Reflection Intelligence</h1>
          <p className="mt-3 max-w-3xl text-slate-400">Turn repeated experiment reflections into patterns. These are signals for exploration, not diagnoses or final decisions.</p>
        </header>

        <section className="mb-8 grid gap-4 md:grid-cols-4">
          {[
            ['Reflected attempts', analysis.reflectedAttempts],
            ['Avg. interest', `${analysis.averageInterest}/5`],
            ['Avg. energy', `${analysis.averageEnergy}/5`],
            ['Repeat rate', `${analysis.repeatRate}%`],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><p className="text-xs uppercase tracking-wider text-slate-500">{label}</p><p className="mt-2 text-3xl font-bold text-white">{value}</p></div>
          ))}
        </section>

        <section className="mb-8 rounded-2xl border border-indigo-500/30 bg-indigo-500/5 p-6">
          <p className="text-xs uppercase tracking-wider text-indigo-400">Interest trajectory</p>
          <h2 className="mt-2 text-2xl font-bold text-white">{analysis.interestTrend === 'rising' ? 'Trending upward ↗' : analysis.interestTrend === 'falling' ? 'Trending downward ↘' : analysis.interestTrend === 'stable' ? 'Relatively stable →' : 'Not enough history yet'}</h2>
          <p className="mt-2 text-sm text-slate-400">Average difficulty: {analysis.averageDifficulty}/5 · Total attempts recorded: {analysis.attempts}</p>
        </section>

        <section className="space-y-4">
          {analysis.insights.map((insight) => (
            <article key={insight.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <div className="flex items-start gap-4"><span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold uppercase text-slate-400">{insight.tone}</span><div><h2 className="text-lg font-semibold text-white">{insight.title}</h2><p className="mt-2 text-sm leading-6 text-slate-400">{insight.detail}</p></div></div>
            </article>
          ))}
        </section>

        <div className="mt-8 flex flex-wrap gap-3"><a href="/experiments" className="rounded-xl bg-cyan-600 px-5 py-3 text-sm font-semibold text-white hover:bg-cyan-500">Open experiments →</a><a href="/majors/decision" className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-900">Decision Intelligence →</a></div>
      </div>
    </main>
  );
}
