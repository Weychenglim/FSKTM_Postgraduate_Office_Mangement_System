import {clearAppointmentFilterParams} from '../utils/appointmentFilters';
import React from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router';
import { ResearchAmendments, type ResearchCreationKind } from './ResearchAmendments';
import { APP_ROUTES, routeForSupervisorResearchRequest } from '../constants/routes';
import { workspacePageSize } from './RequestWorkspacePrimitives';
import { recordReturn, recordFilterParams, type RecordReturn } from '../utils/recordNavigation';
import type { ResearchPageQuery } from '../services/researchAmendmentsApi';
import { coordinatorTransferQuery } from '../services/researchAmendmentsApi';
import { supervisorResearchLabel } from '../utils/supervisorWorkspace';
import {ResearchProfileDirectory} from './ResearchProfileDirectory';

export function researchQueueReturn(source: RecordReturn, page: number): RecordReturn {
  const params = new URLSearchParams(source.path.split('?')[1] ?? '');
  if ((Number(params.get('page')) || 1) === page) return source;
  params.set('page',String(page));
  return {path:`${APP_ROUTES.supervisorResearchChanges}?${params}`,label:source.label};
}

export function officeResearchCreationParams(current: URLSearchParams, studentId: number, kind?:ResearchCreationKind): URLSearchParams {
  const next = new URLSearchParams(current);
  next.delete('profileStudent');
  next.set('student',String(studentId));
  next.delete('changeType');
  if(kind)next.set('changeType',kind);
  return next;
}

export function researchFilterParams(current: URLSearchParams, key: string, value: string): URLSearchParams {
  if (key !== 'clear') return recordFilterParams(current,key,value);
  const next = new URLSearchParams(current);
  for (const field of ['q','programme','semester','type','status','from','to','page']) next.delete(field);
  return next;
}

export function researchViewParams(current: URLSearchParams, view: 'requests' | 'history', coordinator: boolean): URLSearchParams {
  const next = recordFilterParams(current,'view',view);
  if (coordinator) {
    for (const key of ['status','from','to']) next.delete(key);
    next.set('sort',view === 'history' ? 'newest' : 'waiting');
  }
  return next;
}

export function LecturerResearchWorkspace(props: React.ComponentProps<typeof ResearchAmendments>) {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const setFilter = (key: string, value: string, replace = true) => setParams(current => researchFilterParams(current, key, value), { replace, state: location.state });
  const selected = Number(props.routeView === 'profile' ? params.get('profileStudent') ?? params.get('student') : params.get('student'));
  const filters: ResearchPageQuery = {
    focus:props.role === 'Office Staff/Admin' ? 'all' : 'decision',
    programme:params.get('programme') ?? '', semester:params.get('semester') ?? '', type:params.get('type') ?? 'all', status:params.get('status') ?? '',
    from:params.get('from') ?? '', to:params.get('to') ?? '',
    sort:params.get('view') === 'history' && params.get('sort') === 'waiting' ? undefined : ['waiting','oldest','newest'].includes(params.get('sort') ?? '') ? params.get('sort') as ResearchPageQuery['sort'] : undefined,
  };
  const researchFilters = props.role === 'Programme Coordinator' ? coordinatorTransferQuery(filters) : filters;
  const workspaceLabel = supervisorResearchLabel(props.role);
  const source = recordReturn(location.state?.recordReturn, {path:'',label:workspaceLabel}, APP_ROUTES.supervisorAppointments);
  const sourceParams = new URLSearchParams(source.path.split('?')[1] ?? '');
  const nextRequestQuery: ResearchPageQuery | undefined = props.role === 'Programme Coordinator' && props.routeView === 'detail' && source.path.split('?')[0] === APP_ROUTES.supervisorResearchChanges ? coordinatorTransferQuery({
    view:sourceParams.get('view') === 'history' ? 'history' : 'requests',focus:'decision',
    page:Math.max(1,Number(sourceParams.get('page')) || 1),size:workspacePageSize(sourceParams.get('size')),
    q:sourceParams.get('q') ?? '',programme:sourceParams.get('programme') ?? '',semester:sourceParams.get('semester') ?? '',
    type:sourceParams.get('type') ?? 'all',status:sourceParams.get('status') ?? '',from:sourceParams.get('from') ?? '',to:sourceParams.get('to') ?? '',
    sort:['waiting','oldest','newest'].includes(sourceParams.get('sort') ?? '') ? sourceParams.get('sort') as ResearchPageQuery['sort'] : undefined,
  }) : undefined;
  const staffProfile = props.routeView === 'profile' && props.role !== 'Student';
  const openProfile = (studentId: number) => {
    const next = new URLSearchParams(params); next.set('profileStudent', String(studentId));
    navigate(`${APP_ROUTES.supervisorResearchProfile}?${next}`, {state: location.state});
  };
  if (staffProfile && !(selected > 0)) return <ResearchProfileDirectory key={props.role ?? 'Lecturer'} onOpen={openProfile} refreshVersion={props.refreshVersion} />;
  const creationType=params.get('changeType');
  return <ResearchAmendments {...props} initialChangeType={props.routeView==='new' && (creationType==='CORRECTION'||creationType==='TRANSFER'||creationType==='RESEARCH') ? creationType : undefined} role={props.role ?? 'Lecturer'} requestView={params.get('view') === 'history' ? 'history' : 'requests'}
    requestSearch={params.get('q') ?? ''} requestPage={Number(params.get('page')) || 1} requestPageSize={workspacePageSize(params.get('size'))}
    onRequestViewChange={value => setParams(current => researchViewParams(current,value,props.role === 'Programme Coordinator'||props.role === 'Office Staff/Admin'),{replace:false,state:location.state})} onRequestSearch={value => setFilter('q', value)}
    onRequestReset={()=>setParams(current=>{const next=clearAppointmentFilterParams(current);next.delete('student');return next;},{replace:true,state:location.state})}
    onRequestPage={value => setFilter('page', String(value), false)}
    onRequestPageSize={value => setFilter('size', String(value))}
    researchFilters={researchFilters} onResearchFilter={(key,value) => setFilter(key,value)}
    nextRequestQuery={nextRequestQuery}
    onNavigateToNextRequest={(id,page) => {
      const nextSource = researchQueueReturn(source,page);
      navigate(routeForSupervisorResearchRequest(id),{state:{...location.state,recordReturn:nextSource}});
    }}
    onNavigateToNew={props.role==='Office Staff/Admin'?(kind)=>{if(selected>0)navigate(`${APP_ROUTES.supervisorResearchNew}?${officeResearchCreationParams(params,selected,kind)}`,{state:location.state});}:props.onNavigateToNew}
    studentFilter={selected > 0 ? selected : undefined} onStudentFilter={value => setFilter(props.routeView === 'profile' ? 'profileStudent' : 'student', value ? String(value) : '')}
    onNavigateToProfile={studentId => { const next = new URLSearchParams(params); if (studentId ?? selected) next.set('profileStudent', String(studentId ?? selected));
      const source = recordReturn(location.state?.recordReturn, {path: APP_ROUTES.supervisorResearchChanges + location.search, label: workspaceLabel, historyIndex: window.history.state?.idx}, APP_ROUTES.supervisorAppointments);
      navigate(`${APP_ROUTES.supervisorResearchProfile}?${next}`, {state: {recordReturn: source}}); }} />;
}
