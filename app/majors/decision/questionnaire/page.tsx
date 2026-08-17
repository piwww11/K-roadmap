'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useJourneyStore } from '@/store/useJourneyStore';
import type { MajorDecisionResponse } from '@/types';

const QUESTIONS: Array<{ key: keyof Omit<MajorDecisionResponse, 'timestamp'>; title: string; hint: string }> = [
  { key: 'q1_most_curious', title: 'What are you most curious about?', hint: 'Write about the questions, subjects, or phenomena you naturally want to understand.' },
  { key: 'q2_willing_to_struggle', title: 'What would you still be willing to struggle through?', hint: 'Think about the difficult parts you would tolerate because the subject feels worth it.' },
  { key: 'q3_enjoy_most', title: 'What do you enjoy most?', hint: 'Describe the kind of learning, problem solving, or discovery that gives you energy.' },
  { key: 'q4_math_feeling', title: 'How do you feel about mathematical work?', hint: 'Be honest. Confidence is not the same thing as willingness to learn.' },
  { key: 'q5_most_enjoyable_experiment', title: 'Which experiment sounds most enjoyable?', hint: 'Describe the experiment, investigation, or hands-on activity you would genuinely choose.' },
  { key: 'q6_voluntary_research', title: 'What would you research voluntarily?', hint: 'Imagine nobody required you to do it. What topic would you keep investigating anyway?' },
  { key: 'q7_without_name', title: 'Which field would you choose without the university name attached?', hint: 'Ignore prestige and university names. Focus only on the field itself.' },
];

const EMPTY: Omit<MajorDecisionResponse, 'timestamp'> = {
  q1_most_curious: '',
  q2_willing_to_struggle: '',
  q3_enjoy_most: '',
  q4_math_feeling: '',
  q5_most_enjoyable_experiment: '',
  q6_voluntary_research: '',
  q7_without_name: '',
};

export default function MajorDecisionQuestionnairePage() {
  const router = useRouter();
  const addResponse = useJourneyStore((state) => state.addMajorDecisionResponse);
  const [answers, setAnswers] = useState(EMPTY);
  const [error, setError] = useState('');

  const update = (key: keyof typeof answers, value: string) => setAnswers((current) => ({ ...current, [key]: value }));

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const missing = QUESTIONS.find((question) => !answers[question.key].trim());
    if (missing) {
      setError(`Please answer question ${QUESTIONS.indexOf(missing) + 1} before analyzing.`);
      return;
    }

    addResponse({ ...answers, timestamp: new Date().toISOString() });
    router.push('/majors/decision');
  };

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-slate-100 md:p-8">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-indigo-400">K-ROADMAP / DECISION</p>
          <h1 className="text-4xl font-bold text-white">Major Decision Questionnaire</h1>
          <p className="mt-3 max-w-3xl text-slate-400">Answer honestly rather than trying to produce the “right” answer. Your responses will be combined with your roadmap exploration evidence.</p>
        </header>

        <form onSubmit={submit} className="space-y-5">
          {QUESTIONS.map((question, index) => (
            <section key={question.key} className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <div className="mb-4 flex items-start gap-3">
                <span className="rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-300">Q{index + 1}</span>
                <div>
                  <h2 className="text-lg font-semibold text-white">{question.title}</h2>
                  <p className="mt-1 text-sm text-slate-500">{question.hint}</p>
                </div>
              </div>
              <textarea
                value={answers[question.key]}
                onChange={(event) => update(question.key, event.target.value)}
                rows={4}
                placeholder="Write your honest answer..."
                className="w-full resize-y rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-indigo-500"
              />
            </section>
          ))}

          {error && <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => router.push('/majors/decision')} className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-medium text-slate-300 hover:bg-slate-900">View previous results</button>
            <button type="submit" className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-500">Analyze my decision</button>
          </div>
        </form>
      </div>
    </main>
  );
}
