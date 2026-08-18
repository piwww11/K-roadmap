'use client';

import { useEffect, useMemo, useState } from 'react';
import { useJourneyStore } from '@/store/useJourneyStore';
import { useExperimentStore } from '@/store/experimentStore';
import { analyzeReflections } from '@/lib/reflectionIntelligence';

export default function WeeklyReviewPage() {
  const [hydrated, setHydrated] = useState(false);
  const phases = useJourneyStore((s) => s.phases);
  const majors = useJourneyStore((s) => s.majors);
  const experiments = useExperimentStore((s) => s.experiments);
  useEffect(() => setHydrated(true), []);
  const review = useMemo(() => {
    if (!hydrated) return undefined;
    const tasks = phases.flatMap((p) => p.months.flatMap((m) => m.goals.flatMap((g) => g.tasks)));
    const completed = tasks.filter((t) => t.status === 'Completed').length;
    const reflected = experiments.filter((e) => (e.attempts ?? []).some((a) => a.reflection) || e.reflection).length;
    const reflection = analyzeReflections(experiments);
    const focus = [...majors].sort((a, b) => b.interestScore - a.interestScore)[0];
    return { completed, total: tasks.length, reflected, totalExperiments: experiments.length, reflection, focus };
  }, [experiments, hydrated, majors, phases]);
  if (!review) return <main className="min-h-screen bg-slate-950 p-8 text-slate-100" />;
  const suggestions = [review.totalExperiments > review.reflected ? 'Reflect on an unfinished experiment so the system has stronger evidence.' : 'Your experiment reflections are up to date.', review.reflection.interestTrend === 'falling' ? 'Review what changed in your recent experiences before making a major decision.' : 'Keep repeating high-value experiments when you want stronger evidence.', review.completed < review.total ? 'Choose one small roadmap task for the next session instead of overloading the plan.' : 'Your current roadmap tasks are complete; use exploration time to generate new evidence.'];
  return <main className="min-h-screen bg-slate-950 p-8 text-slate-100"><div className="mx-auto max-w-5xl"><header className="mb-10"><p className="text-sm font-semibold uppercase tracking-widest text-cyan-400">K-ROADMAP / WEEKLY REVIEW</p><h1 className="mt-2 text-4xl font-bold">Weekly Intelligence Review</h1><p className="mt-3 text-slate-400">A lightweight deterministic review generated from your current state.</p></header><section className="mb-8 grid gap-4 md:grid-cols-3"><div className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><p className="text-xs uppercase text-slate-500">Tasks</p><p className="mt-2 text-3xl font-bold">{review.completed}/{review.total}</p></div><div className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><p className="text-xs uppercase text-slate-500">Reflected experiments</p><p className="mt-2 text-3xl font-bold">{review.reflected}/{review.totalExperiments}</p></div><div className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><p className="text-xs uppercase text-slate-500">Current interest leader</p><p className="mt-2 text-xl font-bold">{review.focus?.icon} {review.focus?.name ?? '—'}</p></div></section><section className="rounded-2xl border border-indigo-500/30 bg-indigo-500/5 p-6"><p className="text-sm uppercase tracking-wider text-indigo-400">This week&apos;s signals</p><ul className="mt-4 space-y-3 text-slate-300">{suggestions.map((item) => <li key={item}>→ {item}</li>)}</ul></section><section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-6"><h2 className="text-xl font-semibold">Reflection snapshot</h2><p className="mt-3 text-sm text-slate-400">Interest {review.reflection.averageInterest}/5 · Energy {review.reflection.averageEnergy}/5 · Difficulty {review.reflection.averageDifficulty}/5 · Trend {review.reflection.interestTrend}</p></section><a href="/reflections" className="mt-8 inline-block text-sm font-semibold text-cyan-400">Open reflection intelligence →</a></div></main>;
}
