import {SupervisorRequestDisclosure} from './SupervisorRequestFields';
import React, {useState} from 'react';
import type { PanelRecommendationDraft, PanelRecommendationSupervisee } from '../types';
import { panelRequestPending, panelStatusLabel, panelStatusTone } from '../utils/panelPresentation';
import { CoordinatorDataTable } from './CoordinatorBrowsePrimitives';
import { useListState } from './ListState';
import { PortalButton, PortalCard, StatusBadge } from './PortalPrimitives';
import { PortalSelect } from './PortalSelect';
import { WorkspacePagination, WorkspaceSectionHeader, WorkspaceFilterCard } from './RequestWorkspacePrimitives';
import {ClipboardList,Plus,ArrowRightLeft,UserRound,FileText} from 'lucide-react';
import {PanelStudentOverview,PanelResearchDetails,PanelDetailFact} from './PanelDetailLayout';
import {SupervisionDetailSection,SupervisionPerson,supervisionDetailBody} from './SupervisionDetailLayout';
import {formatRequestDisplayDate} from './ApprovalProcess';

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

export function PanelSuperviseeRoster({ students, recommendations, onOpen, embedded = false }: {
  students: PanelRecommendationSupervisee[]; recommendations: PanelRecommendationDraft[]; onOpen: (studentId: string) => void; embedded?: boolean;
}) {
  const [search, setSearch] = useListState('PanelSuperviseeRoster', 'search', '');
  const [stage, setStage] = useListState<Stage>('PanelSuperviseeRoster', 'stage', '');
  const [page, setPage] = useListState('PanelSuperviseeRoster', 'page', 1);
  const [size, setSize] = useListState('PanelSuperviseeRoster', 'size', 10);
  const filtered = filterPanelSupervisees(students, recommendations, search, stage);
  const pageCount = Math.max(1, Math.ceil(filtered.length / size));
  const safePage = Math.min(page, pageCount);
  return <section className={embedded ? "space-y-5" : "appointment-workspace-card rounded-2xl border border-slate-200 bg-white"}>
    {!embedded ? <WorkspaceSectionHeader title="Panels for my supervisees" description="Students you supervise. View their appointed Panel member or manage a nomination." /> : null}
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
        <PortalButton size="sm" className="min-h-11" aria-label={`View student ${student.studentName}`} onClick={() => onOpen(student.studentId)}>View student</PortalButton>,
      ] };
    })} /> : <p role="status" className="card-description py-6 text-center">{students.length ? 'No supervisees match these filters.' : 'No active primary supervisees are available for Panel nomination.'}</p>}
    <WorkspacePagination page={safePage} pageCount={pageCount} total={filtered.length} pageSize={size} noun="students" onPage={setPage} onPageSize={value => { setSize(value); setPage(1); }} />
  </section>;
}

