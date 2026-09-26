import type { ParticipantLifecycleStatus, StudentAcademicStatus } from '../types';
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
