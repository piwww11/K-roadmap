'use client';

import { useMemo, useState } from 'react';
import {
  Plus,
  Trash2,
  Wallet,
  FileText,
  Plane,
  GraduationCap,
  MoreHorizontal,
} from 'lucide-react';

import { useJourneyStore } from '../../store/useJourneyStore';
import type { BudgetItem, BudgetCategory } from '@/types';

const categories = [
  'Application',
  'Document',
  'Travel',
  'Other',
] as const;

type PageBudgetCategory = (typeof categories)[number];

const categoryIcons = {
  Application: GraduationCap,
  Document: FileText,
  Travel: Plane,
  Other: MoreHorizontal,
};

export default function BudgetPage() {
  const budget = useJourneyStore((state) => state.budget);
  const addBudgetItem = useJourneyStore((state) => state.addBudgetItem);
  const removeBudgetItem = useJourneyStore((state) => state.removeBudgetItem);

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<PageBudgetCategory>('Application');

  const total = useMemo(
    () => budget.items.reduce((sum, item) => sum + item.amount, 0),
    [budget.items]
  );

  const categoryTotals = useMemo(
    () =>
      categories.map((category) => ({
        category,
        total: budget.items
          .filter((item) => item.category === category)
          .reduce((sum, item) => sum + item.amount, 0),
      })),
    [budget.items]
  );

  const formatRupiah = (value: number) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(value);

  const handleAdd = () => {
    const numericAmount = Number(amount.replace(/\D/g, ''));
    if (!name.trim() || numericAmount <= 0) return;

    const newItem: BudgetItem = {
      id: `budget-${Date.now()}`,
      name: name.trim(),
      amount: numericAmount,
      category: category as BudgetCategory,
    };

    addBudgetItem(newItem);
    setName('');
    setAmount('');
    setCategory('Application');
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-6 py-10">
      <div className="max-w-5xl mx-auto">
        <header className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <Wallet size={21} className="text-blue-400" />
            </div>
            <span className="text-sm font-semibold uppercase tracking-widest text-blue-400">Preparation</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Budget</h1>
          <p className="text-slate-400 max-w-2xl">Estimate and track the costs of your journey toward studying in Korea.</p>
        </header>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 mb-8 shadow-xl">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Estimated Total</p>
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-4xl font-bold text-white">{formatRupiah(total)}</h2>
              <p className="text-sm text-slate-500 mt-2">
                {budget.items.length} budget item{budget.items.length !== 1 ? 's' : ''}
              </p>
            </div>
            <Wallet size={42} className="text-blue-500/30" />
          </div>
        </section>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {categoryTotals.map(({ category, total }) => {
            const Icon = categoryIcons[category];
            return (
              <div key={category} className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-slate-950 text-slate-400 mb-4"><Icon size={17} /></div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">{category}</p>
                <p className="text-lg font-bold text-white">{formatRupiah(total)}</p>
              </div>
            );
          })}
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 mb-8">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-500/10 text-blue-400"><Plus size={18} /></div>
            <div><h2 className="font-bold text-white">Add Budget Item</h2><p className="text-xs text-slate-500">Add an estimated cost to your roadmap.</p></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_180px_180px_auto] gap-3">
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAdd()} placeholder="e.g. Passport" className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white placeholder:text-slate-600 outline-none focus:border-blue-500/50" />
            <input type="text" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} onKeyDown={(e) => e.key === 'Enter' && handleAdd()} placeholder="Amount" className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white placeholder:text-slate-600 outline-none focus:border-blue-500/50" />
            <select value={category} onChange={(e) => setCategory(e.target.value as PageBudgetCategory)} className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-300 outline-none focus:border-blue-500/50">
              {categories.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <button onClick={handleAdd} className="flex items-center justify-center gap-2 rounded-xl bg-blue-500 px-5 py-3 text-sm font-bold text-white transition-all hover:bg-blue-400 active:scale-95"><Plus size={17} />Add</button>
          </div>
        </section>

        <section>
          <div className="mb-4"><h2 className="text-lg font-bold text-white">Budget Items</h2><p className="text-sm text-slate-500">Your estimated preparation costs.</p></div>
          <div className="space-y-3">
            {budget.items.map((item) => {
              const Icon = categoryIcons[item.category as PageBudgetCategory] ?? MoreHorizontal;
              return (
                <div key={item.id} className="flex items-center gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 transition-colors hover:border-slate-700">
                  <div className="shrink-0 flex items-center justify-center w-11 h-11 rounded-xl bg-slate-950 text-blue-400"><Icon size={19} /></div>
                  <div className="flex-1 min-w-0"><h3 className="font-semibold text-slate-200 truncate">{item.name}</h3><span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">{item.category}</span></div>
                  <p className="font-bold text-white">{formatRupiah(item.amount)}</p>
                  <button onClick={() => removeBudgetItem(item.id)} className="shrink-0 flex items-center justify-center w-9 h-9 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors" aria-label={`Remove ${item.name}`}><Trash2 size={17} /></button>
                </div>
              );
            })}
            {budget.items.length === 0 && <div className="rounded-2xl border border-dashed border-slate-800 p-12 text-center"><Wallet size={32} className="mx-auto mb-3 text-slate-700" /><p className="text-slate-500">No budget items yet.</p><p className="text-xs text-slate-600 mt-1">Add your first estimated expense above.</p></div>}
          </div>
        </section>
      </div>
    </main>
  );
}
