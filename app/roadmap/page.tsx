'use client';

import { useJourneyStore } from '@/store/useJourneyStore';
import { CheckCircle2, Circle, Calendar, Flag, Map } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Phase, Month, Goal, Task } from '@/types';

export default function RoadmapPage() {
  const { phases, toggleTask } = useJourneyStore();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 font-sans">
      
      {/* Header */}
      <header className="mb-12 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2 flex items-center gap-3">
          <Map className="text-indigo-500" size={32} />
          Mission Roadmap
        </h1>
        <p className="text-slate-400">
          Chronological timeline of your preparation for GKS-U 2027.
        </p>
      </header>

      {/* Timeline Container */}
      <div className="max-w-4xl mx-auto relative">
        
        {/* The Vertical Line */}
        <div className="absolute left-4 md:left-8 top-4 bottom-0 w-0.5 bg-gradient-to-b from-indigo-500/40 via-slate-800 to-transparent rounded-full" />

        <div className="space-y-12">
          {phases.map((phase, index) => {
            // Calculate phase progress
            const completedTasks = phase.tasks.filter(t => t.status === 'Completed').length;
            const totalTasks = phase.tasks.length;
            const progressPercent = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
            const isPhaseComplete = progressPercent === 100 && totalTasks > 0;

            return (
              <div key={phase.id} className="relative pl-12 md:pl-20">
                
                {/* Timeline Dot */}
                <div 
                  className={`absolute left-[11px] md:left-[27px] top-6 h-5 w-5 rounded-full border-4 border-slate-950 shadow-sm z-10 transition-colors duration-300 ${
                    isPhaseComplete ? 'bg-emerald-500' : 'bg-indigo-500'
                  }`} 
                />

                {/* Phase Card */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-indigo-500/30 hover:shadow-indigo-950/20">
                  
                  {/* Phase Header */}
                  <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-6 gap-4">
                    <div>
                      <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-2">
                        <Flag size={14} /> Phase {index + 1}
                      </div>
                      <h2 className="text-2xl font-bold text-white mb-2">{phase.title}</h2>
                      <p className="text-slate-400 text-sm leading-relaxed max-w-xl">
                        {phase.description}
                      </p>
                    </div>
                    
                    {/* Date Badge */}
                    <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 text-slate-300 px-3 py-1.5 rounded-lg text-sm shrink-0">
                      <Calendar size={16} className="text-slate-500" />
                      {phase.timeline}
                    </div>
                  </div>

                  {/* Phase Progress Bar */}
                  <div className="mb-6">
                    <div className="flex justify-between text-xs text-slate-500 mb-2 font-medium">
                      <span>Phase Progress</span>
                      <span>{completedTasks} / {totalTasks} tasks</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-1.5">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPercent}%` }}
                       className={`h-1.5 rounded-full transition-all duration-500 ${
  isPhaseComplete
    ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
    : 'bg-gradient-to-r from-indigo-500 to-cyan-400'
}`}
                      />
                    </div>
                  </div>

                  {/* Tasks List */}
                  <div className="space-y-2">
                    {phase.tasks.map((task) => {
                      const isCompleted = task.status === 'Completed';
                      
                      return (
                        <div 
                          key={task.id}
                          onClick={() => toggleTask(phase.id, task.id)}
                          className={`group flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all duration-200 ${
                            isCompleted
  ? 'bg-slate-950/50 border-slate-800/50'
  : 'bg-slate-950 border-slate-800 hover:border-indigo-500/50 hover:bg-indigo-950/10 hover:translate-x-1'
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            {/* Checkbox Icon */}
                            <div className={`${isCompleted ? 'text-emerald-500' : 'text-slate-600 group-hover:text-indigo-400'} transition-colors`}>
                              {isCompleted ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                            </div>
                            
                            {/* Task Title */}
                            <span className={`text-sm font-medium transition-all ${
                              isCompleted ? 'text-slate-500 line-through' : 'text-slate-200'
                            }`}>
                              {task.title}
                            </span>
                          </div>

                          {/* Category Tag */}
                          <div className={`text-[10px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-md border ${
                            isCompleted 
                              ? 'bg-slate-900 border-slate-800 text-slate-600' 
                              : 'bg-indigo-950/30 border-indigo-900/50 text-indigo-400'
                          }`}>
                            {task.category}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}