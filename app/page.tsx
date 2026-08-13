'use client';

import { useJourneyStore } from '@/store/useJourneyStore';
import {
  CheckCircle2,
  Target,
  Zap,
  FileText,
  Wallet,
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function Dashboard() {
  const {
    phases,
    myWhy,
    toggleTask,
    documents,
    budget,
  } = useJourneyStore();

  // ======================================================
  // ROADMAP PROGRESS
  // ======================================================

  const allTasks = phases.flatMap((p) => p.tasks);

  const completedTasks = allTasks.filter(
    (task) => task.status === 'Completed'
  );

  const progressPercent =
    Math.round(
      (completedTasks.length / allTasks.length) * 100
    ) || 0;

  // First incomplete task = Today's Mission
  const todaysMission = allTasks.find(
    (task) => task.status !== 'Completed'
  );

  // ======================================================
  // DOCUMENT PROGRESS
  // ======================================================

  const completedDocuments = documents.filter(
    (document) => document.status === 'Completed'
  );

  const documentProgress =
    Math.round(
      (completedDocuments.length / documents.length) * 100
    ) || 0;

  // ======================================================
  // BUDGET
  // ======================================================

  const totalBudget = budget.reduce(
    (total, item) => total + item.amount,
    0
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 font-sans">

      {/* ==================================================
          HEADER
      ================================================== */}

      <header className="mb-12">
        <h1 className="text-4xl font-bold tracking-tight text-white mb-2">
          🇰🇷 K-ROADMAP
        </h1>

        <p className="text-slate-400 text-lg">
          My Journey to Korea 2027
        </p>
      </header>

      {/* ==================================================
          MAIN STATS
      ================================================== */}

      <div className="grid grid-cols-1 gap-6 mb-12 md:grid-cols-3">

        {/* OVERALL PROGRESS */}

        <div className="group flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:border-indigo-500/20 hover:shadow-[0_8px_30px_rgba(15,23,42,0.5)]">

          <div>
            <h2 className="text-slate-400 text-sm font-semibold uppercase tracking-wider mb-1">
              Overall Progress
            </h2>

            <div className="text-3xl font-bold text-white mb-4">
              {progressPercent}%
            </div>
          </div>

          <div className="w-full bg-slate-800 rounded-full h-2.5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              className="h-2.5 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-700"
            />
          </div>

          <p className="text-xs text-slate-500 mt-3">
            {completedTasks.length} of {allTasks.length} tasks completed
          </p>
        </div>

        {/* DOCUMENT PROGRESS */}

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-lg">

          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-slate-400 text-sm font-semibold uppercase tracking-wider mb-1">
                Application Readiness
              </h2>

              <div className="text-3xl font-bold text-white">
                {documentProgress}%
              </div>
            </div>

            <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400">
              <FileText size={24} />
            </div>
          </div>

          <div className="w-full bg-slate-800 rounded-full h-2.5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${documentProgress}%` }}
              className="bg-cyan-500 h-2.5 rounded-full"
            />
          </div>

          <p className="text-xs text-slate-500 mt-3">
            {completedDocuments.length} of {documents.length} documents completed
          </p>
        </div>

        {/* BUDGET */}

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-lg">

          <div className="flex items-center justify-between">

            <div>
              <h2 className="text-slate-400 text-sm font-semibold uppercase tracking-wider mb-2">
                Budget Tracked
              </h2>

              <div className="text-2xl font-bold text-white">
                {formatCurrency(totalBudget)}
              </div>

              <p className="text-xs text-slate-500 mt-2">
                {budget.length} budget items
              </p>
            </div>

            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Wallet size={24} />
            </div>

          </div>
        </div>
      </div>

      {/* ==================================================
          TODAY'S MISSION
      ================================================== */}

      <div className="mb-8">

        <div className="bg-gradient-to-br from-indigo-900/40 to-slate-900 border border-indigo-500/30 p-6 rounded-2xl shadow-lg relative overflow-hidden">

          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Target size={120} />
          </div>

          <h2 className="flex items-center gap-2 text-indigo-400 text-sm font-semibold uppercase tracking-wider mb-4">
            <Zap size={16} />
            Today's Mission
          </h2>

          {todaysMission ? (
            <div>

              <h3 className="text-2xl font-bold text-white mb-6 max-w-lg">
                {todaysMission.title}
              </h3>

              <button
                onClick={() =>
                  toggleTask(
                    todaysMission.phaseId,
                    todaysMission.id
                  )
                }
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 font-medium text-white shadow-lg shadow-indigo-950/40 transition-all duration-200 hover:-translate-y-0.5 hover:bg-indigo-500 hover:shadow-indigo-900/50 active:translate-y-0"
              >
                <CheckCircle2 size={20} />
                Complete Mission
              </button>

            </div>
          ) : (
            <h3 className="text-2xl font-bold text-emerald-400 mb-6">
              All caught up! Excellent work.
            </h3>
          )}

        </div>
      </div>

      {/* ==================================================
          MY WHY
      ================================================== */}

      <div className="max-w-3xl rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-lg transition-all duration-300 hover:border-slate-700">

        <h2 className="text-slate-400 text-sm font-semibold uppercase tracking-wider mb-4">
          Why I'm Doing This
        </h2>

        <p className="border-l-4 border-indigo-500/40 pl-4 text-lg italic leading-relaxed text-slate-300">
          "{myWhy}"
        </p>

      </div>

    </div>
  );
}