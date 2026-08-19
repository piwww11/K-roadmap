'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Map, GraduationCap, Brain, FileText, Wallet, FlaskConical, ShieldCheck, CalendarCheck, Compass, BarChart3, ChevronDown, Scale, ClipboardList, CalendarDays } from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Roadmap', href: '/roadmap', icon: Map },
  { name: 'Adaptive Journey', href: '/adaptive-journey', icon: Compass },
  { name: 'Progress', href: '/progress', icon: BarChart3 },
  { name: 'Experiments', href: '/experiments', icon: FlaskConical },
  { name: 'Weekly Review', href: '/weekly-review', icon: CalendarCheck },
  { name: 'Skills', href: '/skills', icon: Brain },
  { name: 'Documents', href: '/documents', icon: FileText },
  { name: 'Budget', href: '/budget', icon: Wallet },
  { name: 'Applications', href: '/applications', icon: ClipboardList },
  { name: 'Opportunity Timeline', href: '/opportunities', icon: CalendarDays },
  { name: 'Readiness', href: '/readiness', icon: ShieldCheck },
];

const majorNavigation = [
  { name: 'Decision', href: '/majors/decision', icon: GraduationCap },
  { name: 'Evidence', href: '/majors/evidence', icon: ShieldCheck },
  { name: 'Comparison', href: '/majors/comparison', icon: Scale },
];

const baseLinkClass = 'group flex items-center gap-3 rounded-xl border px-3 py-3 text-sm font-medium transition-all duration-200';

function SidebarLink({ name, href, Icon, active }: { name: string; href: string; Icon: typeof LayoutDashboard; active: boolean }) {
  return <Link href={href} className={active ? `${baseLinkClass} border-indigo-500/20 bg-indigo-500/10 text-indigo-300 shadow-[0_0_20px_rgba(99,102,241,0.08)]` : `${baseLinkClass} border-transparent text-slate-400 hover:border-slate-800 hover:bg-slate-900/80 hover:text-slate-100`}><Icon size={19} className={active ? 'text-indigo-400' : 'text-slate-500 transition-colors duration-200 group-hover:text-slate-300'} /><span className="transition-transform duration-200 group-hover:translate-x-0.5">{name}</span></Link>;
}

export default function Sidebar() {
  const pathname = usePathname();
  const isMajorsSection = pathname === '/majors' || pathname.startsWith('/majors/');
  return <aside className="fixed left-0 top-0 z-50 flex h-screen w-64 flex-col border-r border-slate-800 bg-slate-950 px-4 py-6">
    <div className="mb-10 shrink-0 px-3"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600/20 text-xl">🇰🇷</div><div><h1 className="text-sm font-bold tracking-wide text-white">K-ROADMAP</h1><p className="text-xs text-slate-500">Korea 2027</p></div></div></div>
    <nav className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1"><p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-600">Navigation</p><div className="space-y-2">{navigation.slice(0,4).map(item=><SidebarLink key={item.href} name={item.name} href={item.href} Icon={item.icon} active={item.href==='/'?pathname==='/':pathname.startsWith(item.href)}/>)}</div>
      <div className="pt-1"><Link href="/majors" className={isMajorsSection?`${baseLinkClass} border-indigo-500/20 bg-indigo-500/10 text-indigo-300 shadow-[0_0_20px_rgba(99,102,241,0.08)]`:`${baseLinkClass} border-transparent text-slate-400 hover:border-slate-800 hover:bg-slate-900/80 hover:text-slate-100`}><GraduationCap size={19} className={isMajorsSection?'text-indigo-400':'text-slate-500'}/><span className="flex-1">Majors</span><ChevronDown size={16} className={`transition-transform ${isMajorsSection?'rotate-180 text-indigo-400':'text-slate-600'}`}/></Link>{isMajorsSection&&<div className="ml-5 mt-1 space-y-1 border-l border-slate-800 pl-3">{majorNavigation.map(item=>{const Icon=item.icon;const active=pathname===item.href||pathname.startsWith(`${item.href}/`);return <Link key={item.href} href={item.href} className={active?'flex items-center gap-2 rounded-lg bg-indigo-500/10 px-3 py-2.5 text-xs font-semibold text-indigo-300':'flex items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-900 hover:text-slate-200'}><Icon size={15}/><span>{item.name}</span></Link>})}</div>}</div>
      <div className="space-y-2 pt-1">{navigation.slice(4).map(item=><SidebarLink key={item.href} name={item.name} href={item.href} Icon={item.icon} active={pathname.startsWith(item.href)}/>)}</div>
    </nav>
    <div className="mt-4 shrink-0 rounded-2xl border border-slate-800 bg-slate-900/60 p-4"><div className="mb-2 flex items-center justify-between"><span className="text-xs font-semibold text-slate-400">JOURNEY STATUS</span><span className="h-2 w-2 rounded-full bg-emerald-400"/></div><p className="text-xs leading-relaxed text-slate-500">Building the path, one step at a time.</p></div>
  </aside>;
}
