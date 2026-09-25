import type {
  ParticipantLifecycleStatus,
  ParticipantType,
} from '../types';

const TRANSITIONS: Record<ParticipantType, Partial<Record<ParticipantLifecycleStatus, ParticipantLifecycleStatus[]>>> = {
  STUDENT: {
    ACTIVE: ['DEFERRED', 'GRADUATED', 'WITHDRAWN'],
    DEFERRED: ['ACTIVE', 'WITHDRAWN'],
  },
  LECTURER: {
    ACTIVE: ['RETIRING'],
    RETIRING: ['ACTIVE', 'RETIRED'],
  },
};

export const allowedParticipantTransitions = (
  type: ParticipantType,
  status: ParticipantLifecycleStatus,
): ParticipantLifecycleStatus[] => TRANSITIONS[type][status] ?? [];

export const lifecycleLabel = (status: string): string =>
  status.charAt(0) + status.slice(1).toLowerCase();

export const participantConflictMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'The lifecycle request could not be completed.';

export const blockerTotal = (blockers: Record<string, number>): number =>
  Object.values(blockers).reduce((total, value) => total + value, 0);
