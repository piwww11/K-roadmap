'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Clock3, FlaskConical, Play } from 'lucide-react';
import { useExperimentStore } from '@/store/experimentStore';
import { useJourneyStore } from '@/store/useJourneyStore';

const STATUS_LABELS = {
  planned: 'Planned',
  'in-progress': 'In progress',
  completed: 'Completed',
  skipped: 'Skipped',
} as const;

function durationLabel(minutes?: number) {
  if (!minutes || minutes < 1) return 'Time not recorded';
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (hours && remaining) return `${hours}h ${remaining}m`;
  if (hours) return `${hours}h`;
  return `${remaining} min`;
}

export default function ExperimentsPage() {
  const experiments = useExperimentStore((state) => state.experiments);
  const startExperiment = useExperimentStore((state) => state.startExperiment);
  const saveReflection = useExperimentStore((state) => state.saveReflection);
  const majors = useJourneyStore((state) => state.majors);
  const [reflectionId, setReflectionId] = useState<string | null>(null);
  const [experimentName, setExperimentName] = useState('');
  const [timeHours, setTimeHours] = useState(0);
  const [timeMinutes, setTimeMinutes] = useState(30);
  const [interest, setInterest] = useState(3);
  const [energy, setEnergy] = useState(3);
  const [difficulty, setDifficulty] = useState(3);
  const [wouldDoAgain, setWouldDoAgain] = useState(true);
  const [notes, setNotes] = useState('');

  const completed = experiments.filter((experiment) => experiment.attempts?.some((attempt) => Boolean(attempt.reflection))).length;
  const progress = experiments.length ? Math.round((completed / experiments.length) * 100) : 0;

  const grouped = useMemo(() => majors.map((major) => ({
    major,
    experiments: experiments.filter((experiment) => experiment.majorId === major.id),
  })).filter((group) => group.experiments.length), [experiments, majors]);

  const latestAttempt = (experiment: typeof experiments[number]) => experiment.attempts?.[experiment.attempts.length - 1];

  const begin = (id: string) => startExperiment(id);

  const openReflection = (id: string) => {
    const experiment = experiments.find((item) => item.id === id);
    const attempt = experiment ? latestAttempt(experiment) : undefined;
    setExperimentName(attempt?.experimentName ?? '');
    const recordedMinutes = attempt?.durationMinutes ?? 30;
    setTimeHours(Math.floor(recordedMinutes / 60));
    setTimeMinutes(recordedMinutes % 60);
    setInterest(attempt?.reflection?.interest ?? 3);
    setEnergy(attempt?.reflection?.energy ?? 3);
    setDifficulty(attempt?.reflection?.difficulty ?? 3);
    setWouldDoAgain(attempt?.reflection?.wouldDoAgain ?? true);
    setNotes(attempt?.reflection?.notes ?? '');
    setReflectionId(id);
  };

  const submitReflection = () => {
    if (!reflectionId || !experimentName.trim()) return;
    const totalMinutes = Math.max(1, (Math.max(0, timeHours) * 60) + Math.max(0, Math.min(59, timeMinutes)));
    saveReflection(reflectionId, { interest, energy, difficulty, wouldDoAgain, notes }, {
      experimentName: experimentName.trim(),
      durationMinutes: totalMinutes,
    });
    setReflectionId(null);
  };

  return (
    <main className="min-h-screen bg-slate-950 p-8 text-slate-100">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-cyan-400">K-ROADMAP / EXPLORATION</p>
            <h1 className="text-4xl font-bold text-white">Experiments</h1>
            <p className="mt-3 max-w-3xl text-slate-400">Turn major curiosity into real evidence. Run a small experiment, reflect honestly, then let your decision intelligence learn from the experience.</p>
          </div>
          <Link href="/majors/decision" className="rounded-xl border border-slate-700 px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-900">Back to Decision Intelligence</Link>
        </header>

        <section className="mb-8 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-6">
          <div className="flex items-center justify-between gap-4">
            <div><p className="text-sm font-semibold text-cyan-300">Evidence progress</p><p className="mt-1 text-sm text-slate-400">{completed} of {experiments.length} experiments reflected</p></div>
            <span className="text-2xl font-bold text-white">{progress}%</span>
          </div>
          <div className="mt-4 h-2.5 w-full rounded-full bg-slate-800"><div className="h-2.5 rounded-full bg-cyan-500 transition-all" style={{ width: `${progress}%` }} /></div>
        </section>

        <div className="space-y-8">
          {grouped.map(({ major, experiments: majorExperiments }) => (
            <section key={major.id}>
              <div className="mb-4 flex items-center gap-3"><span className="text-2xl">{major.icon}</span><div><h2 className="text-2xl font-bold text-white">{major.name}</h2><p className="text-sm text-slate-500">{major.university}</p></div></div>
              <div className="grid gap-4">
                {majorExperiments.map((experiment) => {
                  const attempts = experiment.attempts ?? [];
                  const latest = latestAttempt(experiment);
                  return (
                    <article key={experiment.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0"><h3 className="text-lg font-semibold text-white">{experiment.title}</h3><p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">{experiment.description}</p></div>
                        <FlaskConical className="shrink-0 text-cyan-400" size={22} />
                      </div>

                      <div className="mt-5 flex flex-wrap items-center gap-2 text-xs"><span className="rounded-full bg-slate-800 px-3 py-1 text-slate-400">{STATUS_LABELS[experiment.status]}</span><span className="rounded-full bg-slate-800 px-3 py-1 text-slate-400">{attempts.length} attempt{attempts.length === 1 ? '' : 's'}</span></div>

                      {latest?.reflection && <div className="mt-5 rounded-xl bg-slate-950/70 p-4"><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Latest reflection</p>{latest.experimentName && <p className="mt-2 text-sm font-semibold text-white">{latest.experimentName}</p>}<p className="mt-1 flex items-center gap-2 text-xs text-slate-400"><Clock3 size={13}/>{durationLabel(latest.durationMinutes)}</p><p className="mt-2 text-sm text-slate-300">Interest {latest.reflection.interest}/5 · Energy {latest.reflection.energy}/5 · Difficulty {latest.reflection.difficulty}/5 · {latest.reflection.wouldDoAgain ? 'Would do again' : 'Would not do again'}</p>{latest.reflection.notes && <p className="mt-2 text-sm italic text-slate-400">“{latest.reflection.notes}”</p>}</div>}

                      {attempts.length > 1 && <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/40 p-4"><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Attempt history</p><div className="mt-3 space-y-3">{attempts.map((attempt, index) => <div key={attempt.id} className="rounded-lg border border-slate-800/80 bg-slate-900/60 p-3"><div className="flex items-center justify-between gap-3"><span className="text-xs font-semibold text-slate-300">Attempt #{index + 1}</span><span className="text-[11px] text-slate-500">{attempt.reflection ? 'Reflected' : 'In progress'}</span></div><div className="mt-2 grid gap-1 text-[11px] text-slate-400">{attempt.experimentName && <span className="font-semibold text-slate-200">{attempt.experimentName}</span>}<span className="flex items-center gap-1.5"><Clock3 size={12}/>{durationLabel(attempt.durationMinutes)}</span>{attempt.reflection ? <><div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1"><span>Interest <strong className="text-slate-200">{attempt.reflection.interest}/5</strong></span><span>Energy <strong className="text-slate-200">{attempt.reflection.energy}/5</strong></span><span>Difficulty <strong className="text-slate-200">{attempt.reflection.difficulty}/5</strong></span><span>{attempt.reflection.wouldDoAgain ? 'Would repeat' : 'Would not repeat'}</span></div>{attempt.reflection.notes && <span className="mt-1 italic text-slate-500">“{attempt.reflection.notes}”</span>}</> : <span className="text-slate-500">This attempt has not been reflected yet.</span>}</div></div>)}</div></div>}

                      <div className="mt-5 flex flex-wrap gap-3">
                        {experiment.status === 'planned' && <button onClick={() => begin(experiment.id)} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"><Play size={16} /> Start experiment</button>}
                        {experiment.status === 'in-progress' && <button onClick={() => openReflection(experiment.id)} className="flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-500"><CheckCircle2 size={16} /> Reflect & complete</button>}
                        {experiment.status === 'completed' && <><button onClick={() => begin(experiment.id)} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"><Play size={16} /> Run again</button><button onClick={() => openReflection(experiment.id)} className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-800">Update latest reflection</button></>}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        {reflectionId && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-6"><div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl"><h2 className="text-2xl font-bold text-white">Reflect on the experiment</h2><p className="mt-2 text-sm text-slate-400">Capture what you actually did, how long it took, and what the experience felt like.</p><div className="mt-6 space-y-4"><label className="block text-sm text-slate-300">Experiment name<input autoFocus value={experimentName} onChange={(e) => setExperimentName(e.target.value)} placeholder="e.g. Solve three mechanics problems" className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-white placeholder:text-slate-600" /></label><div><p className="text-sm text-slate-300">Time spent</p><div className="mt-2 grid grid-cols-2 gap-3"><label className="text-xs text-slate-400">Hours<input type="number" min={0} max={99} value={timeHours} onChange={(e) => setTimeHours(Number(e.target.value) || 0)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-white" /></label><label className="text-xs text-slate-400">Minutes<input type="number" min={0} max={59} value={timeMinutes} onChange={(e) => setTimeMinutes(Number(e.target.value) || 0)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-white" /></label></div></div></div><div className="mt-6 grid gap-4 md:grid-cols-3"><label className="text-sm text-slate-300">Interest <input type="number" min={1} max={5} value={interest} onChange={(e) => setInterest(Number(e.target.value))} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white" /></label><label className="text-sm text-slate-300">Energy <input type="number" min={1} max={5} value={energy} onChange={(e) => setEnergy(Number(e.target.value))} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white" /></label><label className="text-sm text-slate-300">Difficulty <input type="number" min={1} max={5} value={difficulty} onChange={(e) => setDifficulty(Number(e.target.value))} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white" /></label></div><label className="mt-5 flex items-center gap-3 text-sm text-slate-300"><input type="checkbox" checked={wouldDoAgain} onChange={(e) => setWouldDoAgain(e.target.checked)} /> I would willingly do something like this again.</label><label className="mt-5 block text-sm text-slate-300">Notes<textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} placeholder="What surprised you? What felt satisfying or frustrating?" className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white placeholder:text-slate-600" /></label><div className="mt-6 flex justify-end gap-3"><button onClick={() => setReflectionId(null)} className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-300">Cancel</button><button onClick={submitReflection} disabled={!experimentName.trim() || ((Math.max(0, timeHours) * 60) + Math.max(0, Math.min(59, timeMinutes)) < 1)} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50">Save reflection</button></div></div></div>}
      </div>
    </main>
  );
}