import type { CoordinatorDelegationInput } from '../types/coordinatorDelegation';

export const coordinatorProgrammeNames = (workspace?: { programme: string; programmes?: string[] } | null): string[] =>
  workspace?.programmes ?? (workspace?.programme ? [workspace.programme] : []);

export const malaysiaToday = (now = new Date()): string => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Kuala_Lumpur', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(now);

export function validateDelegation(values: CoordinatorDelegationInput, today = malaysiaToday()): string | null {
  if (!values.programme || !values.coordinatorId) return 'Select a programme and an active coordinator.';
  if (!values.startsOn || !values.endsOn) return 'Both dates are required.';
  if (values.startsOn < today) return 'The start date must be today or later in Malaysia.';
  if (values.endsOn < values.startsOn) return 'The end date must be on or after the start date.';
  if (!values.justification.trim()) return 'A justification is required.';
  return null;
}
