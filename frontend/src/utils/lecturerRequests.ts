import type { SupervisorRequest, SupervisorRequestHistoryRow } from '../types';
import type { CoSupervisorNomination, SupervisoryWorkspace } from '../types/coSupervision';
import { appointmentRequestStatusLabel } from './appointmentRequestStatus';

export type RequestGroup = 'review' | 'coordinator' | 'other' | 'history';
export function requestCalendarDay(value: string): string {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp + 8 * 60 * 60 * 1000).toISOString().slice(0, 10) : '';
}
export function requestWaitingDays(since: string, now = new Date().toISOString()): number | null {
  const start = requestCalendarDay(since), end = requestCalendarDay(now);
  return start && end ? Math.max(0, Math.round((Date.parse(end) - Date.parse(start)) / 86400000)) : null;
}
export function requestGroup(status: string, canDecide: boolean): RequestGroup {
  if (status === 'APPROVED' || status.startsWith('REJECTED') || status.startsWith('CANCELLED')) return 'history';
  if (canDecide) return 'review';
  if (status.includes('COORDINATOR')) return 'coordinator';
  return 'other';
}

// Review capability changes actions, not the label of the same recorded status.
export function requestStatusLabel(status: string, _canDecide = false): string {
  return appointmentRequestStatusLabel(status);
}

export interface LecturerAppointmentRow {
  key: string; kind: 'primary' | 'supporting'; id: number | string; studentName: string; matricNo: string;
  status: string; submittedAt: string; programme: string; semester: string; title: string; canDecide: boolean;
  waitingDays?: number | null; nomination?: CoSupervisorNomination;
}

export function appointmentRequestRows(primary: SupervisorRequest[], history: SupervisorRequestHistoryRow[], workspace: SupervisoryWorkspace): LecturerAppointmentRow[] {
  const rows: LecturerAppointmentRow[] = primary.map(row => ({
    key: `primary-${row.applicationId}`, kind: 'primary', id: row.applicationId!, studentName: row.studentName,
    matricNo: row.studentId, status: 'SUBMITTED_TO_SUPERVISOR', submittedAt: row.receivedTime,
    programme: row.programme, semester: row.semester ?? '', title: row.proposedTopic,
    canDecide: row.participantEligible !== false, waitingDays: row.waitingDays,
  }));
  for (const row of history) rows.push({
    key: `primary-${row.applicationId}`, kind: 'primary', id: row.applicationId!, studentName: row.studentName,
    matricNo: row.studentId, status: row.status ?? '', submittedAt: row.submittedAt ?? row.submittedDate,
    programme: row.programme, semester: row.semester, title: row.researchTitle, canDecide: false, waitingDays: row.waitingDays,
  });
  const nominations = new Map([...workspace.nominations, ...workspace.teams.flatMap(team => team.nominations)].map(row => [row.id, row]));
  for (const row of nominations.values()) rows.push({
    key: `supporting-${row.id}`, kind: 'supporting', id: row.id, studentName: row.studentName, matricNo: row.matricNo,
    status: row.status, submittedAt: row.submittedAt, programme: row.programme ?? '', semester: row.semester ?? '', title: row.justification,
    canDecide: row.allowedActions.some(action => action !== 'cancel'), waitingDays: row.waitingDays, nomination: row,
  });
  return [...new Map(rows.map(row => [row.key, row])).values()].sort((a, b) => Date.parse(a.submittedAt) - Date.parse(b.submittedAt));
}
