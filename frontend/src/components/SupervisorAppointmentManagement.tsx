import { useListState } from './ListState';
import { RecordPage } from './RecordPage';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Users,
  UserX,
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  Search, 
  SlidersHorizontal, 
  Download, 
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  BookOpen,
  Info,
  Mail,
  User,
  Calendar,
  Eye,
  AlertCircle, RefreshCw
} from 'lucide-react';
import { PageHeader, PortalButton, PortalToast, StatusBadge, StatusDot } from './PortalPrimitives';
import { EmptyState, LoadingState, ErrorState } from './StateViews';
import { SupervisorWorkloadMonitoring } from './SupervisorWorkloadMonitoring';
import { SupervisorDocumentsList } from './SupervisorDocumentsList';
import { SupervisorRecord } from '../types';
import {
  formatSupervisorWaiting,
  getSupervisorAppointments,
  getSupervisorRecordSummary,
  orderSupervisorQueueOldestFirst,
  endSupervisorAppointment,
} from '../services';
import { AppointmentEndControl } from './AppointmentEndControl';
import { findSupervisorRecordByRouteKey, supervisorRecordRouteKey } from '../utils/supervisorAppointmentRoutes';
import { downloadCsv } from '../utils/csvExport';
import { SupervisoryTeamManagement } from './SupervisoryTeamManagement';
import { SupervisorWorkspaceNavigation } from './SupervisorWorkspaceNavigation';
import { AppointmentSummaryCard } from './AppointmentPrimitives';
import { WorkspaceSectionHeader, RequestFilters, WorkspacePagination } from './RequestWorkspacePrimitives';
import { CapacityReassessments } from './CapacityReassessments';
import { requestStatusLabel } from '../utils/lecturerRequests';

export function filterOfficeSupervisorRecords(records: SupervisorRecord[], filters: { search: string; programme: string; semester: string; status: string }) {
  const query = filters.search.trim().toLowerCase();
  return records.filter(row => (!query || `${row.studentName} ${row.studentId} ${row.supervisor} ${row.programme} ${row.researchTopic ?? ''}`.toLowerCase().includes(query))
    && (filters.programme === 'All Programmes' || row.programme === filters.programme)
    && (filters.semester === 'All Semesters' || row.semester === filters.semester)
    && (filters.status === 'All Records' || row.status === filters.status));
}
export function OfficeSupervisorRecordTable({ records, onOpen, onDossier }: { records: SupervisorRecord[]; onOpen: (row: SupervisorRecord) => void; onDossier: (row: SupervisorRecord) => void }) {
  const columns = ['Student','Programme','Supervisor','Current stage','Waiting at this stage','Updated','Action'];
  const stage = (row: SupervisorRecord) => row.status === 'Ended' ? 'Ended' : row.workflow?.length ? requestStatusLabel(row.workflow[row.workflow.length - 1].newStatus) : row.status === 'Pending' ? row.waitingOn === 'PROGRAMME_COORDINATOR' || row.waitingOn === 'COORDINATOR' ? 'Awaiting Coordinator approval' : 'Awaiting Supervisor review' : row.status;
  return <table className="data-table block lg:table" aria-label="Appointment records"><thead className="hidden lg:table-header-group"><tr className="data-thead bg-slate-50">{columns.map(value => <th key={value} scope="col" className="data-th">{value}</th>)}</tr></thead><tbody className="block space-y-3 lg:table-row-group lg:space-y-0">{records.map(row => <tr key={row.applicationId != null ? `application-${row.applicationId}` : supervisorRecordRouteKey(row)} className="data-row grid grid-cols-2 rounded-xl border border-slate-200 lg:table-row lg:rounded-none lg:border-x-0 lg:border-t-0">{[
    <><p>{row.studentName}</p><p className="card-caption mt-1">{row.studentId}</p></>, row.programme, row.supervisor || 'Not assigned', stage(row),
    row.status !== 'Pending' ? <span aria-label="Not applicable">—</span> : row.waitingDays == null ? 'Not recorded' : `${row.waitingDays} calendar ${row.waitingDays === 1 ? 'day' : 'days'}`, row.updatedDate,
    <div className="flex flex-wrap justify-end gap-2"><PortalButton size="sm" onClick={() => onDossier(row)}>View student record</PortalButton><PortalButton size="sm" onClick={() => onOpen(row)}>{row.status === 'Approved' || row.status === 'Ended' ? 'View supervision' : row.status === 'No Supervisor' ? 'View record' : 'View request'}</PortalButton></div>
  ].map((cell,index) => <td key={columns[index]} className={`${index === 0 ? 'data-td-strong' : 'data-td'} block min-w-0 break-words lg:table-cell ${index === 0 || index === 6 ? 'col-span-2' : ''}`}>
    {index > 0 && index < 6 ? <span className="card-label block lg:hidden">{columns[index]}</span> : null}{cell}</td>)}</tr>)}</tbody></table>;
}

