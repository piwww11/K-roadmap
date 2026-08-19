export type ApplicationType = 'university' | 'scholarship';
export type ApplicationStatus =
  | 'researching'
  | 'eligible'
  | 'preparing'
  | 'submitted'
  | 'interview'
  | 'accepted'
  | 'rejected'
  | 'withdrawn';
export type ApplicationPriority = 'high' | 'medium' | 'low';

export interface ApplicationTarget {
  id: string;
  type: ApplicationType;
  name: string;
  organization: string;
  country: string;
  program?: string;
  majorId?: string;
  status: ApplicationStatus;
  priority: ApplicationPriority;
  deadline?: string;
  eligibility?: 'unknown' | 'checking' | 'eligible' | 'not-eligible';
  applicationUrl?: string;
  requiredDocumentIds: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
