'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { ArrowRight, Compass, FlaskConical, LockKeyhole, Target } from 'lucide-react';
import { useJourneyStore } from '@/store/useJourneyStore';
import { useExperimentStore } from '@/store/experimentStore';
import { analyzeMajorDecision } from '@/lib/majorDecisionEngine';
import { buildAdaptiveJourneyModel } from '@/lib/adaptiveJourney';

export default function AdaptiveJourneyPage() {
  const phases = useJourneyStore((state) => state.phases);
  const majors = useJourneyStore((state) => state.majors);
  const decisions = useJourneyStore((state) => state.majorDecisions);
  const experiments = useExperimentStore((state) => state.experiments);

  const model = useMemo(() => {
    const decision = decisions[decisions.length - 1];
    const result = decision ? analyzeMajorDecision(decision, majors, phases, experiments) : undefined;
    return buildAdaptiveJourneyModel({ phases, majors, experiments, decision, analyses: result?.analyses ?? [] });
  }, [decisions, experiments, majors, phases]);

  const focus = model.focusMajor;
  const modes = ['stabilize', 'explore', 'deepen', 'prepare'] as const;

  return (
    <main className="min-h-screen bg-slate-950 p-8 text-slate-100">
      <div className="mx-auto max-w-6xl">
        <header className="mb-10">
          <div className="mb-3 flex items-center gap-3 text-indigo-400"><Compass size={24} /><span className="text-xs font-bold uppercase tracking-[0.2em]">K-ROADMAP / ADAPTIVE JOURNEY</span></div>
          <h1 className="text-4xl font-bold text-white">Adaptive Journey</h1>
          <p className="mt-3 max-w-3xl text-slate-400">Your roadmap stays intact, while the next recommended actions adapt to the evidence you are actually building.</p>
        </header>

        <section className="mb-8 grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
          <article className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-6">
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-300">Adaptive mode</p>
            <h2 className="mt-2 text-2xl font-bold text-white">{model.modeLabel}</h2>
            <p className="mt-3 max-w-2xl leading-relaxed text-slate-400">{model.modeDescription}</p>
            <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold">
              {modes.map((mode) => <span key={mode} className={`rounded-full border px-3 py-1.5 ${model.mode === mode ? 'border-indigo-400/40 bg-indigo-400/10 text-indigo-300' : 'border-slate-800 text-slate-600'}`}>{mode}</span>)}
            </div>
          </article>
          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Current focus</p>
            <h2 className="mt-2 text-2xl font-bold text-white">{focus ? `${focus.icon} ${focus.name}` : 'Not established'}</h2>
            {focus ? <><p className="mt-1 text-sm text-slate-500">{focus.university}</p><div className="mt-5 flex items-end justify-between"><div><p className="text-xs text-slate-500">Adaptive score</p><p className="text-3xl font-bold text-cyan-300">{focus.adaptiveScore}</p></div><Link href="/majors/comparison" className="inline-flex items-center gap-2 text-xs font-semibold text-cyan-300">Compare <ArrowRight size={14} /></Link></div></> : <p className="mt-3 text-sm leading-relaxed text-slate-500">Complete a Major Decision questionnaire first. Until then, Adaptive Journey stays conservative.</p>}
          </article>
        </section>

        <section className="mb-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-5 flex items-start justify-between gap-6"><div><p className="text-xs font-bold uppercase tracking-widest text-cyan-400">Why the journey changed</p><h2 className="mt-1 text-xl font-bold text-white">Evidence-driven prioritization</h2></div><Target className="text-cyan-400/70" size={22} /></div>
          <p className="max-w-4xl leading-relaxed text-slate-300">{model.focusReason}</p>
          <p className="mt-3 text-xs text-slate-600">Adaptive Journey does not silently delete, reorder, complete, or rewrite roadmap tasks. It changes the recommended queue so you can see and control the adaptation.</p>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-6 flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-emerald-400">Recommended queue</p><h2 className="mt-1 text-2xl font-bold text-white">What should move next</h2></div><span className="text-xs text-slate-600">{model.suppressedTasks} lower-priority tasks temporarily below the queue</span></div>
          <div className="space-y-3">
            {model.recommendations.map((item, index) => <div key={item.task.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 transition-colors hover:border-indigo-500/30"><div className="flex items-start gap-4"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-sm font-bold text-indigo-300">{index + 1}</div><div className="min-w-0 flex-1"><div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between"><div><h3 className="font-semibold text-slate-100">{item.task.title}</h3><p className="mt-1 text-xs text-slate-600">{item.task.category}{item.focusMajorId ? ' · aligned with current focus' : ''}</p></div><span className="shrink-0 rounded-full bg-slate-900 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Priority {item.score}</span></div><div className="mt-3 space-y-1">{item.reasons.map((reason) => <p key={reason} className="text-sm leading-relaxed text-slate-400">• {reason}</p>)}</div></div></div></div>)}
            {!model.recommendations.length && <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-6 text-center"><LockKeyhole className="mx-auto text-emerald-400" size={24} /><p className="mt-3 font-semibold text-white">Your current roadmap has no unfinished tasks.</p><p className="mt-1 text-sm text-slate-500">Use experiments or application preparation to create the next evidence signal.</p></div>}
          </div>
        </section>

        <div className="mt-6 flex justify-center gap-4 text-xs"><Link href="/roadmap" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-300">Open full roadmap <ArrowRight size={14} /></Link><Link href="/experiments" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-300"><FlaskConical size={14} /> Explore experiments</Link></div>
      </div>
    </main>
  );
}
