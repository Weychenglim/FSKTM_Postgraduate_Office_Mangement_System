import {StaffSupervisorBrowseContext} from './StaffSupervisorBrowseContext';
import React, { useState } from 'react';
import {useSearchParams} from 'react-router';
import { ResearchAmendments } from './ResearchAmendments';
import { PageHeader, PortalButton } from './PortalPrimitives';
import { RecordPage } from './RecordPage';
import { LecturerResearchWorkspace } from './LecturerResearchWorkspace';
import { SupervisorWorkspaceNavigation } from './SupervisorWorkspaceNavigation';
import { supervisorResearchLabel } from '../utils/supervisorWorkspace';

export function StaffResearchWorkspace(props: React.ComponentProps<typeof ResearchAmendments>&{backLabel?:string}) {
  const [busy, setBusy] = useState(false);
  const [metadata, setMetadata] = useState<React.ReactNode>(null);
  const [detailTitle, setDetailTitle] = useState<string | null>(null);
  const [params] = useSearchParams();
  const view = props.routeView ?? 'list';
  const role = props.role === 'Programme Coordinator' ? 'Programme Coordinator' : 'Office Staff/Admin';
  const workspaceLabel = supervisorResearchLabel(role);
  const title = view === 'detail' ? detailTitle ?? 'Request details' : view === 'profile' ? Number(params.get('profileStudent') ?? params.get('student')) > 0 ? 'Research profile' : 'Research profiles' : view === 'new' ? 'Correct research or request transfer' : workspaceLabel;
  const content = <LecturerResearchWorkspace {...props} role={role} routeView={view} hideHeader={view !== 'list'} showRefresh={false} refreshVersion={props.refreshVersion ?? 0} onBusyChange={setBusy} onDetailMetadata={setMetadata} onDetailTitle={setDetailTitle} />;
  const actions = <>{role==='Office Staff/Admin'?<PortalButton size="sm" disabled={busy} onClick={()=>props.onNavigateToProfile?.()}>Research profiles</PortalButton>:null}</>;
  return <StaffSupervisorBrowseContext.Provider value={role}>{view === 'list' && role === 'Programme Coordinator' ? <div className="space-y-6"><PageHeader title="Supervisor Appointments" subtitle="Review programme transfers and follow their recorded progress and outcomes." actions={actions} /><SupervisorWorkspaceNavigation role={role} />{content}</div>
    : <RecordPage title={title} metadata={view==='detail'?metadata:undefined} backLabel={props.backLabel??(view==='list'?'Back to Supervisor Appointments':`Back to ${workspaceLabel}`)} onBack={props.onNavigateToList ?? (() => {})} busy={busy} actions={view==='list'?actions:undefined}>{content}</RecordPage>}</StaffSupervisorBrowseContext.Provider>;
}
