import React from 'react';
import {APP_ROUTES} from '../constants/routes';
import {RecordPageProvider} from './RecordPage';
import './officeDashboard.css';

export function isOfficeDashboardPresentation(pathname:string,role?:string) {
  if(role!=='Office Staff/Admin')return false;
  return [APP_ROUTES.dashboard,APP_ROUTES.dashboardAttention,APP_ROUTES.dashboardTimeline,APP_ROUTES.dashboardPeriods,APP_ROUTES.dashboardSemesters,APP_ROUTES.dashboardLecturerCapacity,APP_ROUTES.dashboardWorkflowReconciliation,APP_ROUTES.dashboardReports,APP_ROUTES.supervisorAppointmentWorkload,APP_ROUTES.panelAppointmentWorkload].some(path=>path===pathname)
    ||pathname.startsWith(`${APP_ROUTES.dashboardProgress}/`);
}

/** Presentation and record host only. Tools are discoverable on Dashboard home. */
export function OfficeDashboardLayout({enabled,children}:{enabled:boolean;children:React.ReactNode}) {
  return enabled?<div data-office-dashboard><RecordPageProvider>{children}</RecordPageProvider></div>:<>{children}</>;
}
