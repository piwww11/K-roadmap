import type {
  Phase,
  Month,
  Goal,
  Task,
  Major,
  Skill,
  DocumentItem,
  BudgetItem,
  Achievement,
  Budget,
} from '../types';

// ============ MAJORS ============
export const INITIAL_MAJORS: Major[] = [
  {
    id: 'm1',
    name: 'Physics',
    university: 'KAIST',
    interestScore: 8,
    confidenceScore: 4,
    themeColor: 'text-indigo-400',
    icon: '⚛️',
    description: 'Fundamental science, vectors, mechanics, waves',
  },
  {
    id: 'm2',
    name: 'Brain & Cognitive Sciences',
    university: 'KAIST',
    interestScore: 7,
    confidenceScore: 6,
    themeColor: 'text-cyan-400',
    icon: '🧠',
    description: 'Neuroscience, cognition, intelligence, computational neuroscience',
  },
  {
    id: 'm3',
    name: 'Life Science & Biotechnology',
    university: 'Korea University',
    interestScore: 5,
    confidenceScore: 7,
    themeColor: 'text-emerald-400',
    icon: '🧬',
    description: 'Biology, genetics, biotechnology, bioinformatics',
  },
];

// ============ SKILLS ============
export const INITIAL_SKILLS: Skill[] = [
  // Physics track
  { id: 'skill-algebra', title: 'Algebra', track: 'physics', category: 'Mathematics', status: 'not-started' },
  { id: 'skill-functions', title: 'Functions', track: 'physics', category: 'Mathematics', status: 'locked' },
  { id: 'skill-trigonometry', title: 'Trigonometry', track: 'physics', category: 'Mathematics', status: 'locked' },
  { id: 'skill-calculus', title: 'Calculus', track: 'physics', category: 'Mathematics', status: 'locked' },
  { id: 'skill-linear-algebra', title: 'Linear Algebra', track: 'physics', category: 'Mathematics', status: 'locked' },
  { id: 'skill-vectors', title: 'Vectors', track: 'physics', category: 'Physics', status: 'locked' },
  { id: 'skill-mechanics', title: 'Mechanics', track: 'physics', category: 'Physics', status: 'locked' },
  { id: 'skill-waves', title: 'Waves', track: 'physics', category: 'Physics', status: 'locked' },
  { id: 'skill-python', title: 'Python Basics', track: 'physics', category: 'Programming', status: 'not-started' },
  { id: 'skill-numpy', title: 'NumPy', track: 'physics', category: 'Programming', status: 'locked' },
  { id: 'skill-matplotlib', title: 'Matplotlib', track: 'physics', category: 'Programming', status: 'locked' },
  
  // BCS track
  { id: 'skill-cell-biology-bcs', title: 'Cell Biology', track: 'bcs', category: 'Biology', status: 'not-started' },
  { id: 'skill-neurons', title: 'Neurons', track: 'bcs', category: 'Biology', status: 'locked' },
  { id: 'skill-brain-anatomy', title: 'Brain Anatomy', track: 'bcs', category: 'Biology', status: 'locked' },
  { id: 'skill-genetics-bcs', title: 'Genetics', track: 'bcs', category: 'Biology', status: 'locked' },
  { id: 'skill-python-bcs', title: 'Python', track: 'bcs', category: 'Computation', status: 'not-started' },
  { id: 'skill-statistics', title: 'Statistics', track: 'bcs', category: 'Computation', status: 'locked' },
  { id: 'skill-machine-learning', title: 'Machine Learning', track: 'bcs', category: 'Computation', status: 'locked' },
  
  // Life Science track
  { id: 'skill-cell-biology-life', title: 'Cell Biology', track: 'life-science', category: 'Biology', status: 'not-started' },
  { id: 'skill-molecular-biology', title: 'Molecular Biology', track: 'life-science', category: 'Biology', status: 'locked' },
  { id: 'skill-genetics-life', title: 'Genetics', track: 'life-science', category: 'Biology', status: 'locked' },
  { id: 'skill-biochemistry', title: 'Biochemistry', track: 'life-science', category: 'Biology', status: 'locked' },
  { id: 'skill-python-life', title: 'Python', track: 'life-science', category: 'Computational', status: 'not-started' },
  { id: 'skill-bioinformatics', title: 'Bioinformatics', track: 'life-science', category: 'Computational', status: 'locked' },
];

