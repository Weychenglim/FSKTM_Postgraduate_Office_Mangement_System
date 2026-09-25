import type {
  StudentProgressDossier,
  StudentProgressSection,
  StudentProgressTab,
  StudentProgressTarget,
} from '../types';
import {
  APP_ROUTES,
  routeForPanelRecommendation,
  routeForSupervisorApplication,
} from '../constants/routes';

export const formatProgressStatus = (
  status: string | null | undefined,
): string => {
  if (!status) return '—';
  return status
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

export const visibleProgressTabs = (
  sections: StudentProgressDossier['visibleSections'],
): StudentProgressTab[] => ['OVERVIEW', ...sections];

export const hasProgressSection = (
  sections: StudentProgressSection[],
  section: StudentProgressSection,
): boolean => sections.includes(section);

export const resolveStudentProgressRecordRoute = (
  target: StudentProgressTarget,
): string => {
  if (
    target.targetModule === 'SUPERVISOR_APPOINTMENTS'
    && target.recordType === 'SUPERVISOR_APPLICATION'
    && target.recordId
  ) {
    return routeForSupervisorApplication(target.recordId);
  }
  if (
    target.targetModule === 'PANEL_APPOINTMENTS'
    && target.recordType === 'PANEL_RECOMMENDATION'
    && target.recordId
  ) {
    return routeForPanelRecommendation(target.recordId);
  }
  if (target.targetModule === 'SUPERVISOR_APPOINTMENTS') {
    return APP_ROUTES.supervisorAppointments;
  }
  if (target.targetModule === 'PANEL_APPOINTMENTS') {
    return APP_ROUTES.panelAppointments;
  }
  if (target.targetModule === 'MARKS') {
    return APP_ROUTES.marks;
  }
  return APP_ROUTES.dashboard;
};
