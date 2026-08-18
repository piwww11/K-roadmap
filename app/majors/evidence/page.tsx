'use client';

import { useEffect, useMemo, useState } from 'react';
import { useJourneyStore } from '@/store/useJourneyStore';
import { useExperimentStore } from '@/store/experimentStore';
import { analyzeMajorDecision } from '@/lib/majorDecisionEngine';

export default function EvidencePage() {
  const [hydrated, setHydrated] = useState(false);
  const majors = useJourneyStore((s) => s.majors);
  const phases = useJourneyStore((s) => s.phases);
  const decisions = useJourneyStore((s) => s.majorDecisions);
  const experiments = useExperimentStore((s) => s.experiments);
  useEffect(() => setHydrated(true), []);
  const result = useMemo(() => {
    if (!hydrated || !decisions.length) return undefined;
    return analyzeMajorDecision(decisions[decisions.length - 1], majors, phases, experiments);
  }, [decisions, experiments, hydrated, majors, phases]);

  return <main className="min-h-screen bg-slate-950 p-8 text-slate-100"><div className="mx-auto max-w-6xl"><header className="mb-10"><p className="text-sm font-semibold uppercase tracking-widest text-indigo-400">K-ROADMAP / EVIDENCE</p><h1 className="mt-2 text-4xl font-bold">Evidence Dashboard</h1><p className="mt-3 max-w-3xl text-slate-400">See why each major is currently strong, uncertain, or still under-explored.</p></header>{!result ? <section className="rounded-2xl border border-slate-800 bg-slate-900 p-8"><h2 className="text-xl font-semibold">No decision evidence yet</h2><p className="mt-2 text-slate-400">Complete the Major Decision questionnaire first.</p><a href="/majors/decision/questionnaire" className="mt-5 inline-block rounded-xl bg-indigo-600 px-5 py-3 font-semibold">Start questionnaire →</a></section> : <div className="space-y-5">{result.analyses.map((analysis) => { const major = majors.find((item) => item.id === analysis.majorId); return <article key={analysis.majorId} className="rounded-2xl border border-slate-800 bg-slate-900 p-6"><div className="flex flex-col justify-between gap-4 md:flex-row"><div><h2 className="text-2xl font-bold">{major?.icon} {major?.name}</h2><p className="mt-1 text-sm text-slate-500">Evidence level: {analysis.evidenceLevel} · Score {analysis.score}/100</p></div><div className="text-sm text-slate-400">{analysis.completedExplorationTasks}/{analysis.totalExplorationTasks} tasks · {analysis.completedExperiments}/{analysis.totalExperiments} experiments</div></div><div className="mt-5 grid gap-4 md:grid-cols-3">{[['What supports it', analysis.strengths], ['What is uncertain', analysis.uncertainties], ['What would strengthen it', analysis.recommendedNextSteps]].map(([title, items]) => <div key={title as string} className="rounded-xl bg-slate-950/70 p-4"><h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title as string}</h3><ul className="mt-3 space-y-2 text-sm text-slate-300">{(items as string[]).map((item) => <li key={item}>• {item}</li>)}</ul></div>)}</div></article>})}</div>}<a href="/majors/decision" className="mt-8 inline-block text-sm font-semibold text-indigo-400">← Back to decision analysis</a></div></main>;
}
