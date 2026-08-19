'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, ExternalLink, GraduationCap, Plus, Trash2, WalletCards } from 'lucide-react';
import { useApplicationTrackerStore, APPLICATION_PRIORITIES, APPLICATION_STATUSES, APPLICATION_TYPES } from '@/store/applicationTrackerStore';
import { useJourneyStore } from '@/store/useJourneyStore';
import type { ApplicationPriority, ApplicationStatus, ApplicationType } from '@/types/application';

const inputClass = 'w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-slate-200 outline-none transition focus:border-indigo-500';

function deadlineLabel(deadline?: string) {
  if (!deadline) return 'No deadline';
  const date = new Date(`${deadline}T00:00:00`);
  if (Number.isNaN(date.getTime())) return 'Invalid deadline';
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function daysUntil(deadline?: string) {
  if (!deadline) return null;
  const target = new Date(`${deadline}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.ceil((target.getTime() - today.getTime()) / 86400000);
  return diff;
}

function statusTone(status: ApplicationStatus) {
  if (status === 'accepted') return 'text-emerald-300 bg-emerald-500/10';
  if (status === 'rejected' || status === 'withdrawn') return 'text-rose-300 bg-rose-500/10';
  if (status === 'submitted' || status === 'interview') return 'text-sky-300 bg-sky-500/10';
  return 'text-amber-300 bg-amber-500/10';
}

export default function ApplicationsPage() {
  const [hydrated, setHydrated] = useState(false);
  const applications = useApplicationTrackerStore((state) => state.applications);
  const addApplication = useApplicationTrackerStore((state) => state.addApplication);
  const updateApplication = useApplicationTrackerStore((state) => state.updateApplication);
  const removeApplication = useApplicationTrackerStore((state) => state.removeApplication);
  const majors = useJourneyStore((state) => state.majors);

  const [type, setType] = useState<ApplicationType>('university');
  const [name, setName] = useState('');
  const [organization, setOrganization] = useState('');
  const [country, setCountry] = useState('South Korea');
  const [program, setProgram] = useState('');
  const [majorId, setMajorId] = useState('');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState<ApplicationPriority>('high');
  const [applicationUrl, setApplicationUrl] = useState('');

  useEffect(() => setHydrated(true), []);

  const stats = useMemo(() => {
    if (!hydrated) return { total: 0, active: 0, urgent: 0, submitted: 0 };
    const active = applications.filter((item) => !['accepted', 'rejected', 'withdrawn'].includes(item.status));
    const urgent = active.filter((item) => {
      const days = daysUntil(item.deadline);
      return days !== null && days >= 0 && days <= 30;
    });
    const submitted = applications.filter((item) => ['submitted', 'interview'].includes(item.status));
    return { total: applications.length, active: active.length, urgent: urgent.length, submitted: submitted.length };
  }, [applications, hydrated]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !organization.trim()) return;
    addApplication({
      type,
      name: name.trim(),
      organization: organization.trim(),
      country: country.trim() || 'Unknown',
      program: program.trim() || undefined,
      majorId: majorId || undefined,
      status: 'researching',
      priority,
      deadline: deadline || undefined,
      eligibility: 'unknown',
      applicationUrl: applicationUrl.trim() || undefined,
      requiredDocumentIds: [],
      notes: undefined,
    });
    setName(''); setOrganization(''); setProgram(''); setMajorId(''); setDeadline(''); setApplicationUrl('');
  };

  if (!hydrated) return <main className="min-h-screen bg-slate-950 p-8 text-slate-100" />;

  const statCards = [
    { label: 'Targets', value: stats.total, Icon: GraduationCap },
    { label: 'Active', value: stats.active, Icon: WalletCards },
    { label: 'Due ≤ 30 days', value: stats.urgent, Icon: CalendarDays },
    { label: 'Submitted / interview', value: stats.submitted, Icon: ExternalLink },
  ];

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-indigo-400">K-ROADMAP / APPLICATIONS</p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight text-white">Application Tracker</h1>
            <p className="mt-3 max-w-3xl text-slate-400">Keep universities and scholarships in one place, track their status, and preserve deadlines for the upcoming opportunity timeline.</p>
          </div>
          <Link href="/readiness" className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-900">Application Readiness →</Link>
        </header>

        <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map(({ label, value, Icon }) => (
            <div key={label} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
              <div className="flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-widest text-slate-500">{label}</span><Icon size={17} className="text-indigo-400" /></div>
              <p className="mt-3 text-3xl font-bold text-white">{value}</p>
            </div>
          ))}
        </section>

        <section className="mb-8 rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <div className="mb-5"><h2 className="text-lg font-bold text-white">Add an application target</h2><p className="mt-1 text-sm text-slate-500">A target can be a university application or a scholarship. We will reuse these deadlines in feature #10.</p></div>
          <form onSubmit={submit} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <select className={inputClass} value={type} onChange={(e) => setType(e.target.value as ApplicationType)}>{APPLICATION_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
            <input className={inputClass} placeholder="University / scholarship name *" value={name} onChange={(e) => setName(e.target.value)} />
            <input className={inputClass} placeholder="Organization / provider *" value={organization} onChange={(e) => setOrganization(e.target.value)} />
            <input className={inputClass} placeholder="Country" value={country} onChange={(e) => setCountry(e.target.value)} />
            <input className={inputClass} placeholder="Program (optional)" value={program} onChange={(e) => setProgram(e.target.value)} />
            <select className={inputClass} value={majorId} onChange={(e) => setMajorId(e.target.value)}><option value="">Related major (optional)</option>{majors.map((major) => <option key={major.id} value={major.id}>{major.name}</option>)}</select>
            <input className={inputClass} type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            <select className={inputClass} value={priority} onChange={(e) => setPriority(e.target.value as ApplicationPriority)}>{APPLICATION_PRIORITIES.map((item) => <option key={item.value} value={item.value}>{item.label} priority</option>)}</select>
            <input className={`${inputClass} lg:col-span-3`} placeholder="Official application URL (optional)" value={applicationUrl} onChange={(e) => setApplicationUrl(e.target.value)} />
            <button type="submit" className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-500"><Plus size={17} /> Add target</button>
          </form>
        </section>

        <section className="space-y-4">
          {applications.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-10 text-center"><GraduationCap className="mx-auto text-slate-600" size={32} /><h2 className="mt-4 font-bold text-white">No applications tracked yet</h2><p className="mt-2 text-sm text-slate-500">Add your first university or scholarship target above.</p></div>
          ) : applications.map((application) => {
            const days = daysUntil(application.deadline);
            const major = majors.find((item) => item.id === application.majorId);
            return <article key={application.id} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-slate-800 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">{application.type}</span><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${statusTone(application.status)}`}>{APPLICATION_STATUSES.find((item) => item.value === application.status)?.label}</span><span className="text-xs text-slate-600">{application.priority} priority</span></div><h2 className="mt-3 text-xl font-bold text-white">{application.name}</h2><p className="mt-1 text-sm text-slate-400">{application.organization} · {application.country}{major ? ` · ${major.name}` : ''}</p>{application.program && <p className="mt-1 text-sm text-slate-500">{application.program}</p>}</div>
                <div className="flex shrink-0 flex-wrap gap-2"><select className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-300" value={application.status} onChange={(e) => updateApplication(application.id, { status: e.target.value as ApplicationStatus })}>{APPLICATION_STATUSES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>{application.applicationUrl && <a href={application.applicationUrl} target="_blank" rel="noreferrer" className="rounded-xl border border-slate-800 p-2 text-slate-400 hover:text-white"><ExternalLink size={16} /></a>}<button type="button" onClick={() => removeApplication(application.id)} className="rounded-xl border border-slate-800 p-2 text-slate-500 hover:border-rose-500/30 hover:text-rose-300" aria-label={`Delete ${application.name}`}><Trash2 size={16} /></button></div>
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-slate-800 pt-4 text-sm"><label className="flex items-center gap-2 text-slate-400"><CalendarDays size={15} className="text-indigo-400" /><input aria-label={`${application.name} deadline`} className="rounded-lg border border-slate-800 bg-slate-950 px-2 py-1 text-sm text-slate-300" type="date" value={application.deadline ?? ''} onChange={(e) => updateApplication(application.id, { deadline: e.target.value || undefined })} /></label>{days !== null && <span className={days < 0 ? 'font-semibold text-rose-300' : days <= 30 ? 'font-semibold text-amber-300' : 'text-slate-500'}>{days < 0 ? `${Math.abs(days)} days overdue` : days === 0 ? 'Due today' : `${days} days left`}</span>}<span className="text-xs text-slate-600">Eligibility: {application.eligibility}</span></div>
            </article>;
          })}
        </section>
      </div>
    </main>
  );
}
