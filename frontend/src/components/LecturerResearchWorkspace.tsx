import React from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router';
import { ResearchAmendments } from './ResearchAmendments';
import { APP_ROUTES } from '../constants/routes';
import { workspacePageSize } from './RequestWorkspacePrimitives';
import { recordReturn, recordFilterParams } from '../utils/recordNavigation';

export function LecturerResearchWorkspace(props: React.ComponentProps<typeof ResearchAmendments>) {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const setFilter = (key: string, value: string, replace = true) => setParams(current => recordFilterParams(current, key, value), { replace, state: location.state });
  const selected = Number(props.routeView === 'profile' ? params.get('profileStudent') ?? params.get('student') : params.get('student'));
  return <ResearchAmendments {...props} role={props.role ?? 'Lecturer'} requestView={params.get('view') === 'history' ? 'history' : 'requests'}
    requestSearch={params.get('q') ?? ''} requestPage={Number(params.get('page')) || 1} requestPageSize={workspacePageSize(params.get('size'))}
    onRequestViewChange={value => setFilter('view', value, false)} onRequestSearch={value => setFilter('q', value)}
    onRequestPage={value => setFilter('page', String(value), false)}
    onRequestPageSize={value => setFilter('size', String(value))}
    studentFilter={selected > 0 ? selected : undefined} onStudentFilter={value => setFilter(props.routeView === 'profile' ? 'profileStudent' : 'student', value ? String(value) : '')}
    onNavigateToProfile={studentId => { const next = new URLSearchParams(params); if (studentId ?? selected) next.set('profileStudent', String(studentId ?? selected));
      const source = recordReturn(location.state?.recordReturn, {path: APP_ROUTES.supervisorResearchChanges + location.search, label: 'Research changes', historyIndex: window.history.state?.idx}, APP_ROUTES.supervisorAppointments);
      navigate(`${APP_ROUTES.supervisorResearchProfile}?${next}`, {state: {recordReturn: source}}); }} />;
}
