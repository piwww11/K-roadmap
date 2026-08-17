'use client';

import { useEffect, useMemo, useState } from 'react';
import { useJourneyStore } from '@/store/useJourneyStore';
import { analyzeMajorDecision } from '@/lib/majorDecisionEngine';
import { CheckCircle2, Compass, FileText, Target, Wallet, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Dashboard() {
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

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

  const progressPercent = hasHydrated ? getOverallProgress() : 0;
  const completedTasks = hasHydrated ? getCompletedTaskCount() : 0;
  const totalTasks = hasHydrated ? getTotalTaskCount() : 0;
  const todaysMission = hasHydrated ? getNextTask() : undefined;
  const currentPhase = hasHydrated ? getCurrentPhase() : undefined;

  const latestDecision = hasHydrated ? majorDecisions[majorDecisions.length - 1] : undefined;
  const decisionResult = useMemo(() => {
    if (!latestDecision || !hasHydrated) return undefined;
    return analyzeMajorDecision(latestDecision, majors, phases);
  }, [hasHydrated, latestDecision, majors, phases]);

  const currentFocus = useMemo(() => {
    if (!hasHydrated || majors.length === 0) return undefined;
    const decisionIsActionable = decisionResult && decisionResult.recommendationStatus !== 'insufficient-evidence';
    if (decisionIsActionable && decisionResult.topMajorId) {
      const decisionMajor = majors.find((major) => major.id === decisionResult.topMajorId);
      if (decisionMajor) return decisionMajor;
    }
    return [...majors].sort((a, b) => b.interestScore - a.interestScore)[0];
  }, [decisionResult, hasHydrated, majors]);

  const currentFocusAnalysis = decisionResult?.analyses.find((analysis) => analysis.majorId === currentFocus?.id);
  const focusSource = decisionResult?.recommendationStatus !== 'insufficient-evidence' && decisionResult ? 'Latest decision signal' : 'Highest current interest';

  const nextMilestone = useMemo(() => {
    if (!currentPhase) return undefined;
    for (const month of currentPhase.months) {
      for (const goal of month.goals) {
        if (goal.status !== 'Completed') return goal;
      }
    }
    return undefined;
  }, [currentPhase]);

  const currentPhaseProgress = hasHydrated && currentPhase ? getPhaseProgress(currentPhase.id) : 0;
  const completedDocuments = hasHydrated ? documents.filter((document) => document.status === 'Ready' || document.status === 'Verified') : [];
  const documentProgress = hasHydrated ? Math.round((completedDocuments.length / documents.length) * 100) || 0 : 0;
  const totalBudget = hasHydrated ? budget.items.reduce((total, item) => total + item.amount, 0) : 0;
  const formatCurrency = (amount: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 font-sans">
      <header className="mb-10"><h1 className="text-4xl font-bold tracking-tight text-white mb-2">🇰🇷 K-ROADMAP</h1><p className="text-slate-400 text-lg">My Journey to Korea 2027</p></header>
      <div className="grid grid-cols-1 gap-6 mb-8 md:grid-cols-2 xl:grid-cols-4">
        <div className="group flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg"><div><h2 className="text-slate-400 text-sm font-semibold uppercase tracking-wider mb-1">Overall Progress</h2><div className="text-3xl font-bold text-white mb-4">{progressPercent}%</div></div><div className="w-full bg-slate-800 rounded-full h-2.5"><motion.div initial={{ width: 0 }} animate={{ width: `${progressPercent}%` }} className="h-2.5 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-700" /></div><p className="text-xs text-slate-500 mt-3">{completedTasks} of {totalTasks} tasks completed</p></div>
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-lg"><div className="flex items-center justify-between mb-4"><div><h2 className="text-slate-400 text-sm font-semibold uppercase tracking-wider mb-1">Current Phase</h2><div className="text-xl font-bold text-white">{currentPhase?.title ?? 'Loading...'}</div></div><div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400"><Compass size={24} /></div></div><div className="w-full bg-slate-800 rounded-full h-2.5"><motion.div initial={{ width: 0 }} animate={{ width: `${currentPhaseProgress}%` }} className="bg-indigo-500 h-2.5 rounded-full" /></div><p className="text-xs text-slate-500 mt-3">{currentPhaseProgress}% complete{currentPhase ? ` · ${currentPhase.subtitle}` : ''}</p></div>
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-lg"><div className="flex items-center justify-between mb-3"><div><h2 className="text-slate-400 text-sm font-semibold uppercase tracking-wider mb-1">Current Focus</h2><div className="text-xl font-bold text-white">{currentFocus ? `${currentFocus.icon} ${currentFocus.name}` : 'Loading...'}</div></div><div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400"><Target size={24} /></div></div><p className="text-xs text-slate-500">{focusSource}{currentFocusAnalysis ? ` · ${currentFocusAnalysis.score}/100` : ''}</p><p className="text-sm text-slate-300 mt-3 line-clamp-2">{currentFocus?.description ?? 'Your major exploration focus will appear here.'}</p>{decisionResult && <a href="/majors/decision" className="mt-4 inline-block text-xs font-semibold text-indigo-400 hover:text-indigo-300">View decision analysis →</a>}</div>
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-lg"><div className="flex items-center justify-between"><div><h2 className="text-slate-400 text-sm font-semibold uppercase tracking-wider mb-2">Application Readiness</h2><div className="text-3xl font-bold text-white">{documentProgress}%</div><p className="text-xs text-slate-500 mt-2">{completedDocuments.length} of {documents.length} documents ready</p></div><div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400"><FileText size={24} /></div></div></div>
      </div>
      <div className="grid grid-cols-1 gap-6 mb-8 lg:grid-cols-3"><div className="lg:col-span-2 bg-gradient-to-br from-indigo-900/40 to-slate-900 border border-indigo-500/30 p-6 rounded-2xl shadow-lg relative overflow-hidden"><div className="absolute top-0 right-0 p-4 opacity-10"><Target size={120} /></div><h2 className="flex items-center gap-2 text-indigo-400 text-sm font-semibold uppercase tracking-wider mb-4"><Zap size={16} />Today&apos;s Mission</h2>{todaysMission ? <div><p className="text-xs uppercase tracking-wider text-slate-500 mb-2">Next recommended task</p><h3 className="text-2xl font-bold text-white mb-6 max-w-2xl">{todaysMission.title}</h3><button onClick={() => toggleTask(todaysMission.id)} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 font-medium text-white shadow-lg shadow-indigo-950/40 transition-all duration-200 hover:-translate-y-0.5 hover:bg-indigo-500 active:translate-y-0"><CheckCircle2 size={20} />Complete Mission</button></div> : <h3 className="text-2xl font-bold text-emerald-400 mb-6">{hasHydrated ? 'All caught up! Excellent work.' : 'Loading mission...'}</h3>}</div><div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-lg"><h2 className="text-slate-400 text-sm font-semibold uppercase tracking-wider mb-4">Next Milestone</h2><h3 className="text-xl font-bold text-white mb-3">{nextMilestone?.title ?? 'Journey complete'}</h3><p className="text-sm text-slate-400 leading-relaxed">{nextMilestone?.description ?? 'You have completed every goal in the current phase.'}</p>{currentPhase && <p className="text-xs text-indigo-400 mt-5">Phase {currentPhase.number} · {currentPhase.title}</p>}</div></div>
      <div className="grid grid-cols-1 gap-6 mb-8 lg:grid-cols-2"><div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg"><h2 className="text-slate-400 text-sm font-semibold uppercase tracking-wider mb-4">Finance Snapshot</h2><div className="flex items-end justify-between gap-4"><div><p className="text-2xl font-bold text-white">{formatCurrency(totalBudget)}</p><p className="text-xs text-slate-500 mt-1">planned expenses</p></div><Wallet className="text-emerald-400" size={26} /></div><div className="mt-5 flex justify-between text-xs text-slate-500"><span>Savings: {formatCurrency(hasHydrated ? budget.currentSavings : 0)}</span><span>Target: {formatCurrency(hasHydrated ? budget.targetAmount : 0)}</span></div></div><div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg"><h2 className="text-slate-400 text-sm font-semibold uppercase tracking-wider mb-4">Journey Principle</h2><p className="text-sm leading-relaxed text-slate-300">Explore → Experiment → Reflect → Compare → Decide → Prepare → Apply</p><p className="text-xs text-slate-500 mt-3">Your current focus can evolve as your experiences and interests change.</p></div></div>
      <div className="max-w-3xl rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-lg"><h2 className="text-slate-400 text-sm font-semibold uppercase tracking-wider mb-4">Why I&apos;m Doing This</h2><p className="border-l-4 border-indigo-500/40 pl-4 text-lg italic leading-relaxed text-slate-300">&quot;{myWhy}&quot;</p></div>
    </div>
  );
}
