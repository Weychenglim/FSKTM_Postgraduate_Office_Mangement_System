import React from 'react';
import type { PanelRecommendationDraft, PanelRecommendationSupervisee } from '../types';
import { panelRequestPending, panelStatusLabel } from '../utils/panelPresentation';
import { CoordinatorDataTable } from './CoordinatorBrowsePrimitives';
import { useListState } from './ListState';
import { PortalButton, StatusBadge } from './PortalPrimitives';
import { PortalSelect } from './PortalSelect';
import { WorkspacePagination, WorkspaceSectionHeader, WorkspaceFilterCard } from './RequestWorkspacePrimitives';

type Stage = '' | 'needs-nomination' | 'awaiting-panel' | 'awaiting-coordinator' | 'active' | 'pending';
const stageLabels: Record<Exclude<Stage, ''>, string> = {
  'needs-nomination': 'Nomination needed', 'awaiting-panel': 'Awaiting Panel review',
  'awaiting-coordinator': 'Awaiting Coordinator approval', active: 'Panel appointed', pending: 'Request in progress',
};

export function pendingPanelRequest(recommendations: PanelRecommendationDraft[], studentId: string) {
  return recommendations.find(request => request.studentId === studentId && panelRequestPending(request.status));
}

function studentStage(student: PanelRecommendationSupervisee, recommendations: PanelRecommendationDraft[]): Exclude<Stage, ''> {
  const request = pendingPanelRequest(recommendations, student.studentId);
  if (request) return request.status === 'PENDING_COORDINATOR' ? 'awaiting-coordinator' : 'awaiting-panel';
  if (!student.canRecommend) return 'pending';
  return student.panelAppointmentId ? 'active' : 'needs-nomination';
}

export function filterPanelSupervisees(students: PanelRecommendationSupervisee[], recommendations: PanelRecommendationDraft[], search: string, stage: Stage) {
  const query = search.trim().toLowerCase();
  return students.filter(student => (!query || [student.studentName, student.studentId, student.programme, student.currentPanelMember, student.currentPanelMemberId].join(' ').toLowerCase().includes(query))
    && (!stage || studentStage(student, recommendations) === stage))
    .sort((a, b) => a.studentName.localeCompare(b.studentName) || a.studentId.localeCompare(b.studentId));
}

