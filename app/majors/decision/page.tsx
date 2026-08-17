'use client';

import { useState } from 'react';
import { useJourneyStore } from '@/store/useJourneyStore';
import { analyzeMajorDecision } from '@/lib/majorDecisionEngine';

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

export default function MajorDecisionPage() {
  const majors = useJourneyStore((state) => state.majors);
  const phases = useJourneyStore((state) => state.phases);
  const decisions = useJourneyStore((state) => state.majorDecisions);
  const [selected, setSelected] = useState(0);
  const response = decisions[selected];
  const result = response ? analyzeMajorDecision(response, majors, phases) : undefined;
  const majorName = (id?: string) => majors.find((major) => major.id === id)?.name ?? 'Unknown major';

  return (
    <main className="min-h-screen bg-slate-950 p-8 text-slate-100">
      <div className="mx-auto max-w-6xl">
        <header className="mb-10">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-indigo-400">K-ROADMAP / INTELLIGENCE</p>
          <h1 className="text-4xl font-bold text-white">Major Decision Intelligence</h1>
          <p className="mt-3 max-w-3xl text-slate-400">A deterministic, explainable analysis of your decision answers and real roadmap exploration. This is evidence, not a final verdict.</p>
        </header>

        {decisions.length === 0 ? (
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-8">
            <h2 className="text-xl font-semibold">No decision response yet</h2>
            <p className="mt-2 text-slate-400">Complete the Major Decision questionnaire first. Your result will appear here automatically.</p>
          </section>
        ) : result ? (
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

            <div className="space-y-5">
              {result.analyses.map((analysis, index) => (
                <article key={analysis.majorId} className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div><div className="flex items-center gap-3"><span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-400">#{index + 1}</span><h3 className="text-2xl font-bold text-white">{majorName(analysis.majorId)}</h3></div><p className="mt-2 text-sm text-slate-500">Evidence: {analysis.evidenceLevel} · Exploration: {analysis.completedExplorationTasks}/{analysis.totalExplorationTasks} tasks</p></div>
                    <div className="text-right"><div className="text-3xl font-bold text-white">{analysis.score}</div><div className="text-xs uppercase tracking-wider text-slate-500">/ 100</div></div>
                  </div>
                  <div className="mt-6 grid gap-4 md:grid-cols-3">
                    <div className="rounded-xl bg-slate-950/70 p-4"><p className="mb-2 text-xs uppercase tracking-wider text-slate-500">Strengths</p>{analysis.strengths.length ? <ul className="space-y-2 text-sm text-slate-300">{analysis.strengths.map((item) => <li key={item}>✓ {item}</li>)}</ul> : <p className="text-sm text-slate-500">No strong signal yet.</p>}</div>
                    <div className="rounded-xl bg-slate-950/70 p-4"><p className="mb-2 text-xs uppercase tracking-wider text-slate-500">Uncertainties</p>{analysis.uncertainties.length ? <ul className="space-y-2 text-sm text-slate-300">{analysis.uncertainties.map((item) => <li key={item}>? {item}</li>)}</ul> : <p className="text-sm text-slate-500">No major uncertainty detected.</p>}</div>
                    <div className="rounded-xl bg-slate-950/70 p-4"><p className="mb-2 text-xs uppercase tracking-wider text-slate-500">Next steps</p><ul className="space-y-2 text-sm text-slate-300">{analysis.recommendedNextSteps.map((item) => <li key={item}>→ {item}</li>)}</ul></div>
                  </div>
                </article>
              ))}
            </div>

            <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6"><h2 className="text-lg font-semibold">Decision evidence used</h2><div className="mt-4 grid gap-3 md:grid-cols-2">{QUESTIONS.map((question) => <div key={question} className="rounded-xl bg-slate-950/60 p-4"><p className="text-xs uppercase tracking-wider text-slate-500">{LABELS[question]}</p><p className="mt-1 text-sm text-slate-300">{response[question]}</p></div>)}</div></section>
          </>
        ) : null}
      </div>
    </main>
  );
}
