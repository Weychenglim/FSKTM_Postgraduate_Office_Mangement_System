import type { SupervisorWorkflowEvent } from './appointment';

export type StudentProgressVisibility = 'INTERNAL' | 'PUBLIC';
export type StudentProgressSection = 'SUPERVISOR' | 'PANEL' | 'MARKS' | 'TIMELINE';
export type StudentProgressTab = 'OVERVIEW' | StudentProgressSection;

export interface StudentProgressTarget {
  targetModule: string;
  recordType: string;
  recordId?: string | null;
}

export interface StudentProgressIdentity {
  studentId: string;
  studentName: string;
  programme: string;
  status: string;
  intakeSemester: string;
  research: {
    semester: string;
    title: string;
    researchArea: string;
    supervisor: string;
  } | null;
}

export interface SupervisorDossierRecord extends StudentProgressTarget {
  recordId: string;
  status: string;
  researchTitle: string;
  proposedSupervisor: string;
  submittedAt: string | null;
  supervisorDecisionAt: string | null;
  coordinatorDecisionAt: string | null;
  cancelledAt: string | null;
  rejectionReason: string | null;
  cancellationReason: string | null;
  waitingSince: string | null;
  waitingDays: number | null;
  waitingOn: string | null;
  appointment: {
    appointmentDate: string;
    status: string;
    supervisor: string;
  } | null;
  workflow?: SupervisorWorkflowEvent[];
}

export interface SupervisorDossierSection {
  currentRecordId: string | null;
  records: SupervisorDossierRecord[];
}

export interface PanelDossierRecord extends StudentProgressTarget {
  recordId?: string;
  status: string;
  supervisor?: string;
  recommendedMember?: string;
  submittedAt?: string | null;
  panelDecisionAt?: string | null;
  coordinatorDecisionAt?: string | null;
  decisionAt?: string | null;
  cancelledAt?: string | null;
  rejectionReason?: string | null;
  cancellationReason?: string | null;
  waitingSince: string | null;
  waitingDays: number | null;
  waitingOn?: string | null;
  appointment: {
    appointmentDate: string;
    status: string;
    panelMember: string;
  } | null;
  workflow?: SupervisorWorkflowEvent[];
}

export interface PanelDossierSection {
  currentRecordId?: string | null;
  records: PanelDossierRecord[];
}

export interface MarksDossierTask extends StudentProgressTarget {
  taskId?: string;
  status: string;
  period: string;
  semester: string;
  evaluator?: string;
  evaluatorRole?: string;
  dueAt: string | null;
  daysUntilDue: number | null;
  deadlineState: string;
}

export interface MarksDossierSection {
  summaryStatus: string | null;
  completionRate: number | null;
  tasks: MarksDossierTask[];
}

export interface TimelineDossierEntry extends StudentProgressTarget {
  recordId: string;
  title: string;
  detail: string;
  level: string;
  status: string;
  deadlineStart: string;
  deadlineEnd: string;
}

export interface TimelineDossierSection {
  semester: string | null;
  session: string | null;
  entries: TimelineDossierEntry[];
}

export interface StudentProgressAttentionItem extends StudentProgressTarget {
  kind: 'MARKS_DEADLINE' | 'WORKFLOW_WAIT' | 'TIMELINE_MILESTONE';
  label: string;
  waitingDays: number | null;
  waitingOn?: string | null;
  dueAt: string | null;
}

export interface StudentProgressDossier {
  generatedAt: string;
  visibility: StudentProgressVisibility;
  student: StudentProgressIdentity;
  visibleSections: StudentProgressSection[];
  overview: {
    supervisorStatus: string | null;
    panelStatus: string | null;
    marksStatus: string | null;
    activeTimelineEntries: number;
    attentionCount: number;
  };
  supervisor: SupervisorDossierSection | null;
  panel: PanelDossierSection | null;
  marks: MarksDossierSection | null;
  timeline: TimelineDossierSection | null;
  attention: StudentProgressAttentionItem[];
}
