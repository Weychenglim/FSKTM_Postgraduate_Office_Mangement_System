import { SIDEBAR_ITEMS, SidebarItemId } from './navigation';

export const APP_ROUTES = {
  root: '/',
  login: '/login',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  dashboard: '/dashboard',
  dashboardTimeline: '/dashboard/timeline',
  dashboardSemesters: '/dashboard/semesters',
  dashboardReports: '/dashboard/reports',
  dashboardProgress: '/dashboard/progress',
  registry: '/registry',
  faq: '/faq',
  files: '/files',
  supervisorAppointments: '/supervisor-appointments',
  supervisorAppointmentWorkload: '/supervisor-appointments/workload',
  supervisorAppointmentNew: '/supervisor-appointments/new',
  supervisorAppointmentHistory: '/supervisor-appointments/history',
  supervisorAppointmentRequirements: '/supervisor-appointments/requirements',
  supervisorAppointmentSupervisees: '/supervisor-appointments/supervisees',
  letters: '/letters',
  announcements: '/announcements',
  marks: '/marks',
  marksConfig: '/marks/config',
  marksRubrics: '/marks/rubrics',
  marksTasks: '/marks/tasks',
  marksRecords: '/marks/records',
  panelAppointments: '/panel-appointments',
  panelAppointmentRecords: '/panel-appointments/records',
  panelAppointmentWorkload: '/panel-appointments/workload',
  panelAppointmentSubmitted: '/panel-appointments/submitted',
  panelAppointmentReviewed: '/panel-appointments/reviewed',
  panelAppointmentAssignments: '/panel-appointments/assignments',
  notifications: '/notifications',
  settings: '/settings',
} as const;

const SIDEBAR_TO_ROUTE: Record<SidebarItemId, string> = {
  [SIDEBAR_ITEMS.DASHBOARD]: APP_ROUTES.dashboard,
  [SIDEBAR_ITEMS.REGISTRY]: APP_ROUTES.registry,
  [SIDEBAR_ITEMS.FAQ_CHATBOT]: APP_ROUTES.faq,
  [SIDEBAR_ITEMS.FILE_MANAGEMENT]: APP_ROUTES.files,
  [SIDEBAR_ITEMS.SUPERVISOR_APPOINTMENTS]: APP_ROUTES.supervisorAppointments,
  [SIDEBAR_ITEMS.LETTER_GENERATION]: APP_ROUTES.letters,
  [SIDEBAR_ITEMS.ANNOUNCEMENTS]: APP_ROUTES.announcements,
  [SIDEBAR_ITEMS.MARKS_ENTRY]: APP_ROUTES.marks,
  [SIDEBAR_ITEMS.PANEL_APPOINTMENTS]: APP_ROUTES.panelAppointments,
  [SIDEBAR_ITEMS.SETTINGS]: APP_ROUTES.settings,
  [SIDEBAR_ITEMS.NOTIFICATIONS]: APP_ROUTES.notifications,
};

const PATH_TO_SIDEBAR: Array<{ path: string; sidebarItem: SidebarItemId }> = [
  { path: APP_ROUTES.dashboard, sidebarItem: SIDEBAR_ITEMS.DASHBOARD },
  { path: APP_ROUTES.registry, sidebarItem: SIDEBAR_ITEMS.REGISTRY },
  { path: APP_ROUTES.faq, sidebarItem: SIDEBAR_ITEMS.FAQ_CHATBOT },
  { path: APP_ROUTES.files, sidebarItem: SIDEBAR_ITEMS.FILE_MANAGEMENT },
  { path: APP_ROUTES.supervisorAppointments, sidebarItem: SIDEBAR_ITEMS.SUPERVISOR_APPOINTMENTS },
  { path: APP_ROUTES.letters, sidebarItem: SIDEBAR_ITEMS.LETTER_GENERATION },
  { path: APP_ROUTES.announcements, sidebarItem: SIDEBAR_ITEMS.ANNOUNCEMENTS },
  { path: APP_ROUTES.marks, sidebarItem: SIDEBAR_ITEMS.MARKS_ENTRY },
  { path: APP_ROUTES.panelAppointments, sidebarItem: SIDEBAR_ITEMS.PANEL_APPOINTMENTS },
  { path: APP_ROUTES.notifications, sidebarItem: SIDEBAR_ITEMS.NOTIFICATIONS },
  { path: APP_ROUTES.settings, sidebarItem: SIDEBAR_ITEMS.SETTINGS },
];

export const routeForSidebarItem = (item: SidebarItemId | string): string =>
  SIDEBAR_TO_ROUTE[item as SidebarItemId] ?? APP_ROUTES.dashboard;

