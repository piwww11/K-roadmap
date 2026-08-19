'use client';

import { useEffect, useMemo, useState } from 'react';
import { useJourneyStore } from '@/store/useJourneyStore';
import { useExperimentStore } from '@/store/experimentStore';
import { analyzeMajorDecision } from '@/lib/majorDecisionEngine';
import { assessEvidenceReliability } from '@/lib/evidenceReliability';

const bandLabel = {
  low: 'Low',
  moderate: 'Moderate',
  high: 'High',
  'very-high': 'Very high',
};

export default function EvidencePage() {
  const [hydrated, setHydrated] = useState(false);
  const majors = useJourneyStore((s) => s.majors);
  const phases = useJourneyStore((s) => s.phases);
  const decisions = useJourneyStore((s) => s.majorDecisions);
  const experiments = useExperimentStore((s) => s.experiments);

  useEffect(() => setHydrated(true), []);

  const result = useMemo(() => {
    if (!hydrated || !decisions.length) return undefined;
    return analyzeMajorDecision(decisions[decisions.length - 1], majors, phases, experiments);
  }, [decisions, experiments, hydrated, majors, phases]);

  return (
    <main className="min-h-screen bg-slate-950 p-8 text-slate-100">
      <div className="mx-auto max-w-6xl">
        <header className="mb-10">
          <p className="text-sm font-semibold uppercase tracking-widest text-indigo-400">K-ROADMAP / EVIDENCE</p>
          <h1 className="mt-2 text-4xl font-bold">Evidence Dashboard</h1>
          <p className="mt-3 max-w-3xl text-slate-400">
            Separate how strong a major looks from how reliable the evidence behind that conclusion is.
          </p>
        </header>

        {!result ? (
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-8">
            <h2 className="text-xl font-semibold">No decision evidence yet</h2>
            <p className="mt-2 text-slate-400">Complete the Major Decision questionnaire first.</p>
            <a href="/majors/decision/questionnaire" className="mt-5 inline-block rounded-xl bg-indigo-600 px-5 py-3 font-semibold">
              Start questionnaire →
            </a>
          </section>
        ) : (
          <div className="space-y-5">
            {result.analyses.map((analysis) => {
              const major = majors.find((item) => item.id === analysis.majorId);
              const reliability = assessEvidenceReliability(analysis);

              return (
                <article key={analysis.majorId} className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                  <div className="flex flex-col justify-between gap-4 md:flex-row">
                    <div>
                      <h2 className="text-2xl font-bold">{major?.icon} {major?.name}</h2>
                      <p className="mt-1 text-sm text-slate-500">
                        Decision evidence: {analysis.evidenceLevel} · Fit score {analysis.score}/100
                      </p>
                    </div>
                    <div className="text-sm text-slate-400">
                      {analysis.completedExplorationTasks}/{analysis.totalExplorationTasks} tasks · {analysis.completedExperiments}/{analysis.totalExperiments} experiments
                    </div>
                  </div>

                  <section className="mt-6 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-5">
                    <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-300">Evidence reliability</p>
                        <div className="mt-2 flex items-end gap-3">
                          <span className="text-4xl font-bold text-white">{reliability.score}</span>
                          <span className="mb-1 text-sm text-slate-500">/100 · {bandLabel[reliability.band]}</span>
                        </div>
                        <p className="mt-2 max-w-2xl text-sm text-slate-400">
                          Reliability measures the quality and repeatability of the evidence, not whether this major is objectively the right choice.
                        </p>
                      </div>
                      <div className="w-full md:max-w-xs">
                        <div className="h-2.5 rounded-full bg-slate-950">
                          <div className="h-full rounded-full bg-indigo-400" style={{ width: `${reliability.score}%` }} />
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                      {reliability.dimensions.map((dimension) => (
                        <div key={dimension.key} className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-semibold text-slate-400">{dimension.label}</p>
                            <span className="text-xs font-bold text-slate-200">{dimension.score}</span>
                          </div>
                          <div className="mt-3 h-1.5 rounded-full bg-slate-900">
                            <div className="h-full rounded-full bg-slate-400" style={{ width: `${dimension.score}%` }} />
                          </div>
                          <p className="mt-2 text-[11px] leading-relaxed text-slate-600">{dimension.explanation}</p>
                        </div>
                      ))}
                    </div>

                    <div className="mt-5 grid gap-4 md:grid-cols-3">
                      <div className="rounded-xl bg-emerald-500/5 p-4">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Why it is reliable</h3>
                        <ul className="mt-3 space-y-2 text-sm text-slate-300">
                          {reliability.strengths.length ? reliability.strengths.map((item) => <li key={item}>• {item}</li>) : <li>• More evidence is needed before strong reliability can be claimed.</li>}
                        </ul>
                      </div>
                      <div className="rounded-xl bg-amber-500/5 p-4">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-400">Reliability limits</h3>
                        <ul className="mt-3 space-y-2 text-sm text-slate-300">
                          {reliability.limitations.length ? reliability.limitations.map((item) => <li key={item}>• {item}</li>) : <li>• No major reliability limitation detected from current evidence.</li>}
                        </ul>
                      </div>
                      <div className="rounded-xl bg-slate-950/70 p-4">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Improve reliability</h3>
                        <ul className="mt-3 space-y-2 text-sm text-slate-300">
                          {reliability.nextSteps.map((item) => <li key={item}>• {item}</li>)}
                        </ul>
                      </div>
                    </div>
                  </section>

                  <div className="mt-5 grid gap-4 md:grid-cols-3">
                    {[
                      ['What supports it', analysis.strengths],
                      ['What is uncertain', analysis.uncertainties],
                      ['What would strengthen it', analysis.recommendedNextSteps],
                    ].map(([title, items]) => (
                      <div key={title as string} className="rounded-xl bg-slate-950/70 p-4">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title as string}</h3>
                        <ul className="mt-3 space-y-2 text-sm text-slate-300">
                          {(items as string[]).map((item) => <li key={item}>• {item}</li>)}
                        </ul>
                      </div>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <a href="/majors/decision" className="mt-8 inline-block text-sm font-semibold text-indigo-400">← Back to decision analysis</a>
      </div>
    </main>
  );
}
