import { APP_ROUTES } from '../constants/routes';
import type { StudentSupervisorApplication } from '../types';

export type SupervisorWorkspaceSection = 'overview' | 'applications' | 'requests' | 'supervisees' | 'research';

export function supervisorResearchPage(view: 'detail' | 'profile' | 'new') {
  return {
    detail: { title: 'Research change request', subtitle: 'Compare changed fields and follow the recorded submissions and decisions for this request.' },
    profile: { title: 'Research profile', subtitle: 'View the current research record and saved revisions.' },
    new: { title: 'Request research change', subtitle: 'The primary supervisor endorses research changes before the programme coordinator makes the final decision.' },
  }[view];
}

export function supervisorWorkspaceSection(role: 'Student' | 'Lecturer', pathname: string): SupervisorWorkspaceSection {
  if (pathname === APP_ROUTES.supervisorResearchChanges || pathname.startsWith(`${APP_ROUTES.supervisorResearchChanges}/`)) return 'research';
  if (role === 'Student') return pathname === APP_ROUTES.supervisorAppointments ? 'overview' : 'applications';
  return pathname === APP_ROUTES.supervisorAppointmentSupervisees || pathname.startsWith(`${APP_ROUTES.supervisorAppointmentSupervisees}/`) ? 'supervisees' : 'requests';
}

export function partitionSupervisorApplications<T extends Pick<StudentSupervisorApplication, 'workflowStatus'>>(records: T[]) {
  const isPending = (row: T) => row.workflowStatus === 'SUBMITTED_TO_SUPERVISOR' || row.workflowStatus === 'PENDING_COORDINATOR';
  return { pending: records.filter(isPending), completed: records.filter(row => !isPending(row)) };
}

export function supervisorWorkspaceLinks(role: 'Student' | 'Lecturer') {
  return role === 'Student' ? [
    { section: 'overview', label: 'My supervisors', route: APP_ROUTES.supervisorAppointments },
    { section: 'applications', label: 'Applications', route: APP_ROUTES.supervisorAppointmentApplications },
    { section: 'research', label: 'Research changes', route: APP_ROUTES.supervisorResearchChanges },
  ] : [
    { section: 'requests', label: 'Requests', route: APP_ROUTES.supervisorAppointments },
    { section: 'supervisees', label: 'My supervisees', route: APP_ROUTES.supervisorAppointmentSupervisees },
    { section: 'research', label: 'Research changes', route: APP_ROUTES.supervisorResearchChanges },
  ];
}
