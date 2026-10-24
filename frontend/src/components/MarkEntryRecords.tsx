import { WorkspaceFilterCard } from './RequestWorkspacePrimitives';
import { MarksHeading } from './MarksPrimitives';
import { PortalSelect } from './PortalSelect';
import { OfficeMonitoringNotice, useOfficeMonitoring } from './OfficeMonitoringContext';
import { filterMonitoringMarks } from '../utils/officeMonitoring';
import { useListState } from './ListState';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Search,
  Files,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { PageHeader } from './PortalPrimitives';
import { LoadingState, ErrorState } from './StateViews';
import { MarkRecord } from '../types';
import { getMarkRecords } from '../services';
import {
  filterMarkRecordsByStatusTab,
  MarkRecordStatusTab,
} from '../utils/markRecords';
import { formatDeadlineText } from '../utils/workflowAgeing';
import { pageWindow } from '../utils/pageWindow';

interface MarkEntryRecordsProps {
  onBack: () => void;
  backLabel?: string;
  onViewRecordDetail: (recordId: string) => void;
  onNavigateToDossier?: (studentId: string) => void;
  initialStatusTab?: MarkRecordStatusTab;
}

export const MarkEntryRecords: React.FC<MarkEntryRecordsProps> = ({
  onBack,
  backLabel = 'Back to Marks overview',
  onViewRecordDetail,
  onNavigateToDossier,
  initialStatusTab: requestedStatusTab = 'All Records',
}) => {
  const [allRecords, setRecords] = useState<MarkRecord[]>([]);
  const monitoring = useOfficeMonitoring();
  const initialStatusTab = monitoring ? 'All Records' : requestedStatusTab;
  const records = useMemo(() => filterMonitoringMarks(allRecords, monitoring?.view ?? null), [allRecords, monitoring?.view]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRecords = useCallback(() => {
    setLoading(true);
    setError(null);
    getMarkRecords()
      .then(setRecords)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load mark records.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  // Live filters retained in the authenticated shell.
  const [searchQuery, setSearchQuery] = useListState('MarkEntryRecords', 'searchQuery', '');
  const [programmeFilter, setProgrammeFilter] = useListState('MarkEntryRecords', 'programmeFilter', 'All Programmes');
  const [semesterFilter, setSemesterFilter] = useListState('MarkEntryRecords', 'semesterFilter', 'All Semesters');
  const [panelFilter, setPanelFilter] = useListState('MarkEntryRecords', 'panelFilter', 'All Members');

  // One status filter, retained in authenticated-shell list memory.
  const [activeTab, setActiveTab] = useListState<MarkRecordStatusTab>('MarkEntryRecords', 'activeTab', initialStatusTab);

  // Retain only the legacy status fallback from the former explicit-Apply UI.
  const [legacyFilters, setLegacyFilters] = useListState('MarkEntryRecords', 'appliedFilters', { status: 'All Statuses' });

  // Current page
  const [currentPage, setCurrentPage] = useListState('MarkEntryRecords', 'currentPage', 1);
  const itemsPerPage = 5;

  const [routeStatus, setRouteStatus] = useListState('MarkEntryRecords', 'routeStatus', initialStatusTab);
  useEffect(() => {
    if (routeStatus !== initialStatusTab) { setActiveTab(initialStatusTab); setCurrentPage(1); }
    setRouteStatus(initialStatusTab);
  }, [initialStatusTab, routeStatus, setActiveTab, setCurrentPage, setRouteStatus]);

  // Preserve a previously applied dropdown status when returning from older list state.
  const selectedStatus: MarkRecordStatusTab = activeTab !== 'All Records' ? activeTab
    : legacyFilters.status === 'Draft' ? 'Draft Saved'
    : ['Submitted', 'Not Started', 'Overdue'].includes(legacyFilters.status)
      ? legacyFilters.status as MarkRecordStatusTab : 'All Records';
  const statusFilters = (['All Records', 'Submitted', 'Draft Saved', 'Not Started', 'Overdue'] as const)
    .map(key => ({ key, count: filterMarkRecordsByStatusTab(records, key).length }));
  const hasFilters = selectedStatus !== 'All Records' || !!searchQuery
    || programmeFilter !== 'All Programmes' || semesterFilter !== 'All Semesters'
    || panelFilter !== 'All Members';
  const clearFilters = () => {
    setSearchQuery(''); setProgrammeFilter('All Programmes'); setSemesterFilter('All Semesters');
    setPanelFilter('All Members'); setActiveTab('All Records'); setCurrentPage(1);
    setLegacyFilters({ status: 'All Statuses' });
  };
  const programmeOptions = useMemo(
    () => Array.from(new Set(records.map((record) => record.programme))).filter(Boolean).sort(),
    [records],
  );
  const semesterOptions = useMemo(
    () => Array.from(new Set(records.map((record) => record.semester))).filter(Boolean).sort(),
    [records],
  );
  const evaluatorOptions = useMemo(
    () => Array.from(new Set(records.map((record) => record.panelMember))).filter(Boolean).sort(),
    [records],
  );

  // Derived filtered dataset matching active constraints
  const filteredRecords = useMemo(() => {
    return filterMarkRecordsByStatusTab(records, selectedStatus).filter(rec => {
      // 1. Text Search matching student name, student ID, panel member, or research title
      const searchText = searchQuery.toLowerCase();
      if (searchText) {
        const matchesStudentName = rec.studentName.toLowerCase().includes(searchText);
        const matchesStudentID = rec.studentId.toLowerCase().includes(searchText);
        const matchesPanel = rec.panelMember.toLowerCase().includes(searchText);
        const matchesTitle = rec.researchTitle.toLowerCase().includes(searchText);
        if (!matchesStudentName && !matchesStudentID && !matchesPanel && !matchesTitle) {
          return false;
        }
      }

      // 2. Programme filter
      if (programmeFilter !== 'All Programmes' && rec.programme !== programmeFilter) {
        return false;
      }

      // 3. Semester filter
      if (semesterFilter !== 'All Semesters' && rec.semester !== semesterFilter) {
        return false;
      }

      // 4. Panel Member filter
      if (panelFilter !== 'All Members' && rec.panelMember !== panelFilter) {
        return false;
      }

      return true;
    });
  }, [records, searchQuery, programmeFilter, semesterFilter, panelFilter, selectedStatus]);

  // Pagination indexing calculations
  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage) || 1;
  useEffect(() => {
    if (!loading && !error && currentPage > totalPages) setCurrentPage(totalPages);
  }, [loading, error, currentPage, totalPages, setCurrentPage]);
  const paginationPages = pageWindow(currentPage, totalPages);
  const paginatedRecords = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredRecords.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredRecords, currentPage]);

  return (
    <div id="mark-entry-records-dashboard" className="marks-workspace space-y-5 text-left relative">
      
      {/* Breadcrumb back link & Title header */}
      <PageHeader
        title="Mark Entry Records"
        subtitle="Find evaluation records and review submission progress."
        backLabel={backLabel}
        onBack={onBack}
        subtitleClassName="leading-relaxed"
      />

      <OfficeMonitoringNotice />

      <div id="mark-records-table-container" className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-3xs">
        <div id="records-filters-card" className="space-y-4 p-5 md:p-6">
          <MarksHeading icon={Files}>Mark records</MarksHeading>
          <WorkspaceFilterCard onReset={clearFilters}
            fieldsClassName="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <label htmlFor="records-search" className="form-label min-w-0 sm:col-span-2">Search records
                <span className="relative mt-1 block">
                  <Search aria-hidden="true" className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input id="records-search" type="search" value={searchQuery} onChange={event => { setSearchQuery(event.target.value); setCurrentPage(1); }}
                    placeholder="Student, ID, evaluator or research title" className="form-control form-control-sm pl-10 pr-4" />
                </span>
              </label>
              <label className="form-label min-w-0">Status
                <PortalSelect aria-label="Record status" className="form-control form-control-sm mt-1" value={selectedStatus} disabled={loading || !!error}
                  onChange={event => { setActiveTab(event.target.value as MarkRecordStatusTab); setLegacyFilters(previous => ({ ...previous, status: 'All Statuses' })); setCurrentPage(1); }}>
                  {statusFilters.map(({ key, count }) => <option key={key} value={key}>{key} ({loading || error ? '—' : count})</option>)}
                </PortalSelect>
              </label>
              <label className="form-label min-w-0">Programme
                <PortalSelect aria-label="Programme" value={programmeFilter} onChange={event => { setProgrammeFilter(event.target.value); setCurrentPage(1); }} className="form-control form-control-sm mt-1">
                  <option value="All Programmes">All Programmes</option>
                  {programmeOptions.map(value => <option key={value} value={value}>{value}</option>)}
                </PortalSelect>
              </label>
              <label className="form-label min-w-0">Semester
                <PortalSelect aria-label="Semester" value={semesterFilter} onChange={event => { setSemesterFilter(event.target.value); setCurrentPage(1); }} className="form-control form-control-sm mt-1">
                  <option value="All Semesters">All Semesters</option>
                  {semesterOptions.map(value => <option key={value} value={value}>{value}</option>)}
                </PortalSelect>
              </label>
              <label className="form-label min-w-0">Evaluator
                <PortalSelect aria-label="Evaluator" value={panelFilter} onChange={event => { setPanelFilter(event.target.value); setCurrentPage(1); }} className="form-control form-control-sm mt-1">
                  <option value="All Members">All Members</option>
                  {evaluatorOptions.map(value => <option key={value} value={value}>{value}</option>)}
                </PortalSelect>
              </label>
          </WorkspaceFilterCard>
          {!loading && !error && (monitoring || records.length > 0) ? <p className="card-caption">{monitoring ? 'Counts for this dashboard monitoring view, before search filters.' : 'Status counts before search filters; paused and retired assignments included.'}</p> : null}
        </div>

        {loading ? (
          <LoadingState message="Loading mark records…" />
        ) : error ? (
          <ErrorState message={error} onRetry={loadRecords} />
        ) : (
        <>
        {filteredRecords.length === 0 ? (
          <div className="mx-5 mb-5 rounded-xl bg-slate-50 px-4 py-6 md:mx-6 md:mb-6">
            <h3 className="text-sm font-semibold text-brand-navy">{records.length === 0 ? monitoring ? 'No records in this monitoring view' : 'No mark records yet' : 'No records match your filters'}</h3>
            <p className="card-description mt-1">{records.length === 0 ? monitoring ? 'No assignments currently match this dashboard view. Clear the monitoring view to see other records.' : 'Records appear once evaluation tasks are generated.' : 'Try a different search or clear the filters to see all records in this view.'}</p>
          </div>
        ) : <>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-5 py-3 md:px-6" role="status">
          <p className="text-sm font-semibold text-brand-navy">{filteredRecords.length} {filteredRecords.length === 1 ? 'record' : 'records'} found</p>
          {hasFilters && <span className="card-caption">Filters applied</span>}
        </div>
        <div className="overflow-x-auto focus-visible:outline-2 focus-visible:outline-blue-600" role="region" aria-label="Mark record results" tabIndex={0}>
          <table className="data-table min-w-[980px]">
            <caption className="sr-only">Mark records matching the selected status and search filters</caption>
            <thead>
              <tr className="data-thead bg-slate-50/30">
                <th scope="col" className="data-th">Student</th>
                <th scope="col" className="data-th">Research Title</th>
                <th scope="col" className="data-th">Evaluator</th>
                <th scope="col" className="data-th">Semester</th>
                <th scope="col" className="data-th">Deadline</th>
                <th scope="col" className="data-th text-center">Total Mark</th>
                <th scope="col" className="data-th text-center">Status</th>
                <th scope="col" className="data-th text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {paginatedRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-55/40 transition-colors">
                    
                    {/* Student details with initial circle badge */}
                    <td className="data-td min-w-[180px] py-4 px-5">
                      <div className="flex items-center gap-3">
                        <div aria-hidden="true" className="w-8 h-8 rounded-full bg-blue-100/70 border border-blue-200/50 flex items-center justify-center text-blue-700 text-xs font-extrabold shrink-0">
                          {rec.studentInitials || rec.studentName.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex flex-col text-left">
                          <span className="card-value text-blue-900 leading-tight">
                            {rec.studentName}
                          </span>
                          <span className="text-xs text-slate-400 font-mono mt-0.5 leading-none">
                            {rec.studentId}
                          </span>
                          <button onClick={() => onViewRecordDetail(rec.id)} aria-label={`View mark record ${rec.id}`}
                            className="mt-1 text-left text-xs font-semibold text-blue-700 hover:underline focus-visible:outline-2 focus-visible:outline-blue-600">{rec.id}</button>
                        </div>
                      </div>
                    </td>

                    {/* Thesis title */}
                    <td className="data-td min-w-[200px] max-w-[240px] whitespace-normal break-words" title={rec.researchTitle}>
                      {rec.researchTitle}
                    </td>

                    {/* Panel member examiner */}
                    <td className="data-td">
                      {rec.panelMember}
                      {rec.evaluatorRoleLabel && <span className="card-caption mt-1 block">{rec.evaluatorRoleLabel}</span>}
                    </td>

                    {/* Academic semester */}
                    <td className="data-td">
                      {rec.semester}
                    </td>

                    <td className={`data-td ${rec.deadlineState === 'OVERDUE' ? 'text-rose-600' : ''}`}>
                      <span className="card-value text-inherit block">{formatDeadlineText(rec)}</span>
                      {rec.dueAt && (
                        <span className="card-caption text-slate-400 block mt-0.5">
                          {new Date(rec.dueAt).toLocaleDateString()}
                        </span>
                      )}
                    </td>

                    {/* Total Mark weighting */}
                    <td className="data-td py-4 px-5 text-center font-sans">
                      {rec.totalMark === 'Draft' ? (
                        <span className="card-value text-slate-500 italic block">
                          Draft
                        </span>
                      ) : rec.totalMark !== null ? (
                        <span className="card-value text-brand-navy">
                          {rec.totalMark}
                        </span>
                      ) : (
                        <span className="card-value text-slate-300 block">-</span>
                      )}
                    </td>

                    {/* Styled Status badge */}
                    <td className="data-td py-4 px-5 text-center">
                      {rec.taskLifecycleStatus === 'RETIRED' ? (
                        <span className="inline-flex px-2.5 py-1 rounded-full bg-slate-100 text-xs font-extrabold tracking-wider text-slate-600 uppercase border border-slate-200" title={rec.retirementReason || undefined}>
                          Retired
                        </span>
                      ) : rec.taskLifecycleStatus === 'PAUSED' ? (
                        <span className="inline-flex px-2.5 py-1 rounded-full bg-amber-50 text-xs font-extrabold tracking-wider text-amber-700 uppercase border border-amber-200" title={rec.pauseReason || undefined}>
                          Paused
                        </span>
                      ) : rec.status === 'Submitted' ? (
                        <span className="inline-flex px-2.5 py-1 rounded-full bg-emerald-50 text-xs font-extrabold tracking-wider text-emerald-600 uppercase border border-emerald-100">
                          Submitted
                        </span>
                      ) : rec.status === 'Draft' ? (
                        <span className="inline-flex px-2.5 py-1 rounded-full bg-blue-50 text-xs font-extrabold tracking-wider text-blue-500 uppercase border border-blue-100">
                          Draft Saved
                        </span>
                      ) : rec.status === 'Not Started' ? (
                        <span className="inline-flex px-2.5 py-1 rounded-full bg-slate-50 text-xs font-extrabold tracking-wider text-slate-500 uppercase border border-slate-200">
                          Not Started
                        </span>
                      ) : rec.status === 'Overdue' ? (
                        <span className="inline-flex px-2.5 py-1 rounded-full bg-rose-50 text-xs font-extrabold tracking-wider text-rose-600 uppercase border border-rose-100">
                          Overdue
                        </span>
                      ) : (
                        <span className="inline-flex px-2.5 py-1 rounded-full bg-gray-100 text-xs font-extrabold tracking-wider text-gray-600 uppercase border border-gray-200">
                          Closed
                        </span>
                      )}
                      {rec.submittedDate && rec.submittedDate !== '-' && <span className="card-caption mt-1 block">Submitted {rec.submittedDate}</span>}
                    </td>

                    {/* Row inspection trigger button */}
                    <td className="data-td py-4 px-5 text-right whitespace-nowrap">
                      <div className="flex flex-col items-end gap-1.5">
                        {onNavigateToDossier && <button
                          aria-label={`View student record for ${rec.studentName}`}
                          onClick={() => onNavigateToDossier(rec.studentId)}
                          className="min-h-11 text-xs font-semibold text-blue-700 hover:underline focus-visible:outline-2 focus-visible:outline-blue-600"
                        >
                          View student record
                        </button>}
                        <button
                          aria-label={`Open mark record ${rec.id}`}
                          onClick={() => onViewRecordDetail(rec.id)}
                          className="min-h-11 py-1.5 px-3 bg-white hover:bg-slate-50 text-brand-navy border border-slate-205 rounded-lg text-xs font-extrabold tracking-wide uppercase transition duration-150 cursor-pointer shadow-2xs"
                        >
                          View
                        </button>
                      </div>
                    </td>

                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Pagination bar block row */}
        <div id="records-pagination-footer" className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50">
          <span className="card-description text-slate-500 font-sans text-left">
            Showing {filteredRecords.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to {Math.min(currentPage * itemsPerPage, filteredRecords.length)} of {filteredRecords.length} filtered records ({records.length} loaded).
          </span>

          <div className="flex flex-wrap items-center justify-center gap-1.5 font-sans">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              aria-label="Previous page"
              disabled={currentPage === 1}
              className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-white hover:text-slate-800 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {paginationPages.map((pageNum, index) => (
              <React.Fragment key={pageNum ?? `gap-${index}`}>
              {pageNum === null ? <span aria-hidden="true" className="px-1 text-slate-400">…</span> : <button
                aria-label={`Page ${pageNum}`}
                aria-current={currentPage === pageNum ? 'page' : undefined}
                onClick={() => setCurrentPage(pageNum)}
                className={`w-8 h-8 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                  currentPage === pageNum
                    ? 'bg-black text-white'
                    : 'border border-slate-200 hover:bg-white text-slate-600'
                }`}
              >
                {pageNum}
              </button>}
              </React.Fragment>
            ))}

            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              aria-label="Next page"
              disabled={currentPage === totalPages}
              className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-white hover:text-slate-800 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
        </>}
        </>
        )}

      </div>

    </div>
  );
};
