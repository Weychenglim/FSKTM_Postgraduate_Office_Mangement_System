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
  AlertCircle
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

// SupervisorRecord now lives in src/types.

interface SupervisorAppointmentManagementProps {
  routeView?: 'list' | 'detail' | 'workload';
  routeRecordId?: string;
  onNavigateToList?: () => void;
  onNavigateToWorkload?: () => void;
  onNavigateToRecord?: (recordId: string) => void;
  onNavigateToDossier?: (studentId: string) => void;
  onNavigateToRequirements?: () => void;
  onOpenCapacity?: () => void;
}

export const SupervisorAppointmentManagement: React.FC<SupervisorAppointmentManagementProps> = ({ 
  routeView = 'list',
  routeRecordId,
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
  const [searchQuery, setSearchQuery] = useState('');
  const [programmeFilter, setProgrammeFilter] = useState('All Programmes');
  const [semesterFilter, setSemesterFilter] = useState('All Semesters');
  
  // Tab/status filter state
  const [activeTab, setActiveTab] = useState<'All Records' | 'No Supervisor' | 'Pending' | 'Approved' | 'Ended' | 'Rejected' | 'Cancelled' | 'Workload Alert'>('All Records');

  // Applied filter state
  const [appliedSearch, setAppliedSearch] = useState('');
  const [appliedProg, setAppliedProg] = useState('All Programmes');
  const [appliedSem, setAppliedSem] = useState('All Semesters');
  const [sortOrder, setSortOrder] = useState<'default' | 'longestWaiting'>('default');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

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
  const filteredRecords = useMemo(() => {
    return records.filter(rec => {
      // Search Box: name, id, supervisor
      const term = appliedSearch.toLowerCase();
      const matchSearch = !term || 
        rec.studentName.toLowerCase().includes(term) ||
        rec.studentId.toLowerCase().includes(term) ||
        rec.supervisor.toLowerCase().includes(term) ||
        rec.programme.toLowerCase().includes(term);

      // Programme
      const matchProg = appliedProg === 'All Programmes' || rec.programme === appliedProg;

      // Status tab
      const matchTab = activeTab === 'All Records' || rec.status === activeTab;

      return matchSearch && matchProg && matchTab;
    });
  }, [records, appliedSearch, appliedProg, activeTab]);

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
  }, [orderedFilteredRecords, currentPage]);

  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage) || 1;
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
      return <LoadingState message="Loading supervisor appointment record…" />;
    }

    if (error) {
      return <ErrorState message={error} onRetry={loadRecords} />;
    }

    if (!selectedRouteRecord) {
      return (
        <EmptyState
          title="Supervisor appointment record not found"
          description="The requested supervisor appointment record does not exist or is no longer available."
          actionLabel="Back to Supervisor Appointments"
          onAction={navigateToList}
        />
      );
    }

    const r = selectedRouteRecord;
    return (
      <div id="sup-detail-viewport" className="space-y-6 animate-fade-in text-left font-sans text-xs">
        <PortalToast message={toastMessage} />

        <PageHeader
          title="Supervisor Appointment Detail"
          subtitle="View student supervision details, appointment status, related records, and supporting documents."
          backLabel="Back to Supervisor Appointment Management"
          onBack={() => {
            navigateToList();
            showToast("Returned to Supervisor Appointment Management");
          }}
          subtitleClassName="leading-relaxed"
          actions={(
            <>
              <PortalButton variant="secondary" onClick={() => onNavigateToDossier?.(r.studentId)}>
                View Dossier
              </PortalButton>
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
              <div className="bg-brand-navy text-white text-[11px] font-black uppercase tracking-widest px-4 py-2.5 rounded-xl shadow-sm shrink-0">
                {r.semester || 'Legacy / Unassigned'}
              </div>
            </>
          )}
        />

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
                  <h3 className="text-base font-extrabold text-brand-navy">{r.studentName}</h3>
                  <div className="mt-1.5 flex items-center">
                    <StatusBadge tone="success" dot pulse className="text-[9px]">
                      {r.status === 'No Supervisor' ? 'APPROVED' : r.status.toUpperCase()}
                    </StatusBadge>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-5 space-y-4 font-sans">
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 block uppercase tracking-wider">
                    Student ID
                  </span>
                  <span className="font-mono text-xs font-black text-slate-800 block mt-1 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">
                    {r.studentId}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 block uppercase tracking-wider">
                    Programme
                  </span>
                  <span className="text-xs font-bold text-slate-800 block mt-1">
                    {r.programme}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 block uppercase tracking-wider">
                    Semester
                  </span>
                  <span className="text-xs font-bold text-brand-navy block mt-1">
                    {r.semester || 'Legacy / Unassigned'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 block uppercase tracking-wider">
                    Email
                  </span>
                  <span className="text-xs font-semibold text-brand-navy hover:text-blue-600 block mt-1 break-all select-all">
                    {r.email || 'Not recorded'}
                  </span>
                </div>
              </div>
            </div>

            {/* Appointment Information Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-3xs space-y-5 text-left">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <User className="w-4 h-4 text-brand-navy" />
                <span className="font-extrabold text-brand-navy text-xs uppercase tracking-wider">
                  Appointment Info
                </span>
              </div>

              <div className="space-y-3 font-sans text-xs">
                <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                  <span className="font-semibold text-slate-400 uppercase text-[10px]">Appointment ID</span>
                  <span className="font-mono font-black text-brand-navy">
                    {r.appointmentId || 'Not assigned'}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                  <span className="font-semibold text-slate-400 uppercase text-[10px]">Supervisor</span>
                  <span className="font-black text-brand-navy">
                    {r.supervisor}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                  <span className="font-semibold text-slate-400 uppercase text-[10px]">Workload</span>
                  <span className="font-black text-brand-navy">
                    {r.workloadLimit || 'Not available'}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                  <span className="font-semibold text-slate-400 uppercase text-[10px]">Approved Date</span>
                  <span className="font-bold text-brand-navy">
                    {r.approvedDate || '-'}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1.5">
                  <span className="font-semibold text-slate-400 uppercase text-[10px]">Released Date</span>
                  <span className="font-bold text-brand-navy">
                    {r.releasedDate || '-'}
                  </span>
                </div>
              </div>
            </div>

            {/* Evaluation Summary Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-3xs text-left">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-5">
                <BookOpen className="w-4 h-4 text-brand-navy" />
                <span className="font-extrabold text-brand-navy text-xs uppercase tracking-wider">
                  Evaluation Summary
                </span>
              </div>

              <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
                <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center border border-slate-100">
                  <AlertCircle className="w-5 h-5 text-slate-500 opacity-40 animate-pulse" />
                </div>
                <h4 className="font-extrabold text-slate-800 text-xs text-center">No evaluation records available</h4>
                <p className="text-[10px] text-slate-400 font-bold max-w-[210px] leading-relaxed text-center">
                  Student has not yet reached the evaluation stage of the appointment process.
                </p>
              </div>

              <div className="border-t border-slate-100 pt-4 mt-2 flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider font-sans">Status:</span>
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
                <span className="font-extrabold text-brand-navy text-xs uppercase tracking-wider">
                  Research Information
                </span>
              </div>

              <div className="bg-[#f8fafc] border border-slate-150 rounded-2xl p-5 space-y-2">
                <h4 className="text-sm font-extrabold text-brand-navy leading-snug">
                  {r.researchTopic || 'No research title recorded'}
                </h4>
                <span className="text-[10.5px] font-black text-slate-500 block tracking-wide">
                  Area: {r.researchArea || 'Not recorded'}
                </span>
              </div>

              <div className="space-y-2 font-sans">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
                  ABSTRACT
                </span>
                <p className="text-slate-600 text-xs font-semibold leading-relaxed">
                  {r.abstract || 'No research abstract recorded.'}
                </p>
              </div>
            </div>

            {/* Status History Card (Timeline design) */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-3xs text-left">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-5">
                <FileText className="w-4.5 h-4.5 text-brand-navy" />
                <span className="font-extrabold text-brand-navy text-xs uppercase tracking-wider">
                  Status History
                </span>
              </div>

              {r.workflow && r.workflow.length > 0 ? (
                <div className="relative pl-6 border-l-2 border-slate-150 space-y-6 ml-2.5 py-1">
                  {[...r.workflow].reverse().map((event) => (
                    <div key={event.id} className="relative">
                      <span className="absolute -left-[32px] top-1 w-3.5 h-3.5 rounded-full bg-brand-navy border-2 border-white ring-4 ring-slate-100" />
                      <h4 className="font-extrabold text-brand-navy text-xs">
                        {event.action.replaceAll('_', ' ')}
                      </h4>
                      <p className="text-[10px] font-bold text-slate-400 mt-1">
                        {new Date(event.createdAt).toLocaleString('en-GB')}
                        {' · '}
                        {event.actorName}
                      </p>
                      {event.reason && (
                        <p className="text-[10px] font-semibold text-rose-600 mt-1">{event.reason}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs font-semibold text-slate-400">No workflow history recorded.</p>
              )}
            </div>

            {r.appointmentLifecycle && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-3xs text-left">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-5">
                  <Calendar className="w-4.5 h-4.5 text-brand-navy" />
                  <span className="font-extrabold text-brand-navy text-xs uppercase tracking-wider">
                    Appointment Lifecycle
                  </span>
                </div>
                {r.appointmentLifecycle.endReason && (
                  <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[10px] font-black uppercase text-slate-500">
                      {r.appointmentLifecycle.endOutcome || 'Ended'}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-700">{r.appointmentLifecycle.endReason}</p>
                  </div>
                )}
                {r.appointmentLifecycle.lifecycle?.length ? (
                  <div className="space-y-4 border-l-2 border-slate-150 pl-4">
                    {[...r.appointmentLifecycle.lifecycle].reverse().map((event) => (
                      <div key={event.id}>
                        <p className="text-xs font-extrabold text-brand-navy">{event.action.replaceAll('_', ' ')}</p>
                        <p className="mt-1 text-[10px] text-slate-400">{event.actorName} · {new Date(event.createdAt).toLocaleString('en-GB')}</p>
                        {event.reason && <p className="mt-1 text-[10px] font-semibold text-slate-600">{event.reason}</p>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs font-semibold text-slate-400">No lifecycle events were recorded for this legacy appointment.</p>
                )}
              </div>
            )}

            {/* Related Panel Status Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-3xs text-left">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-5">
                <Users className="w-4.5 h-4.5 text-brand-navy" />
                <span className="font-extrabold text-brand-navy text-xs uppercase tracking-wider">
                  Related Panel Status
                </span>
              </div>

              <div className="bg-[#f8fafc] border border-slate-150 rounded-2xl p-4 flex items-center justify-between mb-4 shadow-3xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-navy text-white font-black text-xs rounded-lg flex items-center justify-center shrink-0">
                    {r.panelMemberName ? r.panelMemberName.split(' ').filter(n => !n.includes('.')).map(n => n[0]).slice(0, 2).join('').toUpperCase() : '--'}
                  </div>
                  <div>
                    <h5 className="font-extrabold text-slate-850 text-xs">{r.panelMemberName || 'Not assigned'}</h5>
                    <p className="text-[10px] font-bold text-slate-400 mt-0.5">Internal Panel Member</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] font-extrabold text-slate-400 block uppercase tracking-wider">Assigned</span>
                  <span className="text-xs font-black text-brand-navy block mt-1">{r.panelAssignedDate || '-'}</span>
                </div>
              </div>

              <p className="text-[10px] font-semibold text-slate-400">
                Open Panel Appointments for persisted panel workflow details.
              </p>
            </div>

          </div>

        </div>

        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-6 text-left shadow-3xs">
          <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <span className="block text-xs font-extrabold uppercase tracking-wider text-brand-navy">Submitted documents</span>
              <span className="mt-1 block text-[10px] font-bold text-slate-400">Private files attached to this supervisor application.</span>
            </div>
            <StatusBadge tone="neutral">{r.documents?.length || 0} recorded</StatusBadge>
          </div>
          <SupervisorDocumentsList applicationId={r.applicationId} documents={r.documents} />
        </div>

        {/* Notice Alert Banner */}
        <div className="bg-[#eff6ff] border border-blue-150 rounded-2xl p-5 text-left flex items-start gap-4 shadow-3xs mt-6">
          <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-extrabold text-brand-navy text-xs uppercase tracking-wider block">
              Confidential Administrative View
            </span>
            <p className="text-slate-650 text-xs font-semibold leading-relaxed text-slate-500">
              This page provides a read-only administrative view of the supervisor appointment record. Use the related management modules to update files, letters, panel records, or evaluation setup.
            </p>
          </div>
        </div>

      </div>
    );
  }

  return (
    <div id="supervisor-mgmt-viewport" className="space-y-8 animate-fade-in text-left font-sans">
      
      <PortalToast message={toastMessage} />

      <PageHeader
        title="Supervisor Appointment Management"
        subtitle="Monitor supervisor appointment records, workload distribution, and records needing attention."
        subtitleClassName="leading-relaxed max-w-3xl"
        actions={(
          <PortalButton variant="secondary" onClick={onNavigateToRequirements}>
            Document Requirements
          </PortalButton>
        )}
      />

      {/* 4 Vitals Summary Cards matching wireframe exactly */}
      <div id="sup-vitals-row" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Students Without Supervisor */}
        <div className="bg-white border-l-4 border-l-rose-500 border border-y-slate-200 border-r-slate-200 rounded-xl p-5 shadow-3xs hover:shadow-2xs transition flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block leading-none">
              Students Without Supervisor
            </span>
            <span className="text-3xl font-black text-brand-navy block pt-1">
              {recordSummary.withoutSupervisor}
            </span>
            <span className="text-[10px] font-medium text-rose-600 block pt-1.5 flex items-center gap-1">
              <StatusDot tone="danger" pulse />
              No approved supervisor record.
            </span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-rose-50 flex items-center justify-center text-rose-500 shrink-0">
            <UserX className="w-5 h-5" />
          </div>
        </div>

        {/* Pending Records */}
        <div className="bg-white border-l-4 border-l-blue-500 border border-y-slate-200 border-r-slate-200 rounded-xl p-5 shadow-3xs hover:shadow-2xs transition flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block leading-none">
              Pending Records
            </span>
            <span className="text-3xl font-black text-brand-navy block pt-1">
              {recordSummary.pending}
            </span>
            <span className="text-[10px] font-medium text-blue-600 block pt-1.5 flex items-center gap-1">
              <StatusDot tone="info" />
              Supervisor records still in workflow.
            </span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500 shrink-0">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        {/* Approved Supervisors */}
        <div className="bg-white border-l-4 border-l-emerald-500 border border-y-slate-200 border-r-slate-200 rounded-xl p-5 shadow-3xs hover:shadow-2xs transition flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block leading-none">
              Approved Supervisors
            </span>
            <span className="text-3xl font-black text-slate-850 block pt-1">
              {recordSummary.approved}
            </span>
            <span className="text-[10px] font-medium text-emerald-600 block pt-1.5 flex items-center gap-1">
              <StatusDot tone="success" />
              Active approved appointments.
            </span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-500 shrink-0">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>

        {/* Workload Alerts */}
        <div className="bg-white border-l-4 border-l-amber-500 border border-y-slate-200 border-r-slate-200 rounded-xl p-5 shadow-3xs hover:shadow-2xs transition flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block leading-none">
              Workload Alerts
            </span>
            <span className="text-3xl font-black text-amber-500 block pt-1">
              {recordSummary.workloadAlerts}
            </span>
            <span className="text-[10px] font-medium text-amber-600 block pt-1.5 flex items-center gap-1">
              <StatusDot tone="warning" pulse />
              Lecturers near supervision limit.
            </span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* Main Core Layout Grid (Divided 8 cols with filters & table, 4 cols with Side widgets) */}
      <div id="sup-core-grid" className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 items-start">
        
        {/* Left Side: Filter Panels and Records Database Table */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Search and Filters Block */}
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-3xs space-y-5 text-xs text-left">
            <div className="border-b border-slate-100 pb-3">
              <span className="font-extrabold text-slate-400 uppercase tracking-wider text-[10px]">
                Search & Filter Supervisor Records
              </span>
            </div>

            <div className="space-y-4">
              
              {/* Row 1: Search Box */}
              <div>
                <label htmlFor="search-input" className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Search Records
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input
                    id="search-input"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by student name, ID, supervisor, or research title"
                    className="form-control form-control-sm pl-9 pr-4"
                  />
                </div>
              </div>

              {/* Row 2: Programme and Semester Dropdowns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                <div>
                  <label htmlFor="prog-select" className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Programme
                  </label>
                  <div className="relative">
                    <select
                      id="prog-select"
                      value={programmeFilter}
                      onChange={(e) => setProgrammeFilter(e.target.value)}
                      className="form-control form-control-sm appearance-none pr-9 cursor-pointer"
                    >
                      <option>All Programmes</option>
                      <option>MSc. Computer Science</option>
                      <option>MSc. Data Science</option>
                      <option>MSc. Software Engineering</option>
                      <option>MSc. Information Technology</option>
                    </select>
                    <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label htmlFor="sem-select" className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Semester
                  </label>
                  <div className="relative">
                    <select
                      id="sem-select"
                      value={semesterFilter}
                      onChange={(e) => setSemesterFilter(e.target.value)}
                      className="form-control form-control-sm appearance-none pr-9 cursor-pointer"
                    >
                      <option>All Semesters</option>
                      <option>Semester 1, 2024/2025</option>
                      <option>Semester 2, 2024/2025</option>
                    </select>
                    <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5 pointer-events-none" />
                  </div>
                </div>

              </div>

              {/* Row 3: Action Button combined with tab selector for smooth UX */}
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                
                <div className="flex flex-wrap gap-1.5">
                  {(['All Records', 'No Supervisor', 'Pending', 'Approved', 'Ended', 'Rejected', 'Cancelled', 'Workload Alert'] as const).map((tab) => {
                    const isActive = activeTab === tab;
                    return (
                      <button
                        key={tab}
                        onClick={() => {
                          setActiveTab(tab);
                          setCurrentPage(1);
                        }}
                        className={`px-3 py-1.5 text-[10.5px] font-black transition rounded-lg ${
                          isActive 
                            ? 'bg-brand-navy text-white' 
                            : 'bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-650'
                        }`}
                      >
                        {tab}
                      </button>
                    );
                  })}
                </div>

                <div className="flex gap-2 shrink-0">
                  <PortalButton
                    onClick={handleResetFilters}
                    variant="secondary"
                    size="sm"
                  >
                    Reset
                  </PortalButton>
                  <PortalButton
                    onClick={handleApplyFilters}
                    variant="primary"
                    size="sm"
                  >
                    Apply Filters
                  </PortalButton>
                </div>

              </div>

            </div>
          </div>

          {/* Supervisor Appointment Records Card Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-3xs text-left">
            <div className="px-6 py-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="font-extrabold text-brand-navy text-xs uppercase tracking-wider block">
                  Supervisor Appointment Records
                </span>
                <span className="text-[10px] font-bold text-slate-400 block mt-1">
                  View and monitor supervisor appointment records across students and lecturers.
                </span>
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-500">
                  <SlidersHorizontal className="h-4 w-4" />
                  <span>Sort</span>
                  <select
                    value={sortOrder}
                    onChange={(event) => {
                      setSortOrder(event.target.value as 'default' | 'longestWaiting');
                      setCurrentPage(1);
                    }}
                    className="form-control form-control-sm min-w-36 normal-case"
                    aria-label="Sort supervisor appointment records"
                  >
                    <option value="default">Default order</option>
                    <option value="longestWaiting">Longest waiting</option>
                  </select>
                </label>
                <button
                  onClick={handleExportData}
                  className="inline-flex items-center gap-1.5 text-[10.5px] font-black text-slate-500 hover:text-brand-navy transition uppercase tracking-wider cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Export Data</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="data-table min-w-[820px] text-xs">
                <thead>
                  <tr className="data-thead bg-slate-50 select-none">
                    <th className="data-th">Student ID</th>
                    <th className="data-th">Student Name</th>
                    <th className="data-th">Programme</th>
                    <th className="data-th">Supervisor</th>
                    <th className="data-th text-center">Status</th>
                    <th className="data-th">Waiting</th>
                    <th className="data-th">Updated Date</th>
                    <th className="data-th text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="p-0">
                        <LoadingState message="Loading supervisor appointments…" />
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan={8} className="p-0">
                        <ErrorState message={error} onRetry={loadRecords} />
                      </td>
                    </tr>
                  ) : paginatedRecords.length > 0 ? (
                    paginatedRecords.map((r) => (
                      <tr key={r.studentId} className="hover:bg-slate-50/50 transition-colors">
                        
                        {/* Student ID */}
                        <td className="data-td font-mono">
                          {r.studentId}
                        </td>

                        {/* Student Name */}
                        <td className="data-td-strong">
                          {r.studentName}
                        </td>

                        {/* Programme */}
                        <td className="data-td">
                          {r.programme}
                        </td>

                        {/* Supervisor */}
                        <td className={`data-td-strong ${
                          r.supervisor === 'Not Assigned' ? 'text-red-500' : ''
                        }`}>
                          {r.supervisor}
                        </td>

                        {/* Status chip */}
                        <td className="data-td text-center">
                          <div className="flex items-center justify-center">
                            {r.status === 'Approved' ? (
                              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 tracking-wide font-black text-[9px] uppercase rounded-full border border-emerald-100">
                                Approved
                              </span>
                            ) : r.status === 'Pending' ? (
                              <span className="px-2.5 py-1 bg-blue-50 text-blue-600 tracking-wide font-black text-[9px] uppercase rounded-full border border-blue-100">
                                Pending
                              </span>
                            ) : r.status === 'No Supervisor' ? (
                              <span className="px-2.5 py-1 bg-red-50 text-red-650 tracking-wide font-black text-[9px] uppercase rounded-full border border-red-100">
                                No Supervisor
                              </span>
                            ) : r.status === 'Workload Alert' ? (
                              <span className="px-2.5 py-1 bg-amber-50 text-amber-700 tracking-wide font-black text-[9px] uppercase rounded-full border border-amber-100">
                                Workload Alert
                              </span>
                            ) : r.status === 'Cancelled' ? (
                              <span className="px-2.5 py-1 bg-slate-100 text-slate-600 tracking-wide font-black text-[9px] uppercase rounded-full border border-slate-200">
                                Cancelled by Student
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 bg-slate-100 text-slate-600 tracking-wide font-black text-[9px] uppercase rounded-full border border-slate-200">
                                Rejected
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="data-td font-semibold text-slate-500">
                          {formatSupervisorWaiting(r)}
                        </td>

                        {/* Updated Date */}
                        <td className="data-td">
                          {r.updatedDate}
                        </td>

                        {/* Action - View Button */}
                        <td className="data-td text-center">
                          <div className="flex flex-wrap justify-center gap-2">
                            <button
                              onClick={() => onNavigateToDossier?.(r.studentId)}
                              className="px-3 py-1.5 border border-slate-200 bg-white text-blue-700 font-extrabold text-[10px] uppercase rounded-lg"
                            >
                              View Dossier
                            </button>
                            <button
                              onClick={() => {
                                onNavigateToRecord?.(supervisorRecordRouteKey(r));
                                showToast(`Loaded supervisor details for ${r.studentName}`);
                              }}
                              className="px-3 py-1.5 bg-brand-navy hover:bg-slate-800 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-lg transition shadow-3xs hover:shadow-2xs cursor-pointer"
                            >
                              View
                            </button>
                          </div>
                        </td>

                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                        No supervisor records found matching the applied criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination block */}
            <div className="bg-slate-50/50 p-4 border-t border-slate-100 flex items-center justify-between font-sans text-xs select-none">
              <span className="text-slate-450 font-semibold">
                Showing {filteredRecords.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to {Math.min(currentPage * itemsPerPage, filteredRecords.length)} of {filteredRecords.length} records
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 disabled:opacity-45 hover:bg-slate-50 transition cursor-pointer font-bold"
                >
                  Previous
                </button>

                {Array.from({ length: totalPages }).map((_, inx) => {
                  const pNum = inx + 1;
                  return (
                    <button
                      key={pNum}
                      onClick={() => setCurrentPage(pNum)}
                      className={`w-8 h-8 rounded-lg text-xs font-black transition cursor-pointer ${
                        currentPage === pNum 
                          ? 'bg-brand-navy text-white border border-brand-navy' 
                          : 'bg-white border border-slate-205 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {pNum}
                    </button>
                  );
                })}

                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 disabled:opacity-45 hover:bg-slate-50 transition cursor-pointer font-bold"
                >
                  Next
                </button>
              </div>
            </div>

          </div>

        </div>

        {/* Right Side: Interactive widgets panel matching layout precisely */}
        <div id="sup-sidebar-widgets" className="lg:col-span-4 space-y-6">
          
          {/* Records Needing Attention */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-3xs overflow-hidden text-left">
            <div className="bg-slate-50 px-5 py-4 border-b border-slate-200/60 flex items-center gap-2">
              <AlertTriangle className="w-4.5 h-4.5 text-rose-500 shrink-0" />
              <span className="font-extrabold text-brand-navy text-[10.5px] uppercase tracking-wider">
                Records Needing Attention
              </span>
            </div>

            <div className="divide-y divide-slate-100 font-sans">
              
              <div className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                <div className="space-y-1">
                  <h4 className="font-extrabold text-brand-navy text-xs">
                    Students without approved supervisor
                  </h4>
                  <span className="text-[10px] font-bold text-rose-600">
                    {recordSummary.withoutSupervisor} records outstanding
                  </span>
                </div>
                <button
                  onClick={() => {
                    setActiveTab('No Supervisor');
                    setCurrentPage(1);
                    showToast("Filtering to 'No Supervisor' records.");
                  }}
                  className="text-xs font-extrabold text-blue-600 hover:underline cursor-pointer focus:outline-none"
                >
                  Open
                </button>
              </div>

              <div className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                <div className="space-y-1">
                  <h4 className="font-extrabold text-brand-navy text-xs">
                    Supervisor records awaiting workflow action
                  </h4>
                  <div className="text-[10px] font-bold text-amber-600 space-y-0.5">
                    <span className="block">{recordSummary.pending} records in queue</span>
                    <span className="block">Longest waiting: {longestWaitingText}</span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setActiveTab('Pending');
                    setCurrentPage(1);
                    showToast("Filtering to 'Pending' records.");
                  }}
                  className="text-xs font-extrabold text-blue-600 hover:underline cursor-pointer focus:outline-none"
                >
                  Open
                </button>
              </div>

              <div className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                <div className="space-y-1">
                  <h4 className="font-extrabold text-brand-navy text-xs">
                    Lecturers near workload limit
                  </h4>
                  <span className="text-[10px] font-bold text-amber-600">
                    {recordSummary.workloadAlerts} workload alert records
                  </span>
                </div>
                <button
                  onClick={() => {
                    setActiveTab('Workload Alert');
                    setCurrentPage(1);
                    showToast("Filtering to 'Workload Alert' records.");
                  }}
                  className="text-xs font-extrabold text-blue-600 hover:underline cursor-pointer focus:outline-none"
                >
                  Open
                </button>
              </div>

            </div>
          </div>

          {/* Supervisor Workload Snapshot */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-3xs overflow-hidden text-left">
            <div className="bg-slate-50 px-5 py-4 border-b border-slate-200/60 flex items-center justify-between">
              <span className="font-extrabold text-brand-navy text-[10.5px] uppercase tracking-wider block">
                Supervisor Workload Snapshot
              </span>
              <StatusDot tone="success" className="w-2 h-2" />
            </div>

            <div className="p-5 space-y-4 font-sans text-xs">
              <p className="font-semibold leading-relaxed text-slate-500">
                Open workload monitoring for current appointment counts, pending reservations, and configured limits.
              </p>

              {/* View All Workload router button */}
              <button
                onClick={() => {
                  onNavigateToWorkload?.();
                  showToast("Opened Supervisor Workload Monitoring");
                }}
                className="w-full mt-2 py-2.5 border border-slate-250 hover:bg-slate-50 text-brand-navy font-black uppercase text-[10.5px] rounded-xl tracking-wider transition cursor-pointer text-center"
              >
                View All Workload
              </button>

            </div>
          </div>

          {/* Quick Tip Panel */}
          <div className="bg-[#eff6ff] border border-blue-150 rounded-2xl p-5 text-left space-y-3 shadow-3xs">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="font-extrabold text-brand-navy text-[10.5px] uppercase tracking-wider">
                Quick Tip
              </span>
            </div>
            <p className="text-slate-650 text-xs font-semibold leading-relaxed">
              Submission document requirements are centrally configured and snapshot when each application is created.
            </p>
            <button
              onClick={onNavigateToRequirements}
              className="inline-flex items-center gap-1.5 text-xs font-extrabold text-blue-600 hover:text-blue-800 hover:underline mt-1 cursor-pointer"
            >
              <span>Manage Document Requirements</span>
            </button>
          </div>

        </div>

      </div>

    </div>
  );
};
