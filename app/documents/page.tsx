'use client';

import { useMemo, useState } from 'react';
import {
  Check,
  Circle,
  Clock,
  FileText,
  GraduationCap,
  User,
  ChevronDown,
} from 'lucide-react';

import { useJourneyStore } from '../../store/useJourneyStore';
import type { DocumentItem, DocumentStatus } from '@/types';
const statusOrder: DocumentStatus[] = [
  'Not Started',
  'In Progress',
  'Completed',
];

export default function DocumentsPage() {
  const documents = useJourneyStore(
    (state) => state.documents
  );

  const updateDocumentStatus = useJourneyStore(
    (state) => state.updateDocumentStatus
  );

  const [activeCategory, setActiveCategory] =
    useState<'All' | 'GKS' | 'University' | 'Personal'>(
      'All'
    );

  const filteredDocuments = useMemo(() => {
    if (activeCategory === 'All') {
      return documents;
    }

    return documents.filter(
      (document) =>
        document.category === activeCategory
    );
  }, [documents, activeCategory]);

  const completedCount = documents.filter(
    (document) =>
      document.status === 'Completed'
  ).length;

  const progress =
    documents.length === 0
      ? 0
      : Math.round(
          (completedCount / documents.length) * 100
        );

  const cycleStatus = (
    documentId: string,
    currentStatus: DocumentStatus
  ) => {
    const currentIndex =
      statusOrder.indexOf(currentStatus);

    const nextIndex =
      (currentIndex + 1) % statusOrder.length;

    updateDocumentStatus(
      documentId,
      statusOrder[nextIndex]
    );
  };

  const getStatusIcon = (
    status: DocumentStatus
  ) => {
    switch (status) {
      case 'Completed':
        return (
          <Check
            size={18}
            strokeWidth={3}
          />
        );

      case 'In Progress':
        return (
          <Clock size={18} />
        );

      default:
        return (
          <Circle size={18} />
        );
    }
  };

  const getStatusStyle = (
    status: DocumentStatus
  ) => {
    switch (status) {
      case 'Completed':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';

      case 'In Progress':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/30';

      default:
        return 'text-slate-400 bg-slate-900 border-slate-700';
    }
  };

  const getCategoryIcon = (
    category: string
  ) => {
    switch (category) {
      case 'GKS':
        return (
          <GraduationCap size={18} />
        );

      case 'University':
        return (
          <FileText size={18} />
        );

      default:
        return (
          <User size={18} />
        );
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-6 py-10">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <header className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <FileText
                size={21}
                className="text-blue-400"
              />
            </div>

            <span className="text-sm font-semibold uppercase tracking-widest text-blue-400">
              Preparation
            </span>
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
            Documents
          </h1>

          <p className="text-slate-400 max-w-2xl">
            Keep track of every document you need
            for your journey to Korea.
          </p>
        </header>

        {/* Progress Card */}
        <section className="mb-8 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl">

          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
                Document Progress
              </p>

              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-white">
                  {progress}%
                </span>

                <span className="text-sm text-slate-500">
                  {completedCount} of {documents.length} completed
                </span>
              </div>
            </div>

            <div className="text-sm text-slate-400">
              {documents.length - completedCount} remaining
            </div>
          </div>

          <div className="h-3 w-full rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-blue-500 transition-all duration-500"
              style={{
                width: `${progress}%`,
              }}
            />
          </div>
        </section>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-3 mb-8">
          {(
            [
              'All',
              'GKS',
              'University',
              'Personal',
            ] as const
          ).map((category) => (
            <button
              key={category}
              onClick={() =>
                setActiveCategory(category)
              }
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                activeCategory === category
                  ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                  : 'bg-slate-900/50 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Documents */}
        <section className="space-y-4">

          {filteredDocuments.map((document) => (
            <button
              key={document.id}
              onClick={() =>
                cycleStatus(
                  document.id,
                  document.status
                )
              }
              className="w-full text-left group"
            >
              <div
                className={`rounded-2xl border bg-slate-900/60 p-5 transition-all duration-300 hover:bg-slate-900 ${
                  document.status === 'Completed'
                    ? 'border-emerald-500/20'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-4">

                  {/* Document Icon */}
                  <div
                    className={`shrink-0 flex items-center justify-center w-11 h-11 rounded-xl ${
                      document.status ===
                      'Completed'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-slate-950 text-blue-400'
                    }`}
                  >
                    {getCategoryIcon(
                      document.category
                    )}
                  </div>

                  {/* Information */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">

                      <h2
                        className={`font-bold ${
                          document.status ===
                          'Completed'
                            ? 'text-white'
                            : 'text-slate-200'
                        }`}
                      >
                        {document.name}
                      </h2>

                      <span className="px-2 py-0.5 rounded-md bg-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        {document.category}
                      </span>
                    </div>

                    <p className="text-sm text-slate-500">
                      {document.description}
                    </p>
                  </div>

                  {/* Status */}
                  <div
                    className={`shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold ${getStatusStyle(
                      document.status
                    )}`}
                  >
                    {getStatusIcon(
                      document.status
                    )}

                    <span className="hidden sm:inline">
                      {document.status}
                    </span>

                    <ChevronDown
                      size={14}
                      className="opacity-50"
                    />
                  </div>
                </div>
              </div>
            </button>
          ))}

          {filteredDocuments.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-800 p-12 text-center">
              <FileText
                size={32}
                className="mx-auto mb-3 text-slate-700"
              />

              <p className="text-slate-500">
                No documents in this category.
              </p>
            </div>
          )}

        </section>

        {/* Footer Hint */}
        <div className="mt-8 text-center">
          <p className="text-xs text-slate-600">
            Click a document to cycle through its
            status.
          </p>
        </div>

      </div>
    </main>
  );
}