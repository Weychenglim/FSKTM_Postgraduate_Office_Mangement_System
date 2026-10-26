/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  ExistingAccount,
  StaffAccount,
  StaffAccountChange,
  StaffAccountPage,
  StaffAccountStatus,
  StaffDuty,
  StaffRole,
  StaffWorkItem,
  WaitingApprovals,
} from '../types';
import { titleCase } from './programmeLabel';

export const ROLE_LABEL: Record<StaffRole, string> = {
  'Office Staff/Admin': 'Office staff',
  Lecturer: 'Lecturer',
  'Programme Coordinator': 'Programme coordinator',
};

export const STATUS_LABEL: Record<StaffAccountStatus, string> = {
  ACTIVE: 'Active',
  NOT_ACTIVATED: 'Not activated yet',
  SIGN_IN_OFF: 'Sign-in off',
};

export const DUTY_LABEL: Record<StaffDuty, string> = {
  Supervisor: 'Supervisor',
  Panel: 'Panel member',
};

export const programmeName = (programme: string): string =>
  titleCase(programme).replace(/\((\w)/g, (_, letter: string) => `(${letter.toUpperCase()}`);

/** The second line under a name: the role, then duties, programme or department. */
export function roleLine(account: Pick<StaffAccount, 'role' | 'duties' | 'programme' | 'department'>): string {
  if (account.role === 'Lecturer') {
    return account.duties.length ? account.duties.map(duty => DUTY_LABEL[duty]).join(', ') : 'No duties yet';
  }
  if (account.role === 'Programme Coordinator') return programmeName(account.programme) || 'No programme';
  return account.department;
}

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

const WORK: Record<string, (count: number) => string> = {
  activeSupervisorAppointments: n => plural(n, 'active supervisee', 'active supervisees'),
  pendingSupervisorApplications: n => plural(n, 'supervisor request waiting', 'supervisor requests waiting'),
  activeCoSupervisorAppointments: n => plural(n, 'student they co-supervise', 'students they co-supervise'),
  pendingCoSupervisorNominations: n => plural(n, 'co-supervisor nomination waiting', 'co-supervisor nominations waiting'),
  activePanelAppointments: n => plural(n, 'active panel appointment', 'active panel appointments'),
  pendingPanelRecommendations: n => plural(n, 'panel nomination waiting', 'panel nominations waiting'),
  unfinishedMarksTasks: n => plural(n, 'marks task not submitted', 'marks tasks not submitted'),
  coordinatorDelegations: n => plural(n, 'coordinator delegation', 'coordinator delegations'),
  managedProgrammes: () => 'The programme they coordinate',
};

export const workLabel = (item: StaffWorkItem): string => (WORK[item.key] ?? (n => `${n} open item${n === 1 ? '' : 's'}`))(item.count);

const DUTY_WORK: Record<StaffDuty, string[]> = {
  Supervisor: ['activeSupervisorAppointments', 'pendingSupervisorApplications', 'activeCoSupervisorAppointments', 'pendingCoSupervisorNominations'],
  Panel: ['activePanelAppointments', 'pendingPanelRecommendations'],
};

/** The open work a duty carries, as one line for the Duties box. */
export function dutyWorkLine(duty: StaffDuty, work: StaffWorkItem[]): string {
  const items = work.filter(item => DUTY_WORK[duty].includes(item.key));
  return items.length ? items.map(workLabel).join(', ') : 'No open work';
}

export const dutyHasWork = (duty: StaffDuty, work: StaffWorkItem[]): boolean =>
  work.some(item => DUTY_WORK[duty].includes(item.key));

/** "Supervisor 3 of 5 · Panel member 1 of 4" for this semester. */
export function capacityLine(capacity: StaffAccountPage['capacity']): string {
  if (!capacity || !capacity.semester) return '';
  const parts = capacity.duties
    .filter(row => row.state !== 'LIMIT_WITHOUT_DUTY')
    .map(row => {
      const name = DUTY_LABEL[row.duty];
      if (row.state === 'NOT_CONFIGURED') return `${name}: no limit set yet`;
      if (row.state === 'INELIGIBLE') return `${name}: not available`;
      const load = `${name} ${row.load ?? 0} of ${row.limit ?? 0}`;
      return row.state === 'TEMPORARILY_UNAVAILABLE' ? `${load} (away)` : load;
    });
  return parts.join(' · ');
}

export const capacityNeedsLimit = (capacity: StaffAccountPage['capacity']): boolean =>
  Boolean(capacity?.duties.some(row => row.state === 'NOT_CONFIGURED'));

export const leftoverLimits = (capacity: StaffAccountPage['capacity']): StaffDuty[] =>
  capacity?.duties.filter(row => row.state === 'LIMIT_WITHOUT_DUTY').map(row => row.duty) ?? [];

const FIELD_LABEL: Record<string, string> = {
  name: 'Full name',
  phone: 'Phone',
  staffId: 'Staff ID',
  department: 'Department',
  title: 'Title',
  researchArea: 'Research area',
  position: 'Position',
};

const text = (value: unknown): string => (typeof value === 'string' ? value : '');
const list = (value: unknown): StaffDuty[] => (Array.isArray(value) ? (value as StaffDuty[]) : []);
const duties = (value: unknown): string => {
  const names = list(value).map(duty => DUTY_LABEL[duty] ?? duty);
  return names.length ? names.join(', ') : 'none';
};

/** One history row in words: what happened, and the detail under it. */
export function historyLine(change: StaffAccountChange): { title: string; detail: string } {
  const details = change.details ?? {};
  switch (change.action) {
    case 'CREATED': {
      const role = ROLE_LABEL[details.role as StaffRole] ?? text(details.role);
      const extra = details.programme ? programmeName(text(details.programme)) : list(details.duties).length ? duties(details.duties) : '';
      return { title: 'Account created', detail: `as ${role}${extra ? ` (${extra})` : ''}` };
    }
    case 'DETAILS_EDITED': {
      const changes = Array.isArray(details.changes) ? (details.changes as { field: string }[]) : [];
      return { title: 'Details changed', detail: changes.map(item => FIELD_LABEL[item.field] ?? item.field).join(', ') };
    }
    case 'EMAIL_CHANGED':
      return { title: 'Email changed', detail: `from ${text(details.from)} to ${text(details.to)}` };
    case 'DUTIES_CHANGED':
      return { title: 'Duties changed', detail: `now ${duties(details.to)}` };
    case 'PROGRAMME_CHANGED':
      return { title: 'Programme changed', detail: `now ${programmeName(text(details.to)) || 'no programme'}` };
    case 'SIGN_IN_OFF':
      return { title: 'Sign-in turned off', detail: text(details.reason) ? `"${text(details.reason)}"` : '' };
    case 'SIGN_IN_ON':
      return { title: 'Sign-in turned back on', detail: text(details.reason) ? `"${text(details.reason)}"` : '' };
    case 'LINK_SENT': {
      const what = details.kind === 'reset' ? 'Password reset link' : 'Activation email';
      return { title: details.sent === false ? `${what} could not be sent` : `${what} sent`, detail: '' };
    }
    case 'LINK_COPIED':
      return { title: 'Activation link copied', detail: '' };
    case 'DELETED':
      return { title: 'Account deleted', detail: '' };
    default:
      return { title: change.action, detail: '' };
  }
}

/** Words for the approvals that wait for a programme's coordinator. */
export function waitingLine(waiting: WaitingApprovals): string {
  const parts = [
    waiting.supervisorRequests && plural(waiting.supervisorRequests, 'supervisor request', 'supervisor requests'),
    waiting.coSupervisorNominations && plural(waiting.coSupervisorNominations, 'co-supervisor nomination', 'co-supervisor nominations'),
    waiting.panelNominations && plural(waiting.panelNominations, 'panel nomination', 'panel nominations'),
    waiting.amendments && plural(waiting.amendments, 'research change', 'research changes'),
  ].filter(Boolean);
  return parts.length ? parts.join(', ') : 'nothing';
}

/** Where a duplicate's holder can be opened, if the office can open it here. */
export const existingAccountPath = (existing: ExistingAccount | undefined, base: string): string | null =>
  existing?.kind === 'staff' && existing.id ? `${base}/${encodeURIComponent(existing.id)}` : null;

export function existingAccountText(existing: ExistingAccount | undefined): string {
  if (!existing || existing.kind === 'other') return 'It belongs to an account that is not managed here.';
  if (existing.kind === 'student') return `It belongs to the student ${existing.name} (${existing.id}).`;
  return `It belongs to ${existing.name}.`;
}

const HONORIFIC = /^(assoc|prof|dr|mr|ms|mrs|madam|ts|ir|sr)\.?$/i;

export const initials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(word => word && !HONORIFIC.test(word))
    .slice(0, 2)
    .map(word => word[0].toUpperCase())
    .join('') || 'ST';