export const routeForDashboardTimeline = (): string => APP_ROUTES.dashboardTimeline;

export const routeForDashboardSemesters = (): string => APP_ROUTES.dashboardSemesters;

export const routeForDashboardReports = (): string => APP_ROUTES.dashboardReports;

export const routeForStudentProgress = (studentId?: string): string =>
  studentId
    ? `${APP_ROUTES.dashboardProgress}/${encodeURIComponent(studentId)}`
    : APP_ROUTES.dashboardProgress;

export const routeForMarkRecord = (recordId: string): string =>
  `${APP_ROUTES.marksRecords}/${encodeURIComponent(recordId)}`;

export const routeForSupervisorApplication = (applicationId: string): string =>
  `${APP_ROUTES.supervisorAppointments}/${encodeURIComponent(applicationId)}`;

export const routeForSupervisorWorkload = (): string =>
  APP_ROUTES.supervisorAppointmentWorkload;

export const routeForSupervisorNewApplication = (): string =>
  APP_ROUTES.supervisorAppointmentNew;

export const routeForSupervisorHistory = (): string =>
  APP_ROUTES.supervisorAppointmentHistory;

export const routeForSupervisorRequirements = (): string =>
  APP_ROUTES.supervisorAppointmentRequirements;

export const routeForSupervisorSupervisee = (studentId: string): string =>
  `${APP_ROUTES.supervisorAppointmentSupervisees}/${encodeURIComponent(studentId)}`;

export const routeForPanelRecommendation = (recommendationId: string): string =>
  `${APP_ROUTES.panelAppointments}/recommendations/${encodeURIComponent(recommendationId)}`;

export const routeForPanelRecommendationStart = (studentId: string): string =>
  `${APP_ROUTES.panelAppointments}?student=${encodeURIComponent(studentId)}`;

export const routeForPanelRecord = (recordId: string): string =>
  `${APP_ROUTES.panelAppointmentRecords}/${encodeURIComponent(recordId)}`;

export const routeForPanelWorkload = (): string => APP_ROUTES.panelAppointmentWorkload;

export const routeForPanelSubmittedRecommendations = (): string =>
  APP_ROUTES.panelAppointmentSubmitted;

export const routeForPanelReviewedRequests = (): string =>
  APP_ROUTES.panelAppointmentReviewed;

export const routeForPanelAssignment = (studentId: string): string =>
  `${APP_ROUTES.panelAppointmentAssignments}/${encodeURIComponent(studentId)}`;

export const sidebarItemForPath = (pathname: string): SidebarItemId => {
  const match = PATH_TO_SIDEBAR.find(({ path }) => pathname === path || pathname.startsWith(`${path}/`));
  return match?.sidebarItem ?? SIDEBAR_ITEMS.DASHBOARD;
};

export const isKnownAppPath = (pathname: string): boolean => {
  if (
    pathname === APP_ROUTES.root
    || pathname === APP_ROUTES.login
    || pathname === APP_ROUTES.forgotPassword
    || pathname === APP_ROUTES.resetPassword
  ) {
    return true;
  }

  if (pathname === APP_ROUTES.dashboard || pathname.startsWith(`${APP_ROUTES.dashboard}/`)) {
    return (
      pathname === APP_ROUTES.dashboard
      || pathname === APP_ROUTES.dashboardTimeline
      || pathname === APP_ROUTES.dashboardSemesters
      || pathname === APP_ROUTES.dashboardReports
      || pathname === APP_ROUTES.dashboardProgress
      || /^\/dashboard\/progress\/[^/]+$/.test(pathname)
    );
  }

  if (pathname === APP_ROUTES.supervisorAppointments || pathname.startsWith(`${APP_ROUTES.supervisorAppointments}/`)) {
    const supervisorSubpath = pathname.slice(`${APP_ROUTES.supervisorAppointments}/`.length);
    return (
      pathname === APP_ROUTES.supervisorAppointments
      || pathname === APP_ROUTES.supervisorAppointmentWorkload
      || pathname === APP_ROUTES.supervisorAppointmentNew
      || pathname === APP_ROUTES.supervisorAppointmentHistory
      || pathname === APP_ROUTES.supervisorAppointmentRequirements
      || /^supervisees\/[^/]+$/.test(supervisorSubpath)
      || /^[^/]+$/.test(supervisorSubpath)
    );
  }

  return PATH_TO_SIDEBAR.some(({ path }) => pathname === path || pathname.startsWith(`${path}/`));
};

interface WorkflowNotificationTarget {
  targetModule?: string;
  recordType?: string;
  recordId?: string;
}

export const routeForNotificationTarget = (target: WorkflowNotificationTarget): string => {
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

  return APP_ROUTES.notifications;
};
