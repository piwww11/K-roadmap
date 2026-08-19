'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { FlaskConical, Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useJourneyStore } from '@/store/useJourneyStore';
import { useExperimentStore } from '@/store/experimentStore';

const EXPERIMENT_TEMPLATES = [
  { key: 'hands-on', label: 'Hands-on reality check', title: (major: string) => `Mini project: ${major} in practice`, description: (major: string) => `Spend 60–90 focused minutes doing a beginner-friendly task in ${major}. Record what felt satisfying, frustrating, and surprisingly easy or hard.`, minutes: 90 },
  { key: 'deep-dive', label: 'Deep-dive test', title: (major: string) => `Research sprint: Is ${major} still interesting?`, description: (major: string) => `Choose one real topic from ${major}, read two reliable sources, and explain the idea in your own words without copying. Note whether curiosity grows after the difficult parts appear.`, minutes: 60 },
  { key: 'day-in-life', label: 'Reality check', title: (major: string) => `Reality check: a day in ${major}`, description: (major: string) => `Inspect a real university curriculum and two real career/research paths related to ${major}. Write down which parts you would genuinely want to spend years doing.`, minutes: 45 },
  { key: 'compare', label: 'Head-to-head test', title: (major: string) => `Compare ${major} with another path`, description: (major: string) => `Pick the closest competing major and complete one small task from each. Compare curiosity, energy, difficulty tolerance, and willingness to repeat the work.`, minutes: 90 },
] as const;

export default function DecisionExperimentsPage() {
  const majors = useJourneyStore((state) => state.majors);
  const experiments = useExperimentStore((state) => state.experiments);
  const addExperiment = useExperimentStore((state) => state.addExperiment);
  const [majorId, setMajorId] = useState(majors[0]?.id ?? '');
  const [templateKey, setTemplateKey] = useState<(typeof EXPERIMENT_TEMPLATES)[number]['key']>('hands-on');
  const [generated, setGenerated] = useState(false);

  const selectedMajor = majors.find((major) => major.id === majorId) ?? majors[0];
  const template = EXPERIMENT_TEMPLATES.find((item) => item.key === templateKey) ?? EXPERIMENT_TEMPLATES[0];
  const existingCount = useMemo(() => experiments.filter((item) => item.majorId === selectedMajor?.id).length, [experiments, selectedMajor?.id]);

  const generatedTitle = selectedMajor ? template.title(selectedMajor.name) : '';
  const generatedDescription = selectedMajor ? template.description(selectedMajor.name) : '';

  const createExperiment = () => {
    if (!selectedMajor) return;
    addExperiment({ title: generatedTitle, description: generatedDescription, majorId: selectedMajor.id, estimatedMinutes: template.minutes, status: 'planned' });
    setGenerated(true);
  };

  return <main className="min-h-screen bg-slate-950 p-8 text-slate-100"><div className="mx-auto max-w-5xl">
    <header className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between"><div><p className="text-sm font-semibold uppercase tracking-widest text-indigo-400">K-ROADMAP / DECISION LAB</p><h1 className="mt-2 text-4xl font-bold text-white">Decision Experiment Generator</h1><p className="mt-3 max-w-3xl text-slate-400">Turn uncertainty into evidence. Pick a major and the kind of uncertainty you want to test; K-Roadmap creates a small, repeatable experiment instead of pretending the decision is already settled.</p></div><Link href="/majors/decision" className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-900">Back to Decision Intelligence</Link></header>

    <section className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-300"><Sparkles size={20}/></div><div><h2 className="font-bold text-white">Generate an experiment</h2><p className="text-xs text-slate-500">Existing experiments for this major: {existingCount}</p></div></div>
        <label className="mt-6 block text-sm font-semibold text-slate-300">Major<select value={majorId} onChange={(e) => { setMajorId(e.target.value); setGenerated(false); }} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 font-normal text-white">{majors.map((major) => <option key={major.id} value={major.id}>{major.name} · {major.university}</option>)}</select></label>
        <div className="mt-5"><p className="text-sm font-semibold text-slate-300">Experiment type</p><div className="mt-2 space-y-2">{EXPERIMENT_TEMPLATES.map((item) => <button key={item.key} type="button" onClick={() => { setTemplateKey(item.key); setGenerated(false); }} className={`w-full rounded-xl border px-4 py-3 text-left transition ${templateKey === item.key ? 'border-indigo-400/40 bg-indigo-400/10 text-indigo-200' : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700 hover:text-slate-200'}`}><span className="text-sm font-semibold">{item.label}</span><span className="ml-2 text-xs text-slate-600">{item.minutes} min</span></button>)}</div></div>
        <button type="button" onClick={createExperiment} disabled={!selectedMajor} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"><FlaskConical size={17}/> Add experiment to my journey</button>
      </div>

      <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-6"><p className="text-xs font-bold uppercase tracking-widest text-indigo-400">Preview</p>{selectedMajor ? <><div className="mt-4 flex items-start gap-3"><span className="text-3xl">{selectedMajor.icon}</span><div><h2 className="text-2xl font-bold text-white">{generatedTitle}</h2><p className="mt-1 text-xs text-slate-500">{selectedMajor.university} · {template.minutes} minutes</p></div></div><p className="mt-6 leading-relaxed text-slate-300">{generatedDescription}</p><div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/60 p-4"><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">What this is testing</p><p className="mt-2 text-sm text-slate-400">Whether your curiosity survives contact with the actual work—not just the idea, university name, or imagined career.</p></div>{generated && <div className="mt-5 flex items-center gap-2 rounded-xl bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-300"><CheckCircle2 size={17}/> Added. Open Experiments to start it.</div>}<Link href="/experiments" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-indigo-300 hover:text-indigo-200">Go to Experiments <ArrowRight size={15}/></Link></> : <p className="mt-6 text-slate-500">Add a major first.</p>}</div>
    </section>

    <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6"><h2 className="text-lg font-bold text-white">How to use the result</h2><div className="mt-4 grid gap-3 md:grid-cols-3"><div className="rounded-xl bg-slate-950/60 p-4"><p className="text-xs font-bold uppercase tracking-wider text-indigo-400">1 · Run</p><p className="mt-2 text-sm text-slate-400">Do the smallest version of the experiment honestly.</p></div><div className="rounded-xl bg-slate-950/60 p-4"><p className="text-xs font-bold uppercase tracking-wider text-indigo-400">2 · Reflect</p><p className="mt-2 text-sm text-slate-400">Record interest, energy, difficulty, and whether you would willingly repeat it.</p></div><div className="rounded-xl bg-slate-950/60 p-4"><p className="text-xs font-bold uppercase tracking-wider text-indigo-400">3 · Re-evaluate</p><p className="mt-2 text-sm text-slate-400">Return to Decision Intelligence and let the new evidence change the picture.</p></div></div></section>
  </div></main>;
}
