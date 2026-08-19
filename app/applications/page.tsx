'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, ExternalLink, GraduationCap, Plus, Trash2, WalletCards } from 'lucide-react';
import { useApplicationTrackerStore, APPLICATION_PRIORITIES, APPLICATION_STATUSES, APPLICATION_TYPES } from '@/store/applicationTrackerStore';
import { useJourneyStore } from '@/store/useJourneyStore';
import type { ApplicationPriority, ApplicationStatus, ApplicationType } from '@/types/application';

const inputClass = 'w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-slate-200 outline-none transition focus:border-indigo-500';

function daysUntil(deadline?: string) {
  if (!deadline) return null;
  const target = new Date(`${deadline}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}

function statusTone(status: ApplicationStatus) {
  if (status === 'accepted') return 'text-emerald-300 bg-emerald-500/10';
  if (status === 'rejected' || status === 'withdrawn') return 'text-rose-300 bg-rose-500/10';
  if (status === 'submitted' || status === 'interview') return 'text-sky-300 bg-sky-500/10';
  return 'text-amber-300 bg-amber-500/10';
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const YEARS = Array.from({ length: 11 }, (_, index) => new Date().getFullYear() + index);

type DeadlineParts = { day: string; month: string; year: string };

function parseDeadline(deadline?: string): DeadlineParts {
  if (!deadline) return { day: '', month: '', year: '' };
  const [year, month, day] = deadline.split('-');
  return { day: day || '', month: month ? String(Number(month)) : '', year: year || '' };
}

function buildDeadline(year: string, month: string, day: string) {
  if (!year || !month || !day) return undefined;
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return undefined;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function formatDeadline(value?: string) {
  if (!value) return 'mm/dd/yyyy';
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) return 'mm/dd/yyyy';
  return `${month}/${day}/${year}`;
}

function DeadlinePicker({ value, onChange }: { value?: string; onChange: (value?: string) => void }) {
  const [open, setOpen] = useState(false);
  const [parts, setParts] = useState<DeadlineParts>(() => parseDeadline(value));

  useEffect(() => setParts(parseDeadline(value)), [value]);

  const maxDays = parts.year && parts.month ? new Date(Number(parts.year), Number(parts.month), 0).getDate() : 31;
  const days = Array.from({ length: maxDays }, (_, index) => index + 1);

  const updatePart = (key: keyof DeadlineParts, nextValue: string) => {
    const next = { ...parts, [key]: nextValue };
    if (key === 'month' && next.day && Number(next.day) > maxDays) next.day = '';
    setParts(next);
    const complete = buildDeadline(next.year, next.month, next.day);
    if (complete) onChange(complete);
  };

  return (
    <div className="relative w-full">
      <button type="button" onClick={() => setOpen((current) => !current)} className={`${inputClass} flex items-center justify-between text-left`} aria-haspopup="dialog" aria-expanded={open}>
        <span className={value ? 'text-slate-200' : 'text-slate-500'}>{formatDeadline(value)}</span>
        <CalendarDays size={16} className="text-slate-500" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-2 w-full min-w-[300px] rounded-xl border border-slate-800 bg-slate-900 p-3 shadow-2xl">
          <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">Select deadline</div>
          <div className="grid grid-cols-3 gap-2">
            <select aria-label="Deadline month" className={inputClass} value={parts.month} onChange={(e) => updatePart('month', e.target.value)}>
              <option value="">Month</option>
              {MONTHS.map((month, index) => <option key={month} value={String(index + 1)}>{month}</option>)}
            </select>
            <select aria-label="Deadline day" className={inputClass} value={parts.day} onChange={(e) => updatePart('day', e.target.value)}>
              <option value="">Day</option>
              {days.map((day) => <option key={day} value={String(day)}>{day}</option>)}
            </select>
            <select aria-label="Deadline year" className={inputClass} value={parts.year} onChange={(e) => updatePart('year', e.target.value)}>
              <option value="">Year</option>
              {YEARS.map((year) => <option key={year} value={String(year)}>{year}</option>)}
            </select>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            {value && <button type="button" onClick={() => { setParts({ day: '', month: '', year: '' }); onChange(undefined); }} className="rounded-lg px-3 py-1.5 text-xs text-slate-500 hover:text-slate-200">Clear</button>}
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500">Done</button>
          </div>
        </div>
      )}
    </div>
  );
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
  const [deadline, setDeadline] = useState<string | undefined>();
  const [priority, setPriority] = useState<ApplicationPriority>('high');
  const [applicationUrl, setApplicationUrl] = useState('');

  useEffect(() => setHydrated(true), []);

  const stats = useMemo(() => {
    if (!hydrated) return { total: 0, active: 0, urgent: 0, submitted: 0 };
    const active = applications.filter((item) => !['accepted', 'rejected', 'withdrawn'].includes(item.status));
    const urgent = active.filter((item) => { const days = daysUntil(item.deadline); return days !== null && days >= 0 && days <= 30; });
    const submitted = applications.filter((item) => ['submitted', 'interview'].includes(item.status));
    return { total: applications.length, active: active.length, urgent: urgent.length, submitted: submitted.length };
  }, [applications, hydrated]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !organization.trim()) return;
    addApplication({ type, name: name.trim(), organization: organization.trim(), country: country.trim() || 'Unknown', program: program.trim() || undefined, majorId: majorId || undefined, status: 'researching', priority, deadline, eligibility: 'unknown', applicationUrl: applicationUrl.trim() || undefined, requiredDocumentIds: [], notes: undefined });
    setName(''); setOrganization(''); setProgram(''); setMajorId(''); setDeadline(undefined); setApplicationUrl('');
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
          <div><p className="text-sm font-semibold uppercase tracking-widest text-indigo-400">K-ROADMAP / APPLICATIONS</p><h1 className="mt-2 text-4xl font-bold tracking-tight text-white">Application Tracker</h1><p className="mt-3 max-w-3xl text-slate-400">Keep universities and scholarships in one place, track their status, and preserve deadlines for the upcoming opportunity timeline.</p></div>
          <Link href="/readiness" className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-900">Application Readiness →</Link>
        </header>

        <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map(({ label, value, Icon }) => <div key={label} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5"><div className="flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-widest text-slate-500">{label}</span><Icon size={17} className="text-indigo-400" /></div><p className="mt-3 text-3xl font-bold text-white">{value}</p></div>)}
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
            <DeadlinePicker value={deadline} onChange={setDeadline} />
            <select className={inputClass} value={priority} onChange={(e) => setPriority(e.target.value as ApplicationPriority)}>{APPLICATION_PRIORITIES.map((item) => <option key={item.value} value={item.value}>{item.label} priority</option>)}</select>
            <input className={`${inputClass} lg:col-span-3`} placeholder="Official application URL (optional)" value={applicationUrl} onChange={(e) => setApplicationUrl(e.target.value)} />
            <button type="submit" className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-500"><Plus size={17} /> Add target</button>
          </form>
        </section>

        <section className="space-y-4">
          {applications.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-10 text-center"><GraduationCap className="mx-auto text-slate-600" size={32} /><h2 className="mt-4 font-bold text-white">No applications tracked yet</h2><p className="mt-2 text-sm text-slate-500">Add your first university or scholarship target above.</p></div> : applications.map((application) => {
            const days = daysUntil(application.deadline);
            const major = majors.find((item) => item.id === application.majorId);
            return <article key={application.id} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-slate-800 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">{application.type}</span><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${statusTone(application.status)}`}>{APPLICATION_STATUSES.find((item) => item.value === application.status)?.label}</span><span className="text-xs text-slate-600">{application.priority} priority</span></div><h2 className="mt-3 text-xl font-bold text-white">{application.name}</h2><p className="mt-1 text-sm text-slate-400">{application.organization} · {application.country}{major ? ` · ${major.name}` : ''}</p>{application.program && <p className="mt-1 text-sm text-slate-500">{application.program}</p>}</div>
                <div className="flex shrink-0 flex-wrap gap-2"><select className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-300" value={application.status} onChange={(e) => updateApplication(application.id, { status: e.target.value as ApplicationStatus })}>{APPLICATION_STATUSES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>{application.applicationUrl && <a href={application.applicationUrl} target="_blank" rel="noreferrer" className="rounded-xl border border-slate-800 p-2 text-slate-400 hover:text-white"><ExternalLink size={16} /></a>}<button type="button" onClick={() => removeApplication(application.id)} className="rounded-xl border border-slate-800 p-2 text-slate-500 hover:border-rose-500/30 hover:text-rose-300" aria-label={`Delete ${application.name}`}><Trash2 size={16} /></button></div>
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-slate-800 pt-4 text-sm"><div className="flex min-w-[260px] items-center gap-2 text-slate-400"><CalendarDays size={15} className="shrink-0 text-indigo-400" /><div className="min-w-0 flex-1"><DeadlinePicker value={application.deadline} onChange={(value) => updateApplication(application.id, { deadline: value })} /></div></div>{days !== null && <span className={days < 0 ? 'font-semibold text-rose-300' : days <= 30 ? 'font-semibold text-amber-300' : 'text-slate-500'}>{days < 0 ? `${Math.abs(days)} days overdue` : days === 0 ? 'Due today' : `${days} days left`}</span>}<span className="text-xs text-slate-600">Eligibility: {application.eligibility}</span></div>
            </article>;
          })}
        </section>
      </div>
    </main>
  );
}