// ============ DOCUMENTS ============
export const INITIAL_DOCUMENTS: DocumentItem[] = [
  { id: 'doc-passport', name: 'Passport', description: 'Valid passport for GKS application', status: 'Not Started', category: 'GKS' },
  { id: 'doc-birth', name: 'Birth Certificate', description: 'Birth certificate', status: 'Not Started', category: 'GKS' },
  { id: 'doc-diploma', name: 'Graduation Certificate', description: 'High school diploma', status: 'Not Started', category: 'University' },
  { id: 'doc-transcript', name: 'Academic Transcript', description: 'Official academic records', status: 'Not Started', category: 'University' },
  { id: 'doc-certificates', name: 'Certificates', description: 'Achievement/award certificates', status: 'Not Started', category: 'University' },
  { id: 'doc-recommendation', name: 'Recommendation Letters', description: 'From academic referees', status: 'Not Started', category: 'GKS' },
  { id: 'doc-personal-statement', name: 'Personal Statement', description: 'Personal statement explaining journey', status: 'Not Started', category: 'GKS' },
  { id: 'doc-study-plan', name: 'Study Plan', description: 'Academic goals and plan', status: 'Not Started', category: 'GKS' },
  { id: 'doc-language', name: 'Language Certificate', description: 'IELTS or English proficiency', status: 'Not Started', category: 'Language' },
];

// ============ BUDGET ============
export const INITIAL_BUDGET: Budget = {
  items: [
    { id: 'budget-1', name: 'Passport', amount: 0, category: 'Document' },
    { id: 'budget-2', name: 'Document Translation', amount: 0, category: 'Translation' },
    { id: 'budget-3', name: 'IELTS Test', amount: 0, category: 'Language Test' },
    { id: 'budget-4', name: 'Application Fees', amount: 0, category: 'Application' },
    { id: 'budget-5', name: 'Travel to Campus Visit', amount: 0, category: 'Transportation' },
  ],
  targetAmount: 5000000,
  currentSavings: 0,
};

// ============ ACHIEVEMENTS ============
export const INITIAL_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'ach-first-step',
    name: 'First Step',
    description: 'Complete your first roadmap task',
    icon: '🏆',
    rarity: 'common',
  },
  {
    id: 'ach-math',
    name: 'Math isn\'t that scary',
    description: '7 consecutive days of math practice',
    icon: '🧮',
    rarity: 'rare',
  },
  {
    id: 'ach-physicist',
    name: 'Physicist in Training',
    description: 'Complete first Physics project',
    icon: '⚛️',
    rarity: 'rare',
  },
  {
    id: 'ach-brain',
    name: 'Brain Explorer',
    description: 'Complete BCS exploration phase',
    icon: '🧠',
    rarity: 'rare',
  },
  {
    id: 'ach-life',
    name: 'Life Explorer',
    description: 'Complete Life Science exploration',
    icon: '🧬',
    rarity: 'rare',
  },
  {
    id: 'ach-research',
    name: 'First Research',
    description: 'Complete first independent research',
    icon: '🔬',
    rarity: 'epic',
  },
  {
    id: 'ach-korea',
    name: 'Korea Dreamer',
    description: 'Complete university research phase',
    icon: '🇰🇷',
    rarity: 'epic',
  },
  {
    id: 'ach-documents',
    name: 'Paperwork Warrior',
    description: 'Complete entire document checklist',
    icon: '📑',
    rarity: 'epic',
  },
  {
    id: 'ach-ready',
    name: 'Application Ready',
    description: 'Complete all application preparation',
    icon: '🎓',
    rarity: 'legendary',
  },
];

// ============ PHASES & ROADMAP ============

const createTask = (
  id: string,
  title: string,
  goalId: string,
  category: string,
  majorId?: string
): Task => ({
  id,
  title,
  goalId,
  status: 'Not Started',
  category,
  majorReward: majorId ? { majorId, confidenceAmount: 0.3 } : undefined,
  createdAt: new Date().toISOString(),
});

