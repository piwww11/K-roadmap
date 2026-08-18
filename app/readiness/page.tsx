'use client';

import { useEffect, useMemo, useState } from 'react';
import { useJourneyStore } from '@/store/useJourneyStore';

export default function ReadinessPage() {
  const [hydrated, setHydrated] = useState(false);
  const getOverallProgress = useJourneyStore((s) => s.getOverallProgress);
  const documents = useJourneyStore((s) => s.documents);
  const budget = useJourneyStore((s) => s.budget);
  const skills = useJourneyStore((s) => s.skills);
  useEffect(() => setHydrated(true), []);
  const readiness = useMemo(() => {
    if (!hydrated) return { roadmap: 0, documents: 0, skills: 0, budget: 0, overall: 0 };
    const roadmap = getOverallProgress();
    const documentsScore = documents.length ? Math.round((documents.filter((d) => d.status === 'Ready' || d.status === 'Verified').length / documents.length) * 100) : 0;
    const skillsScore = skills.length ? Math.round((skills.filter((s) => s.status === 'completed').length / skills.length) * 100) : 0;
    const budgetScore = budget.targetAmount <= 0 ? 0 : Math.min(100, Math.round((budget.currentSavings / budget.targetAmount) * 100));
    const overall = Math.round((roadmap + documentsScore + skillsScore + budgetScore) / 4);
    return { roadmap, documents: documentsScore, skills: skillsScore, budget: budgetScore, overall };
  }, [budget, documents, getOverallProgress, hydrated, skills]);
  const rows = [['Roadmap execution', readiness.roadmap], ['Documents', readiness.documents], ['Skills', readiness.skills], ['Budget readiness', readiness.budget]] as const;
  return <main className="min-h-screen bg-slate-950 p-8 text-slate-100"><div className="mx-auto max-w-5xl"><header className="mb-10"><p className="text-sm font-semibold uppercase tracking-widest text-emerald-400">K-ROADMAP / PREPARATION</p><h1 className="mt-2 text-4xl font-bold">Application Readiness</h1><p className="mt-3 max-w-3xl text-slate-400">A transparent preparation score built from your actual roadmap, skills, documents, and savings state.</p></header><section className="mb-8 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-8"><p className="text-sm uppercase tracking-wider text-emerald-400">Overall readiness</p><p className="mt-2 text-6xl font-bold">{readiness.overall}%</p><p className="mt-3 text-sm text-slate-400">This is a planning indicator, not an admissions probability.</p></section><section className="space-y-4">{rows.map(([label, value]) => <div key={label} className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><div className="mb-3 flex justify-between"><span className="font-semibold">{label}</span><span className="text-sm text-slate-400">{value}%</span></div><div className="h-2.5 rounded-full bg-slate-800"><div className="h-2.5 rounded-full bg-emerald-500" style={{ width: `${value}%` }} /></div></div>)}</section><a href="/documents" className="mt-8 inline-block text-sm font-semibold text-emerald-400">Open document tracker →</a></div></main>;
}
