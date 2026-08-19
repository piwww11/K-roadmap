import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ApplicationPriority, ApplicationStatus, ApplicationTarget, ApplicationType } from '@/types/application';

interface ApplicationTrackerState {
  applications: ApplicationTarget[];
  addApplication: (input: Omit<ApplicationTarget, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateApplication: (id: string, updates: Partial<ApplicationTarget>) => void;
  removeApplication: (id: string) => void;
  getUpcoming: (limit?: number) => ApplicationTarget[];
}

const now = () => new Date().toISOString();

const initialApplications: ApplicationTarget[] = [];

export const useApplicationTrackerStore = create<ApplicationTrackerState>()(
  persist(
    (set, get) => ({
      applications: initialApplications,

      addApplication: (input) => {
        const timestamp = now();
        const application: ApplicationTarget = {
          ...input,
          id: `application-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        set((state) => ({ applications: [application, ...state.applications] }));
      },

      updateApplication: (id, updates) =>
        set((state) => ({
          applications: state.applications.map((application) =>
            application.id === id
              ? { ...application, ...updates, updatedAt: now() }
              : application
          ),
        })),

      removeApplication: (id) =>
        set((state) => ({
          applications: state.applications.filter((application) => application.id !== id),
        })),

      getUpcoming: (limit = 5) =>
        [...get().applications]
          .filter((application) => application.deadline && !['accepted', 'rejected', 'withdrawn'].includes(application.status))
          .sort((a, b) => String(a.deadline).localeCompare(String(b.deadline)))
          .slice(0, limit),
    }),
    {
      name: 'k-roadmap-application-tracker-v1',
      version: 1,
    }
  )
);

export const APPLICATION_STATUSES: { value: ApplicationStatus; label: string }[] = [
  { value: 'researching', label: 'Researching' },
  { value: 'eligible', label: 'Eligible' },
  { value: 'preparing', label: 'Preparing' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'interview', label: 'Interview' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'withdrawn', label: 'Withdrawn' },
];

export const APPLICATION_TYPES: { value: ApplicationType; label: string }[] = [
  { value: 'university', label: 'University' },
  { value: 'scholarship', label: 'Scholarship' },
];

export const APPLICATION_PRIORITIES: { value: ApplicationPriority; label: string }[] = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];
