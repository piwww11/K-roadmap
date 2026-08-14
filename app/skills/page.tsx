'use client';

import { useState } from 'react';
import { useJourneyStore } from '@/store/useJourneyStore';
import type { SkillStatus } from '@/types';
import { Lock, Check, Play, Circle, Brain, Atom, Dna } from 'lucide-react';
import { motion } from 'framer-motion';

const trackInfo = {
  physics: { name: 'Physics Track', icon: Atom, color: 'text-indigo-400', bg: 'bg-indigo-500' },
  bcs: { name: 'BCS Track', icon: Brain, color: 'text-cyan-400', bg: 'bg-cyan-500' },
  'life-science': { name: 'Life Science', icon: Dna, color: 'text-emerald-400', bg: 'bg-emerald-500' },
};

type Track = keyof typeof trackInfo;

export default function SkillTreePage() {
  const skills = useJourneyStore((state) => state.skills);
  const updateSkillStatus = useJourneyStore((state) => state.updateSkillStatus);
  const [activeTrack, setActiveTrack] = useState<Track>('physics');
  const currentSkills = skills.filter((skill) => skill.track === activeTrack);
  const categories = [...new Set(currentSkills.map((skill) => skill.category))];

  const handleSkillClick = (skillId: string, status: SkillStatus) => {
    if (status === 'locked') return;
    const nextStatus: SkillStatus = status === 'not-started' ? 'learning' : status === 'learning' ? 'completed' : 'not-started';
    updateSkillStatus(skillId, nextStatus);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <div className="max-w-5xl mx-auto">
        <header className="mb-10">
          <p className="text-indigo-400 text-sm font-semibold uppercase tracking-widest mb-2">K-ROADMAP</p>
          <h1 className="text-4xl font-bold text-white">Skill Progression Tree</h1>
          <p className="text-slate-400 mt-2">Build your foundations one skill at a time.</p>
        </header>

        <div className="flex flex-wrap gap-3 mb-12">
          {(Object.keys(trackInfo) as Track[]).map((track) => {
            const Icon = trackInfo[track].icon;
            const isActive = activeTrack === track;
            return <button key={track} onClick={() => setActiveTrack(track)} className={`flex items-center gap-2 px-5 py-3 rounded-xl border transition-all ${isActive ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-900 border-transparent text-slate-400 hover:bg-slate-800'}`}><Icon size={20} className={isActive ? trackInfo[track].color : 'text-slate-500'} />{trackInfo[track].name}</button>;
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {categories.map((category) => {
            const categorySkills = currentSkills.filter((skill) => skill.category === category);
            return <section key={category}>
              <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-6 border-b border-slate-800 pb-3">{category}</h2>
              <div className="flex flex-col items-center">
                {categorySkills.map((skill, index) => {
                  const isLast = index === categorySkills.length - 1;
                  const isLocked = skill.status === 'locked';
                  const isLearning = skill.status === 'learning';
                  const isCompleted = skill.status === 'completed';
                  return <div key={skill.id} className="flex flex-col items-center w-full">
                    <motion.button whileHover={isLocked ? {} : { scale: 1.04 }} whileTap={isLocked ? {} : { scale: 0.97 }} disabled={isLocked} onClick={() => handleSkillClick(skill.id, skill.status)} className={`w-full max-w-xs px-4 py-4 rounded-xl border-2 transition-all ${isLocked ? 'bg-slate-950 border-slate-800 opacity-50 cursor-not-allowed' : isCompleted ? `${trackInfo[activeTrack].bg} border-transparent` : isLearning ? `bg-slate-900 border-dashed ${trackInfo[activeTrack].color.replace('text-', 'border-')}` : 'bg-slate-900 border-slate-700 hover:border-slate-500'}`}>
                      <div className="flex items-center gap-3"><div className="w-7 h-7 rounded-full bg-slate-950 flex items-center justify-center shrink-0">{isLocked && <Lock size={15} className="text-slate-600" />}{skill.status === 'not-started' && <Circle size={15} className="text-slate-400" />}{isLearning && <Play size={15} className={trackInfo[activeTrack].color} fill="currentColor" />}{isCompleted && <Check size={16} className="text-white" strokeWidth={3} />}</div><span className={`font-semibold text-sm ${isLocked ? 'text-slate-600' : 'text-white'}`}>{skill.title}</span></div>
                    </motion.button>
                    {!isLast && <div className="w-1 h-8 bg-slate-800 relative overflow-hidden"><div className={`absolute inset-0 ${isCompleted ? trackInfo[activeTrack].bg : 'bg-transparent'}`} /></div>}
                  </div>;
                })}
              </div>
            </section>;
          })}
        </div>

        <div className="mt-12 bg-slate-900 border border-slate-800 rounded-2xl p-5"><p className="text-sm text-slate-400"><span className="text-white font-semibold">How it works:</span>{' '}Click a skill to cycle through <span className="text-slate-300">Not Started → Learning → Completed</span>. Your progress is automatically saved.</p></div>
      </div>
    </main>
  );
}