const createGoal = (
  id: string,
  title: string,
  monthId: string,
  tasks: Task[]
): Goal => ({
  id,
  title,
  monthId,
  tasks,
  status: 'Not Started',
  progress: 0,
});

const createMonth = (
  id: string,
  name: string,
  year: number,
  phaseId: string,
  goals: Goal[],
  startDate: string,
  endDate: string
): Month => ({
  id,
  name,
  year,
  phaseId,
  goals,
  startDate,
  endDate,
});

// PHASE 1: Know the Battlefield (Aug-Sep 2026)
const phase1Tasks = {
  goal1: [
    createTask('t1-1', 'Collect academic documents', 'goal-1-1', 'Documents', 'm1'),
    createTask('t1-2', 'Create academic profile', 'goal-1-1', 'Documents', 'm2'),
    createTask('t1-3', 'Record grades', 'goal-1-1', 'Documents', 'm3'),
  ],
  goal2: [
    createTask('t1-4', 'Research KAIST Physics curriculum', 'goal-1-2', 'Research', 'm1'),
    createTask('t1-5', 'Research KAIST BCS curriculum', 'goal-1-2', 'Research', 'm2'),
    createTask('t1-6', 'Research Korea University Life Science', 'goal-1-2', 'Research', 'm3'),
  ],
  goal3: [
    createTask('t1-7', 'Identify weak mathematics topics', 'goal-1-3', 'Math', 'm1'),
    createTask('t1-8', 'Start algebra review', 'goal-1-3', 'Math', 'm1'),
    createTask('t1-9', 'Start functions review', 'goal-1-3', 'Math', 'm1'),
  ],
};

const phase1Month1: Month = createMonth(
  'month-1-1',
  'August',
  2026,
  'phase-1',
  [
    createGoal('goal-1-1', 'Organize Academic Documents', 'month-1-1', phase1Tasks.goal1),
    createGoal('goal-1-2', 'Research Universities', 'month-1-1', phase1Tasks.goal2),
  ],
  '2026-08-01',
  '2026-08-31'
);

const phase1Month2: Month = createMonth(
  'month-1-2',
  'September',
  2026,
  'phase-1',
  [
    createGoal('goal-1-3', 'Identify Math Weaknesses', 'month-1-2', phase1Tasks.goal3),
  ],
  '2026-09-01',
  '2026-09-30'
);

// PHASE 2: Physics vs BCS vs Life Science Experiment (Oct-Nov 2026)
const phase2Month1: Month = createMonth(
  'month-2-1',
  'October',
  2026,
  'phase-2',
  [
    createGoal('goal-2-1', 'Physics Experiment', 'month-2-1', [
      createTask('t2-1', 'Learn basic mechanics', 'goal-2-1', 'Physics', 'm1'),
      createTask('t2-2', 'Review vectors', 'goal-2-1', 'Physics', 'm1'),
      createTask('t2-3', 'Learn required Python concepts', 'goal-2-1', 'Physics', 'm1'),
      createTask('t2-4', 'Build simple orbit simulation', 'goal-2-1', 'Physics', 'm1'),
    ]),
    createGoal('goal-2-2', 'BCS Experiment', 'month-2-1', [
      createTask('t2-5', 'Learn neuron basics', 'goal-2-2', 'BCS', 'm2'),
      createTask('t2-6', 'Study neuroscience fundamentals', 'goal-2-2', 'BCS', 'm2'),
      createTask('t2-7', 'Learn basic neural networks', 'goal-2-2', 'BCS', 'm2'),
    ]),
    createGoal('goal-2-3', 'Life Science Experiment', 'month-2-1', [
      createTask('t2-8', 'Learn DNA basics', 'goal-2-3', 'Life Science', 'm3'),
      createTask('t2-9', 'Learn genetics fundamentals', 'goal-2-3', 'Life Science', 'm3'),
      createTask('t2-10', 'Explore bioinformatics', 'goal-2-3', 'Life Science', 'm3'),
    ]),
  ],
  '2026-10-01',
  '2026-10-31'
);

