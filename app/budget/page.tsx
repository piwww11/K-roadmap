'use client';

import { useMemo, useState } from 'react';
import { Plus, Trash2, Wallet, FileText, Plane, GraduationCap, MoreHorizontal, PiggyBank, Target } from 'lucide-react';
import { useJourneyStore } from '../../store/useJourneyStore';
import type { BudgetItem, BudgetCategory } from '@/types';

const categories = ['Application', 'Document', 'Travel', 'Other'] as const;
type PageBudgetCategory = (typeof categories)[number];
const categoryIcons = { Application: GraduationCap, Document: FileText, Travel: Plane, Other: MoreHorizontal };

export default function BudgetPage() {
  const budget = useJourneyStore((state) => state.budget);
  const addBudgetItem = useJourneyStore((state) => state.addBudgetItem);
  const removeBudgetItem = useJourneyStore((state) => state.removeBudgetItem);
  const setBudgetTarget = useJourneyStore((state) => state.setBudgetTarget);
  const setCurrentSavings = useJourneyStore((state) => state.setCurrentSavings);

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<PageBudgetCategory>('Application');
  const [savingAmount, setSavingAmount] = useState('');
  const [targetAmount, setTargetAmount] = useState(String(budget.targetAmount));

  const total = useMemo(() => budget.items.reduce((sum, item) => sum + item.amount, 0), [budget.items]);
  const savingsProgress = budget.targetAmount > 0 ? Math.min(100, (budget.currentSavings / budget.targetAmount) * 100) : 0;
  const remaining = Math.max(0, budget.targetAmount - budget.currentSavings);
  const categoryTotals = useMemo(() => categories.map((category) => ({ category, total: budget.items.filter((item) => item.category === category).reduce((sum, item) => sum + item.amount, 0) })), [budget.items]);
  const formatRupiah = (value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);

  const handleAdd = () => {
    const numericAmount = Number(amount.replace(/\D/g, ''));
    if (!name.trim() || numericAmount <= 0) return;
    const newItem: BudgetItem = { id: `budget-${Date.now()}`, name: name.trim(), amount: numericAmount, category: category as BudgetCategory };
    addBudgetItem(newItem);
    setName(''); setAmount(''); setCategory('Application');
  };

  const handleAddSaving = () => {
    const deposit = Number(savingAmount.replace(/\D/g, ''));
    if (deposit <= 0) return;
    setCurrentSavings(budget.currentSavings + deposit);
    setSavingAmount('');
  };

  const handleTargetSave = () => {
    const target = Number(targetAmount.replace(/\D/g, ''));
    if (target >= 0) setBudgetTarget(target);
  };

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto max-w-5xl">
        <header className="mb-10">
          <div className="mb-3 flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10"><Wallet size={21} className="text-blue-400" /></div><span className="text-sm font-semibold uppercase tracking-widest text-blue-400">Preparation</span></div>
          <h1 className="mb-2 text-3xl font-bold tracking-tight text-white">Budget</h1>
          <p className="max-w-2xl text-slate-400">Estimate your Korea journey costs and track the money you actually save along the way.</p>
        </header>

        <section className="mb-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl"><p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500">Estimated Total</p><div className="flex items-end justify-between gap-4"><div><h2 className="text-4xl font-bold text-white">{formatRupiah(total)}</h2><p className="mt-2 text-sm text-slate-500">{budget.items.length} budget item{budget.items.length !== 1 ? 's' : ''}</p></div><Wallet size={42} className="text-blue-500/30" /></div></div>
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 shadow-xl"><div className="mb-3 flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-widest text-emerald-400">Real Savings</p><PiggyBank size={22} className="text-emerald-400/60" /></div><div className="flex items-end gap-2"><h2 className="text-4xl font-bold text-white">{formatRupiah(budget.currentSavings)}</h2><span className="mb-1 text-sm text-slate-500">saved</span></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-950"><div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${savingsProgress}%` }} /></div><div className="mt-2 flex justify-between text-xs text-slate-500"><span>{savingsProgress.toFixed(1)}% of target</span><span>{formatRupiah(remaining)} remaining</span></div></div>
        </section>

        <section className="mb-8 rounded-2xl border border-emerald-500/20 bg-slate-900/60 p-6">
          <div className="mb-5 flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400"><PiggyBank size={18} /></div><div><h2 className="font-bold text-white">Add Real-Life Savings</h2><p className="text-xs text-slate-500">Every time you save money in real life, record the deposit here.</p></div></div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]"><input type="text" inputMode="numeric" value={savingAmount} onChange={(e) => setSavingAmount(e.target.value.replace(/\D/g, ''))} onKeyDown={(e) => e.key === 'Enter' && handleAddSaving()} placeholder="e.g. 100000" className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white placeholder:text-slate-600 outline-none focus:border-emerald-500/50" /><button onClick={handleAddSaving} className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-bold text-slate-950 transition-all hover:bg-emerald-400 active:scale-95"><Plus size={17} />Record Saving</button></div>
          <div className="mt-4 flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950/50 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><Target size={17} className="text-slate-500" /><div><p className="text-sm font-semibold text-slate-300">Savings target</p><p className="text-xs text-slate-600">Used by readiness and this progress bar.</p></div></div><div className="flex gap-2"><input type="text" inputMode="numeric" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value.replace(/\D/g, ''))} onKeyDown={(e) => e.key === 'Enter' && handleTargetSave()} className="w-36 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-500/50" /><button onClick={handleTargetSave} className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-slate-900">Save target</button></div></div>
        </section>

        <section className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">{categoryTotals.map(({ category, total }) => { const Icon = categoryIcons[category]; return <div key={category} className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5"><div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-slate-950 text-slate-400"><Icon size={17} /></div><p className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-500">{category}</p><p className="text-lg font-bold text-white">{formatRupiah(total)}</p></div>; })}</section>

        <section className="mb-8 rounded-2xl border border-slate-800 bg-slate-900/60 p-6"><div className="mb-5 flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400"><Plus size={18} /></div><div><h2 className="font-bold text-white">Add Budget Item</h2><p className="text-xs text-slate-500">Add an estimated cost to your roadmap.</p></div></div><div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_180px_180px_auto]"><input type="text" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAdd()} placeholder="e.g. Passport" className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white placeholder:text-slate-600 outline-none focus:border-blue-500/50" /><input type="text" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} onKeyDown={(e) => e.key === 'Enter' && handleAdd()} placeholder="Amount" className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white placeholder:text-slate-600 outline-none focus:border-blue-500/50" /><select value={category} onChange={(e) => setCategory(e.target.value as PageBudgetCategory)} className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-300 outline-none focus:border-blue-500/50">{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select><button onClick={handleAdd} className="flex items-center justify-center gap-2 rounded-xl bg-blue-500 px-5 py-3 text-sm font-bold text-white transition-all hover:bg-blue-400 active:scale-95"><Plus size={17} />Add</button></div></section>

        <section><div className="mb-4"><h2 className="text-lg font-bold text-white">Budget Items</h2><p className="text-sm text-slate-500">Your estimated preparation costs.</p></div><div className="space-y-3">{budget.items.map((item) => { const Icon = categoryIcons[item.category as PageBudgetCategory] ?? MoreHorizontal; return <div key={item.id} className="flex items-center gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 transition-colors hover:border-slate-700"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-blue-400"><Icon size={19} /></div><div className="min-w-0 flex-1"><h3 className="truncate font-semibold text-slate-200">{item.name}</h3><span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{item.category}</span></div><p className="font-bold text-white">{formatRupiah(item.amount)}</p><button onClick={() => removeBudgetItem(item.id)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-red-500/10 hover:text-red-400" aria-label={`Remove ${item.name}`}><Trash2 size={17} /></button></div>; })}{budget.items.length === 0 && <div className="rounded-2xl border border-dashed border-slate-800 p-12 text-center"><Wallet size={32} className="mx-auto mb-3 text-slate-700" /><p className="text-slate-500">No budget items yet.</p><p className="mt-1 text-xs text-slate-600">Add your first estimated expense above.</p></div>}</div></section>
      </div>
    </main>
  );
}
