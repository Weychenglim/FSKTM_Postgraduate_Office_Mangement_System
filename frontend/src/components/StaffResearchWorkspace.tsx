import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { ResearchAmendments } from './ResearchAmendments';
import { PageHeader, PortalButton } from './PortalPrimitives';
import { RecordPage } from './RecordPage';
import { LecturerResearchWorkspace } from './LecturerResearchWorkspace';
import { SupervisorWorkspaceNavigation } from './SupervisorWorkspaceNavigation';

export function StaffResearchWorkspace(props: React.ComponentProps<typeof ResearchAmendments>) {
  const [refresh, setRefresh] = useState(0);
  const [busy, setBusy] = useState(false);
  const view = props.routeView ?? 'list';
  const title = view === 'detail' ? 'Research change request' : view === 'profile' ? 'Research profile' : view === 'new' ? 'Request research change' : 'Research changes';
  const role = props.role === 'Programme Coordinator' ? 'Programme Coordinator' : 'Office Staff/Admin';
  const content = <LecturerResearchWorkspace {...props} role={role} routeView={view} hideHeader={view !== 'list'} showRefresh={false} refreshVersion={(props.refreshVersion ?? 0) + refresh} onBusyChange={setBusy} />;
  return view === 'list' ? <div className="space-y-6"><PageHeader title="Supervisor Appointments" subtitle="Review research changes and follow their recorded progress and outcomes." actions={<PortalButton size="sm" icon={RefreshCw} disabled={busy} onClick={() => setRefresh(value => value + 1)}>Refresh</PortalButton>} /><SupervisorWorkspaceNavigation role={role} />{content}</div>
    : <RecordPage title={title} backLabel="Back to Research changes" onBack={props.onNavigateToList ?? (() => {})}>{content}</RecordPage>;
}
