import React, {useEffect, useRef, useState} from 'react';
import {useLocation} from 'react-router';
import {request} from '../services/apiClient';
import {browseQuery, type BrowsePage, type BrowseParams, type CoordinatorAppointmentRow} from '../services/coordinatorWorkspaceApi';
import {formatMalaysiaDate} from '../utils/malaysiaDateTime';
import {CoordinatorDataTable, CoordinatorFiltersBar, CoordinatorPageFooter, useCoordinatorFilters, useCoordinatorPage} from './CoordinatorBrowsePrimitives';
import {ErrorState, LoadingState} from './StateViews';
import {PortalButton} from './PortalPrimitives';
import {WorkspaceSectionHeader} from './RequestWorkspacePrimitives';
import {RecordPage} from './RecordPage';
import {RequestDetailCard, RequestSection, RequestField, readableRecordStatus} from './RequestDetailPrimitives';

const loadHistory = (params: BrowseParams) => request<BrowsePage<CoordinatorAppointmentRow>>(
  `/appointments/supervisor/my-appointments/history/?${browseQuery(params)}`);
const roleLabel = (row: CoordinatorAppointmentRow) => row.kind === 'primary' ? 'Primary supervisor' : 'Supporting supervisor';
const recordedDate = (value: string | null) => value ? formatMalaysiaDate(value) : 'Not recorded';

export function LecturerSupervisionHistory({lecturerId, actions, refreshVersion = 0}: {
  lecturerId?: string; actions: React.ReactNode; refreshVersion?: number;
}) {
  const filters = useCoordinatorFilters(`lecturer-supervision-history:${lecturerId}`, 'newest', {}, true);
  const location = useLocation();
  const [selected, setSelected] = useState<CoordinatorAppointmentRow | null>(null);
  const lastViewed = useRef<CoordinatorAppointmentRow | null>(null);
  const params = {...filters.params, status: '', view: 'history'};
  const result = useCoordinatorPage(loadHistory, params, refreshVersion, !selected);
  const sameQuery = result.dataQuery === JSON.stringify(params);
  useEffect(() => {
    const previous = lastViewed.current;
    if (!selected && previous && location.state?.portalRecordPage === `my-past-supervision:${previous.key}`) setSelected(previous);
  }, [location.key, location.state, selected]);
  const open = (row: CoordinatorAppointmentRow) => {lastViewed.current = row; setSelected(row);};

  const detail = selected ? <RecordPage pageKey={`my-past-supervision:${selected.key}`} title="Past supervision appointment"
    subtitle={`${selected.studentName} · ${selected.matricNo}`} backLabel="Back to Past supervisees" onBack={() => setSelected(null)}>
    <RequestDetailCard><RequestSection title="Appointment record">
      <RequestField label="Student" value={selected.studentName}/>
      <RequestField label="Matric number" value={selected.matricNo}/>
      <RequestField label="Programme" value={selected.programme || 'Not recorded'}/>
      <RequestField label="Your role" value={roleLabel(selected)}/>
      <RequestField label="Started on" value={recordedDate(selected.appointmentDate)}/>
      <RequestField label="Ended on" value={recordedDate(selected.endedAt)}/>
      <RequestField label="Outcome" value={selected.outcome ? readableRecordStatus(selected.outcome) : 'Not recorded'}/>
    </RequestSection></RequestDetailCard>
  </RecordPage> : null;

  return <><div hidden={!!selected} inert={selected ? true : undefined}><section className="appointment-workspace-card rounded-2xl border border-slate-200 bg-white shadow-sm">
    <WorkspaceSectionHeader title="My supervisees" description="Ended primary and supporting appointments." actions={actions}/>
    <CoordinatorFiltersBar filters={{...filters, status: ''}} facets={result.data?.facets} allProgrammesLabel="All programmes"
      includeEndDate={false} showStatus={false} history dateLabel="Ended" searchLabel="Find an appointment"
      typeLabel="Your role" typeOptions={[["all", "All roles"], ["primary", "Primary supervisor"], ["supporting", "Supporting supervisor"]]}
      sortOptions={[["newest", "Recently ended"], ["oldest", "Oldest endings first"]]}/>
    {!result.error && (!sameQuery || result.loading && !result.data) ? <LoadingState message="Loading past appointments…"/> : result.error ? <ErrorState message={result.error} onRetry={result.reload}/>
      : !result.data?.results.length ? <p role="status" className="card-description py-6 text-center">{filters.q || filters.programme || filters.semester || filters.type !== 'all' || filters.from
        ? 'No past appointments match these filters.' : 'No past supervision appointments.'}</p>
      : <CoordinatorDataTable label="Past supervisee appointments" columns={['Student', 'Your role', 'Started on', 'Ended on', 'Outcome', 'Action']}
        rows={result.data.results.map(row => ({key: row.key, cells: [<><p>{row.studentName}</p><p className="card-caption mt-1">{row.matricNo}</p></>,
          roleLabel(row), recordedDate(row.appointmentDate), recordedDate(row.endedAt), row.outcome ? readableRecordStatus(row.outcome) : 'Not recorded',
          <PortalButton size="sm" className="whitespace-nowrap" aria-label={`View past appointment for ${row.studentName}`} onClick={() => open(row)}>View appointment</PortalButton>]}))}/>}
    {sameQuery && !result.loading && !result.error ? <CoordinatorPageFooter data={result.data} filters={filters} noun="appointments"/> : null}
  </section></div>{detail}</>;
}
