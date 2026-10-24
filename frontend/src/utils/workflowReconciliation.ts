import type {
  ReconciliationAllowedResolution,
  ReconciliationFilters,
  ReconciliationResolution,
  ReconciliationIssue,
} from '../types';
import { ApiError } from '../services/apiClient';
import {
  APP_ROUTES,
  routeForMarkRecord,
  routeForPanelRecommendation,
  routeForSupervisorApplication,
} from '../constants/routes';

export const buildReconciliationQuery = (filters: ReconciliationFilters): string => {
  const params = new URLSearchParams();
  if (filters.reviewStatus) params.set('reviewStatus', filters.reviewStatus);
  if (filters.module) params.set('module', filters.module);
  if (filters.severity) params.set('severity', filters.severity);
  if (filters.repairability) params.set('repairability', filters.repairability);
  if (filters.programme) params.set('programme', filters.programme);
  if (filters.search?.trim()) params.set('search', filters.search.trim());
  params.set('page', String(filters.page ?? 1));
  params.set('pageSize', String(filters.pageSize ?? 25));
  return `?${params.toString()}`;
};

export const resolutionPayload = (
  resolution: ReconciliationAllowedResolution,
  programme?: string,
): ReconciliationResolution => ({
  action: resolution.action,
  ...(resolution.semesterId ? { semesterId: resolution.semesterId } : {}),
  ...(resolution.requiresProgramme && programme ? { programme } : {}),
});

export const reconciliationErrorMessage = (error: unknown): string => {
  if (error instanceof ApiError && error.status === 409) {
    return error.message.includes('changed after preview')
      ? 'The issue changed after preview. Refresh and review it again.'
      : error.message;
  }
  return error instanceof Error ? error.message : 'Unable to complete reconciliation.';
};

export const reconciliationRecordRoute = (
  targetModule?: string,
  recordType?: string,
  recordId?: string,
): string | null => {
  if (!recordId) return null;
  if (targetModule === 'SUPERVISOR_APPOINTMENTS' && recordType === 'SUPERVISOR_APPLICATION') {
    return routeForSupervisorApplication(recordId);
  }
  if (targetModule === 'PANEL_APPOINTMENTS' && recordType === 'PANEL_RECOMMENDATION') {
    return routeForPanelRecommendation(recordId);
  }
  if (targetModule === 'MARKS') {
    if (recordType === 'EVALUATION_PERIOD') return APP_ROUTES.marksConfig;
    if (recordType === 'MARKS_TASK' || recordType === 'EVALUATION_TASK') return APP_ROUTES.marksTasks;
    return recordType === 'MARK_RECORD'
      ? routeForMarkRecord(recordId)
      : APP_ROUTES.marks;
  }
  if (targetModule === 'DASHBOARD' && recordType === 'TIMELINE_ENTRY') {
    return APP_ROUTES.dashboardTimeline;
  }
  if (targetModule === 'DASHBOARD' && recordType === 'SEMESTER_TIMELINE') return APP_ROUTES.dashboardTimeline;
  return null;
};

const sentenceLabel = (value: string) => {
  const label = value.toLowerCase().replaceAll('_', ' ');
  return label.charAt(0).toUpperCase() + label.slice(1);
};

export function reconciliationIdentity(issue: ReconciliationIssue) {
  const state = issue.currentState;
  const reference = `${sentenceLabel(issue.recordType)} #${issue.recordId}`;
  const name = String(state.lecturerName || issue.studentId || state.semesterLabel || state.recordedSemester || reference);
  const context = [state.staffNo, state.semesterLabel !== name ? state.semesterLabel : state.semesterCode,
    state.planVersion != null ? `Version ${state.planVersion}` : null].filter(Boolean).join(' · ');
  return {
    name,
    context: context || [issue.programme, name === reference ? null : reference].filter(Boolean).join(' · '),
  };
}

/** Keep the list scannable; the review page retains the full title and explanation. */
export function reconciliationListSummary(issue: ReconciliationIssue) {
  switch (issue.issueType) {
    case 'CAPACITY_ENTRY_ROLE_MISMATCH':
      return { title: 'Capacity roles differ', fact: '' };
    case 'SEMESTER_UNASSIGNED':
      return { title: 'Semester not linked', fact: '' };
    case 'CAPACITY_PLAN_MISSING':
      return { title: 'No capacity plan', fact: '' };
    case 'CAPACITY_LEGACY_LIMIT_DIVERGENCE': {
      const state = issue.currentState;
      const fact = [['Supervisor', 'supervisorLimit', 'legacySupervisorLimit'], ['Panel', 'panelLimit', 'legacyPanelLimit']]
        .filter(([, current, legacy]) => state[current] != null && state[current] !== state[legacy])
        .map(([role, current, legacy]) => `${role}: ${state[current]} vs ${state[legacy] ?? 'not set'} (old)`)
        .join(' · ');
      return { title: 'Capacity limits differ', fact };
    }
    default:
      return { title: issue.title, fact: '' };
  }
}

