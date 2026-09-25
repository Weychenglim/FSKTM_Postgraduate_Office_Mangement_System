export type AcademicSemesterTerm = 'SEMESTER_I' | 'SEMESTER_II' | 'SPECIAL';
export type AcademicSemesterLifecycle = 'DRAFT' | 'ACTIVE' | 'CLOSED' | 'ARCHIVED';
export type AcademicSemesterEffectiveStatus =
  | AcademicSemesterLifecycle
  | 'EXPIRED';

export interface AcademicSemester {
  id: number;
  code: string;
  academicSession: string;
  term: AcademicSemesterTerm;
  label: string;
  startsOn: string;
  endsOn: string;
  lifecycleStatus: AcademicSemesterLifecycle;
  effectiveStatus: AcademicSemesterEffectiveStatus;
  isActive: boolean;
  activatedAt: string | null;
  closedAt: string | null;
  archivedAt: string | null;
  timelineCount?: number;
  marksPeriodCount?: number;
  marksTaskCount?: number;
}

export interface AcademicSemesterAudit {
  id: number;
  action: string;
  reason: string;
  actor: string;
  beforeValues: Record<string, unknown>;
  afterValues: Record<string, unknown>;
  createdAt: string;
}

export interface AcademicSemesterInput {
  academicSession: string;
  term: AcademicSemesterTerm;
  startsOn: string;
  endsOn: string;
}

export interface ActiveAcademicSemesterResponse {
  available: boolean;
  semester: AcademicSemester | null;
}
