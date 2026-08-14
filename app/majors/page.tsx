'use client';

import { useEffect, useState } from 'react';
import { useJourneyStore } from '@/store/useJourneyStore';
import type { Major } from '@/types';

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';

import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Star } from 'lucide-react';

function SortableMajorCard({
  major,
  rank,
}: {
  major: {
    id: string;
    name: string;
    university: string;
    interestScore: number;
    confidenceScore: number;
    themeColor: string;
  };
  rank: number;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: major.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex gap-4 rounded-2xl border bg-slate-900 p-6 ${
        isDragging
          ? 'border-indigo-500 shadow-2xl shadow-indigo-500/20'
          : 'border-slate-800'
      }`}
    >
      <div
        {...attributes}
        {...listeners}
        className="flex cursor-grab items-center justify-center px-1 text-slate-600 transition-colors hover:text-indigo-400 active:cursor-grabbing"
        title="Drag to reorder"
      >
        <GripVertical size={24} />
      </div>

      <div className="flex-1">
        <div className="mb-6 flex flex-col items-start justify-between gap-4 md:flex-row">
          <div>
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
                Rank #{rank}
              </span>

              <h2 className="text-2xl font-bold text-white">
                {major.name}
              </h2>
            </div>

            <p className={`${major.themeColor} mt-2 font-medium`}>
              {major.university}
            </p>
          </div>

          <div className="text-right">
            <div className="flex items-center gap-1">
              <span className="mr-2 text-xs uppercase tracking-wider text-slate-400">
                Interest
              </span>

              {[...Array(10)].map((_, i) => (
                <Star
                  key={i}
                  size={14}
                  className={
                    i < major.interestScore
                      ? 'fill-yellow-500 text-yellow-500'
                      : 'text-slate-700'
                  }
                />
              ))}
            </div>

            <p className="mt-2 text-xs text-slate-400">
              Confidence:{' '}
              <span className="font-bold text-white">
                {major.confidenceScore}/10
              </span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-xl bg-slate-950/60 p-4">
            <p className="mb-2 text-xs uppercase tracking-wider text-slate-500">
              Interest
            </p>

            <p className="text-slate-300">
              How strongly this field attracts you.
            </p>
          </div>

          <div className="rounded-xl bg-slate-950/60 p-4">
            <p className="mb-2 text-xs uppercase tracking-wider text-slate-500">
              Confidence
            </p>

            <p className="text-slate-300">
              How confident you currently feel about pursuing it.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MajorsPage() {
  const [mounted, setMounted] = useState(false);

  const majors = useJourneyStore((state) => state.majors);
  const reorderMajors = useJourneyStore(
    (state) => state.reorderMajors
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = majors.findIndex(
      (major) => major.id === active.id
    );

    const newIndex = majors.findIndex(
      (major) => major.id === over.id
    );

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    const reordered = arrayMove(
      majors,
      oldIndex,
      newIndex
    );

    reorderMajors(
      oldIndex,
      reordered.findIndex(
        (major) => major.id === active.id
      )
    );
  };

  return (
    <main className="min-h-screen bg-slate-950 p-8 text-slate-100">
      <div className="mx-auto max-w-5xl">
        <header className="mb-10">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-indigo-400">
            K-ROADMAP
          </p>

          <h1 className="text-4xl font-bold text-white">
            Major Exploration
          </h1>

          <p className="mt-2 max-w-2xl text-slate-400">
            Drag the cards to decide which field feels most
            important to you right now.
          </p>
        </header>

        {mounted ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={majors.map((major) => major.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-5">
                {majors.map((major, index) => (
                  <SortableMajorCard
                    key={major.id}
                    major={major}
                    rank={index + 1}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <div className="space-y-5">
            {majors.map((major, index) => (
              <div
                key={major.id}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-6"
              >
                <div className="flex gap-4">
                  <div className="flex items-center px-1 text-slate-700">
                    <GripVertical size={24} />
                  </div>

                  <div>
                    <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
                      Rank #{index + 1}
                    </span>

                    <h2 className="mt-3 text-2xl font-bold text-white">
                      {major.name}
                    </h2>

                    <p className={`${major.themeColor} mt-2 font-medium`}>
                      {major.university}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}