// SupervisorRecord now lives in src/types.

interface SupervisorAppointmentManagementProps {
  routeView?: 'list' | 'detail' | 'workload' | 'teams' | 'teamDetail';
  routeRecordId?: string;
  routeTeamStudentId?: string;
  onNavigateToTeam?: (studentId: string) => void;
  onNavigateToTeams?: () => void;
  onNavigateToList?: () => void;
  onNavigateToWorkload?: () => void;
  onNavigateToRecord?: (recordId: string) => void;
  onNavigateToDossier?: (studentId: string) => void;
  onNavigateToRequirements?: () => void;
  onOpenCapacity?: () => void;
}

export const SupervisorAppointmentManagement: React.FC<SupervisorAppointmentManagementProps> = ({ 
  routeView = 'list',
  routeRecordId, routeTeamStudentId, onNavigateToTeam, onNavigateToTeams,
  onNavigateToList,
  onNavigateToWorkload,
  onNavigateToRecord,
  onNavigateToDossier,
  onNavigateToRequirements,
  onOpenCapacity,
}) => {
  // Toast notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Supervisor appointment records are loaded from the persisted Django API.
  const [records, setRecords] = useState<SupervisorRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRecords = useCallback(() => {
    setLoading(true);
    setError(null);
    getSupervisorAppointments()
      .then(setRecords)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load supervisor appointments.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  // Filters State
  const [searchQuery, setSearchQuery] = useListState('SupervisorAppointmentManagement', 'searchQuery', '');
  const [programmeFilter, setProgrammeFilter] = useListState('SupervisorAppointmentManagement', 'programmeFilter', 'All Programmes');
  const [semesterFilter, setSemesterFilter] = useListState('SupervisorAppointmentManagement', 'semesterFilter', 'All Semesters');
  
  // Tab/status filter state
  const [activeTab, setActiveTab] = useListState<'All Records' | 'No Supervisor' | 'Pending' | 'Approved' | 'Ended' | 'Rejected' | 'Cancelled' | 'Workload Alert'>('SupervisorAppointmentManagement', 'activeTab', 'All Records');

  // Applied filter state
  const [appliedSearch, setAppliedSearch] = useListState('SupervisorAppointmentManagement', 'appliedSearch', '');
  const [appliedProg, setAppliedProg] = useListState('SupervisorAppointmentManagement', 'appliedProg', 'All Programmes');
  const [appliedSem, setAppliedSem] = useListState('SupervisorAppointmentManagement', 'appliedSem', 'All Semesters');
  const [sortOrder, setSortOrder] = useListState<'default' | 'longestWaiting'>('SupervisorAppointmentManagement', 'sortOrder', 'default');

  // Pagination State
  const [currentPage, setCurrentPage] = useListState('SupervisorAppointmentManagement', 'currentPage', 1);
  const [itemsPerPage, setItemsPerPage] = useListState('SupervisorAppointmentManagement', 'size', 10);
  const [teamRefresh, setTeamRefresh] = useState(0);
  const [teamBusy, setTeamBusy] = useState(false);
  const [carryBusy, setCarryBusy] = useState(false);
  const refresh = () => { if (routeView !== 'teams') loadRecords(); setTeamRefresh(value => value + 1); };

  const handleApplyFilters = () => {
    setAppliedSearch(searchQuery);
    setAppliedProg(programmeFilter);
    setAppliedSem(semesterFilter);
    setCurrentPage(1);
    showToast("Filters applied for supervisor records.");
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setProgrammeFilter('All Programmes');
    setSemesterFilter('All Semesters');
    setAppliedSearch('');
    setAppliedProg('All Programmes');
    setAppliedSem('All Semesters');
    setActiveTab('All Records');
    setSortOrder('default');
    setCurrentPage(1);
    showToast("Filters reset to default.");
  };

  // Process filters
  const filteredRecords = useMemo(() => filterOfficeSupervisorRecords(records, { search: appliedSearch, programme: appliedProg, semester: appliedSem, status: activeTab }), [records, appliedSearch, appliedProg, appliedSem, activeTab]);

  const orderedFilteredRecords = useMemo(
    () => sortOrder === 'longestWaiting'
      ? orderSupervisorQueueOldestFirst(filteredRecords)
      : filteredRecords,
    [filteredRecords, sortOrder],
  );

  // Paginated records helper
  const paginatedRecords = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return orderedFilteredRecords.slice(startIdx, startIdx + itemsPerPage);
  }, [orderedFilteredRecords, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage) || 1;
  useEffect(() => { if (!loading && !error) setCurrentPage(current => Math.min(current, totalPages)); }, [totalPages, loading, error, setCurrentPage]);
  const recordSummary = useMemo(() => getSupervisorRecordSummary(records), [records]);
  const longestWaitingText = recordSummary.longestWaiting
    ? formatSupervisorWaiting(recordSummary.longestWaiting)
    : '-';
  const selectedRouteRecord = useMemo(
    () => findSupervisorRecordByRouteKey(records, routeRecordId),
    [records, routeRecordId],
  );
  const navigateToList = onNavigateToList ?? (() => undefined);

  // Handles export interaction
  const handleExportData = () => {
    downloadCsv('supervisor_appointments_report.csv', orderedFilteredRecords, [
      { header: 'Student ID', value: (record) => record.studentId },
      { header: 'Student Name', value: (record) => record.studentName },
      { header: 'Programme', value: (record) => record.programme },
      { header: 'Supervisor', value: (record) => record.supervisor },
      { header: 'Status', value: (record) => record.status },
      { header: 'Waiting Since', value: (record) => record.waitingSince || '' },
      { header: 'Waiting Days', value: (record) => record.waitingDays ?? '' },
      { header: 'Waiting On', value: (record) => record.waitingOn || '' },
      { header: 'Appointment Status', value: (record) => record.appointmentLifecycle?.status || '' },
      { header: 'End Outcome', value: (record) => record.appointmentLifecycle?.endOutcome || '' },
      { header: 'End Reason', value: (record) => record.appointmentLifecycle?.endReason || '' },
      { header: 'Ended At', value: (record) => record.appointmentLifecycle?.endedAt || '' },
      { header: 'Ended By', value: (record) => record.appointmentLifecycle?.endedBy || '' },
      { header: 'Supersedes Appointment ID', value: (record) => record.appointmentLifecycle?.supersedesAppointmentId ?? '' },
      { header: 'Replacement Appointment ID', value: (record) => record.appointmentLifecycle?.replacementAppointmentId ?? '' },
      { header: 'Requested Replacement Appointment ID', value: (record) => record.replacesAppointmentId ?? '' },
      { header: 'Replacement Reason', value: (record) => record.replacementReason || '' },
      { header: 'Updated Date', value: (record) => record.updatedDate },
    ]);
    showToast(`Downloaded supervisor_appointments_report.csv with ${orderedFilteredRecords.length} records.`);
  };

  if (routeView === 'workload') {
    return (
      <SupervisorWorkloadMonitoring onBack={navigateToList} onOpenCapacity={onOpenCapacity} />
    );
  }

  if (routeView === 'detail') {
    if (loading) {
      return <RecordPage title="Appointment record" backLabel="Back to Appointment records" onBack={navigateToList}><LoadingState message="Loading supervisor appointment record…" /></RecordPage>;
    }

    if (error) {
      return <RecordPage title="Appointment record" backLabel="Back to Appointment records" onBack={navigateToList}><ErrorState message={error} onRetry={loadRecords} /></RecordPage>;
    }

    if (!selectedRouteRecord) {
      return (
        <RecordPage title="Appointment record" backLabel="Back to Appointment records" onBack={navigateToList}><EmptyState
          title="Supervisor appointment record not found"
          description="The requested supervisor appointment record does not exist or is no longer available."
        /></RecordPage>
      );
    }

    const r = selectedRouteRecord;
    return (
        <RecordPage
          title="Appointment record"
          subtitle="View student supervision details, appointment status, related records, and supporting documents."
          backLabel="Back to Appointment records"
          onBack={navigateToList}
          actions={(
            <>
              <PortalButton variant="secondary" onClick={() => onNavigateToDossier?.(r.studentId)}>
                View student record
              </PortalButton>
              <div className="bg-brand-navy text-white text-[11px] font-black uppercase tracking-widest px-4 py-2.5 rounded-xl shadow-sm shrink-0">
                {r.semester || 'Legacy / Unassigned'}
              </div>
            </>
          )}
        >

      <div id="sup-detail-viewport" className="space-y-6 animate-fade-in text-left font-sans text-xs">
        <PortalToast message={toastMessage} />

              {r.appointmentLifecycle?.status === 'ACTIVE' && (
                <AppointmentEndControl
                  label="Supervisor Appointment"
                  onSubmit={async (outcome, reason) => {
                    await endSupervisorAppointment(
                      r.appointmentLifecycle!.appointmentId,
                      outcome,
                      reason,
                    );
                    showToast('Supervisor appointment ended and workload released.');
                    await loadRecords();
                  }}
                />
              )}
        {/* Grid Layout of Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start mt-4">
          
          {/* Left Column (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Student Profile Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-3xs space-y-5 text-left">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-[#eff6ff] text-[#3b82f6] font-black text-lg rounded-xl flex items-center justify-center uppercase tracking-wider shrink-0 shadow-3xs border border-indigo-100">
                  {r.studentName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                </div>
                <div>
                  <h3 className="section-label">{r.studentName}</h3>
                  <div className="mt-1.5 flex items-center">
                    <StatusBadge tone="success" dot pulse className="text-[9px]">
                      {r.status === 'No Supervisor' ? 'APPROVED' : r.status.toUpperCase()}
                    </StatusBadge>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-5 space-y-4 font-sans">
                <div>
                  <span className="card-label block">
                    Student ID
                  </span>
                  <span className="font-mono text-xs font-black text-slate-800 block mt-1 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">
                    {r.studentId}
                  </span>
                </div>

                <div>
                  <span className="card-label block">
                    Programme
                  </span>
                  <span className="card-value block mt-1">
                    {r.programme}
                  </span>
                </div>

                <div>
                  <span className="card-label block">
                    Semester
                  </span>
                  <span className="card-value block mt-1">
                    {r.semester || 'Legacy / Unassigned'}
                  </span>
                </div>

                <div>
                  <span className="card-label block">
                    Email
                  </span>
                  <span className="card-description hover:text-blue-600 block mt-1 break-all select-all">
                    {r.email || 'Not recorded'}
                  </span>
                </div>
              </div>
            </div>

            {/* Appointment Information Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-3xs space-y-5 text-left">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <User className="w-4 h-4 text-brand-navy" />
                <span className="card-label">
                  Appointment Info
                </span>
              </div>

              <div className="space-y-3 font-sans text-xs">
                <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                  <span className="card-label">Appointment ID</span>
                  <span className="font-mono font-black text-brand-navy">
                    {r.appointmentId || 'Not assigned'}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                  <span className="card-label">Supervisor</span>
                  <span className="card-value">
                    {r.supervisor}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                  <span className="card-label">Workload</span>
                  <span className="card-value">
                    {r.workloadLimit || 'Not available'}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                  <span className="card-label">Approved Date</span>
                  <span className="card-value">
                    {r.approvedDate || '-'}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1.5">
                  <span className="card-label">Released Date</span>
                  <span className="card-value">
                    {r.releasedDate || '-'}
                  </span>
                </div>
              </div>
            </div>

            {/* Evaluation Summary Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-3xs text-left">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-5">
                <BookOpen className="w-4 h-4 text-brand-navy" />
                <span className="card-label">
                  Evaluation Summary
                </span>
              </div>

              <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
                <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center border border-slate-100">
                  <AlertCircle className="w-5 h-5 text-slate-500 opacity-40 animate-pulse" />
                </div>
                <h4 className="section-label text-center">No evaluation records available</h4>
                <p className="card-description max-w-[210px] text-center">
                  Student has not yet reached the evaluation stage of the appointment process.
                </p>
              </div>

              <div className="border-t border-slate-100 pt-4 mt-2 flex justify-between items-center">
                <span className="card-label font-sans">Status:</span>
                <span className="px-2.5 py-1 bg-slate-150 border border-slate-200 text-slate-700 text-[9px] font-black uppercase tracking-wider rounded-lg">
                  NOT STARTED
                </span>
              </div>
            </div>

          </div>

          {/* Right Column (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Research Information Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-3xs space-y-5 text-left">
              <div className="flex items-center gap-2 pb-1">
                <BookOpen className="w-4.5 h-4.5 text-brand-navy" />
                <span className="card-label">
                  Research Information
                </span>
              </div>

              <div className="bg-[#f8fafc] border border-slate-150 rounded-2xl p-5 space-y-2">
                <h4 className="section-label leading-snug">
                  {r.researchTopic || 'No research title recorded'}
                </h4>
                <span className="card-value block">
                  Area: {r.researchArea || 'Not recorded'}
                </span>
              </div>

              <div className="space-y-2 font-sans">
                <span className="card-label block">
                  ABSTRACT
                </span>
                <p className="card-description">
                  {r.abstract || 'No research abstract recorded.'}
                </p>
              </div>
            </div>

            {/* Status History Card (Timeline design) */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-3xs text-left">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-5">
                <FileText className="w-4.5 h-4.5 text-brand-navy" />
                <span className="card-label">
                  Status History
                </span>
              </div>

              {r.workflow && r.workflow.length > 0 ? (
                <div className="relative pl-6 border-l-2 border-slate-150 space-y-6 ml-2.5 py-1">
                  {[...r.workflow].reverse().map((event) => (
                    <div key={event.id} className="relative">
                      <span className="absolute -left-[32px] top-1 w-3.5 h-3.5 rounded-full bg-brand-navy border-2 border-white ring-4 ring-slate-100" />
                      <h4 className="section-label">
                        {event.action.replaceAll('_', ' ')}
                      </h4>
                      <p className="card-description mt-1">
                        {new Date(event.createdAt).toLocaleString('en-GB')}
                        {' · '}
                        {event.actorName}
                      </p>
                      {event.reason && (
                        <p className="card-description text-rose-600 mt-1">{event.reason}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="card-description">No workflow history recorded.</p>
              )}
            </div>

            {r.appointmentLifecycle && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-3xs text-left">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-5">
                  <Calendar className="w-4.5 h-4.5 text-brand-navy" />
                  <span className="card-label">
                    Appointment Lifecycle
                  </span>
                </div>
                {r.appointmentLifecycle.endReason && (
                  <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="card-label">
                      {r.appointmentLifecycle.endOutcome || 'Ended'}
                    </p>
                    <p className="card-description mt-1">{r.appointmentLifecycle.endReason}</p>
                  </div>
                )}
                {r.appointmentLifecycle.lifecycle?.length ? (
                  <div className="space-y-4 border-l-2 border-slate-150 pl-4">
                    {[...r.appointmentLifecycle.lifecycle].reverse().map((event) => (
                      <div key={event.id}>
                        <p className="card-value">{event.action.replaceAll('_', ' ')}</p>
                        <p className="card-description mt-1">{event.actorName} · {new Date(event.createdAt).toLocaleString('en-GB')}</p>
                        {event.reason && <p className="card-description mt-1">{event.reason}</p>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="card-description">No lifecycle events were recorded for this legacy appointment.</p>
                )}
              </div>
            )}

            {/* Related Panel Status Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-3xs text-left">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-5">
                <Users className="w-4.5 h-4.5 text-brand-navy" />
                <span className="card-label">
                  Related Panel Status
                </span>
              </div>

              <div className="bg-[#f8fafc] border border-slate-150 rounded-2xl p-4 flex items-center justify-between mb-4 shadow-3xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-navy text-white font-black text-xs rounded-lg flex items-center justify-center shrink-0">
                    {r.panelMemberName ? r.panelMemberName.split(' ').filter(n => !n.includes('.')).map(n => n[0]).slice(0, 2).join('').toUpperCase() : '--'}
                  </div>
                  <div>
                    <h5 className="section-label">{r.panelMemberName || 'Not assigned'}</h5>
                    <p className="card-description mt-0.5">Internal Panel Member</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="card-label block">Assigned</span>
                  <span className="card-value block mt-1">{r.panelAssignedDate || '-'}</span>
                </div>
              </div>

              <p className="card-description">
                Open Panel Appointments for persisted panel workflow details.
              </p>
            </div>

          </div>

        </div>

        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-6 text-left shadow-3xs">
          <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <span className="card-label block">Submitted documents</span>
              <span className="card-value mt-1 block">Private files attached to this supervisor application.</span>
            </div>
            <StatusBadge tone="neutral">{r.documents?.length || 0} recorded</StatusBadge>
          </div>
          <SupervisorDocumentsList applicationId={r.applicationId} documents={r.documents} />
        </div>

        {/* Notice Alert Banner */}
        <div className="bg-[#eff6ff] border border-blue-150 rounded-2xl p-5 text-left flex items-start gap-4 shadow-3xs mt-6">
          <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="card-label block">
              Confidential Administrative View
            </span>
            <p className="card-description text-slate-650">
              This page provides a read-only administrative view of the supervisor appointment record. Use the related management modules to update files, letters, panel records, or evaluation setup.
            </p>
          </div>
        </div>

      </div>
      </RecordPage>
    );
  }

  if (routeView === 'teamDetail') return <RecordPage title="Supervision details" backLabel="Back to Supervisory teams" onBack={onNavigateToTeams ?? navigateToList}>
    <SupervisoryTeamManagement role="Office Staff/Admin" view="detail" routeStudentId={routeTeamStudentId} showResearchChanges={false} showRefresh={false} />
  </RecordPage>;
  const programmes = [...new Set(records.map(row => row.programme).filter(Boolean))];
  const semesters = [...new Set(records.map(row => row.semester).filter((value): value is string => !!value))];
  return <div id="supervisor-mgmt-viewport" className="space-y-6 text-left font-sans pb-12">
    <PortalToast message={toastMessage} />
    <PageHeader title="Supervisor Appointments" subtitle="Monitor appointment records, manage supervisory teams and follow research changes." actions={<PortalButton size="sm" icon={RefreshCw} disabled={routeView === 'teams' ? teamBusy : loading || carryBusy} onClick={refresh}>Refresh</PortalButton>} />
    <SupervisorWorkspaceNavigation role="Office Staff/Admin" />
    {routeView === 'teams' ? <SupervisoryTeamManagement role="Office Staff/Admin" view="roster" showResearchChanges={false} showRefresh={false} refreshVersion={teamRefresh} onBusyChange={setTeamBusy} onNavigateToStudent={onNavigateToTeam} /> : <>
      {!loading && !error ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AppointmentSummaryCard title="Without supervisor" value={recordSummary.withoutSupervisor} description="Students without an approved supervisor." />
        <AppointmentSummaryCard title="Pending records" value={recordSummary.pending} description="Appointments awaiting a recorded decision." />
        <AppointmentSummaryCard title="Approved supervisors" value={recordSummary.approved} description="Active approved appointments." />
        <AppointmentSummaryCard title="Workload alerts" value={recordSummary.workloadAlerts} description="Lecturers near their supervision limit." />
      </div> : null}
      <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-label="Appointment records">
        <WorkspaceSectionHeader title="Appointment records" description="View appointment records across students and lecturers." actions={<><PortalButton size="sm" disabled={loading || !!error} onClick={handleExportData}>Export records</PortalButton><PortalButton size="sm" onClick={onNavigateToRequirements}>Document requirements</PortalButton><PortalButton size="sm" onClick={onNavigateToWorkload}>View workload</PortalButton></>} />
        <RequestFilters search={searchQuery} onSearch={setSearchQuery} searchLabel="Find a record" searchPlaceholder="Student name, matric number, supervisor or research title">
          <label className="form-label">Programme<select className="form-control form-control-sm mt-1" value={programmeFilter} onChange={event => setProgrammeFilter(event.target.value)}><option>All Programmes</option>{programmes.map(value => <option key={value}>{value}</option>)}</select></label>
          <label className="form-label">Semester<select className="form-control form-control-sm mt-1" value={semesterFilter} onChange={event => setSemesterFilter(event.target.value)}><option>All Semesters</option>{semesters.map(value => <option key={value}>{value}</option>)}</select></label>
          <label className="form-label">Status<select className="form-control form-control-sm mt-1" value={activeTab} onChange={event => { setActiveTab(event.target.value as typeof activeTab); setCurrentPage(1); }}>{(['All Records','No Supervisor','Pending','Approved','Ended','Rejected','Cancelled','Workload Alert'] as const).map(value => <option key={value}>{value}</option>)}</select></label>
          <label className="form-label">Sort<select className="form-control form-control-sm mt-1" value={sortOrder} onChange={event => { setSortOrder(event.target.value as typeof sortOrder); setCurrentPage(1); }}><option value="default">Default order</option><option value="longestWaiting">Longest waiting</option></select></label>
          <div className="flex items-end gap-2"><PortalButton size="sm" onClick={handleResetFilters}>Reset filters</PortalButton><PortalButton size="sm" variant="primary" onClick={handleApplyFilters}>Apply filters</PortalButton></div>
        </RequestFilters>
        {loading ? <LoadingState message="Loading appointment records…" /> : error ? <ErrorState message={error} onRetry={loadRecords} /> : <>
          {paginatedRecords.length ? <OfficeSupervisorRecordTable records={paginatedRecords} onOpen={record => onNavigateToRecord?.(supervisorRecordRouteKey(record))} onDossier={record => onNavigateToDossier?.(record.studentId)} /> : <EmptyState title="No matching records" description="Adjust the filters to see more records." />}
          <WorkspacePagination page={currentPage} pageCount={totalPages} total={filteredRecords.length} noun="records" pageSize={itemsPerPage} onPage={setCurrentPage} onPageSize={value => { setItemsPerPage(value); setCurrentPage(1); }} />
        </>}
      </section>
      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-label="Records needing attention"><WorkspaceSectionHeader title="Records needing attention" description={`Longest waiting: ${longestWaitingText}`} /><div className="flex flex-wrap gap-2">{(['No Supervisor','Pending','Workload Alert'] as const).map(value => <PortalButton key={value} size="sm" onClick={() => { setActiveTab(value); setCurrentPage(1); }}>{value === 'No Supervisor' ? 'View students without supervisor' : value === 'Pending' ? 'View pending records' : 'View workload alerts'}</PortalButton>)}</div></section>
      <CapacityReassessments role="Office Staff/Admin" showRefresh={false} refreshVersion={teamRefresh} onBusyChange={setCarryBusy} onChanged={loadRecords} />
      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><WorkspaceSectionHeader title="Appointment guidance" /><p className="card-description">Submission document requirements are configured centrally and recorded when each application is created.</p><PortalButton size="sm" onClick={onNavigateToRequirements}>Manage document requirements</PortalButton></section>
    </>}
  </div>;
};
