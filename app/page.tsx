'use client';

import { useEffect, useMemo, useState } from 'react';
import { useJourneyStore } from '@/store/useJourneyStore';
import { useExperimentStore } from '@/store/experimentStore';
import { analyzeMajorDecision } from '@/lib/majorDecisionEngine';
import { buildAdaptiveDashboardPlan } from '@/lib/adaptiveDashboard';
import { CheckCircle2, Compass, FileText, Target, Wallet, Zap, FlaskConical, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Dashboard() {
  const [hasHydrated, setHasHydrated] = useState(false);
  useEffect(() => { setHasHydrated(true); }, []);

  const myWhy = useJourneyStore((state) => state.myWhy);
  const getOverallProgress = useJourneyStore((state) => state.getOverallProgress);
  const getCompletedTaskCount = useJourneyStore((state) => state.getCompletedTaskCount);
  const getTotalTaskCount = useJourneyStore((state) => state.getTotalTaskCount);
  const getNextTask = useJourneyStore((state) => state.getNextTask);
  const getCurrentPhase = useJourneyStore((state) => state.getCurrentPhase);
  const getPhaseProgress = useJourneyStore((state) => state.getPhaseProgress);
  const toggleTask = useJourneyStore((state) => state.toggleTask);
  const documents = useJourneyStore((state) => state.documents);
  const budget = useJourneyStore((state) => state.budget);
  const majors = useJourneyStore((state) => state.majors);
  const phases = useJourneyStore((state) => state.phases);
  const majorDecisions = useJourneyStore((state) => state.majorDecisions);
  const experiments = useExperimentStore((state) => state.experiments);

  const progressPercent = hasHydrated ? getOverallProgress() : 0;
  const completedTasks = hasHydrated ? getCompletedTaskCount() : 0;
  const totalTasks = hasHydrated ? getTotalTaskCount() : 0;
  const fallbackTask = hasHydrated ? getNextTask() : undefined;
  const currentPhase = hasHydrated ? getCurrentPhase() : undefined;
  const completedExperiments = hasHydrated ? experiments.filter((experiment) => experiment.status === 'completed').length : 0;
  const totalExperiments = experiments.length;

  const latestDecision = hasHydrated ? majorDecisions[majorDecisions.length - 1] : undefined;
  const decisionResult = useMemo(() => {
    if (!latestDecision || !hasHydrated) return undefined;
    return analyzeMajorDecision(latestDecision, majors, phases, experiments);
  }, [hasHydrated, latestDecision, majors, phases, experiments]);

  const adaptivePlan = useMemo(() => {
    if (!hasHydrated) return undefined;
    return buildAdaptiveDashboardPlan({ analyses: decisionResult?.analyses ?? [], majors, phases, experiments });
  }, [decisionResult, experiments, hasHydrated, majors, phases]);

  const currentFocus = useMemo(() => {
    if (!hasHydrated || majors.length === 0) return undefined;
    const focusId = adaptivePlan?.focusMajorId;
    if (focusId) {
      const adaptiveMajor = majors.find((major) => major.id === focusId);
      if (adaptiveMajor) return adaptiveMajor;
    }
    return [...majors].sort((a, b) => b.interestScore - a.interestScore)[0];
  }, [adaptivePlan?.focusMajorId, hasHydrated, majors]);

  const currentFocusAnalysis = decisionResult?.analyses.find((analysis) => analysis.majorId === currentFocus?.id);
  const nextMilestone = useMemo(() => {
    if (!currentPhase) return undefined;
    for (const month of currentPhase.months) for (const goal of month.goals) if (goal.status !== 'Completed') return goal;
    return undefined;
  }, [currentPhase]);

  const currentPhaseProgress = hasHydrated && currentPhase ? getPhaseProgress(currentPhase.id) : 0;
  const completedDocuments = hasHydrated ? documents.filter((document) => document.status === 'Ready' || document.status === 'Verified') : [];
  const documentProgress = hasHydrated ? Math.round((completedDocuments.length / documents.length) * 100) || 0 : 0;
  const totalBudget = hasHydrated ? budget.items.reduce((total, item) => total + item.amount, 0) : 0;
  const formatCurrency = (amount: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);
  const missionTask = adaptivePlan?.missionTask;
  const missionFallback = missionTask ?? fallbackTask;
  const missionIsAdaptive = Boolean(adaptivePlan?.title);

  return (
    <div className="min-h-screen bg-slate-950 p-8 font-sans text-slate-100">
      <header className="mb-10"><h1 className="mb-2 text-4xl font-bold tracking-tight text-white">🇰🇷 K-ROADMAP</h1><p className="text-lg text-slate-400">My Journey to Korea 2027</p></header>
      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <div className="group flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg"><div><h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-slate-400">Overall Progress</h2><div className="mb-4 text-3xl font-bold text-white">{progressPercent}%</div></div><div className="h-2.5 w-full rounded-full bg-slate-800"><motion.div initial={{ width: 0 }} animate={{ width: `${progressPercent}%` }} className="h-2.5 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-700" /></div><p className="mt-3 text-xs text-slate-500">{completedTasks} of {totalTasks} tasks completed</p></div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg"><div className="mb-4 flex items-center justify-between"><div><h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-slate-400">Current Phase</h2><div className="text-xl font-bold text-white">{currentPhase?.title ?? 'Loading...'}</div></div><div className="rounded-xl bg-indigo-500/10 p-3 text-indigo-400"><Compass size={24} /></div></div><div className="h-2.5 w-full rounded-full bg-slate-800"><motion.div initial={{ width: 0 }} animate={{ width: `${currentPhaseProgress}%` }} className="h-2.5 rounded-full bg-indigo-500" /></div><p className="mt-3 text-xs text-slate-500">{currentPhaseProgress}% complete{currentPhase ? ` · ${currentPhase.subtitle}` : ''}</p></div>
        <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-6 shadow-lg"><div className="mb-3 flex items-center justify-between"><div><h2 className="mb-1 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-cyan-300">Current Focus <Sparkles size={14} /></h2><div className="text-xl font-bold text-white">{currentFocus ? `${currentFocus.icon} ${currentFocus.name}` : 'Loading...'}</div></div><div className="rounded-xl bg-cyan-500/10 p-3 text-cyan-400"><Target size={24} /></div></div><p className="text-xs text-slate-400">{adaptivePlan?.title ?? 'Your major exploration focus will appear here.'}{currentFocusAnalysis ? ` · ${currentFocusAnalysis.score}/100` : ''}</p><p className="mt-3 line-clamp-2 text-sm text-slate-300">{adaptivePlan?.reason ?? currentFocus?.description ?? 'Your major exploration focus will appear here.'}</p>{decisionResult && <a href="/majors/decision" className="mt-4 inline-block text-xs font-semibold text-indigo-400 hover:text-indigo-300">View decision analysis →</a>}</div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg"><div className="flex items-center justify-between"><div><h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-slate-400">Application Readiness</h2><div className="text-3xl font-bold text-white">{documentProgress}%</div><p className="mt-2 text-xs text-slate-500">{completedDocuments.length} of {documents.length} documents ready</p></div><div className="rounded-xl bg-cyan-500/10 p-3 text-cyan-400"><FileText size={24} /></div></div></div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="relative overflow-hidden rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-900/40 to-slate-900 p-6 shadow-lg lg:col-span-2"><div className="absolute right-0 top-0 p-4 opacity-10"><Target size={120} /></div><h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-indigo-400"><Zap size={16} />Today&apos;s Mission</h2>{missionIsAdaptive ? <div><p className="mb-2 text-xs uppercase tracking-wider text-slate-500">Adaptive next action · {adaptivePlan?.priority ?? 'medium'} priority</p><h3 className="mb-3 max-w-2xl text-2xl font-bold text-white">{adaptivePlan?.title}</h3><p className="mb-5 max-w-2xl text-sm leading-relaxed text-slate-300">{adaptivePlan?.reason}</p>{missionTask ? <button onClick={() => toggleTask(missionTask.id)} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 font-medium text-white shadow-lg shadow-indigo-950/40 transition-all duration-200 hover:-translate-y-0.5 hover:bg-indigo-500 active:translate-y-0"><CheckCircle2 size={20} />Complete Mission</button> : <a href="/experiments" className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-5 py-3 text-sm font-semibold text-cyan-300 hover:bg-cyan-400/15">Open exploration workspace →</a>}</div> : missionFallback ? <div><p className="mb-2 text-xs uppercase tracking-wider text-slate-500">Next roadmap task</p><h3 className="mb-6 max-w-2xl text-2xl font-bold text-white">{missionFallback.title}</h3><button onClick={() => toggleTask(missionFallback.id)} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 font-medium text-white shadow-lg shadow-indigo-950/40 transition-all duration-200 hover:-translate-y-0.5 hover:bg-indigo-500 active:translate-y-0"><CheckCircle2 size={20} />Complete Mission</button></div> : <h3 className="mb-6 text-2xl font-bold text-emerald-400">{hasHydrated ? 'All caught up! Excellent work.' : 'Loading mission...'}</h3>}</div>
        <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-6 shadow-lg"><h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-cyan-300"><FlaskConical size={16} />Experiment Evidence</h2><div className="text-3xl font-bold text-white">{completedExperiments}/{totalExperiments}</div><p className="mt-2 text-sm text-slate-400">experiments reflected</p><a href="/experiments" className="mt-5 inline-block text-xs font-semibold text-cyan-300 hover:text-cyan-200">Open exploration workspace →</a></div>
      </div>

      {adaptivePlan && adaptivePlan.signals.length > 0 && <div className="mb-8 rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg"><h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-400"><Sparkles size={16} />Why the dashboard chose this</h2><div className="grid grid-cols-1 gap-3 md:grid-cols-2">{adaptivePlan.signals.map((signal) => <div key={signal} className="rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-slate-300">✓ {signal}</div>)}</div></div>}

      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2"><div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg"><h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">Next Milestone</h2><h3 className="mb-3 text-xl font-bold text-white">{nextMilestone?.title ?? 'Journey complete'}</h3><p className="text-sm leading-relaxed text-slate-400">{nextMilestone?.description ?? 'You have completed every goal in the current phase.'}</p>{currentPhase && <p className="mt-5 text-xs text-indigo-400">Phase {currentPhase.number} · {currentPhase.title}</p>}</div><div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg"><h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">Finance Snapshot</h2><div className="flex items-end justify-between gap-4"><div><p className="text-2xl font-bold text-white">{formatCurrency(totalBudget)}</p><p className="mt-1 text-xs text-slate-500">planned expenses</p></div><Wallet className="text-emerald-400" size={26} /></div><div className="mt-5 flex justify-between text-xs text-slate-500"><span>Savings: {formatCurrency(hasHydrated ? budget.currentSavings : 0)}</span><span>Target: {formatCurrency(hasHydrated ? budget.targetAmount : 0)}</span></div></div></div>
      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2"><div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg"><h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">Journey Principle</h2><p className="text-sm leading-relaxed text-slate-300">Explore → Experiment → Reflect → Compare → Decide → Prepare → Apply</p><p className="mt-3 text-xs text-slate-500">Your current focus can evolve as your experiences and interests change.</p></div><div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg"><h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">Why I&apos;m Doing This</h2><p className="border-l-4 border-indigo-500/40 pl-4 text-lg italic leading-relaxed text-slate-300">&quot;{myWhy}&quot;</p></div></div>
    </div>
  );
}
