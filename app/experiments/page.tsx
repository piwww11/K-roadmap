'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Clock3, Edit3, FlaskConical, Play, RotateCcw, Save, X } from 'lucide-react';
import { useExperimentStore } from '@/store/experimentStore';
import { useJourneyStore } from '@/store/useJourneyStore';

const STATUS_LABELS = {
  planned: 'Planned',
  'in-progress': 'In progress',
  completed: 'Completed',
  skipped: 'Skipped',
} as const;

function durationLabel(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (hours && remaining) return `${hours}h ${remaining}m`;
  if (hours) return `${hours}h`;
  return `${remaining} min`;
}

export default function ExperimentsPage() {
  const experiments = useExperimentStore((state) => state.experiments);
  const startExperiment = useExperimentStore((state) => state.startExperiment);
  const updateExperiment = useExperimentStore((state) => state.updateExperiment);
  const saveReflection = useExperimentStore((state) => state.saveReflection);
  const resetExperiments = useExperimentStore((state) => state.resetExperiments);
  const majors = useJourneyStore((state) => state.majors);
  const [reflectionId, setReflectionId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editHours, setEditHours] = useState(0);
  const [editMinutes, setEditMinutes] = useState(30);
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

  const startEditing = (experiment: typeof experiments[number]) => {
    setEditingId(experiment.id);
    setEditName(experiment.customTitle ?? experiment.title);
    setEditHours(Math.floor(experiment.estimatedMinutes / 60));
    setEditMinutes(experiment.estimatedMinutes % 60);
  };

  const saveExperimentSettings = () => {
    if (!editingId) return;
    const totalMinutes = Math.max(1, (Math.max(0, editHours) * 60) + Math.max(0, Math.min(59, editMinutes)));
    const original = experiments.find((experiment) => experiment.id === editingId);
    if (!original) return;
    const trimmedName = editName.trim();
    updateExperiment(editingId, {
      customTitle: trimmedName && trimmedName !== original.title ? trimmedName : undefined,
      estimatedMinutes: totalMinutes,
    });
    setEditingId(null);
  };

  const openReflection = (id: string) => {
    const experiment = experiments.find((item) => item.id === id);
    const attempt = experiment ? latestAttempt(experiment) : undefined;
    setInterest(attempt?.reflection?.interest ?? 3);
    setEnergy(attempt?.reflection?.energy ?? 3);
    setDifficulty(attempt?.reflection?.difficulty ?? 3);
    setWouldDoAgain(attempt?.reflection?.wouldDoAgain ?? true);
    setNotes(attempt?.reflection?.notes ?? '');
    setReflectionId(id);
  };

  const submitReflection = () => {
    if (!reflectionId) return;
    saveReflection(reflectionId, { interest, energy, difficulty, wouldDoAgain, notes });
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
              <div className="grid gap-4 md:grid-cols-2">
                {majorExperiments.map((experiment) => {
                  const attempts = experiment.attempts ?? [];
                  const latest = latestAttempt(experiment);
                  const displayTitle = experiment.customTitle?.trim() || experiment.title;
                  const isEditing = editingId === experiment.id;
                  return (
                    <article key={experiment.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0"><h3 className="text-lg font-semibold text-white">{displayTitle}</h3>{experiment.customTitle && <p className="mt-1 text-xs text-slate-600">Based on: {experiment.title}</p>}<p className="mt-2 text-sm leading-relaxed text-slate-400">{experiment.description}</p></div>
                        <FlaskConical className="shrink-0 text-cyan-400" size={22} />
                      </div>

                      {isEditing ? (
                        <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Experiment name<input value={editName} onChange={(e) => setEditName(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500" /></label>
                          <div className="mt-4"><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Duration</p><div className="mt-2 grid grid-cols-2 gap-3"><label className="text-xs text-slate-400">Hours<input type="number" min={0} max={99} value={editHours} onChange={(e) => setEditHours(Number(e.target.value) || 0)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500" /></label><label className="text-xs text-slate-400">Minutes<input type="number" min={0} max={59} value={editMinutes} onChange={(e) => setEditMinutes(Number(e.target.value) || 0)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500" /></label></div></div>
                          <div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => setEditingId(null)} className="flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-900"><X size={14}/> Cancel</button><button type="button" onClick={saveExperimentSettings} className="flex items-center gap-2 rounded-lg bg-cyan-600 px-3 py-2 text-xs font-semibold text-white hover:bg-cyan-500"><Save size={14}/> Save</button></div>
                        </div>
                      ) : (
                        <div className="mt-5 flex flex-wrap items-center gap-2 text-xs"><span className="flex items-center gap-1.5 rounded-full bg-slate-800 px-3 py-1 text-slate-400"><Clock3 size={13}/>{durationLabel(experiment.estimatedMinutes)}</span><span className="rounded-full bg-slate-800 px-3 py-1 text-slate-400">{STATUS_LABELS[experiment.status]}</span><span className="rounded-full bg-slate-800 px-3 py-1 text-slate-400">{attempts.length} attempt{attempts.length === 1 ? '' : 's'}</span></div>
                      )}

                      {!isEditing && latest?.reflection && <div className="mt-5 rounded-xl bg-slate-950/70 p-4"><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Latest reflection</p><p className="mt-2 text-sm text-slate-300">Interest {latest.reflection.interest}/5 · Energy {latest.reflection.energy}/5 · Difficulty {latest.reflection.difficulty}/5 · {latest.reflection.wouldDoAgain ? 'Would do again' : 'Would not do again'}</p>{latest.reflection.notes && <p className="mt-2 text-sm italic text-slate-400">“{latest.reflection.notes}”</p>}</div>}
                      {!isEditing && attempts.length > 1 && <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/40 p-4"><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Attempt history</p><div className="mt-3 space-y-3">{attempts.map((attempt, index) => <div key={attempt.id} className="rounded-lg border border-slate-800/80 bg-slate-900/60 p-3"><div className="flex items-center justify-between gap-3"><span className="text-xs font-semibold text-slate-300">Attempt #{index + 1}</span><span className="text-[11px] text-slate-500">{attempt.reflection ? 'Reflected' : 'In progress'}</span></div>{attempt.reflection ? <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-slate-400"><span>Interest <strong className="text-slate-200">{attempt.reflection.interest}/5</strong></span><span>Energy <strong className="text-slate-200">{attempt.reflection.energy}/5</strong></span><span>Difficulty <strong className="text-slate-200">{attempt.reflection.difficulty}/5</strong></span><span>{attempt.reflection.wouldDoAgain ? 'Would repeat' : 'Would not repeat'}</span>{attempt.reflection.notes && <span className="col-span-2 mt-1 italic text-slate-500">“{attempt.reflection.notes}”</span>}</div> : <p className="mt-2 text-[11px] text-slate-500">This attempt has not been reflected yet.</p>}</div>)}</div></div>}

                      <div className="mt-5 flex flex-wrap gap-3">
                        {experiment.status === 'planned' && <button onClick={() => begin(experiment.id)} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"><Play size={16} /> Start experiment</button>}
                        {experiment.status === 'in-progress' && <button onClick={() => openReflection(experiment.id)} className="flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-500"><CheckCircle2 size={16} /> Reflect & complete</button>}
                        {experiment.status === 'completed' && <><button onClick={() => begin(experiment.id)} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"><Play size={16} /> Run again</button><button onClick={() => openReflection(experiment.id)} className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-800">Update latest reflection</button></>}
                        <button type="button" onClick={() => startEditing(experiment)} className="flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-800"><Edit3 size={15}/> Customize</button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        {reflectionId && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-6"><div className="w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl"><h2 className="text-2xl font-bold text-white">Reflect on the experiment</h2><p className="mt-2 text-sm text-slate-400">There is no right answer. The goal is to capture what the experience actually felt like.</p><div className="mt-6 grid gap-4 md:grid-cols-3"><label className="text-sm text-slate-300">Interest <input type="number" min={1} max={5} value={interest} onChange={(e) => setInterest(Number(e.target.value))} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white" /></label><label className="text-sm text-slate-300">Energy <input type="number" min={1} max={5} value={energy} onChange={(e) => setEnergy(Number(e.target.value))} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white" /></label><label className="text-sm text-slate-300">Difficulty <input type="number" min={1} max={5} value={difficulty} onChange={(e) => setDifficulty(Number(e.target.value))} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white" /></label></div><label className="mt-5 flex items-center gap-3 text-sm text-slate-300"><input type="checkbox" checked={wouldDoAgain} onChange={(e) => setWouldDoAgain(e.target.checked)} /> I would willingly do something like this again.</label><label className="mt-5 block text-sm text-slate-300">Notes<textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} placeholder="What surprised you? What felt satisfying or frustrating?" className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white placeholder:text-slate-600" /></label><div className="mt-6 flex justify-end gap-3"><button onClick={() => setReflectionId(null)} className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-300">Cancel</button><button onClick={submitReflection} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500">Save reflection</button></div></div></div>}

        <div className="mt-10 flex justify-end"><button onClick={resetExperiments} className="flex items-center gap-2 text-xs text-slate-600 hover:text-slate-400"><RotateCcw size={14} /> Reset experiment templates</button></div>
      </div>
    </main>
  );
}
