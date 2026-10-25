import { PortalSelect } from './PortalSelect';
import { DecisionDialog } from './DecisionDialog';
import { LinkedPeriodStatus } from './LinkedPeriodStatus';
import { completeDecision } from '../utils/decisionSubmission';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Plus, CalendarDays, ListChecks, History
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { APP_ROUTES } from '../constants/routes';
import { useListState } from './ListState';
import {
  createTimelineEntry,
  deleteTimelineEntry,
  getActiveTimeline,
  getAcademicSemesters,
  getTimelineAuditLogs,
  timelineEntryToLegacy,
  updateTimelineEntry,
} from '../services';
import { AcademicSemester, ActiveSemesterTimeline, TimelineAuditLog, TimelineEntry } from '../types';
import { EditTimelineEntryDrawer } from './EditTimelineEntryDrawer';
import { PageHeader, PortalButton, PortalToast, StatusBadge } from './PortalPrimitives';
import { TimelineAddEventsModal } from './TimelineAddEventsModal';
import {OfficeToolHeading, OfficeToolViews} from './OfficeToolPrimitives';
import { CoordinatorDataTable } from './CoordinatorBrowsePrimitives';
import { WorkspaceFilterCard, WorkspacePagination } from './RequestWorkspacePrimitives';
import { SemesterTimeline } from './SemesterTimeline';
import { ErrorState, LoadingState } from './StateViews';
import { InformationalEventExtension } from './InformationalEventExtension';
import { clampPage, paginate, paginationRange } from '../utils/pagination';
import { formatSemesterLifecycle } from '../utils/academicSemesters';
import { canManagePeriodSemester, canEditTimelineSemester, loadPeriodTimeline } from '../utils/operationalPeriodAccess';

// TimelineEntry now lives in src/types.

interface TimelineManagementProps {
  onBack: () => void;
  backLabel?: string;
  onManageSemesters: () => void;
}

const formatDisplayDate = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const actionLabel = (action: TimelineAuditLog['action']) => {
  switch (action) {
    case 'UPLOAD':
      return 'Uploaded timeline';
    case 'REPLACE':
      return 'Replaced timeline';
    case 'ADD_ENTRY':
      return 'Added entry';
    case 'EDIT_ENTRY':
      return 'Edited entry';
    case 'EXTEND':
      return 'Extended deadline';
    case 'DELETE_ENTRY':
      return 'Deleted entry';
    default:
      return action;
  }
};

const actionColor = (action: TimelineAuditLog['action']) => {
  switch (action) {
    case 'UPLOAD':
    case 'REPLACE':
      return 'text-[#2563eb]';
    case 'ADD_ENTRY':
      return 'text-[#16a34a]';
    case 'EDIT_ENTRY':
    case 'EXTEND':
      return 'text-[#d97706]';
    case 'DELETE_ENTRY':
      return 'text-[#dc2626]';
    default:
      return 'text-slate-600';
  }
};

const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'OS';