export function PanelSuperviseeRoster({ students, recommendations, onOpen }: {
  students: PanelRecommendationSupervisee[]; recommendations: PanelRecommendationDraft[]; onOpen: (studentId: string) => void;
}) {
  const [search, setSearch] = useListState('PanelSuperviseeRoster', 'search', '');
  const [stage, setStage] = useListState<Stage>('PanelSuperviseeRoster', 'stage', '');
  const [page, setPage] = useListState('PanelSuperviseeRoster', 'page', 1);
  const [size, setSize] = useListState('PanelSuperviseeRoster', 'size', 10);
  const filtered = filterPanelSupervisees(students, recommendations, search, stage);
  const pageCount = Math.max(1, Math.ceil(filtered.length / size));
  const safePage = Math.min(page, pageCount);
  return <section className="appointment-workspace-card rounded-2xl border border-slate-200 bg-white">
    <WorkspaceSectionHeader title="Panels for my supervisees" description="Students you supervise. View their appointed Panel member or manage a nomination." />
    <WorkspaceFilterCard fieldsClassName="flex flex-wrap items-end gap-3" onReset={() => {setSearch('');setStage('');setPage(1);}}>
      <label className="form-label min-w-0 basis-64 flex-1">Find a supervisee<input type="search" className="form-control form-control-sm mt-1" placeholder="Student name, matric number or Panel member" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} /></label>
      <label className="form-label min-w-0 basis-56">Nomination status<PortalSelect className="form-control form-control-sm mt-1" value={stage} onChange={event => { setStage(event.target.value as Stage); setPage(1); }}><option value="">All students</option>{Object.entries(stageLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</PortalSelect></label>
    </WorkspaceFilterCard>
    {filtered.length ? <CoordinatorDataTable label="Supervisees and their Panel members" columns={['Student', 'Programme', 'Current panel member', 'Nomination status', 'Action']} rows={filtered.slice((safePage - 1) * size, safePage * size).map(student => {
      const state = studentStage(student, recommendations);
      return { key: student.studentId, cells: [
        <><p>{student.studentName}</p><p className="card-caption mt-1">{student.studentId}</p></>, student.programme || 'Not recorded',
        <><p>{student.panelAppointmentId ? student.currentPanelMember || 'Not recorded' : 'Not appointed'}</p>{student.panelAppointmentId && student.currentPanelMemberId ? <p className="card-caption mt-1">{student.currentPanelMemberId}</p> : null}</>,
        <StatusBadge tone={state === 'active' ? 'success' : 'warning'}>{stageLabels[state]}</StatusBadge>,
        <PortalButton size="sm" aria-label={`View panel for ${student.studentName}`} onClick={() => onOpen(student.studentId)}>View panel</PortalButton>,
      ] };
    })} /> : <p role="status" className="card-description py-6 text-center">{students.length ? 'No supervisees match these filters.' : 'No active primary supervisees are available for Panel nomination.'}</p>}
    <WorkspacePagination page={safePage} pageCount={pageCount} total={filtered.length} pageSize={size} noun="students" onPage={setPage} onPageSize={value => { setSize(value); setPage(1); }} />
  </section>;
}

export function PanelSuperviseeDetails({ student, pendingRequest, onRecommend, onOpenRequest }: {
  student: PanelRecommendationSupervisee; pendingRequest?: PanelRecommendationDraft;
  onRecommend: () => void; onOpenRequest: (request: PanelRecommendationDraft) => void;
}) {
  const appointed = Boolean(student.panelAppointmentId);
  return <section className="appointment-workspace-card rounded-2xl border border-slate-200 bg-white" aria-label="Student Panel details">
    <WorkspaceSectionHeader title={student.studentName} description={student.studentId} />
    <dl className="grid gap-4 sm:grid-cols-2"><div><dt className="card-label">Programme</dt><dd className="card-description mt-1">{student.programme || 'Not recorded'}</dd></div><div><dt className="card-label">Intake semester</dt><dd className="card-description mt-1">{student.semester || 'Not recorded'}</dd></div><div className="sm:col-span-2"><dt className="card-label">Current research title</dt><dd className="card-value mt-1 break-words">{student.proposedTopic || 'Not recorded'}</dd></div></dl>
    <div className="space-y-3 border-t border-slate-200 pt-5">
      <h3 className="section-label">Current appointed panel member</h3>
      <p className="card-value">{appointed ? student.currentPanelMember || 'Not recorded' : 'Not appointed'}</p>
      {appointed && student.currentPanelMemberId ? <p className="card-description">{student.currentPanelMemberId}</p> : null}
      {student.canRecommend && !pendingRequest ? <PortalButton size="sm" variant="primary" onClick={onRecommend}>{appointed ? 'Request replacement' : 'Nominate panel member'}</PortalButton> : null}
      {!pendingRequest && !student.canRecommend ? <p role="status" className="card-description">A request is in progress. Another nomination cannot be submitted.</p> : null}
    </div>
    {pendingRequest ? <div className="space-y-3 border-t border-slate-200 pt-5">
      <h3 className="section-label">{appointed ? 'Proposed replacement' : 'Proposed panel member'}</h3>
      <p className="card-value">{pendingRequest.recommendedMember}</p>
      <StatusBadge tone="info">{panelStatusLabel(pendingRequest.status)}</StatusBadge>
      {appointed ? <p className="card-description">{student.currentPanelMember || 'The current Panel member'} remains appointed until final approval of the replacement.</p> : null}
      <div><PortalButton size="sm" onClick={() => onOpenRequest(pendingRequest)}>View pending request</PortalButton></div>
    </div> : null}
  </section>;
}
