import type { ParticipantLifecycleStatus, StudentAcademicStatus, StudentRecord } from '../types';
import { allowedParticipantTransitions, lifecycleLabel } from './participantLifecycle';

export const studentStatusOptions = (
  current: StudentAcademicStatus,
): StudentAcademicStatus[] =>
  allowedParticipantTransitions(
    'STUDENT',
    current.toUpperCase() as ParticipantLifecycleStatus,
  ).map((status) => lifecycleLabel(status) as StudentAcademicStatus);

const blockerLabel = (key: string): string => {
  const words = key.replace(/([A-Z])/g, ' $1').trim().toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

export const describeBlockers = (blockers: Record<string, number | undefined>): string[] =>
  Object.entries(blockers)
    .filter(([, count]) => (count ?? 0) > 0)
    .map(([key, count]) => `${blockerLabel(key)}: ${count}`);

export interface RegistrySummary {
  total: number;
  active: number;
  deferred: number;
  exited: number;
  awaitingActivation: number;
}

export const summariseRegistry = (students: StudentRecord[]): RegistrySummary => ({
  total: students.length,
  active: students.filter((s) => s.academicStatus === 'Active').length,
  deferred: students.filter((s) => s.academicStatus === 'Deferred').length,
  exited: students.filter((s) => s.academicStatus === 'Graduated' || s.academicStatus === 'Withdrawn').length,
  awaitingActivation: students.filter((s) => s.activated === false).length,
});

export const distinctValues = (values: string[]): string[] =>
  [...new Set(values.map((v) => v.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
