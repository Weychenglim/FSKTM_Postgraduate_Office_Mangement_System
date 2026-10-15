/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// The student's "My Profile" page (UC06): counts and table rows built from
// the progress dossier, issued letters and the notification feed.

import type { GeneratedLetter, NotificationItem, StudentProgressDossier } from '../types';

export type RecordCategory = 'appointments' | 'marks' | 'letters' | 'announcements' | 'files';

export const RECORD_CATEGORIES: readonly RecordCategory[] = ['appointments', 'marks', 'letters', 'announcements', 'files'];

export interface RecordCounts {
  appointments: number;
  marks: number;
  letters: number;
  announcements: number;
}

export interface AppointmentRow {
  key: string;
  kind: 'Supervisor' | 'Panel';
  person: string;
  status: string;
  date: string | null;
}

export interface MarksRow {
  key: string;
  period: string;
  semester: string;
  role: string;
  status: string;
  dueAt: string | null;
}

/** "PENDING_SUPERVISOR" -> "Pending Supervisor". */
export function humanStatus(value: string | null | undefined): string {
  if (!value) return '-';
  return value
    .toLowerCase()
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function appointmentRows(dossier: StudentProgressDossier | null): AppointmentRow[] {
  const supervisor = (dossier?.supervisor?.records ?? []).map((record, index) => ({
    key: `supervisor-${record.recordId ?? index}`,
    kind: 'Supervisor' as const,
    person: record.appointment?.supervisor || record.proposedSupervisor || '-',
    status: humanStatus(record.appointment?.status ?? record.status),
    date: record.appointment?.appointmentDate ?? record.submittedAt ?? null,
  }));
  const panel = (dossier?.panel?.records ?? []).map((record, index) => ({
    key: `panel-${record.recordId ?? index}`,
    kind: 'Panel' as const,
    person: record.appointment?.panelMember || record.recommendedMember || '-',
    status: humanStatus(record.appointment?.status ?? record.status),
    date: record.appointment?.appointmentDate ?? record.submittedAt ?? null,
  }));
  return [...supervisor, ...panel];
}

export function marksRows(dossier: StudentProgressDossier | null): MarksRow[] {
  return (dossier?.marks?.tasks ?? []).map((task, index) => ({
    key: task.taskId ?? `task-${index}`,
    period: task.period,
    semester: task.semester,
    role: humanStatus(task.evaluatorRole),
    status: humanStatus(task.status),
    dueAt: task.dueAt,
  }));
}

/** The student's announcements, newest first as the feed sends them. */
export function announcementItems(notifications: NotificationItem[]): NotificationItem[] {
  return notifications.filter((item) => item.isAnnouncement);
}

export function recordCounts(input: {
  dossier: StudentProgressDossier | null;
  letters: GeneratedLetter[];
  notifications: NotificationItem[];
}): RecordCounts {
  return {
    appointments: appointmentRows(input.dossier).length,
    marks: marksRows(input.dossier).length,
    // Requests still waiting, or turned down, are not letters yet.
    letters: input.letters.filter((letter) => letter.status === 'Issued').length,
    announcements: announcementItems(input.notifications).length,
  };
}
