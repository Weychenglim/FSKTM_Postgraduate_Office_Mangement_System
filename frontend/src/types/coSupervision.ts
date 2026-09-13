export type CoSupervisorAction = 'accept' | 'reject' | 'approve' | 'coordinator-reject' | 'cancel';
export type CoSupervisorOutcome = 'COMPLETED' | 'WITHDRAWN' | 'OTHER';
export interface TeamPerson { id: number; name: string }
export interface TeamAudit { id: number; action: string; actor: string; createdAt: string; reason?: string; previousStatus?: string; newStatus?: string }
export interface CoSupervisorNomination {
  id: number;
  studentId: number;
  matricNo: string;
  studentName: string;
  candidate: TeamPerson;
  nominator: TeamPerson;
  status: 'SUBMITTED_TO_CO_SUPERVISOR' | 'PENDING_COORDINATOR' | 'APPROVED' | 'REJECTED_BY_CO_SUPERVISOR' | 'REJECTED_BY_COORDINATOR' | 'CANCELLED';
  justification: string;
  reason: string;
  submittedAt: string;
  decidedAt?: string | null;
  waitingSince?: string | null;
  waitingDays?: number | null;
  responsibleStage?: string | null;
  replacesAppointmentId: number | null;
  allowedActions: CoSupervisorAction[];
  history: TeamAudit[];
}
export interface CoSupervisorAppointment {
  id: number;
  studentId: number;
  matricNo: string;
  studentName: string;
  supervisor: TeamPerson;
  status: 'ACTIVE' | 'ENDED';
  appointmentDate: string;
  endOutcome: string;
  endReason: string;
  endedAt: string | null;
  supersedesId: number | null;
  canEnd: boolean;
  history: TeamAudit[];
}
export interface SupervisoryTeam {
  studentId: number;
  matricNo: string;
  studentName: string;
  programme: string;
  studentStatus: string;
  primarySupervisor: TeamPerson | null;
  primaryAppointmentId: number | null;
  research: { title: string; area: string; abstract: string };
  appointments: CoSupervisorAppointment[];
  nominations: CoSupervisorNomination[];
  canNominate: boolean;
  timeline?: { id: number | string; title: string; date?: string; status?: string }[];
}
export interface CoSupervisorCandidate extends TeamPerson {
  selectable: boolean;
  reason: string;
  capacityState: string;
  activeLoad: number;
  limit: number | null;
  unavailableUntil?: string | null;
}
export interface SupervisoryWorkspace {
  teams: SupervisoryTeam[];
  nominations: CoSupervisorNomination[];
  appointments: CoSupervisorAppointment[];
}
