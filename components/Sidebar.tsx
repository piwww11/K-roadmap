'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Map, GraduationCap, Brain, FileText, Wallet, FlaskConical, GitCompare, ShieldCheck, CalendarCheck } from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Roadmap', href: '/roadmap', icon: Map },
  { name: 'Majors', href: '/majors', icon: GraduationCap },
  { name: 'Comparison', href: '/majors/comparison', icon: GitCompare },
  { name: 'Experiments', href: '/experiments', icon: FlaskConical },
  { name: 'Weekly Review', href: '/weekly-review', icon: CalendarCheck },
  { name: 'Skills', href: '/skills', icon: Brain },
  { name: 'Documents', href: '/documents', icon: FileText },
  { name: 'Budget', href: '/budget', icon: Wallet },
  { name: 'Readiness', href: '/readiness', icon: ShieldCheck },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-50 flex h-screen w-64 flex-col border-r border-slate-800 bg-slate-950 px-4 py-6">
      <div className="mb-10 shrink-0 px-3"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600/20 text-xl">🇰🇷</div><div><h1 className="text-sm font-bold tracking-wide text-white">K-ROADMAP</h1><p className="text-xs text-slate-500">Korea 2027</p></div></div></div>
      <nav className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1"><p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-600">Navigation</p>{navigation.map((item) => { const Icon = item.icon; const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href); return <Link key={item.href} href={item.href} className={isActive ? 'group flex items-center gap-3 rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-3 py-3 text-sm font-medium text-indigo-300 shadow-[0_0_20px_rgba(99,102,241,0.08)] transition-all duration-200' : 'group flex items-center gap-3 rounded-xl border border-transparent px-3 py-3 text-sm font-medium text-slate-400 transition-all duration-200 hover:border-slate-800 hover:bg-slate-900/80 hover:text-slate-100'}><Icon size={19} className={isActive ? 'text-indigo-400' : 'text-slate-500 transition-colors duration-200 group-hover:text-slate-300'} /><span className="transition-transform duration-200 group-hover:translate-x-0.5">{item.name}</span></Link>; })}</nav>
      <div className="mt-4 shrink-0 rounded-2xl border border-slate-800 bg-slate-900/60 p-4"><div className="mb-2 flex items-center justify-between"><span className="text-xs font-semibold text-slate-400">JOURNEY STATUS</span><span className="h-2 w-2 rounded-full bg-emerald-400" /></div><p className="text-xs leading-relaxed text-slate-500">Building the path, one step at a time.</p></div>
    </aside>
  );
}