const phase2Month2: Month = createMonth(
  'month-2-2',
  'November',
  2026,
  'phase-2',
  [
    createGoal('goal-2-4', 'Reflections & Interest Ratings', 'month-2-2', [
      createTask('t2-11', 'Write Physics reflection', 'goal-2-4', 'Reflection', 'm1'),
      createTask('t2-12', 'Rate Physics interest 1-10', 'goal-2-4', 'Reflection', 'm1'),
      createTask('t2-13', 'Write BCS reflection', 'goal-2-4', 'Reflection', 'm2'),
      createTask('t2-14', 'Rate BCS interest 1-10', 'goal-2-4', 'Reflection', 'm2'),
      createTask('t2-15', 'Write Life Science reflection', 'goal-2-4', 'Reflection', 'm3'),
      createTask('t2-16', 'Rate Life Science interest 1-10', 'goal-2-4', 'Reflection', 'm3'),
    ]),
  ],
  '2026-11-01',
  '2026-11-30'
);

// PHASE 3: Build Major Foundations (Dec 2026 - Jan 2027)
const phase3Month1: Month = createMonth(
  'month-3-1',
  'December',
  2026,
  'phase-3',
  [
    createGoal('goal-3-1', 'Physics Foundations', 'month-3-1', [
      createTask('t3-1', 'Master Algebra', 'goal-3-1', 'Mathematics', 'm1'),
      createTask('t3-2', 'Master Functions', 'goal-3-1', 'Mathematics', 'm1'),
      createTask('t3-3', 'Learn Trigonometry', 'goal-3-1', 'Mathematics', 'm1'),
    ]),
    createGoal('goal-3-2', 'BCS Foundations', 'month-3-1', [
      createTask('t3-4', 'Master Cell Biology', 'goal-3-2', 'Biology', 'm2'),
      createTask('t3-5', 'Learn Statistics', 'goal-3-2', 'Statistics', 'm2'),
      createTask('t3-6', 'Learn Python for data', 'goal-3-2', 'Programming', 'm2'),
    ]),
    createGoal('goal-3-3', 'Life Science Foundations', 'month-3-1', [
      createTask('t3-7', 'Master Molecular Biology', 'goal-3-3', 'Biology', 'm3'),
      createTask('t3-8', 'Learn Genetics', 'goal-3-3', 'Biology', 'm3'),
      createTask('t3-9', 'Learn Bioinformatics tools', 'goal-3-3', 'Programming', 'm3'),
    ]),
  ],
  '2026-12-01',
  '2026-12-31'
);

const phase3Month2: Month = createMonth(
  'month-3-2',
  'January',
  2027,
  'phase-3',
  [
    createGoal('goal-3-4', 'Advanced Skill Development', 'month-3-2', [
      createTask('t3-10', 'Continue advanced studies', 'goal-3-4', 'Study', 'm1'),
    ]),
  ],
  '2027-01-01',
  '2027-01-31'
);

// PHASE 4: University Deep Dive (Feb-Mar 2027)
const phase4Month1: Month = createMonth(
  'month-4-1',
  'February',
  2027,
  'phase-4',
  [
    createGoal('goal-4-1', 'Deep Dive Research', 'month-4-1', [
      createTask('t4-1', 'Research KAIST Physics labs', 'goal-4-1', 'Research', 'm1'),
      createTask('t4-2', 'Research KAIST BCS programs', 'goal-4-1', 'Research', 'm2'),
      createTask('t4-3', 'Research Korea University programs', 'goal-4-1', 'Research', 'm3'),
    ]),
  ],
  '2027-02-01',
  '2027-02-28'
);

const phase4Month2: Month = createMonth(
  'month-4-2',
  'March',
  2027,
  'phase-4',
  [
    createGoal('goal-4-2', 'Curriculum Analysis', 'month-4-2', [
      createTask('t4-4', 'Analyze Physics curriculum', 'goal-4-2', 'Analysis', 'm1'),
      createTask('t4-5', 'Analyze BCS curriculum', 'goal-4-2', 'Analysis', 'm2'),
      createTask('t4-6', 'Analyze Life Science curriculum', 'goal-4-2', 'Analysis', 'm3'),
    ]),
  ],
  '2027-03-01',
  '2027-03-31'
);

