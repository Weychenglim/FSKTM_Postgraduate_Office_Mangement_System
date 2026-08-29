import type { AcademicSemester, CapacityState } from '../types';
import { ApiError } from '../services/apiClient';

const CAPACITY_LABELS: Record<CapacityState, string> = {
  AVAILABLE: 'Available',
  FULL: 'Full',
  OVER_CAPACITY: 'Over capacity',
  TEMPORARILY_UNAVAILABLE: 'Temporarily unavailable',
  NOT_CONFIGURED: 'Not configured',
  INELIGIBLE: 'Ineligible',
};

export const capacityStateLabel = (state: CapacityState): string =>
  CAPACITY_LABELS[state];

export const capacityUtilization = (load: number, limit: number): number => {
  if (!Number.isFinite(load) || !Number.isFinite(limit) || load <= 0 || limit <= 0) {
    return 0;
  }
  return Math.min(100, Math.max(0, Math.round((load / limit) * 100)));
};

interface CapacityDraftEntryValues {
  hasSupervisorRole: boolean;
  hasPanelRole: boolean;
  supervisorLimit: number | null;
  panelLimit: number | null;
}

export const validateCapacityDraftEntry = (
  values: CapacityDraftEntryValues,
): string[] => {
  const errors: string[] = [];
  if (values.hasSupervisorRole && values.supervisorLimit === null) {
    errors.push('A Supervisor limit is required.');
  } else if (!values.hasSupervisorRole && values.supervisorLimit !== null) {
    errors.push('Remove the Supervisor limit for a Lecturer without that role.');
  }
  if (values.hasPanelRole && values.panelLimit === null) {
    errors.push('A Panel limit is required.');
  } else if (!values.hasPanelRole && values.panelLimit !== null) {
    errors.push('Remove the Panel limit for a Lecturer without that role.');
  }
  if (values.supervisorLimit !== null && values.supervisorLimit < 0) {
    errors.push('Supervisor limit cannot be negative.');
  }
  if (values.panelLimit !== null && values.panelLimit < 0) {
    errors.push('Panel limit cannot be negative.');
  }
  return errors;
};

const isIsoDate = (value: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(value);

export const validateAvailabilityWindow = (
  startsOn: string,
  endsOn: string,
  semester: Pick<AcademicSemester, 'startsOn' | 'endsOn'>,
): string | null => {
  if (!startsOn || !endsOn) return 'Start and end dates are required.';
  if (!isIsoDate(startsOn) || !isIsoDate(endsOn)) {
    return 'Start and end dates must be valid dates.';
  }
  if (endsOn < startsOn) return 'The end date must be on or after the start date.';
  if (startsOn < semester.startsOn || endsOn > semester.endsOn) {
    return 'Availability dates must stay within the selected semester.';
  }
  return null;
};

export const capacityConflictMessage = (error: unknown): string => {
  if (error instanceof ApiError && error.status === 409) {
    const suffix = 'Refresh and review the latest policy.';
    return error.message.endsWith('.')
      ? `${error.message} ${suffix}`
      : `${error.message}. ${suffix}`;
  }
  return error instanceof Error
    ? error.message
    : 'Lecturer capacity data could not be updated. Try again.';
};
