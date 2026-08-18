'use client';

import { useMemo, useState } from 'react';
import { useJourneyStore } from '@/store/useJourneyStore';
import { useExperimentStore } from '@/store/experimentStore';
import { analyzeMajorDecision } from '@/lib/majorDecisionEngine';
import { buildEvidenceDashboardModel } from '@/lib/evidenceDashboard';

const QUESTIONS = ['q1_most_curious','q2_willing_to_struggle','q3_enjoy_most','q4_math_feeling','q5_most_enjoyable_experiment','q6_voluntary_research','q7_without_name'] as const;
const LABELS: Record<(typeof QUESTIONS)[number], string> = {
  q1_most_curious: 'What are you most curious about?',
  q2_willing_to_struggle: 'What would you still be willing to struggle through?',
  q3_enjoy_most: 'What do you enjoy most?',
  q4_math_feeling: 'How do you feel about mathematical work?',
  q5_most_enjoyable_experiment: 'Which experiment sounds most enjoyable?',
  q6_voluntary_research: 'What would you research voluntarily?',
  q7_without_name: 'Which field would you choose without the university name attached?',
};
const dateLabel = (timestamp: string) => timestamp.slice(0, 10);
const timelineIcon = (kind: string) => kind === 'reflection' ? '↗' : kind === 'experiment' ? '🧪' : kind === 'task' ? '✓' : '🧭';