// PHASE 5: Major Decision #1 (Apr 2027)
const phase5Month1: Month = createMonth(
  'month-5-1',
  'April',
  2027,
  'phase-5',
  [
    createGoal('goal-5-1', 'Decision Evaluation', 'month-5-1', [
      createTask('t5-1', 'Reflect on curiosity', 'goal-5-1', 'Reflection', undefined),
      createTask('t5-2', 'Evaluate struggle willingness', 'goal-5-1', 'Reflection', undefined),
      createTask('t5-3', 'Compare learning experiences', 'goal-5-1', 'Reflection', undefined),
      createTask('t5-4', 'Assess math confidence', 'goal-5-1', 'Reflection', 'm1'),
      createTask('t5-5', 'Rate experiment enjoyment', 'goal-5-1', 'Reflection', undefined),
    ]),
  ],
  '2027-04-01',
  '2027-04-30'
);

// PHASE 6: Commit to Major (Apr-May 2027)
const phase6Month1: Month = createMonth(
  'month-6-1',
  'April-May',
  2027,
  'phase-6',
  [
    createGoal('goal-6-1', 'Commit to Major', 'month-6-1', [
      createTask('t6-1', 'Finalize major ranking', 'goal-6-1', 'Decision', undefined),
      createTask('t6-2', 'Activate primary major track', 'goal-6-1', 'Planning', undefined),
    ]),
  ],
  '2027-04-15',
  '2027-05-31'
);

// PHASE 7: Language & GKS Prep (May 2027)
const phase7Month1: Month = createMonth(
  'month-7-1',
  'May',
  2027,
  'phase-7',
  [
    createGoal('goal-7-1', 'Language Preparation', 'month-7-1', [
      createTask('t7-1', 'Research GKS requirements', 'goal-7-1', 'GKS', undefined),
      createTask('t7-2', 'Determine language requirements', 'goal-7-1', 'GKS', undefined),
      createTask('t7-3', 'Create IELTS study plan', 'goal-7-1', 'Language', undefined),
      createTask('t7-4', 'Create test timeline', 'goal-7-1', 'Language', undefined),
    ]),
  ],
  '2027-05-01',
  '2027-05-31'
);

// PHASE 8: Build My Story (Jun 2027)
const phase8Month1: Month = createMonth(
  'month-8-1',
  'June',
  2027,
  'phase-8',
  [
    createGoal('goal-8-1', 'Personal Story Development', 'month-8-1', [
      createTask('t8-1', 'Write why Korea', 'goal-8-1', 'Writing', undefined),
      createTask('t8-2', 'Write why major', 'goal-8-1', 'Writing', undefined),
      createTask('t8-3', 'Write why university', 'goal-8-1', 'Writing', undefined),
      createTask('t8-4', 'Document journey evolution', 'goal-8-1', 'Writing', undefined),
      createTask('t8-5', 'Draft personal statement', 'goal-8-1', 'Writing', undefined),
    ]),
  ],
  '2027-06-01',
  '2027-06-30'
);

// PHASE 9: Application Assembly (Jul 2027)
const phase9Month1: Month = createMonth(
  'month-9-1',
  'July',
  2027,
  'phase-9',
  [
    createGoal('goal-9-1', 'Document Preparation', 'month-9-1', [
      createTask('t9-1', 'Prepare all documents', 'goal-9-1', 'Documents', undefined),
      createTask('t9-2', 'Get document translations', 'goal-9-1', 'Documents', undefined),
      createTask('t9-3', 'Verify document authenticity', 'goal-9-1', 'Documents', undefined),
    ]),
    createGoal('goal-9-2', 'Application Review', 'month-9-1', [
      createTask('t9-4', 'Final documents check', 'goal-9-2', 'GKS', undefined),
      createTask('t9-5', 'Proofread essays', 'goal-9-2', 'GKS', undefined),
    ]),
  ],
  '2027-07-01',
  '2027-07-31'
);

