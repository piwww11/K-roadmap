'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { BarChart3, CheckCircle2, FlaskConical, ArrowRight, Sparkles } from 'lucide-react';
import { useJourneyStore } from '@/store/useJourneyStore';
import { useExperimentStore } from '@/store/experimentStore';
import { analyzeMajorDecision } from '@/lib/majorDecisionEngine';
import { buildWeeklyIntelligenceReview } from '@/lib/weeklyIntelligence';

export default function WeeklyReviewPage() {
  const phases = useJourneyStore((state) => state.phases);
  const majors = useJourneyStore((state) => state.majors);
  const decisions = useJourneyStore((state) => state.majorDecisions);
  const experiments = useExperimentStore((state) => state.experiments);

  const review = useMemo(() => {
    const latestDecision = decisions[decisions.length - 1];
    const result = latestDecision ? analyzeMajorDecision(latestDecision, majors, phases, experiments) : undefined;
    return buildWeeklyIntelligenceReview({
      phases,
      experiments,
      majors,
      decision: latestDecision,
      analyses: result?.analyses ?? [],
    });
  }, [decisions, experiments, majors, phases]);

  const leader = review.currentInterestLeader;

  return (
    <main className="min-h-screen bg-slate-950 p-8 text-slate-100">
      <div className="mx-auto max-w-6xl">
        <header className="mb-10">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-indigo-400">K-ROADMAP / INTELLIGENCE</p>
          <h1 className="text-4xl font-bold text-white">Weekly Intelligence Review</h1>
          <p className="mt-3 max-w-3xl text-slate-400">A deterministic weekly snapshot of your progress, experiments, reflections, and current evidence direction. It does not pretend to be AI.</p>
        </header>

        <section className="mb-8 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-6">
          <div className="flex items-start gap-4"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-300"><Sparkles size={20} /></div><div><p className="text-xs font-bold uppercase tracking-widest text-indigo-300">This week's read</p><p className="mt-2 text-lg leading-relaxed text-slate-200">{review.summary}</p></div></div>
        </section>

        <section className="mb-8 grid gap-4 md:grid-cols-2">
          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-6"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-slate-500">Task progress</p><p className="mt-2 text-3xl font-bold text-white">{review.taskProgress.percent}%</p></div><BarChart3 className="text-cyan-400/70" size={28} /></div><div className="mt-4 h-2 rounded-full bg-slate-800"><div className="h-2 rounded-full bg-cyan-500" style={{ width: `${review.taskProgress.percent}%` }} /></div><div className="mt-3 flex justify-between text-xs text-slate-500"><span>{review.taskProgress.completed}/{review.taskProgress.total} completed</span><span>{review.taskProgress.inProgress} in progress</span></div><Link href="/roadmap" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-cyan-300 hover:text-cyan-200">Open roadmap <ArrowRight size={15} /></Link></article>
          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-6"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-slate-500">Experiment progress</p><p className="mt-2 text-3xl font-bold text-white">{review.experimentProgress.percent}%</p></div><FlaskConical className="text-indigo-400/70" size={28} /></div><div className="mt-4 h-2 rounded-full bg-slate-800"><div className="h-2 rounded-full bg-indigo-500" style={{ width: `${review.experimentProgress.percent}%` }} /></div><div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500"><span>{review.experimentProgress.completed}/{review.experimentProgress.total} experiments reflected</span><span>{review.experimentProgress.reflectedAttempts} reflected attempts</span><span>Interest {review.experimentProgress.averageInterest}/5</span><span>Energy {review.experimentProgress.averageEnergy}/5</span></div><Link href="/experiments" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-indigo-300 hover:text-indigo-200">Open experiments <ArrowRight size={15} /></Link></article>
        </section>

        <section className="mb-8 rounded-2xl border border-slate-800 bg-slate-900 p-6"><div className="mb-5 flex items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-cyan-400">Current interest leader</p><h2 className="mt-1 text-2xl font-bold text-white">{leader ? `${leader.icon} ${leader.name}` : 'No clear leader yet'}</h2></div>{leader && <span className="rounded-full bg-cyan-400/10 px-3 py-1.5 text-xs font-bold text-cyan-300">{leader.adaptiveScore}/100</span>}</div>{leader ? <div className="grid gap-3 md:grid-cols-3"><div className="rounded-xl bg-slate-950/60 p-4"><p className="text-xs uppercase tracking-wider text-slate-500">Adaptive score</p><p className="mt-1 text-xl font-bold text-white">{leader.adaptiveScore}</p></div><div className="rounded-xl bg-slate-950/60 p-4"><p className="text-xs uppercase tracking-wider text-slate-500">Evidence score</p><p className="mt-1 text-xl font-bold text-cyan-300">{leader.evidenceScore}/100</p></div><div className="rounded-xl bg-slate-950/60 p-4"><p className="text-xs uppercase tracking-wider text-slate-500">Evidence maturity</p><p className="mt-1 text-xl font-bold text-white">{Math.round(leader.maturity * 100)}%</p></div></div> : <p className="text-sm text-slate-500">Run the Major Decision questionnaire first to establish an initial intelligence baseline.</p>}<Link href="/majors/comparison" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-cyan-300 hover:text-cyan-200">Inspect comparison evidence <ArrowRight size={15} /></Link></section>

        <section className="mb-8 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6"><div className="mb-5 flex items-center gap-3"><CheckCircle2 className="text-emerald-400" size={21} /><div><p className="text-xs font-bold uppercase tracking-widest text-emerald-400">Deterministic next steps</p><h2 className="mt-1 text-xl font-bold text-white">What to do next</h2></div></div><div className="space-y-3">{review.suggestions.map((suggestion, index) => <div key={suggestion} className="flex items-start gap-4 rounded-xl border border-slate-800 bg-slate-950/50 p-4"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-xs font-bold text-emerald-300">{index + 1}</span><p className="pt-1 text-sm leading-relaxed text-slate-300">{suggestion}</p></div>)}</div></section>

        <p className="text-center text-xs text-slate-600">Generated from the current K-ROADMAP state · no AI-generated conclusions or hidden scoring.</p>
      </div>
    </main>
  );
}