export function PanelSuperviseeDetails({ student, pendingRequest, recommendations = [], onRecommend, onOpenRequest }: {
  student: PanelRecommendationSupervisee; pendingRequest?: PanelRecommendationDraft;
  recommendations?: PanelRecommendationDraft[];
  onRecommend: () => void; onOpenRequest: (request: PanelRecommendationDraft) => void;
}) {
  const appointed = Boolean(student.panelAppointmentId);
  const [historyPage,setHistoryPage]=useState(1);
  const history=recommendations.filter(row=>row.studentId===student.studentId&&!panelRequestPending(row.status))
    .sort((a,b)=>(Date.parse(b.submittedAt||b.submittedDate)||0)-(Date.parse(a.submittedAt||a.submittedDate)||0));
  const pages=Math.max(1,Math.ceil(history.length/5)),page=Math.min(historyPage,pages);
  return <section className="space-y-7" aria-label="Student Panel details">
    <PanelStudentOverview record={student}/>
    <div data-panel-supervisee-columns className="grid min-w-0 items-start gap-7 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="order-last min-w-0 space-y-7 xl:order-first">
        <SupervisionDetailSection title="Current appointed panel member" icon={UserRound} contentClassName="mt-4 min-w-0">
          {appointed ? <SupervisionPerson role="Panel member" name={student.currentPanelMember||'Not recorded'} department={student.currentPanelDepartment} email={student.currentPanelEmail}
            appointedOn={student.currentPanelAppointmentDate?formatRequestDisplayDate(student.currentPanelAppointmentDate):undefined}/> : <p className={supervisionDetailBody}>Not appointed</p>}
        </SupervisionDetailSection>
        <PanelResearchDetails record={student}/>
      </div>
      <aside className="order-first min-w-0 xl:order-last" aria-label="Panel nomination">
        <SupervisionDetailSection title="Panel nomination" icon={ClipboardList} contentClassName="mt-4 min-w-0 space-y-5">
          {pendingRequest ? <>
            <StatusBadge tone="info">{panelStatusLabel(pendingRequest.status)}</StatusBadge>
            <dl><PanelDetailFact title={appointed?'Proposed replacement':'Proposed panel member'} value={pendingRequest.recommendedMember}/></dl>
            {appointed?<p className={supervisionDetailBody}>{student.currentPanelMember||'The current Panel member'} remains appointed until final approval of the replacement.</p>:null}
            <PortalButton icon={FileText} variant="primary" className="min-h-11 w-full [&]:normal-case [&]:tracking-normal" onClick={()=>onOpenRequest(pendingRequest)}>View pending request</PortalButton>
          </> : student.canRecommend ? <>
            <p className={supervisionDetailBody}>{appointed?'A replacement takes effect after final approval.':'Select a Panel member for this student.'}</p>
            <PortalButton variant="primary" icon={appointed?ArrowRightLeft:Plus} className="min-h-11 w-full [&]:normal-case [&]:tracking-normal" onClick={onRecommend}>{appointed?'Request replacement':'Nominate panel member'}</PortalButton>
          </> : <p role="status" className={supervisionDetailBody}>A request is in progress. Another nomination cannot be submitted.</p>}

        </SupervisionDetailSection>
      </aside>
    </div>
    {history.length?<div data-panel-nomination-history><PortalCard padding="lg" role="region" aria-label="Nomination history" className="[&>details]:border-t-0">
      <SupervisorRequestDisclosure title={`Nomination history (${history.length})`}>
        <table role="table" aria-label="Completed Panel nominations" className="data-table block table-fixed lg:table">
          <thead role="rowgroup" className="hidden lg:table-header-group"><tr role="row" className="data-thead">{['Panel member','Outcome','Submitted','Action'].map(title=><th role="columnheader" key={title} scope="col" className={`data-th ${title==='Action'?'text-right':''}`}>{title}</th>)}</tr></thead>
          <tbody role="rowgroup" className="block space-y-3 lg:table-row-group lg:space-y-0">{history.slice((page-1)*5,page*5).map(row=><tr role="row" key={row.id} className="data-row grid grid-cols-2 rounded-xl border border-slate-200 lg:table-row lg:rounded-none lg:border-x-0 lg:border-t-0">
            <td role="cell" className="data-td col-span-2 block min-w-0 lg:table-cell [overflow-wrap:anywhere]"><span className="card-label mb-1 block lg:hidden">Panel member</span>{row.recommendedMember||'Not recorded'}</td>
            <td role="cell" className="data-td block min-w-0 lg:table-cell"><span className="card-label mb-1 block lg:hidden">Outcome</span><StatusBadge tone={panelStatusTone(row.status)}>{panelStatusLabel(row.status)}</StatusBadge></td>
            <td role="cell" className="data-td block min-w-0 lg:table-cell [overflow-wrap:anywhere]"><span className="card-label mb-1 block lg:hidden">Submitted</span>{formatRequestDisplayDate(row.submittedAt||row.submittedDate)}</td>
            <td role="cell" className="data-td col-span-2 block lg:table-cell"><div className="flex justify-start lg:justify-end"><PortalButton size="sm" icon={FileText} className="min-h-11 whitespace-nowrap [&]:normal-case [&]:tracking-normal" aria-label={`View request for ${row.recommendedMember||'Panel member'}, submitted ${formatRequestDisplayDate(row.submittedAt||row.submittedDate)}`} onClick={()=>onOpenRequest(row)}>View request</PortalButton></div></td>
          </tr>)}</tbody>
        </table>
        <WorkspacePagination page={page} pageCount={pages} total={history.length} pageSize={5} noun="records" onPage={setHistoryPage}/>
      </SupervisorRequestDisclosure>
    </PortalCard></div>:null}
  </section>;
}
