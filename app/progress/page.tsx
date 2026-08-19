'use client';

import Link from 'next/link';
import { BarChart3, CalendarDays, CheckCircle2, Clock3, FlaskConical, ArrowRight, BookOpen, Brain } from 'lucide-react';
import { useMemo } from 'react';
import { useJourneyStore } from '@/store/useJourneyStore';
import { useExperimentStore } from '@/store/experimentStore';
import { buildProgressAnalytics, dateLabel } from '@/lib/progressAnalytics';

const eventIcon = {
  decision: Brain,
  experiment: FlaskConical,
  reflection: CheckCircle2,
  journal: BookOpen,
};

export default function ProgressAnalyticsPage() {
  const phases = useJourneyStore((state) => state.phases);
  const majors = useJourneyStore((state) => state.majors);
  const decisions = useJourneyStore((state) => state.majorDecisions);
  const journalEntries = useJourneyStore((state) => state.journalEntries);
  const experiments = useExperimentStore((state) => state.experiments);

  const model = useMemo(() => buildProgressAnalytics({ phases, majors, experiments, decisions, journalEntries }), [decisions, experiments, journalEntries, majors, phases]);

  return (
    <main className="min-h-screen bg-slate-950 p-8 text-slate-100">
      <div className="mx-auto max-w-6xl">
        <header className="mb-10">
          <div className="mb-3 flex items-center gap-3 text-cyan-400"><BarChart3 size={24} /><span className="text-xs font-bold uppercase tracking-[0.2em]">K-ROADMAP / PROGRESS</span></div>
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div><h1 className="text-4xl font-bold text-white">Progress Analytics</h1><p className="mt-3 max-w-3xl text-slate-400">See how much of the journey is complete, where progress is concentrated, and which dated activities have shaped the journey so far.</p></div>
            <Link href="/roadmap" className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-900">Open roadmap <ArrowRight size={15} /></Link>
          </div>
        </header>

        <section className="mb-8 grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-6"><p className="text-xs font-bold uppercase tracking-widest text-cyan-300">Overall progress</p><div className="mt-2 flex items-end gap-2"><span className="text-5xl font-bold text-white">{model.overall.progress}</span><span className="mb-1 text-slate-500">%</span></div><div className="mt-4 h-2.5 rounded-full bg-slate-900"><div className="h-full rounded-full bg-cyan-400" style={{ width: `${model.overall.progress}%` }} /></div><p className="mt-3 text-xs text-slate-500">{model.overall.completed} of {model.overall.total} roadmap tasks completed</p></article>
          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-6"><p className="text-xs font-bold uppercase tracking-widest text-slate-500">Current phase</p><h2 className="mt-2 text-xl font-bold text-white">{model.currentPhase?.title ?? 'Journey complete'}</h2>{model.currentPhase && <><p className="mt-1 text-xs text-slate-500">Phase {model.currentPhase.number} · {model.currentPhase.progress}% complete</p><div className="mt-4 flex items-center gap-2 text-xs text-indigo-300"><CalendarDays size={14} /> {model.currentPhase.startDate} — {model.currentPhase.endDate}</div></>}</article>
          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-6"><p className="text-xs font-bold uppercase tracking-widest text-slate-500">Next phase</p><h2 className="mt-2 text-xl font-bold text-white">{model.nextPhase?.title ?? 'No next phase'}</h2>{model.nextPhase && <p className="mt-2 text-sm text-slate-500">Starts {model.nextPhase.startDate}. Current progress stays the primary signal until the next phase begins.</p>}</article>
        </section>

        <section className="mb-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-6 flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-indigo-400">Phase analytics</p><h2 className="mt-1 text-2xl font-bold text-white">Where the roadmap stands</h2></div><span className="text-xs text-slate-600">{model.phases.length} phases</span></div>
          <div className="space-y-4">{model.phases.map((phase) => <article key={phase.id} className="rounded-xl border border-slate-800 bg-slate-950/50 p-4"><div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div className="min-w-0"><div className="flex items-center gap-2"><span className="rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Phase {phase.number}</span><h3 className="truncate font-semibold text-white">{phase.title}</h3></div><p className="mt-1 text-xs text-slate-600">{phase.startDate} — {phase.endDate}</p></div><div className="flex items-center gap-4 text-xs text-slate-400"><span>{phase.completed}/{phase.total} tasks</span><strong className="text-white">{phase.progress}%</strong></div></div><div className="mt-3 h-2 rounded-full bg-slate-900"><div className={`h-full rounded-full ${phase.progress === 100 ? 'bg-emerald-400' : 'bg-indigo-400'}`} style={{ width: `${phase.progress}%` }} /></div></article>)}</div>
        </section>

        <section className="mb-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-6"><p className="text-xs font-bold uppercase tracking-widest text-emerald-400">Major progress</p><h2 className="mt-1 text-2xl font-bold text-white">Where exploration is concentrated</h2><p className="mt-2 text-sm text-slate-500">This is execution evidence, not a replacement for Major Comparison's adaptive score.</p></div>
          <div className="grid gap-4 lg:grid-cols-3">{model.majors.map((major) => <article key={major.majorId} className="rounded-xl border border-slate-800 bg-slate-950/50 p-5"><div className="flex items-center gap-3"><span className="text-2xl">{major.icon}</span><div><h3 className="font-bold text-white">{major.name}</h3><p className="text-xs text-slate-600">Execution snapshot</p></div></div><div className="mt-5"><div className="flex justify-between text-xs"><span className="text-slate-500">Major task progress</span><span className="font-semibold text-slate-200">{major.taskProgress}%</span></div><div className="mt-2 h-2 rounded-full bg-slate-900"><div className="h-full rounded-full bg-indigo-400" style={{ width: `${major.taskProgress}%` }} /></div></div><div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-lg bg-slate-900 p-3"><p className="text-[10px] uppercase tracking-wider text-slate-600">Tasks</p><p className="mt-1 text-sm font-bold text-white">{major.completedTasks}/{major.totalTasks}</p></div><div className="rounded-lg bg-slate-900 p-3"><p className="text-[10px] uppercase tracking-wider text-slate-600">Reflections</p><p className="mt-1 text-sm font-bold text-white">{major.reflectionRate}%</p></div></div><p className="mt-3 text-xs text-slate-600">{major.reflectedExperiments}/{major.experiments} experiments reflected</p></article>)}</div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-6 flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-cyan-400">Journey timeline</p><h2 className="mt-1 text-2xl font-bold text-white">Dated activity</h2><p className="mt-2 text-sm text-slate-500">Decisions, experiments, reflections, and journal entries in chronological order.</p></div><span className="text-xs text-slate-600">{model.activityCount} events</span></div>
          {model.activity.length ? <div className="relative ml-2 border-l border-slate-800 pl-7">{model.activity.map((event) => { const Icon = eventIcon[event.kind]; return <article key={event.id} className="relative pb-6 last:pb-0"><span className="absolute -left-[39px] top-0 flex h-6 w-6 items-center justify-center rounded-full border border-slate-800 bg-slate-950 text-cyan-300"><Icon size={12} /></span><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-slate-950 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">{event.kind}</span><span className="text-[10px] text-slate-600">{dateLabel(event.date)}</span></div><h3 className="mt-2 font-semibold text-slate-200">{event.title}</h3><p className="mt-1 text-sm leading-relaxed text-slate-500">{event.detail}</p></article>; })}</div> : <div className="rounded-xl border border-dashed border-slate-800 p-8 text-center text-sm text-slate-500">No dated activity yet. Run an experiment, reflect, journal, or record a decision snapshot to start the timeline.</div>}
        </section>

        <div className="mt-5 flex items-start gap-2 rounded-xl border border-slate-800 bg-slate-950/50 p-4 text-xs leading-relaxed text-slate-600"><Clock3 size={14} className="mt-0.5 shrink-0" />{model.note}</div>
      </div>
    </main>
  );
}