// PHASE 10: GKS Application (Aug 2027)
const phase10Month1: Month = createMonth(
  'month-10-1',
  'August',
  2027,
  'phase-10',
  [
    createGoal('goal-10-1', 'Final Application', 'month-10-1', [
      createTask('t10-1', 'Check latest guidelines', 'goal-10-1', 'GKS', undefined),
      createTask('t10-2', 'Verify eligibility', 'goal-10-1', 'GKS', undefined),
      createTask('t10-3', 'Format all documents', 'goal-10-1', 'GKS', undefined),
      createTask('t10-4', 'Final proofread', 'goal-10-1', 'GKS', undefined),
      createTask('t10-5', 'Submit application', 'goal-10-1', 'GKS', undefined),
    ]),
  ],
  '2027-08-01',
  '2027-08-31'
);

// ============ EXPORT INITIAL PHASES ============
export const INITIAL_PHASES: Phase[] = [
  {
    id: 'phase-1',
    number: 1,
    title: 'Know the Battlefield',
    subtitle: 'Understanding & Foundation',
    description: 'Understand GKS requirements, organize documents, and identify areas for improvement.',
    months: [phase1Month1, phase1Month2],
    startDate: '2026-08-01',
    endDate: '2026-09-30',
    status: 'Not Started',
  },
  {
    id: 'phase-2',
    number: 2,
    title: 'Physics vs BCS vs Life Science Experiment',
    subtitle: 'Exploration & Testing',
    description: 'Test genuine interest through small projects in each field.',
    months: [phase2Month1, phase2Month2],
    startDate: '2026-10-01',
    endDate: '2026-11-30',
    status: 'Not Started',
  },
  {
    id: 'phase-3',
    number: 3,
    title: 'Build Major Foundations',
    subtitle: 'Skill Development',
    description: 'Develop core skills and knowledge in chosen major direction.',
    months: [phase3Month1, phase3Month2],
    startDate: '2026-12-01',
    endDate: '2027-01-31',
    status: 'Not Started',
  },
  {
    id: 'phase-4',
    number: 4,
    title: 'University Deep Dive',
    subtitle: 'Research & Analysis',
    description: 'Research universities, programs, labs, and opportunities.',
    months: [phase4Month1, phase4Month2],
    startDate: '2027-02-01',
    endDate: '2027-03-31',
    status: 'Not Started',
  },
  {
    id: 'phase-5',
    number: 5,
    title: 'Major Decision #1',
    subtitle: 'Reflection & Evaluation',
    description: 'Evaluate experiences and make informed major decision.',
    months: [phase5Month1],
    startDate: '2027-04-01',
    endDate: '2027-04-30',
    status: 'Not Started',
  },
  {
    id: 'phase-6',
    number: 6,
    title: 'Commit to Major Direction',
    subtitle: 'Commitment Phase',
    description: 'Finalize major choice and activate primary track.',
    months: [phase6Month1],
    startDate: '2027-04-15',
    endDate: '2027-05-31',
    status: 'Not Started',
  },
  {
    id: 'phase-7',
    number: 7,
    title: 'Language & GKS Preparation',
    subtitle: 'Test & Requirements',
    description: 'Research GKS requirements and begin language preparation.',
    months: [phase7Month1],
    startDate: '2027-05-01',
    endDate: '2027-05-31',
    status: 'Not Started',
  },
  {
    id: 'phase-8',
    number: 8,
    title: 'Build My Story',
    subtitle: 'Personal Statement & Plan',
    description: 'Develop personal statement and study plan essays.',
    months: [phase8Month1],
    startDate: '2027-06-01',
    endDate: '2027-06-30',
    status: 'Not Started',
  },
  {
    id: 'phase-9',
    number: 9,
    title: 'Application Assembly',
    subtitle: 'Document Preparation',
    description: 'Compile and verify all required documents.',
    months: [phase9Month1],
    startDate: '2027-07-01',
    endDate: '2027-07-31',
    status: 'Not Started',
  },
  {
    id: 'phase-10',
    number: 10,
    title: 'GKS APPLICATION',
    subtitle: 'Final Submission',
    description: 'Final checks and submission of application.',
    months: [phase10Month1],
    startDate: '2027-08-01',
    endDate: '2027-08-31',
    status: 'Not Started',
  },
];