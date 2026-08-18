'use client';

import { useEffect, useMemo, useState } from 'react';
import { useJourneyStore } from '@/store/useJourneyStore';
import { useExperimentStore } from '@/store/experimentStore';
import { analyzeMajorDecision } from '@/lib/majorDecisionEngine';

export default function MajorComparePage() {
  const [hydrated, setHydrated] = useState(false);
  const majors = useJourneyStore((s) => s.majors);
  const phases = useJourneyStore((s) => s.phases);
  const decisions = useJourneyStore((s) => s.majorDecisions);
  const experiments = useExperimentStore((s) => s.experiments);
  useEffect(() => setHydrated(true), []);
  const result = useMemo(() => hydrated && decisions.length ? analyzeMajorDecision(decisions[decisions.length - 1], majors, phases, experiments) : undefined, [decisions, experiments, hydrated, majors, phases]);
  return <main className="min-h-screen bg-slate-950 p-8 text-slate-100"><div className="mx-auto max-w-6xl"><header className="mb-10"><p className="text-sm font-semibold uppercase tracking-widest text-violet-400">K-ROADMAP / DECISION STUDIO</p><h1 className="mt-2 text-4xl font-bold">Major Comparison Studio</h1><p className="mt-3 max-w-3xl text-slate-400">Compare the same decision signals side by side without turning the ranking into a permanent verdict.</p></header><div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900"><table className="w-full min-w-[760px] text-left"><thead><tr className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-500"><th className="p-5">Signal</th>{majors.map((major) => <th key={major.id} className="p-5">{major.icon} {major.name}</th>)}</tr></thead><tbody>{[['Interest', ...majors.map((m) => `${m.interestScore}/10`)], ['Confidence', ...majors.map((m) => `${m.confidenceScore}/10`)], ['Decision score', ...majors.map((m) => result?.analyses.find((a) => a.majorId === m.id)?.score ?? '—')], ['Evidence level', ...majors.map((m) => result?.analyses.find((a) => a.majorId === m.id)?.evidenceLevel ?? '—')], ['Exploration', ...majors.map((m) => { const a = result?.analyses.find((x) => x.majorId === m.id); return a ? `${a.completedExplorationTasks}/${a.totalExplorationTasks} tasks · ${a.completedExperiments}/${a.totalExperiments} experiments` : '—'; })]].map((row) => <tr key={String(row[0])} className="border-b border-slate-800 last:border-0"><td className="p-5 text-sm font-semibold text-slate-300">{row[0] as string}</td>{row.slice(1).map((value, index) => <td key={`${row[0]}-${index}`} className="p-5 text-sm text-slate-400">{value as string}</td>)}</tr>)}</tbody></table></div>{!decisions.length && <p className="mt-5 text-sm text-slate-500">Run the decision questionnaire to add decision-specific comparison scores.</p>}<div className="mt-8 flex gap-3"><a href="/majors" className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold">Major board</a><a href="/majors/decision" className="rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold">Decision analysis →</a></div></div></main>;
}