export default function MajorDecisionPage() {
  const majors = useJourneyStore((state) => state.majors);
  const phases = useJourneyStore((state) => state.phases);
  const decisions = useJourneyStore((state) => state.majorDecisions);
  const experiments = useExperimentStore((state) => state.experiments);
  const [selected, setSelected] = useState(0);
  const response = decisions[selected];
  const result = response ? analyzeMajorDecision(response, majors, phases, experiments) : undefined;
  const evidenceDashboard = useMemo(() => {
    if (!result) return undefined;
    return buildEvidenceDashboardModel({ majors, phases, experiments, decisions, analyses: result.analyses });
  }, [decisions, experiments, majors, phases, result]);
  const majorName = (id?: string) => majors.find((major) => major.id === id)?.name ?? 'Unknown major';

  return (
    <main className="min-h-screen bg-slate-950 p-8 text-slate-100">
      <div className="mx-auto max-w-6xl">
        <header className="mb-10">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-indigo-400">K-ROADMAP / INTELLIGENCE</p>
          <h1 className="text-4xl font-bold text-white">Major Decision Intelligence</h1>
          <p className="mt-3 max-w-3xl text-slate-400">A deterministic, explainable analysis of your decision answers and real roadmap exploration. This is evidence, not a final verdict.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <a href="/majors/decision/questionnaire" className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-500">{decisions.length ? 'Run a new decision' : 'Start Major Decision'}</a>
            <a href="/experiments" className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-900">Run an experiment →</a>
          </div>
        </header>

        {decisions.length === 0 ? (
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-8">
            <h2 className="text-xl font-semibold">No decision response yet</h2>
            <p className="mt-2 text-slate-400">Start the questionnaire above. Your result will be generated from your answers and roadmap exploration evidence.</p>
          </section>
        ) : result && evidenceDashboard ? (
          <>
            <section className="mb-8 flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-6 md:flex-row md:items-end md:justify-between">
              <div><p className="text-sm text-slate-500">Decision snapshot</p><h2 className="mt-1 text-2xl font-bold">{dateLabel(response.timestamp)}</h2></div>
              <select value={selected} onChange={(event) => setSelected(Number(event.target.value))} className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white">
                {decisions.map((decision, index) => <option key={`${decision.timestamp}-${index}`} value={index}>Decision #{index + 1} — {dateLabel(decision.timestamp)}</option>)}
              </select>
            </section>

            <section className="mb-8 rounded-2xl border border-indigo-500/30 bg-indigo-500/5 p-8">
              <p className="text-sm uppercase tracking-wider text-indigo-400">Current interpretation</p>
              <h2 className="mt-2 text-3xl font-bold text-white">{result.topMajorId ? majorName(result.topMajorId) : 'No clear leader'}</h2>
              <p className="mt-3 text-slate-300">{result.recommendationStatus === 'strong-fit' && 'This major currently has the strongest alignment and enough exploration evidence to be considered a strong fit.'}{result.recommendationStatus === 'leading' && 'This major is currently leading, but keep collecting real-world evidence before committing.'}{result.recommendationStatus === 'exploring' && 'The signals are close. Treat this as an exploration result rather than a winner.'}{result.recommendationStatus === 'insufficient-evidence' && 'There is not enough real exploration evidence to make a meaningful recommendation yet.'}</p>
            </section>

            <section className="mb-10">
              <div className="mb-5"><p className="text-sm font-semibold uppercase tracking-widest text-cyan-400">Evidence Dashboard</p><h2 className="mt-1 text-2xl font-bold text-white">What the system currently knows about each major</h2><p className="mt-2 max-w-3xl text-sm text-slate-400">The adaptive score combines the initial decision with observed evidence. Evidence maturity controls how much real experience is allowed to change the initial belief.</p></div>
              <div className="grid gap-5 lg:grid-cols-3">
                {evidenceDashboard.majors.map((major) => (
                  <article key={major.majorId} className={`rounded-2xl border p-6 ${major.majorId === evidenceDashboard.leaderId ? 'border-cyan-400/40 bg-cyan-400/5' : 'border-slate-800 bg-slate-900'}`}>
                    <div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2"><span className="text-2xl">{major.icon}</span><h3 className="text-xl font-bold text-white">{major.name}</h3></div><p className="mt-2 text-xs uppercase tracking-wider text-slate-500">Evidence: {major.evidenceLevel}</p></div>{major.majorId === evidenceDashboard.leaderId && <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-[11px] font-semibold text-cyan-300">CURRENT LEADER</span>}</div>
                    <div className="mt-5 grid grid-cols-3 gap-2 text-center"><div className="rounded-xl bg-slate-950/70 p-3"><p className="text-[10px] uppercase text-slate-500">Decision</p><p className="mt-1 font-bold text-white">{major.adaptive.decisionScore}</p></div><div className="rounded-xl bg-slate-950/70 p-3"><p className="text-[10px] uppercase text-slate-500">Evidence</p><p className="mt-1 font-bold text-cyan-300">{major.adaptive.evidenceScore}</p></div><div className="rounded-xl bg-slate-950/70 p-3"><p className="text-[10px] uppercase text-slate-500">Adaptive</p><p className="mt-1 font-bold text-white">{major.adaptive.adaptiveScore}</p></div></div>
                    <div className="mt-5"><div className="flex justify-between text-xs text-slate-500"><span>Evidence maturity</span><span>{Math.round(major.adaptive.evidenceMaturity * 100)}%</span></div><div className="mt-2 h-2 rounded-full bg-slate-800"><div className="h-2 rounded-full bg-cyan-500" style={{ width: `${Math.round(major.adaptive.evidenceMaturity * 100)}%` }} /></div></div>
                    <div className="mt-5 space-y-2 text-xs text-slate-400"><p>Tasks: {major.taskProgress.completed}/{major.taskProgress.total}</p><p>Experiments: {major.experimentProgress.completed}/{major.experimentProgress.total} reflected · {major.experimentProgress.attempts} attempts</p><p>Reflection interest: {major.reflection.interest}/5 · energy: {major.reflection.energy}/5</p><p>Trend: {major.reflection.trend} · repeat: {major.reflection.wouldDoAgain}%</p></div>
                  </article>
                ))}
              </div>
            </section>

            <section className="mb-10 grid gap-5 lg:grid-cols-2">
              {evidenceDashboard.majors.map((major) => (
                <article key={`${major.majorId}-evidence`} className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                  <div className="flex items-center gap-3"><span className="text-2xl">{major.icon}</span><div><h3 className="text-xl font-bold text-white">{major.name}</h3><p className="text-xs text-slate-500">Evidence interpretation</p></div></div>
                  <div className="mt-5 grid gap-4 md:grid-cols-3">
                    <div className="rounded-xl bg-emerald-400/5 p-4"><p className="mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-300">Strengths</p>{major.strengths.length ? <ul className="space-y-2 text-sm text-slate-300">{major.strengths.map((item) => <li key={item}>✓ {item}</li>)}</ul> : <p className="text-sm text-slate-500">No strong signal yet.</p>}</div>
                    <div className="rounded-xl bg-amber-400/5 p-4"><p className="mb-2 text-xs font-semibold uppercase tracking-wider text-amber-300">Uncertainties</p>{major.uncertainties.length ? <ul className="space-y-2 text-sm text-slate-300">{major.uncertainties.map((item) => <li key={item}>? {item}</li>)}</ul> : <p className="text-sm text-slate-500">No major uncertainty detected.</p>}</div>
                    <div className="rounded-xl bg-cyan-400/5 p-4"><p className="mb-2 text-xs font-semibold uppercase tracking-wider text-cyan-300">Next evidence needed</p>{major.nextEvidenceNeeded.length ? <ul className="space-y-2 text-sm text-slate-300">{major.nextEvidenceNeeded.map((item) => <li key={item}>→ {item}</li>)}</ul> : <p className="text-sm text-slate-500">Enough evidence for now. Keep observing naturally.</p>}</div>
                  </div>
                </article>
              ))}
            </section>

            <section className="mb-10 rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <div className="mb-6"><p className="text-sm font-semibold uppercase tracking-widest text-indigo-400">Evidence Timeline</p><h2 className="mt-1 text-2xl font-bold text-white">Why each major is moving</h2><p className="mt-2 text-sm text-slate-400">This timeline combines decision signals, completed tasks, experiment attempts, and reflections. A timeline event explains the direction of the evidence; it does not pretend we stored a historical score that never existed.</p></div>
              <div className="space-y-8">
                {evidenceDashboard.majors.map((major) => (
                  <div key={`${major.majorId}-timeline`}>
                    <div className="mb-3 flex items-center gap-3"><span className="text-xl">{major.icon}</span><h3 className="font-bold text-white">{major.name}</h3><span className="text-xs text-slate-500">Adaptive {major.adaptive.adaptiveScore}/100</span></div>
                    {major.timeline.length ? <div className="relative ml-3 border-l border-slate-800 pl-6">{major.timeline.map((event) => <div key={event.id} className="relative pb-5 last:pb-0"><span className="absolute -left-[34px] top-0 flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-[10px]">{timelineIcon(event.kind)}</span><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold text-slate-200">{event.title}</p><span className={`text-[10px] uppercase tracking-wider ${event.direction === 'strengthened' ? 'text-emerald-400' : event.direction === 'softened' ? 'text-amber-400' : 'text-slate-500'}`}>{event.direction}</span><span className="text-[10px] text-slate-600">{dateLabel(event.date)}</span></div><p className="mt-1 text-xs leading-relaxed text-slate-500">{event.detail}</p></div>)}</div> : <p className="ml-9 text-sm text-slate-500">No observable evidence events yet.</p>}
                  </div>
                ))}
              </div>
            </section>

            <div className="space-y-5">
              {result.analyses.map((analysis, index) => {
                const reflectedAttempts = analysis.reflectedAttempts ?? 0;
                const totalExperimentAttempts = analysis.totalExperimentAttempts ?? 0;
                const averageReflectionInterest = analysis.averageReflectionInterest ?? 0;
                const averageReflectionEnergy = analysis.averageReflectionEnergy ?? 0;
                const averageReflectionDifficulty = analysis.averageReflectionDifficulty ?? 0;
                const wouldDoAgainRate = analysis.wouldDoAgainRate ?? 0;
                const reflectionRepeatRate = analysis.reflectionRepeatRate ?? 0;
                return (
                  <article key={analysis.majorId} className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between"><div><div className="flex items-center gap-3"><span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-400">#{index + 1}</span><h3 className="text-2xl font-bold text-white">{majorName(analysis.majorId)}</h3></div><p className="mt-2 text-sm text-slate-500">Decision score: {analysis.score} · Evidence: {analysis.evidenceLevel} · Tasks: {analysis.completedExplorationTasks}/{analysis.totalExplorationTasks} · Experiments: {analysis.completedExperiments}/{analysis.totalExperiments}</p></div><div className="text-right"><div className="text-3xl font-bold text-white">{analysis.score}</div><div className="text-xs uppercase tracking-wider text-slate-500">decision / 100</div></div></div>
                    {reflectedAttempts > 0 && <div className="mt-5 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Reflection evidence</p><p className="mt-1 text-xs text-slate-500">{reflectedAttempts} reflected attempt{reflectedAttempts === 1 ? '' : 's'} across {totalExperimentAttempts} total attempt{totalExperimentAttempts === 1 ? '' : 's'}</p></div><span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">Interest trend: {analysis.reflectionInterestTrend}</span></div><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><div><p className="text-[11px] uppercase tracking-wider text-slate-500">Interest</p><p className="mt-1 text-sm font-semibold text-white">{averageReflectionInterest}/5</p></div><div><p className="text-[11px] uppercase tracking-wider text-slate-500">Energy</p><p className="mt-1 text-sm font-semibold text-white">{averageReflectionEnergy}/5</p></div><div><p className="text-[11px] uppercase tracking-wider text-slate-500">Difficulty</p><p className="mt-1 text-sm font-semibold text-white">{averageReflectionDifficulty}/5</p></div><div><p className="text-[11px] uppercase tracking-wider text-slate-500">Would repeat</p><p className="mt-1 text-sm font-semibold text-white">{wouldDoAgainRate}%</p></div><div><p className="text-[11px] uppercase tracking-wider text-slate-500">Repeated experiments</p><p className="mt-1 text-sm font-semibold text-white">{reflectionRepeatRate}%</p></div></div></div>}
                    <div className="mt-6 grid gap-4 md:grid-cols-3"><div className="rounded-xl bg-slate-950/70 p-4"><p className="mb-2 text-xs uppercase tracking-wider text-slate-500">Strengths</p>{analysis.strengths.length ? <ul className="space-y-2 text-sm text-slate-300">{analysis.strengths.map((item) => <li key={item}>✓ {item}</li>)}</ul> : <p className="text-sm text-slate-500">No strong signal yet.</p>}</div><div className="rounded-xl bg-slate-950/70 p-4"><p className="mb-2 text-xs uppercase tracking-wider text-slate-500">Uncertainties</p>{analysis.uncertainties.length ? <ul className="space-y-2 text-sm text-slate-300">{analysis.uncertainties.map((item) => <li key={item}>? {item}</li>)}</ul> : <p className="text-sm text-slate-500">No major uncertainty detected.</p>}</div><div className="rounded-xl bg-slate-950/70 p-4"><p className="mb-2 text-xs uppercase tracking-wider text-slate-500">Next steps</p><ul className="space-y-2 text-sm text-slate-300">{analysis.recommendedNextSteps.map((item) => <li key={item}>→ {item}</li>)}</ul></div></div>
                  </article>
                );
              })}
            </div>

            <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6"><h2 className="text-lg font-semibold">Decision evidence used</h2><div className="mt-4 grid gap-3 md:grid-cols-2">{QUESTIONS.map((question) => <div key={question} className="rounded-xl bg-slate-950/60 p-4"><p className="text-xs uppercase tracking-wider text-slate-500">{LABELS[question]}</p><p className="mt-1 text-sm text-slate-300">{response[question]}</p></div>)}</div></section>
          </>
        ) : null}
      </div>
    </main>
  );
}
