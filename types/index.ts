export type TaskStatus = 'Not Started' | 'In Progress' | 'Completed';

export interface Task {
  id: string;
  title: string;
  phaseId: string;
  status: TaskStatus;
  category: 'Math' | 'Physics' | 'BCS' | 'Life Science' | 'Language' | 'GKS';
}

export interface Phase {
  id: string;
  title: string;
  timeline: string;
  description: string;
  tasks: Task[];
}

export interface Major {
  id: string;
  name: string;
  university: string;
  interestScore: number;
  confidenceScore: number;
  themeColor: string;
}

// Skill Tree
export type SkillStatus =
  'locked' |
  'not-started' |
  'learning' |
  'completed';

export interface Skill {
  id: string;
  title: string;
  track: 'physics' | 'bcs' | 'life-science';
  category: string;
  status: SkillStatus;
}
// Documents & Budget

export type DocumentStatus =
  | 'Not Started'
  | 'In Progress'
  | 'Completed';

export interface DocumentItem {
  id: string;
  name: string;
  description: string;
  status: DocumentStatus;
  category: 'GKS' | 'University' | 'Personal';
}

export interface BudgetItem {
  id: string;
  name: string;
  amount: number;
  category: 'Application' | 'Document' | 'Travel' | 'Other';
}