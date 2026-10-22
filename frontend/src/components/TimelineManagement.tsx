import { PortalSelect } from './PortalSelect';
import { DecisionDialog } from './DecisionDialog';
import { LinkedPeriodStatus } from './LinkedPeriodStatus';
import { completeDecision } from '../utils/decisionSubmission';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ChevronLeft,
  ChevronRight,
  Download,
  Plus,
  Search,
  Trash2,
  Upload
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { APP_ROUTES } from '../constants/routes';
import { useListState } from './ListState';
import {
  createTimelineEntry,
  deleteTimelineEntry,
  downloadTimelineTemplate,
  getActiveTimeline,
  getAcademicSemesters,
  getTimelineAuditLogs,
  saveBlob,
  timelineEntryToLegacy,
  updateTimelineEntry,
} from '../services';
import { AcademicSemester, ActiveSemesterTimeline, TimelineAuditLog, TimelineEntry } from '../types';
import { AddTimelineEntryDrawer } from './AddTimelineEntryDrawer';
import { EditTimelineEntryDrawer } from './EditTimelineEntryDrawer';
import { PageHeader, PortalButton, PortalToast, StatusBadge } from './PortalPrimitives';
import {OfficeToolContext, OfficeToolViews} from './OfficeToolPrimitives';
import { SemesterTimeline } from './SemesterTimeline';
import { ErrorState, LoadingState } from './StateViews';
import { UploadTimelineDrawer } from './UploadTimelineDrawer';
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
  
  // Upload Timeline Drawer Slide-in state
  const [uploadDrawerOpen, setUploadDrawerOpen] = useState(false);
  const [savingEntry, setSavingEntry] = useState(false);
  const savingEntryRef = useRef(false);

  const triggerToast = (msg: string) => {
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
  const [error, setError] = useState<string | null>(null);
  const selectedSemesterRef = useRef(selectedSemesterId);
  selectedSemesterRef.current = selectedSemesterId;
  const loadVersion = useRef(0);
  const semesterLoadVersion = useRef(0);
  const auditPageSize = 10;
  const paginatedAuditLogs = useMemo(
    () => paginate(auditLogs, auditPage, auditPageSize),
    [auditLogs, auditPage],
  );
  const auditRange = paginationRange(auditPage, auditLogs.length, auditPageSize);

  useEffect(() => {
    setAuditPage((page) => clampPage(page, auditLogs.length, auditPageSize));
  }, [auditLogs.length]);

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
    setError(null);
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
        if (version === loadVersion.current) setError(e instanceof Error ? e.message : 'Failed to load timeline entries.');
        if (propagateError) throw e;
      })
      .finally(() => { if (version === loadVersion.current) setLoading(false); });
  }, []);

  const loadSemesters = useCallback(() => {
    const version = ++semesterLoadVersion.current;
    setLoading(true);
    setError(null);
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
        setError(loadError instanceof Error ? loadError.message : 'Failed to load academic semesters.');
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
    if (selectedSemesterRef.current === null) loadSemesters();
    else loadEntries();
  };

  // Search and Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [roleFilter, setRoleFilter] = useState('All');

  // Applied internal filter results
  const [appliedSearch, setAppliedSearch] = useState('');
  const [appliedCategory, setAppliedCategory] = useState('All');
  const [appliedStatus, setAppliedStatus] = useState('All');
  const [appliedRole, setAppliedRole] = useState('All');

  const filteredEntries = entries.filter((ent) => {
    const matchSearch = ent.event.toLowerCase().includes(appliedSearch.toLowerCase());
    const matchCategory = appliedCategory === 'All' || ent.category === appliedCategory;
    const matchStatus = appliedStatus === 'All' || ent.status === appliedStatus;
    const matchRole = appliedRole === 'All' || ent.targetRole.includes(appliedRole as any);

    return matchSearch && matchCategory && matchStatus && matchRole;
  });

  // Entry Management Modals & Drawers
  const [addDrawerOpen, setAddDrawerOpen] = useState(false);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimelineEntry | null>(null);
  const [deletingEntry, setDeletingEntry] = useState(false);
  const deletingEntryRef = useRef(false);
  const [entryToDelete, setEntryToDelete] = useState<{id: string, name: string} | null>(null);

  const handleApplyFilters = () => {
    setAppliedSearch(searchTerm);
    setAppliedCategory(categoryFilter);
    setAppliedStatus(statusFilter);
    setAppliedRole(roleFilter);
    triggerToast('Applied query filters to database records matching your scope.');
  };

  const handleOpenAddModal = () => {
    setAddDrawerOpen(true);
  };

  const handleOpenEditModal = (ent: TimelineEntry) => {
    setEditingEntry(ent);
    setEditDrawerOpen(true);
  };

  const handleAddEntry = (newEntryVal: Omit<TimelineEntry, 'id' | 'status'>) => {
    if (savingEntryRef.current) return;
    savingEntryRef.current = true; setSavingEntry(true);
    createTimelineEntry(newEntryVal, selectedSemesterId ?? undefined)
      .then((savedEntry) => {
        const normalizedEntry = timelineEntryToLegacy(savedEntry);
        triggerToast(`Successfully created timeline entry: "${normalizedEntry.event}"`);
        setAddDrawerOpen(false);
        loadEntries();
      })
      .catch((e) => {
        triggerToast(e instanceof Error ? e.message : 'Failed to create timeline entry.');
      }).finally(() => { savingEntryRef.current = false; setSavingEntry(false); });
  };

  const handleEditEntry = (updated: Omit<TimelineEntry, 'status'>) => {
    if (savingEntryRef.current) return;
    savingEntryRef.current = true; setSavingEntry(true);
    updateTimelineEntry(updated.id, updated)
      .then((savedEntry) => {
        const normalizedEntry = timelineEntryToLegacy(savedEntry);

        triggerToast(`Successfully modified entry: "${normalizedEntry.event}"`);
        setEditDrawerOpen(false);
        loadEntries();
      })
      .catch((e) => {
        triggerToast(e instanceof Error ? e.message : 'Failed to update timeline entry.');
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

  const handleDownloadTemplate = () => {
    triggerToast('Generating Excel master schedule template...');
    downloadTimelineTemplate(selectedSemesterId ?? undefined)
      .then((blob) => {
        saveBlob(blob, 'FSKTM_Semester_Timeline_Template.xlsx');
        triggerToast('Success! FSKTM_Semester_Timeline_Template.xlsx downloaded.');
      })
      .catch((e) => {
        triggerToast(e instanceof Error ? e.message : 'Failed to download timeline template.');
      });
  };

  const handleUploadTimeline = () => {
    setUploadDrawerOpen(true);
  };

  const handleImportSuccess = (importedEvents: TimelineEntry[], importedCount?: number) => {
    setEntries(importedEvents);
    triggerToast(`Import completed! ${importedCount ?? importedEvents.length} entries committed.`);
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
      
      <PortalToast message={toastMessage} />

      {/* Head section title with actions buttons Row */}
      <PageHeader
        className="office-tool-heading"
        title="Calendar"
        subtitle="Plan and communicate semester events. Submission windows and extra time are managed in Periods & deadlines."
        backLabel={backLabel}
        onBack={onBack}
        actions={(
          <>
            <details className="office-tool-import relative"><summary className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-extrabold uppercase tracking-wider">Import & template</summary><div className="absolute right-0 top-full z-20 mt-2 flex w-56 flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <PortalButton variant="secondary" size="md" icon={Download} disabled={!calendarEditable} onClick={handleDownloadTemplate}>
              Download Template
            </PortalButton>
            <PortalButton variant="secondary" size="md" icon={Upload} disabled={!calendarEditable} onClick={handleUploadTimeline}>
              Upload Timeline
            </PortalButton>
            </div></details>
            <PortalButton variant="primary" size="sm" icon={Plus} disabled={!calendarEditable} onClick={handleOpenAddModal}>Add event</PortalButton>
          </>
        )}
      />

      <OfficeToolContext>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <label className="form-label min-w-0 w-full sm:max-w-sm">
          Academic semester
          <PortalSelect
            disabled={extensionId!==null || savingEntry || deletingEntry || uploadDrawerOpen || addDrawerOpen || editDrawerOpen}
            value={selectedSemesterId ?? ''}
            onChange={(event) => {const id=Number(event.target.value);setSelectedSemesterId(id);setSearchParams({semester:String(id)},{replace:true});}}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-sans not-italic normal-case tracking-normal text-xs font-bold"
          >
            {!semesters.length ? <option value="">No Draft, Active or Closed semesters</option> : null}
            {semesters.map((semester) => (
              <option key={semester.id} value={semester.id}>
                {semester.label} - {formatSemesterLifecycle(semester.effectiveStatus)}
              </option>
            ))}
          </PortalSelect>
        </label>
        <div className="flex flex-wrap items-center gap-3 pb-2"><p className="card-description">{loading ? 'Loading calendar…' : `${entries.length} events`}</p>{selectedSemester && <StatusBadge tone={selectedSemester.effectiveStatus==='ACTIVE'?'success':'neutral'}>{formatSemesterLifecycle(selectedSemester.effectiveStatus)}</StatusBadge>}</div>
      </div>
      </OfficeToolContext>

      <OfficeToolViews<typeof view> label="Calendar views" value={view} onChange={setView} options={[{value:'calendar',label:'Calendar'},{value:'entries',label:'Entries'},{value:'history',label:'History'}]}/>
      {view==='calendar' && <SemesterTimeline timeline={timeline} loading={loading} error={error} onRetry={handleRetry} />}
      {/* 2. Timeline Entries Table Section */}
      <div hidden={view!=='entries'} id="timeline-records-box" className="bg-white border border-[#e2e8f0] rounded-2xl p-6 shadow-xs space-y-6 text-left">
        
        <div className="space-y-1 block text-left">
          <h2 className="section-label">
            Timeline Entries
          </h2>
        </div>

        {/* Query filter controls bar block */}
        <div className="filter-toolbar grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          
          {/* Search bar input text input column */}
          <div className="md:col-span-4 relative">
            <input
              type="text"
              placeholder="Search event name"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-control form-control-sm pl-10 pr-4"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 shrink-0" />
          </div>

          {/* Select filter 1: Category */}
          <div className="md:col-span-2 relative">
            <PortalSelect
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="form-control form-control-sm appearance-none cursor-pointer"
            >
              <option value="All">Category: All</option>
              <option value="Research Project (P1)">Research Project (P1)</option>
              <option value="Research Project (P2)">Research Project (P2)</option>
            </PortalSelect>
          </div>

          {/* Select filter 2: Status */}
          <div className="md:col-span-2 relative">
            <PortalSelect
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="form-control form-control-sm appearance-none cursor-pointer"
            >
              <option value="All">Status: All</option>
              <option value="Ended">Ended</option>
              <option value="Active">Active</option>
              <option value="Deadline">Deadline</option>
              <option value="Upcoming">Upcoming</option>
            </PortalSelect>
          </div>

          {/* Select filter 3: Target Role */}
          <div className="md:col-span-2 relative">
            <PortalSelect
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="form-control form-control-sm appearance-none cursor-pointer"
            >
              <option value="All">Target Role: All</option>
              <option value="STUDENT">Student</option>
              <option value="LECTURER">Lecturer</option>
            </PortalSelect>
          </div>

          {/* Action Trigger Filter criteria */}
          <div className="md:col-span-2">
            <PortalButton
              variant="soft"
              size="sm"
              fullWidth
              onClick={handleApplyFilters}
            >
              Apply Filters
            </PortalButton>
          </div>

        </div>

        {/* Data list Table layout */}
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr className="data-thead select-none">
                <th className="data-th">Event</th>
                <th className="data-th">Category</th>
                <th className="data-th">Start Date</th>
                <th className="data-th">End Date</th>
                <th className="data-th">Target Role</th>
                <th className="data-th text-center">Status</th>
                <th className="data-th text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-0 text-xs font-semibold">
                    <LoadingState message="Loading timeline…" />
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="p-0 text-xs font-semibold">
                    <ErrorState message={error} onRetry={handleRetry} />
                  </td>
                </tr>
              ) : filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 italic text-xs font-semibold">
                    No timeline schedule events found matching your filter scope criteria.
                  </td>
                </tr>
              ) : (
                filteredEntries.map((ent) => (
                  <tr key={ent.id} className="data-row">
                    {/* Event name banner */}
                    <td className="data-td-strong max-w-[240px]">
                      {ent.event}
                    </td>

                    {/* Category Label description */}
                    <td className="data-td">
                      {ent.category}
                    </td>

                    {/* Start timeline */}
                    <td className="data-td font-mono">
                      {ent.startDate}
                    </td>

                    {/* End timeline */}
                    <td className="data-td font-mono">
                      {ent.endDate}
                    </td>

                    {/* Target Roles Badge Chips */}
                    <td className="data-td">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {ent.targetRole.map((role) => (
                          <span
                            key={role}
                            className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wider leading-none shrink-0 ${
                              role === 'STUDENT'
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-150/40'
                                : 'bg-slate-100 text-slate-700 border border-slate-200/50'
                            }`}
                          >
                            {role}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Status indicator pill with colored bullet code */}
                    <td className="data-td text-center">
                      {ent.linkedPeriodStatus?<LinkedPeriodStatus status={ent.linkedPeriodStatus}/>:<StatusBadge tone={getStatusTone(ent.status)} dot pulse={ent.status === 'Deadline'}>
                        {ent.status}
                      </StatusBadge>}
                    </td>

                    {/* Manage row edit handler link */}
                    <td className="data-td text-right">
                      <div className="flex items-center justify-end gap-2.5">
                        {ent.operationalPeriodId || ent.marksPeriodId ? <Link
                          to={`${APP_ROUTES.dashboardPeriods}?semester=${selectedSemesterId}${ent.operationalPeriodId ? `#operational-period-${ent.operationalPeriodId}` : `#marks-period-${ent.marksPeriodId}`}`}
                          className="text-[#2563eb] hover:underline font-bold text-xs"
                        >Manage period</Link> : <><button
                          disabled={!calendarEditable}
                          onClick={() => handleOpenEditModal(ent)}
                          className="text-[#2563eb] hover:text-[#1d4ed8] font-bold text-xs hover:underline cursor-pointer"
                        >
                          Edit
                        </button><button type="button" disabled={!calendarEditable} onClick={()=>setExtensionId(Number(ent.id))} className="text-blue-700 hover:underline text-xs">Extend date</button></>}
                        <span className="card-description text-slate-300">|</span>
                        <button
                          disabled={!calendarEditable}
                          onClick={() => handleDeleteEntry(ent.id, ent.event)}
                          className="text-slate-400 hover:text-red-600 transition"
                          title="Delete Timeline Step"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* 3. Recent Updates Track Section */}
      <div hidden={view!=='history'} id="recent-timeline-updates-card" className="bg-white border border-[#e2e8f0] rounded-2xl p-6 shadow-xs space-y-4 text-left">
        <h3 className="section-label">
          Recent Timeline Updates
        </h3>

        <div className="overflow-x-auto pt-1">
          <table className="data-table">
            <thead>
              <tr className="data-thead select-none">
                <th className="data-th text-left">USER</th>
                <th className="data-th text-left">DATE</th>
                <th className="data-th text-left">ACTION</th>
                <th className="data-th text-left">DETAILS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="p-0 text-xs font-semibold">
                    <LoadingState message="Loading audit log..." />
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={4} className="p-0 text-xs font-semibold">
                    <ErrorState message={error} onRetry={handleRetry} />
                  </td>
                </tr>
              ) : auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-slate-400 italic text-xs font-semibold">
                    No timeline audit records are available yet.
                  </td>
                </tr>
              ) : paginatedAuditLogs.map((log) => (
                <tr key={log.id} className="data-row">
                  {/* User identity cell with photo avatar */}
                  <td className="data-td flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full border border-slate-200 bg-slate-100 text-[9px] font-black text-slate-600 flex items-center justify-center">
                      {initials(log.actorName)}
                    </span>
                    <span className="card-value">{log.actorName}</span>
                  </td>

                  {/* Operation date log */}
                  <td className="data-td">
                    {formatDisplayDate(log.createdAt)}
                  </td>

                  {/* Operational tag action color mapping */}
                  <td className="data-td-strong">
                    <span className={actionColor(log.action)}>
                      {actionLabel(log.action)}
                    </span>
                  </td>

                  {/* Details summary */}
                  <td className="data-td">
                    {log.summary}
                    {typeof log.before?.deadlineEnd === 'string' && typeof log.after?.deadlineEnd === 'string' ? <p className="card-description mt-1">Deadline: {formatDisplayDate(log.before.deadlineEnd)} → {formatDisplayDate(log.after.deadlineEnd)}</p> : null}
                    {log.reason ? <p className="card-description mt-1 whitespace-pre-wrap">Reason: {log.reason}</p> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && !error && auditLogs.length > 0 && (
          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
            <span className="card-description">
              Showing {auditRange.start} to {auditRange.end} of {auditRange.total} updates
            </span>
            <div className="flex items-center gap-1.5 select-none">
              <button
                type="button"
                aria-label="Previous audit page"
                disabled={auditPage === 1}
                onClick={() => setAuditPage((page) => Math.max(1, page - 1))}
                className="w-8 h-8 rounded-lg bg-white border border-slate-250 flex items-center justify-center text-slate-700 disabled:opacity-40 hover:bg-slate-50 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: auditRange.totalPages }, (_, index) => index + 1).map((page) => (
                <button
                  type="button"
                  key={page}
                  onClick={() => setAuditPage(page)}
                  className={`w-8 h-8 rounded-lg text-xs font-black transition ${
                    auditPage === page
                      ? 'bg-brand-navy text-white border border-brand-navy'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                type="button"
                aria-label="Next audit page"
                disabled={auditPage === auditRange.totalPages}
                onClick={() => setAuditPage((page) => Math.min(auditRange.totalPages, page + 1))}
                className="w-8 h-8 rounded-lg bg-white border border-slate-250 flex items-center justify-center text-slate-700 disabled:opacity-40 hover:bg-slate-50 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Timeline Slide-in Drawer */}
      <AddTimelineEntryDrawer
        busy={savingEntry}
        isOpen={addDrawerOpen}
        onClose={() => setAddDrawerOpen(false)}
        onSave={handleAddEntry}
        timelineLabel={selectedSemester?.label ?? 'the active timeline'}
      />

      {/* Edit Timeline Slide-in Drawer */}
      <EditTimelineEntryDrawer
        busy={savingEntry}
        isOpen={editDrawerOpen}
        onClose={() => {
          setEditDrawerOpen(false);
          setEditingEntry(null);
        }}
        entry={editingEntry}
        onSave={handleEditEntry}
        timelineLabel={selectedSemester?.label ?? 'the active timeline'}
      />

      {/* Upload Timeline Slide-in Drawer */}
      <UploadTimelineDrawer 
        isOpen={uploadDrawerOpen && Boolean(selectedSemester)}
        onClose={() => setUploadDrawerOpen(false)} 
        onImportSuccess={handleImportSuccess}
        semesterId={selectedSemester?.id ?? 0}
        semesterLabel={selectedSemester?.label ?? 'No semester selected'}
      />

      {/* Delete Confirmation Modal */}
      <InformationalEventExtension entry={timeline?.levels.flatMap(group=>group.entries).find(entry=>entry.id===extensionId)??null} onClose={()=>setExtensionId(null)} onReload={async()=>{await loadEntries(true);}}/>
      <DecisionDialog kind="confirmation" tone="danger" decisionKey={entryToDelete?.id} successMessage="Timeline entry deleted." onReload={async () => { await loadEntries(true); }} isOpen={!!entryToDelete} title="Delete Timeline Entry?" message={<>Permanently remove <strong>{entryToDelete?.name}</strong> from the postgraduate timeline? This action cannot be undone.</>} confirmLabel="Delete Entry" busy={deletingEntry} onConfirm={confirmDeleteEntry} onClose={() => { if (!deletingEntryRef.current) setEntryToDelete(null); }} />

    </div>
  );
};
