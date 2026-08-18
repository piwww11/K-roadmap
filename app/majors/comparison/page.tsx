'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useJourneyStore } from '@/store/useJourneyStore';
import { useExperimentStore } from '@/store/experimentStore';
import { analyzeMajorDecision } from '@/lib/majorDecisionEngine';
import { buildMajorComparisonModel, explainMajorAgainstLeader } from '@/lib/majorComparison';

const dateLabel = (timestamp: string) => timestamp.slice(0, 10);

function MetricBar({ label, value, max = 100, suffix = '' }: { label: string; value: number; max?: number; suffix?: string }) {
  const width = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-500">{label}</span>
        <span className="font-semibold text-slate-200">{value}{suffix}</span>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-slate-800"><div className="h-1.5 rounded-full bg-indigo-400" style={{ width: `${width}%` }} /></div>
    </div>
  );
}

export default function MajorComparisonPage() {
  const majors = useJourneyStore((state) => state.majors);
  const phases = useJourneyStore((state) => state.phases);
  const decisions = useJourneyStore((state) => state.majorDecisions);
  const experiments = useExperimentStore((state) => state.experiments);
  const [selected, setSelected] = useState(0);

  const decision = decisions[selected];
  const analysis = decision ? analyzeMajorDecision(decision, majors, phases, experiments) : undefined;
  const model = useMemo(() => {
    if (!decision || !analysis) return undefined;
    return buildMajorComparisonModel({ majors, phases, experiments, decision, analyses: analysis.analyses });
  }, [analysis, decision, experiments, majors, phases]);

  const leader = model?.entries.find((entry) => entry.majorId === model.leaderId);
  const selectedEntry = model?.entries.find((entry) => entry.majorId === (leader?.majorId ?? model?.entries[0]?.majorId));
  const comparisonTarget = selectedEntry ?? leader;

  return (
    <main className="min-h-screen bg-slate-950 p-8 text-slate-100">
      <div className="mx-auto max-w-6xl">
        <header className="mb-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-indigo-400">K-ROADMAP / INTELLIGENCE</p>
              <h1 className="text-4xl font-bold text-white">Major Comparison Studio</h1>
              <p className="mt-3 max-w-3xl text-slate-400">Compare the majors side by side using the same evidence model that drives the adaptive dashboard. A ranking is a snapshot of evidence, not a final verdict.</p>
            </div>
            <Link href="/majors/decision" className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-900">← Decision Intelligence</Link>
          </div>
        </header>

        {decisions.length === 0 ? (
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-8">
            <h2 className="text-xl font-semibold text-white">No decision snapshot yet</h2>
            <p className="mt-2 max-w-2xl text-slate-400">Complete the Major Decision questionnaire first. Comparison Studio needs a decision snapshot as the initial belief before it can explain how observed evidence changes the picture.</p>
            <Link href="/majors/decision/questionnaire" className="mt-5 inline-flex rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-500">Start Major Decision</Link>
          </section>
        ) : model ? (
          <>
            <section className="mb-8 rounded-2xl border border-indigo-500/30 bg-indigo-500/5 p-7">
              <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-widest text-indigo-400">Current comparison</p>
                  <h2 className="mt-2 text-2xl font-bold text-white">{model.headline}</h2>
                  <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-300">{model.explanation}</p>
                </div>
                <div className="rounded-xl bg-slate-950/70 px-4 py-3 text-right"><p className="text-[10px] uppercase tracking-wider text-slate-500">Decision snapshot</p><p className="mt-1 text-sm font-semibold text-white">{dateLabel(decision.timestamp)}</p></div>
              </div>
              {model.runnerUpId && <div className="mt-5 flex flex-wrap gap-3 text-xs text-slate-400"><span className="rounded-full bg-slate-900 px-3 py-1.5">Leader gap: <b className="text-white">{model.leaderGap}</b> points</span><span className="rounded-full bg-slate-900 px-3 py-1.5">Adaptive score is evidence-aware</span><span className="rounded-full bg-slate-900 px-3 py-1.5">No AI / no hidden weighting</span></div>}
            </section>

            <section className="mb-10 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] border-collapse text-sm">
                  <thead><tr className="border-b border-slate-800 bg-slate-950/60"><th className="px-5 py-4 text-left text-xs uppercase tracking-wider text-slate-500">Dimension</th>{model.entries.map((entry) => <th key={entry.majorId} className="px-5 py-4 text-left"><div className="flex items-center gap-2"><span>{entry.icon}</span><span className="font-bold text-white">{entry.name}</span>{entry.rank === 1 && <span className="rounded-full bg-cyan-400/10 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-cyan-300">Leader</span>}</div><p className="mt-1 text-[11px] font-normal text-slate-600">{entry.university}</p></th>)}</tr></thead>
                  <tbody>
                    <tr className="border-b border-slate-800/70"><td className="px-5 py-4 text-slate-500">Interest</td>{model.entries.map((entry) => <td key={entry.majorId} className="px-5 py-4 font-semibold text-white">{entry.interest}/10</td>)}</tr>
                    <tr className="border-b border-slate-800/70"><td className="px-5 py-4 text-slate-500">Confidence</td>{model.entries.map((entry) => <td key={entry.majorId} className="px-5 py-4 font-semibold text-white">{entry.confidence}/10</td>)}</tr>
                    <tr className="border-b border-slate-800/70"><td className="px-5 py-4 text-slate-500">Decision score</td>{model.entries.map((entry) => <td key={entry.majorId} className="px-5 py-4 font-semibold text-white">{entry.decisionScore}/100</td>)}</tr>
                    <tr className="border-b border-slate-800/70 bg-indigo-500/5"><td className="px-5 py-4 font-semibold text-indigo-300">Adaptive score</td>{model.entries.map((entry) => <td key={entry.majorId} className="px-5 py-4 text-lg font-bold text-white">{entry.adaptiveScore}/100</td>)}</tr>
                    <tr className="border-b border-slate-800/70"><td className="px-5 py-4 text-slate-500">Evidence score</td>{model.entries.map((entry) => <td key={entry.majorId} className="px-5 py-4 font-semibold text-cyan-300">{entry.evidenceScore}/100</td>)}</tr>
                    <tr className="border-b border-slate-800/70"><td className="px-5 py-4 text-slate-500">Evidence level</td>{model.entries.map((entry) => <td key={entry.majorId} className="px-5 py-4 capitalize text-slate-300">{entry.evidenceLevel}</td>)}</tr>
                    <tr className="border-b border-slate-800/70"><td className="px-5 py-4 text-slate-500">Evidence maturity</td>{model.entries.map((entry) => <td key={entry.majorId} className="px-5 py-4 font-semibold text-slate-200">{Math.round(entry.evidenceMaturity * 100)}%</td>)}</tr>
                    <tr><td className="px-5 py-4 text-slate-500">Exploration</td>{model.entries.map((entry) => <td key={entry.majorId} className="px-5 py-4 text-slate-300">{entry.exploration.completed}/{entry.exploration.total} <span className="text-slate-600">({entry.exploration.progress}%)</span></td>)}</tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section className="mb-10 grid gap-5 lg:grid-cols-3">
              {model.entries.map((entry) => (
                <article key={entry.majorId} className={`rounded-2xl border p-6 ${entry.majorId === model.leaderId ? 'border-cyan-400/40 bg-cyan-400/5' : 'border-slate-800 bg-slate-900'}`}>
                  <div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2"><span className="text-2xl">{entry.icon}</span><h2 className="text-xl font-bold text-white">{entry.name}</h2></div><p className="mt-1 text-xs text-slate-500">Rank #{entry.rank} · {entry.university}</p></div><span className="text-2xl font-bold text-white">{entry.adaptiveScore}</span></div>
                  <div className="mt-6 space-y-4"><MetricBar label="Adaptive" value={entry.adaptiveScore} /><MetricBar label="Observed evidence" value={entry.evidenceScore} /><MetricBar label="Exploration" value={entry.exploration.progress} /><MetricBar label="Evidence maturity" value={Math.round(entry.evidenceMaturity * 100)} /></div>
                  <div className="mt-6 grid grid-cols-2 gap-3"><div className="rounded-xl bg-slate-950/60 p-3"><p className="text-[10px] uppercase tracking-wider text-slate-500">Experiments</p><p className="mt-1 text-sm font-semibold text-white">{entry.experiments.completed}/{entry.experiments.total}</p><p className="text-[11px] text-slate-600">{entry.experiments.attempts} attempts</p></div><div className="rounded-xl bg-slate-950/60 p-3"><p className="text-[10px] uppercase tracking-wider text-slate-500">Reflection</p><p className="mt-1 text-sm font-semibold text-white">{entry.reflection.interest}/5 interest</p><p className="text-[11px] capitalize text-slate-600">{entry.reflection.trend}</p></div></div>
                </article>
              ))}
            </section>

            {leader && <section className="mb-10 rounded-2xl border border-slate-800 bg-slate-900 p-7">
              <div className="mb-6"><p className="text-sm font-semibold uppercase tracking-widest text-indigo-400">Trade-offs</p><h2 className="mt-1 text-2xl font-bold text-white">Why the majors differ right now</h2><p className="mt-2 text-sm text-slate-400">This section explains the comparison using the same evidence already shown above. It does not invent a new score.</p></div>
              <div className="grid gap-5 lg:grid-cols-3">
                {model.entries.map((entry) => <article key={entry.majorId} className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5"><div className="flex items-center gap-2"><span>{entry.icon}</span><h3 className="font-bold text-white">{entry.name}</h3></div><ul className="mt-4 space-y-2 text-sm text-slate-400">{explainMajorAgainstLeader(entry, leader).map((reason) => <li key={reason}>• {reason}</li>)}</ul></article>)}
              </div>
            </section>}

            <section className="mb-10 grid gap-5 lg:grid-cols-2">
              {model.entries.map((entry) => <article key={`${entry.majorId}-next`} className="rounded-2xl border border-slate-800 bg-slate-900 p-6"><div className="flex items-center gap-3"><span className="text-2xl">{entry.icon}</span><div><h3 className="font-bold text-white">What would change {entry.name}?</h3><p className="text-xs text-slate-500">Evidence needed to reduce the current gap</p></div></div>{entry.nextEvidenceNeeded.length ? <ul className="mt-5 space-y-3 text-sm text-slate-300">{entry.nextEvidenceNeeded.map((item) => <li key={item} className="rounded-xl bg-slate-950/60 p-3">→ {item}</li>)}</ul> : <p className="mt-5 text-sm text-slate-500">No specific evidence gap detected right now. Keep observing consistently.</p>}</article>)}
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6"><div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><h2 className="text-lg font-semibold text-white">Compare another decision snapshot</h2><p className="mt-1 text-sm text-slate-500">The comparison is recalculated from the selected questionnaire response and current evidence.</p></div><select value={selected} onChange={(event) => setSelected(Number(event.target.value))} className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white">{decisions.map((item, index) => <option key={`${item.timestamp}-${index}`} value={index}>Decision #{index + 1} — {dateLabel(item.timestamp)}</option>)}</select></div></section>
          </>
        ) : null}
      </div>
    </main>
  );
}