export const TimelineManagement: React.FC<TimelineManagementProps> = ({
  onBack,
  backLabel = 'Back to Office Dashboard',
  onManageSemesters,
}) => {
  const [searchParams,setSearchParams] = useSearchParams();
  const [view,setView] = useListState<'calendar'|'entries'|'history'>('OfficeCalendar','view','calendar');
  const [extensionId,setExtensionId] = useState<number|null>(null);
  // Toast overlay
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastTone, setToastTone] = useState<'info' | 'success' | 'danger'>('info');

  // Upload Timeline Drawer Slide-in state

  const [savingEntry, setSavingEntry] = useState(false);
  const savingEntryRef = useRef(false);

  const triggerToast = (msg: string, tone: 'info' | 'success' | 'danger' = 'info') => {
    setToastTone(tone);
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [timeline, setTimeline] = useState<ActiveSemesterTimeline | null>(null);
  const [semesters, setSemesters] = useState<AcademicSemester[]>([]);
  const [selectedSemesterId, setSelectedSemesterId] = useState<number | null>(()=>{const value=Number(searchParams.get('semester')); return Number.isInteger(value)&&value>0?value:null;});
  const [auditLogs, setAuditLogs] = useState<TimelineAuditLog[]>([]);
  const [auditPage, setAuditPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [semesterError, setSemesterError] = useState<string | null>(null);
  const [entriesError, setEntriesError] = useState<string | null>(null);
  const [entrySaveError, setEntrySaveError] = useState<string | null>(null);
  const error = semesterError ?? entriesError;
  const selectedSemesterRef = useRef(selectedSemesterId);
  selectedSemesterRef.current = selectedSemesterId;
  const loadVersion = useRef(0);
  const semesterLoadVersion = useRef(0);
  const [auditPageSize, setAuditPageSize] = useState(10);
  const paginatedAuditLogs = useMemo(
    () => paginate(auditLogs, auditPage, auditPageSize),
    [auditLogs, auditPage, auditPageSize],
  );
  const auditRange = paginationRange(auditPage, auditLogs.length, auditPageSize);

  useEffect(() => {
    setAuditPage((page) => clampPage(page, auditLogs.length, auditPageSize));
  }, [auditLogs.length, auditPageSize]);

  const selectedSemester = semesters.find((semester) => semester.id === selectedSemesterId) ?? null;
  const calendarEditable = canEditTimelineSemester(selectedSemester?.lifecycleStatus);
  const selectedSemesterLifecycleRef = useRef(selectedSemester?.lifecycleStatus);
  selectedSemesterLifecycleRef.current = selectedSemester?.lifecycleStatus;

  const loadEntries = useCallback((propagateError = false) => {
    const semesterId = selectedSemesterRef.current;
    const version = ++loadVersion.current;
    if (!semesterId) {
      setTimeline(null);
      setEntries([]);
      setAuditLogs([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setEntriesError(null);
    setTimeline(null);
    setEntries([]);
    setAuditLogs([]);
    return loadPeriodTimeline(semesterId, selectedSemesterLifecycleRef.current ?? 'CLOSED', getActiveTimeline, getTimelineAuditLogs)
      .then(([activeTimeline, logs]) => {
        if (version !== loadVersion.current) return;
        setTimeline(activeTimeline);
        setEntries(activeTimeline?.available
          ? activeTimeline.levels.flatMap((group) => group.entries.map(timelineEntryToLegacy))
          : []);
        setAuditLogs(logs);
      })
      .catch((e) => {
        if (version === loadVersion.current) setEntriesError(e instanceof Error ? e.message : 'Failed to load timeline entries.');
        if (propagateError) throw e;
      })
      .finally(() => { if (version === loadVersion.current) setLoading(false); });
  }, []);

  const loadSemesters = useCallback(() => {
    const version = ++semesterLoadVersion.current;
    setLoading(true);
    setSemesterError(null);
    getAcademicSemesters()
      .then((rows) => {
        if (version !== semesterLoadVersion.current) return;
        const editable = rows.filter((semester) => (
          canManagePeriodSemester(semester.lifecycleStatus)
        ));
        setSemesters(editable);
        setSelectedSemesterId((current) => (
          current && editable.some((semester) => semester.id === current)
            ? current
            : editable.find((semester) => semester.effectiveStatus === 'ACTIVE')?.id
              ?? editable[0]?.id
              ?? null
        ));
        if (editable.length === 0) setLoading(false);
      })
      .catch((loadError) => {
        if (version !== semesterLoadVersion.current) return;
        setSemesterError(loadError instanceof Error ? loadError.message : 'Failed to load academic semesters.');
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    loadSemesters();
    return () => { semesterLoadVersion.current += 1; };
  }, [loadSemesters]);

  useEffect(() => {
    if (selectedSemesterId !== null && selectedSemester) loadEntries();
    return () => { loadVersion.current += 1; };
  }, [loadEntries, selectedSemesterId, selectedSemester?.lifecycleStatus]);

  const handleRetry = () => {
    if (semesterError || selectedSemesterRef.current === null) loadSemesters();
    else loadEntries();
  };

  // Search and Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [roleFilter, setRoleFilter] = useState('All');

  const [entryPage, setEntryPage] = useState(1);
  const [entryPageSize, setEntryPageSize] = useState(10);

  // Filter results update as controls change.
  const filteredEntries = entries.filter((ent) => {
    const matchSearch = ent.event.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = categoryFilter === 'All' || ent.category === categoryFilter;
    const matchStatus = statusFilter === 'All' || ent.status === statusFilter;
    const matchRole = roleFilter === 'All' || ent.targetRole.includes(roleFilter as any);

    return matchSearch && matchCategory && matchStatus && matchRole;
  });

  // Entry Management Modals & Drawers
  const [addDrawerOpen, setAddDrawerOpen] = useState(false);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimelineEntry | null>(null);
  const [deletingEntry, setDeletingEntry] = useState(false);
  const deletingEntryRef = useRef(false);
  const [entryToDelete, setEntryToDelete] = useState<{id: string, name: string} | null>(null);

  useEffect(() => { setEntryPage(1); }, [searchTerm, categoryFilter, statusFilter, roleFilter, selectedSemesterId]);
  const entryRange = paginationRange(entryPage, filteredEntries.length, entryPageSize);
  const currentEntryPage = clampPage(entryPage, filteredEntries.length, entryPageSize);
  const shownEntries = paginate(filteredEntries, currentEntryPage, entryPageSize);

  const handleOpenAddModal = () => {
    setEntrySaveError(null);
    setAddDrawerOpen(true);
  };

  const handleOpenEditModal = (ent: TimelineEntry) => {
    setEntrySaveError(null);
    setEditingEntry(ent);
    setEditDrawerOpen(true);
  };

  const handleAddEntry = (newEntryVal: Omit<TimelineEntry, 'id' | 'status'>) => {
    if (savingEntryRef.current) return;
    setEntrySaveError(null);
    savingEntryRef.current = true; setSavingEntry(true);
    createTimelineEntry(newEntryVal, selectedSemesterId ?? undefined)
      .then((savedEntry) => {
        const normalizedEntry = timelineEntryToLegacy(savedEntry);
        triggerToast(`Successfully created timeline entry: "${normalizedEntry.event}"`, 'success');
        setAddDrawerOpen(false);
        loadEntries();
      })
      .catch((e) => {
        setEntrySaveError(e instanceof Error ? e.message : 'Failed to create timeline entry.');
      }).finally(() => { savingEntryRef.current = false; setSavingEntry(false); });
  };

  const handleEditEntry = (updated: Omit<TimelineEntry, 'status'>) => {
    if (savingEntryRef.current) return;
    setEntrySaveError(null);
    savingEntryRef.current = true; setSavingEntry(true);
    updateTimelineEntry(updated.id, updated)
      .then((savedEntry) => {
        const normalizedEntry = timelineEntryToLegacy(savedEntry);

        triggerToast(`Successfully modified entry: "${normalizedEntry.event}"`, 'success');
        setEditDrawerOpen(false);
        loadEntries();
      })
      .catch((e) => {
        setEntrySaveError(e instanceof Error ? e.message : 'Failed to update timeline entry.');
      }).finally(() => { savingEntryRef.current = false; setSavingEntry(false); });
  };

  const handleDeleteEntry = (id: string, name: string) => {
    setEntryToDelete({ id, name });
  };

  const confirmDeleteEntry = async () => {
    if (!entryToDelete || deletingEntryRef.current) return false;
    deletingEntryRef.current = true; setDeletingEntry(true);
    const { id } = entryToDelete;
    try { return await completeDecision(() => deleteTimelineEntry(id), async () => { await loadEntries(true); }); }
    finally { deletingEntryRef.current = false; setDeletingEntry(false); }
  };

  const handleImportSuccess = (importedEvents: TimelineEntry[], importedCount?: number) => {
    setEntries(importedEvents);
    triggerToast(`Import completed! ${importedCount ?? importedEvents.length} entries committed.`, 'success');
    loadEntries();
  };

  const getStatusTone = (status: TimelineEntry['status']) => {
    switch (status) {
      case 'Ended':
        return 'neutral';
      case 'Active':
        return 'info';
      case 'Deadline':
        return 'danger';
      case 'Upcoming':
        return 'warning';
      default:
        return 'neutral';
    }
  };

  return (
    <div id="timeline-management-universe" className="space-y-8 animate-fade-in text-left font-sans text-xs pb-16">

      <PortalToast message={toastMessage} tone={toastTone} />

      {/* Head section title with actions buttons Row */}
      <PageHeader
        className="office-tool-heading"
        title="Calendar"
        subtitle="Plan and communicate semester events. Submission windows and extra time are managed in Periods & deadlines."
        backLabel={backLabel}
        onBack={onBack}

      />

      <div className="capacity-semester-selection" role="region" aria-label="Semester context">
        <div className="capacity-semester-control">
          <label htmlFor="timeline-academic-semester" className="capacity-field-label">Academic semester</label>
          <PortalSelect id="timeline-academic-semester" className="form-control form-control-md"
            aria-describedby={selectedSemester ? 'timeline-semester-dates' : undefined}
            disabled={extensionId!==null || savingEntry || deletingEntry || addDrawerOpen || editDrawerOpen}
            value={selectedSemesterId ?? ''}
            onChange={event => { const id=Number(event.target.value); setSelectedSemesterId(id); setSearchParams({semester:String(id)},{replace:true}); }}>
            {!semesters.length && <option value="">No available semesters</option>}
            {semesters.map(semester => <option key={semester.id} value={semester.id}>{semester.label}</option>)}
          </PortalSelect>
          {selectedSemester && <p id="timeline-semester-dates" className="capacity-semester-dates">{formatDisplayDate(selectedSemester.startsOn)} – {formatDisplayDate(selectedSemester.endsOn)}</p>}
        </div>
        {selectedSemester && <div className="capacity-semester-status"><StatusBadge tone={selectedSemester.effectiveStatus==='ACTIVE'?'success':selectedSemester.effectiveStatus==='DRAFT'?'warning':'neutral'}>{formatSemesterLifecycle(selectedSemester.effectiveStatus)}</StatusBadge></div>}
      </div>
      <OfficeToolViews<typeof view> appearance="workspace" label="Calendar views" value={view} onChange={setView} options={[{value:'calendar',label:'Calendar',icon:CalendarDays},{value:'entries',label:'Entries',icon:ListChecks},{value:'history',label:'History',icon:History}]}/>
      {view==='calendar' && <SemesterTimeline timeline={timeline} loading={loading} error={error} onRetry={handleRetry} actions={<PortalButton variant="primary" size="sm" icon={Plus} disabled={!calendarEditable} onClick={handleOpenAddModal}>Add events</PortalButton>} />}
      <section hidden={view!=='entries'} id="timeline-records-box" className="timeline-workspace-table rounded-xl border border-slate-200 bg-white p-4 sm:p-5 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><OfficeToolHeading icon={ListChecks}>Timeline entries</OfficeToolHeading><PortalButton variant="primary" size="sm" icon={Plus} disabled={!calendarEditable} onClick={handleOpenAddModal}>Add events</PortalButton></div>
        <WorkspaceFilterCard onReset={() => { setSearchTerm(''); setCategoryFilter('All'); setStatusFilter('All'); setRoleFilter('All'); setEntryPage(1); }}>
          <label className="form-label min-w-0">Find an event<input type="search" placeholder="Search event name" className="form-control form-control-sm mt-1" value={searchTerm} onChange={event => setSearchTerm(event.target.value)} /></label>
          <label className="form-label min-w-0">Category<PortalSelect className="form-control form-control-sm mt-1" value={categoryFilter} onChange={event => setCategoryFilter(event.target.value)}><option value="All">All categories</option><option value="Research Project (P1)">Research Project (P1)</option><option value="Research Project (P2)">Research Project (P2)</option></PortalSelect></label>
          <label className="form-label min-w-0">Status<PortalSelect className="form-control form-control-sm mt-1" value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option value="All">All statuses</option>{['Ended','Active','Deadline','Upcoming'].map(status => <option key={status}>{status}</option>)}</PortalSelect></label>
          <label className="form-label min-w-0">Audience<PortalSelect className="form-control form-control-sm mt-1" value={roleFilter} onChange={event => setRoleFilter(event.target.value)}><option value="All">All audiences</option><option value="STUDENT">Student</option><option value="LECTURER">Lecturer</option></PortalSelect></label>
        </WorkspaceFilterCard>
        {loading ? <LoadingState message="Loading timeline…" /> : error ? <ErrorState message={error} onRetry={handleRetry} /> : <>
          <p role="status" className="card-description">{filteredEntries.length ? `Showing ${entryRange.start}–${entryRange.end} of ${filteredEntries.length} events` : 'No matching events. Adjust or clear the filters.'}</p>
          <CoordinatorDataTable label="Timeline entries" columns={['Event','Category','Starts on','Ends on','Audience','Status','Action']} rows={shownEntries.map(ent => ({key:ent.id, cells:[
            ent.event, ent.category, ent.startDate, ent.endDate,
            <div className="flex flex-wrap gap-1.5">{ent.targetRole.map(role => <StatusBadge key={role} tone="neutral">{role === 'STUDENT' ? 'Student' : role === 'LECTURER' ? 'Lecturer' : role}</StatusBadge>)}</div>,
            ent.linkedPeriodStatus ? <LinkedPeriodStatus status={ent.linkedPeriodStatus}/> : <StatusBadge tone={getStatusTone(ent.status)} dot pulse={ent.status==='Deadline'}>{ent.status}</StatusBadge>,
            <div className="flex flex-wrap items-center gap-2">
              {ent.operationalPeriodId || ent.marksPeriodId ? <Link
                to={`${APP_ROUTES.dashboardPeriods}?semester=${selectedSemesterId}${ent.operationalPeriodId ? `#operational-period-${ent.operationalPeriodId}` : `#marks-period-${ent.marksPeriodId}`}`}
                className="inline-flex rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy/20"
              >Manage period</Link> : <>
                <PortalButton size="sm" disabled={!calendarEditable} onClick={() => handleOpenEditModal(ent)}>Edit event</PortalButton>
              </>}
              <PortalButton size="sm" variant="ghost" className="text-rose-700 hover:bg-rose-50 hover:text-rose-800" aria-label={`Delete ${ent.event}`} disabled={!calendarEditable} onClick={() => handleDeleteEntry(ent.id, ent.event)}>Delete</PortalButton>
            </div>

          ]}))} />
          <WorkspacePagination page={currentEntryPage} pageCount={entryRange.totalPages} total={filteredEntries.length} pageSize={entryPageSize} noun="events" onPage={setEntryPage} onPageSize={size => {setEntryPageSize(size);setEntryPage(1);}} />
        </>}
      </section>
      <section hidden={view!=='history'} id="recent-timeline-updates-card" className="timeline-workspace-table rounded-xl border border-slate-200 bg-white p-4 sm:p-5 space-y-5">
        <OfficeToolHeading icon={History}>Recent timeline updates</OfficeToolHeading>
        {loading ? <LoadingState message="Loading audit log…" /> : error ? <ErrorState message={error} onRetry={handleRetry} /> : !auditLogs.length ? <p className="card-description">No timeline updates yet.</p> : <>
          <CoordinatorDataTable label="Timeline history" columns={['User','Date','Action','Details']} rows={paginatedAuditLogs.map(log => ({key:log.id,cells:[
            <div className="flex items-center gap-3"><span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">{initials(log.actorName)}</span><span>{log.actorName}</span></div>,
            formatDisplayDate(log.createdAt), <span className={actionColor(log.action)}>{actionLabel(log.action)}</span>,
            <div>{log.summary}{typeof log.before?.deadlineEnd === 'string' && typeof log.after?.deadlineEnd === 'string' && <p className="card-description mt-1">Deadline: {formatDisplayDate(log.before.deadlineEnd)} → {formatDisplayDate(log.after.deadlineEnd)}</p>}{log.reason && <p className="card-description mt-1 whitespace-pre-wrap">Reason: {log.reason}</p>}</div>
          ]}))} />
          <WorkspacePagination page={auditPage} pageCount={auditRange.totalPages} total={auditLogs.length} pageSize={auditPageSize} noun="updates" onPage={setAuditPage} onPageSize={size=>{setAuditPageSize(size);setAuditPage(1);}} />
        </>}
      </section>

      {addDrawerOpen && selectedSemester && <TimelineAddEventsModal
        error={entrySaveError} busy={savingEntry}
        onClose={() => setAddDrawerOpen(false)} onSave={handleAddEntry}
        onImportSuccess={handleImportSuccess}
        semesterId={selectedSemester.id} semesterLabel={selectedSemester.label}
      />}

      {/* Edit Timeline Slide-in Drawer */}
      <EditTimelineEntryDrawer
        error={entrySaveError}
        busy={savingEntry}
        isOpen={editDrawerOpen}
        onClose={() => {
          setEditDrawerOpen(false);
          setEditingEntry(null);
        }}
        entry={editingEntry}
        onSave={handleEditEntry}
        onExtendDeadline={calendarEditable && editingEntry ? () => setExtensionId(Number(editingEntry.id)) : undefined}
        timelineLabel={selectedSemester?.label ?? 'the active timeline'}
      />

      {/* Delete Confirmation Modal */}
      <InformationalEventExtension entry={timeline?.levels.flatMap(group=>group.entries).find(entry=>entry.id===extensionId)??null} onClose={()=>setExtensionId(null)} onReload={async()=>{await loadEntries(true); setEditDrawerOpen(false); setEditingEntry(null);}}/>
      <DecisionDialog kind="confirmation" tone="danger" decisionKey={entryToDelete?.id} successMessage="Timeline entry deleted." onReload={async () => { await loadEntries(true); }} isOpen={!!entryToDelete} title="Delete Timeline Entry?" message={<>Permanently remove <strong>{entryToDelete?.name}</strong> from the postgraduate timeline? This action cannot be undone.</>} confirmLabel="Delete Entry" busy={deletingEntry} onConfirm={confirmDeleteEntry} onClose={() => { if (!deletingEntryRef.current) setEntryToDelete(null); }} />

    </div>
  );
};