export function reconciliationRepairDetails(issue: ReconciliationIssue, resolution: ReconciliationAllowedResolution | null, programme = '') {
  const details: { label: string; value: string }[] = [];
  if (resolution?.action === 'ASSIGN_SEMESTER') details.push({ label: 'Assign to semester',
    value: [issue.suggestion.semesterLabel || `Semester #${resolution.semesterId}`, issue.suggestion.semesterCode].filter(Boolean).join(' · '),
  });
  if (resolution?.action === 'COPY_CAPACITY_PLAN') {
    details.push({ label: 'Create draft for', value: String(issue.currentState.semesterLabel || `Semester #${issue.recordId}`) });
    details.push({ label: 'Copy from', value: [issue.suggestion.sourceSemesterLabel || `Capacity plan #${issue.suggestion.sourcePlanId}`,
      issue.suggestion.sourcePlanVersion != null ? `Version ${issue.suggestion.sourcePlanVersion}` : null].filter(Boolean).join(' · '),
    });
  }
  if (resolution?.requiresProgramme && programme) details.push({ label: 'Managed programme', value: programme });
  return details;
}

/** Explanations describe existing server checks; they never decide repair eligibility. */
export function reconciliationExplanation(issue: ReconciliationIssue) {
  const state = issue.currentState;
  let why = issue.summary;
  let effect = issue.severity === 'BLOCKING'
    ? 'This inconsistency can prevent the affected workflow from completing correctly.'
    : 'This record needs review; the warning does not itself change workflow access.';
  let next = issue.repairability === 'REPAIRABLE'
    ? 'Review the proposed repair below. Applying it requires a reason and confirmation.'
    : 'Review the source record and the evidence below before deciding what to change.';
  let actionLabel = 'Open source record';
  if (issue.issueType.startsWith('CAPACITY_')) actionLabel = 'Review capacity limits';
  switch (issue.issueType) {
    case 'CAPACITY_LEGACY_LIMIT_DIVERGENCE': {
      const differences = [['Supervisor', 'supervisorLimit', 'legacySupervisorLimit'], ['Panel', 'panelLimit', 'legacyPanelLimit']]
        .filter(([, current, legacy]) => state[current] != null && state[current] !== state[legacy])
        .map(([role, current, legacy]) => `${role}: ${state[current]} in the published semester policy versus ${state[legacy] ?? 'not set'} in the old lecturer profile`);
      why = differences.length ? `${differences.join('. ')}.` : issue.summary;
      effect = 'The published semester limits remain in force. A different old profile value does not make the semester policy invalid.';
      next = 'Check whether the difference is intentional. Do not change approved semester limits just to match an older profile. This check offers no automatic repair.';
      break;
    }
    case 'SEMESTER_UNASSIGNED':
      why = 'This saved record is not linked to an academic semester. A typed semester name alone does not create that link.';
      effect = 'Semester-specific lists and reports may omit this record until it is linked.';
      next = issue.repairability === 'REPAIRABLE'
        ? 'One semester matches all available label and date evidence. Review that assignment below.'
        : 'There is no single verified semester match. Review the recorded label and dates with a system administrator before linking this record.';
      break;
    case 'CAPACITY_PLAN_MISSING':
      why = 'This semester has no saved capacity plan.';
      effect = state.lifecycleStatus === 'DRAFT'
        ? 'A complete published policy is needed before semester activation.'
        : 'Lecturer capacity cannot be resolved from a published policy for this semester.';
      next = issue.repairability === 'REPAIRABLE'
        ? 'The repair copies the single verified earlier published policy into a draft. Review the limits separately before you publish it.'
        : 'Prepare a capacity draft in Lecturer capacity, review the limits, then publish it through the normal approval flow.';
      break;
    case 'CAPACITY_MULTIPLE_PUBLISHED':
      effect = 'More than one policy claims to supply the semester limits.';
      next = 'Review the publication history with a system administrator. Do not delete versions or overwrite published history.';
      break;
    case 'CAPACITY_PLAN_INCOMPLETE':
      effect = 'The published policy does not cover all required lecturer roles or limits.';
      next = 'Review the listed readiness problems in Lecturer capacity and prepare the necessary policy revision.';
      break;
    case 'CAPACITY_ENTRY_ROLE_MISMATCH':
      effect = 'The saved limits no longer align with the lecturer’s current Supervisor or Panel roles.';
      next = 'Check the lecturer roles and the policy version. Preserve historical versions; use the capacity workflow for any revision.';
      break;
    case 'CAPACITY_AVAILABILITY_OVERLAP':
      why = 'Two uncancelled availability restrictions cover overlapping dates for the same lecturer, semester and role.';
      effect = 'The restrictions duplicate part of the same date range.';
      next = 'Review both restrictions and their reasons in Lecturer availability before correcting either source record.';
      break;
    case 'MARKS_TASKS_MISSING':
      effect = 'Some eligible evaluators have no active task in this open evaluation period.';
      break;
    case 'SUPERVISOR_HANDOFF_INCOMPLETE':
    case 'PANEL_HANDOFF_INCOMPLETE':
      effect = 'The approved request has not produced its final appointment record.';
      break;
    case 'RESEARCH_PROFILE_SUPERVISOR_MISMATCH':
      effect = 'The research profile names a different Supervisor from the sole active appointment.';
      break;
  }
  return { why, effect, next, actionLabel };
}
