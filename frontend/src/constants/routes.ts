import { SIDEBAR_ITEMS, SidebarItemId } from './navigation';

export const APP_ROUTES = {
  root: '/',
  login: '/login',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  dashboard: '/dashboard',
  dashboardTimeline: '/dashboard/timeline',
  registry: '/registry',
  faq: '/faq',
  files: '/files',
  supervisorAppointments: '/supervisor-appointments',
  letters: '/letters',
  announcements: '/announcements',
  marks: '/marks',
  marksConfig: '/marks/config',
  marksRubrics: '/marks/rubrics',
  marksTasks: '/marks/tasks',
  marksRecords: '/marks/records',
  panelAppointments: '/panel-appointments',
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

export const routeForMarkRecord = (recordId: string): string =>
  `${APP_ROUTES.marksRecords}/${encodeURIComponent(recordId)}`;

export const routeForSupervisorApplication = (applicationId: string): string =>
  `${APP_ROUTES.supervisorAppointments}/${encodeURIComponent(applicationId)}`;

export const routeForPanelRecommendation = (recommendationId: string): string =>
  `${APP_ROUTES.panelAppointments}/recommendations/${encodeURIComponent(recommendationId)}`;

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
