/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { PageHeader, PortalButton, PortalToast } from './PortalPrimitives';
import { LoadingState, ErrorState } from './StateViews';
import { MarkRecord } from '../types';
import { getMarkRecords } from '../services';
import {
  filterMarkRecordsByStatusTab,
  getMarkRecordSummary,
  MarkRecordStatusTab,
} from '../utils/markRecords';
import { formatDeadlineText } from '../utils/workflowAgeing';

interface MarkEntryRecordsProps {
  onBack: () => void;
  onViewRecordDetail: (recordId: string) => void;
  onNavigateToDossier?: (studentId: string) => void;
  initialStatusTab?: MarkRecordStatusTab;
}

export const MarkEntryRecords: React.FC<MarkEntryRecordsProps> = ({
  onBack,
  onViewRecordDetail,
  onNavigateToDossier,
  initialStatusTab = 'All Records',
}) => {
  const [records, setRecords] = useState<MarkRecord[]>([]);
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

  // Form Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [programmeFilter, setProgrammeFilter] = useState('All Programmes');
  const [semesterFilter, setSemesterFilter] = useState('All Semesters');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [panelFilter, setPanelFilter] = useState('All Members');

  // Interactive pill filter selection mapping directly to Status Pill Buttons
  const [activeTab, setActiveTab] = useState<MarkRecordStatusTab>(initialStatusTab);

  // Active query parameters (applied on clicking 'Apply Filters')
  const [appliedFilters, setAppliedFilters] = useState({
    search: '',
    programme: 'All Programmes',
    semester: 'All Semesters',
    status: 'All Statuses',
    panelMember: 'All Members',
  });

  // Current page
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Notification system
  const [toast, setToast] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    setActiveTab(initialStatusTab);
    setCurrentPage(1);
  }, [initialStatusTab]);

  // Run Apply filter logic
  const handleApplyFilters = () => {
    setAppliedFilters({
      search: searchQuery,
      programme: programmeFilter,
      semester: semesterFilter,
      status: statusFilter,
      panelMember: panelFilter
    });
    setCurrentPage(1);
    triggerToast("Record filters applied successfully.");
  };

  // Calculated Stats
  const summary = useMemo(
    () => getMarkRecordSummary(
      records.filter((record) => record.taskLifecycleStatus === 'ACTIVE'),
    ),
    [records],
  );
  const totalRecordCount = summary.total;
  const submittedCount = summary.submitted;
  const draftSavedCount = summary.draft;
  const notStartedCount = summary.notStarted;
  const overdueCount = summary.overdue;
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
    return filterMarkRecordsByStatusTab(records, activeTab).filter(rec => {
      // 1. Text Search matching student name, student ID, panel member, or research title
      const searchText = appliedFilters.search.toLowerCase();
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
      if (appliedFilters.programme !== 'All Programmes' && rec.programme !== appliedFilters.programme) {
        return false;
      }

      // 3. Semester filter
      if (appliedFilters.semester !== 'All Semesters' && rec.semester !== appliedFilters.semester) {
        return false;
      }

      // 4. Panel Member filter
      if (appliedFilters.panelMember !== 'All Members' && rec.panelMember !== appliedFilters.panelMember) {
        return false;
      }

      // 5. Status filter dropdown applies only when the status pill is All Records.
      if (activeTab === 'All Records' && appliedFilters.status !== 'All Statuses') {
        if (appliedFilters.status === 'Submitted' && rec.status !== 'Submitted') return false;
        if (appliedFilters.status === 'Draft' && rec.status !== 'Draft') return false;
        if (appliedFilters.status === 'Not Started' && rec.status !== 'Not Started') return false;
        if (appliedFilters.status === 'Overdue' && rec.status !== 'Overdue') return false;
      }

      return true;
    });
  }, [records, appliedFilters, activeTab]);

  // Pagination indexing calculations
  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage) || 1;
  const paginatedRecords = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredRecords.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredRecords, currentPage]);

  return (
    <div id="mark-entry-records-dashboard" className="space-y-8 animate-fade-in text-left relative">
      
      <PortalToast message={toast} />

      {/* Breadcrumb back link & Title header */}
      <PageHeader
        title="Mark Entry Records"
        subtitle="Search and monitor mark entry records by student, panel member, semester, and status."
        backLabel="Back to Marks & Evaluation Management"
        onBack={onBack}
        subtitleClassName="leading-relaxed"
      />

      {/* 4 Summary Cards Row with exact look (number text + solid bottom line) */}
      <div id="records-metrics-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
        
        {/* Total Records */}
        <div className="bg-white rounded-2xl border border-slate-205 pt-5 pb-6 px-6 relative shadow-xs overflow-hidden flex flex-col justify-between h-[120px]">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
            Total Records
          </span>
          <span className="text-brand-navy font-black text-3xl font-sans tracking-tight block">
            {totalRecordCount}
          </span>
          {/* Bottom solid indicator bar */}
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-blue-600" />
        </div>

        {/* Submitted */}
        <div className="bg-white rounded-2xl border border-slate-205 pt-5 pb-6 px-6 relative shadow-xs overflow-hidden flex flex-col justify-between h-[120px]">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
            Submitted
          </span>
          <span className="text-emerald-500 font-black text-3xl font-sans tracking-tight block">
            {submittedCount}
          </span>
          {/* Bottom solid green line */}
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-emerald-500" />
        </div>

        {/* Draft Saved */}
        <div className="bg-white rounded-2xl border border-slate-205 pt-5 pb-6 px-6 relative shadow-xs overflow-hidden flex flex-col justify-between h-[120px]">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
            Draft Saved
          </span>
          <span className="text-blue-500 font-black text-3xl font-sans tracking-tight block">
            {draftSavedCount}
          </span>
          {/* Bottom solid cyan line */}
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-blue-400" />
        </div>

        {/* Not Started */}
        <div className="bg-white rounded-2xl border border-slate-205 pt-5 pb-6 px-6 relative shadow-xs overflow-hidden flex flex-col justify-between h-[120px]">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
            Not Started
          </span>
          <span className="text-slate-500 font-black text-3xl font-sans tracking-tight block">
            {notStartedCount}
          </span>
          {/* Bottom solid gray line */}
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-slate-350" />
        </div>

        {/* Overdue */}
        <div className="bg-white rounded-2xl border border-slate-205 pt-5 pb-6 px-6 relative shadow-xs overflow-hidden flex flex-col justify-between h-[120px]">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
            Overdue
          </span>
          <span className="text-rose-600 font-black text-3xl font-sans tracking-tight block">
            {overdueCount}
          </span>
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-rose-500" />
        </div>

      </div>

      {/* Advanced search and filters container box */}
      <div id="records-filters-card" className="bg-white rounded-2xl border border-slate-200/90 p-5 md:p-6 text-left shadow-3xs space-y-5">
        
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-end">
          {/* Search field */}
          <div className="md:col-span-6 flex flex-col">
            <label className="form-label">
              Search
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by student name, ID, panel member, or research title"
                className="form-control form-control-md pl-10 pr-4"
              />
            </div>
          </div>

          {/* Programme dropdown selector */}
          <div className="md:col-span-3 flex flex-col">
            <label className="form-label">
              Programme
            </label>
            <select
              value={programmeFilter}
              onChange={(e) => setProgrammeFilter(e.target.value)}
              className="form-control form-control-md cursor-pointer"
            >
              <option value="All Programmes">All Programmes</option>
              {programmeOptions.map((programme) => (
                <option key={programme} value={programme}>{programme}</option>
              ))}
            </select>
          </div>

          {/* Semester dropdown selector */}
          <div className="md:col-span-3 flex flex-col">
            <label className="form-label">
              Semester
            </label>
            <select
              value={semesterFilter}
              onChange={(e) => setSemesterFilter(e.target.value)}
              className="form-control form-control-md cursor-pointer"
            >
              <option value="All Semesters">All Semesters</option>
              {semesterOptions.map((semester) => (
                <option key={semester} value={semester}>{semester}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-end pt-2">
          {/* Status Select dropdown */}
          <div className="md:col-span-4 flex flex-col">
            <label className="form-label">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="form-control form-control-md cursor-pointer"
            >
              <option value="All Statuses">All Statuses</option>
              <option value="Submitted">Submitted</option>
              <option value="Draft">Draft Saved</option>
              <option value="Not Started">Not Started</option>
              <option value="Overdue">Overdue</option>
            </select>
          </div>

          {/* Panel Member select */}
          <div className="md:col-span-4 flex flex-col">
            <label className="form-label">
              Panel Member
            </label>
            <select
              value={panelFilter}
              onChange={(e) => setPanelFilter(e.target.value)}
              className="form-control form-control-md cursor-pointer"
            >
              <option value="All Members">All Members</option>
              {evaluatorOptions.map((member) => (
                <option key={member} value={member}>{member}</option>
              ))}
            </select>
          </div>

          {/* Core Apply Filters Action Trigger */}
          <div className="md:col-span-4">
            <PortalButton
              variant="primary"
              size="lg"
              fullWidth
              onClick={handleApplyFilters}
            >
              Apply Filters
            </PortalButton>
          </div>
        </div>

      </div>

      {/* Pill tabs list according to status filter tabs */}
      <div id="records-status-pills-row" className="flex flex-wrap items-center gap-2">
        {([
          { key: 'All Records', label: 'All Records' },
          { key: 'Submitted', label: 'Submitted' },
          { key: 'Draft Saved', label: 'Draft Saved' },
          { key: 'Not Started', label: 'Not Started' },
          { key: 'Overdue', label: 'Overdue' }
        ] as const).map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                setCurrentPage(1);
              }}
              className={`px-4 py-2 text-xs font-bold rounded-full transition-all cursor-pointer select-none ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-650'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Main Records Data Table Container */}
      <div id="mark-records-table-container" className="bg-white rounded-2xl border border-slate-200/80 shadow-3xs overflow-hidden">

        {loading ? (
          <LoadingState message="Loading mark records…" />
        ) : error ? (
          <ErrorState message={error} onRetry={loadRecords} />
        ) : (
        <>
        <div className="overflow-x-auto">
          <table className="data-table min-w-[1050px]">
            <thead>
              <tr className="data-thead bg-slate-50/30">
                <th className="data-th">Record ID</th>
                <th className="data-th">Student</th>
                <th className="data-th">Research Title</th>
                <th className="data-th">Panel Member</th>
                <th className="data-th">Semester</th>
                <th className="data-th">Deadline</th>
                <th className="data-th text-center">Total Mark</th>
                <th className="data-th text-center">Status</th>
                <th className="data-th text-center">Submitted Date</th>
                <th className="data-th text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {paginatedRecords.length > 0 ? (
                paginatedRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-55/40 transition-colors">
                    
                    {/* Record ID styled code link */}
                    <td className="py-4 px-5 text-xs font-bold text-blue-600 font-mono">
                      <button 
                        onClick={() => onViewRecordDetail(rec.id)}
                        className="hover:underline text-left cursor-pointer focus:outline-none"
                      >
                        {rec.id}
                      </button>
                    </td>

                    {/* Student details with initial circle badge */}
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100/70 border border-blue-200/50 flex items-center justify-center text-blue-700 text-[10px] font-extrabold shrink-0">
                          {rec.studentInitials}
                        </div>
                        <div className="flex flex-col text-left">
                          <span className="text-xs font-extrabold text-blue-900 leading-tight">
                            {rec.studentName}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono mt-0.5 leading-none">
                            {rec.studentId}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Thesis title */}
                    <td className="data-td max-w-[200px] truncate" title={rec.researchTitle}>
                      {rec.researchTitle}
                    </td>

                    {/* Panel member examiner */}
                    <td className="data-td">
                      {rec.panelMember}
                    </td>

                    {/* Academic semester */}
                    <td className="data-td">
                      {rec.semester}
                    </td>

                    <td className={`data-td ${rec.deadlineState === 'OVERDUE' ? 'text-rose-600' : ''}`}>
                      <span className="font-bold block">{formatDeadlineText(rec)}</span>
                      {rec.dueAt && (
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {new Date(rec.dueAt).toLocaleDateString()}
                        </span>
                      )}
                    </td>

                    {/* Total Mark weighting */}
                    <td className="py-4 px-5 text-center font-sans">
                      {rec.totalMark === 'Draft' ? (
                        <span className="text-xs font-extrabold text-slate-500 italic block">
                          Draft
                        </span>
                      ) : rec.totalMark !== null ? (
                        <span className="text-xs font-black text-brand-navy">
                          {rec.totalMark}
                        </span>
                      ) : (
                        <span className="text-slate-300 text-xs block font-bold">-</span>
                      )}
                    </td>

                    {/* Styled Status badge */}
                    <td className="py-4 px-5 text-center">
                      {rec.taskLifecycleStatus === 'RETIRED' ? (
                        <span className="inline-flex px-2.5 py-1 rounded-full bg-slate-100 text-[9px] font-extrabold tracking-wider text-slate-600 uppercase border border-slate-200" title={rec.retirementReason || undefined}>
                          Retired
                        </span>
                      ) : rec.taskLifecycleStatus === 'PAUSED' ? (
                        <span className="inline-flex px-2.5 py-1 rounded-full bg-amber-50 text-[9px] font-extrabold tracking-wider text-amber-700 uppercase border border-amber-200" title={rec.pauseReason || undefined}>
                          Paused
                        </span>
                      ) : rec.status === 'Submitted' ? (
                        <span className="inline-flex px-2.5 py-1 rounded-full bg-emerald-50 text-[9px] font-extrabold tracking-wider text-emerald-600 uppercase border border-emerald-100">
                          Submitted
                        </span>
                      ) : rec.status === 'Draft' ? (
                        <span className="inline-flex px-2.5 py-1 rounded-full bg-blue-50 text-[9px] font-extrabold tracking-wider text-blue-500 uppercase border border-blue-100">
                          Draft Saved
                        </span>
                      ) : rec.status === 'Not Started' ? (
                        <span className="inline-flex px-2.5 py-1 rounded-full bg-slate-50 text-[9px] font-extrabold tracking-wider text-slate-500 uppercase border border-slate-200">
                          Not Started
                        </span>
                      ) : rec.status === 'Overdue' ? (
                        <span className="inline-flex px-2.5 py-1 rounded-full bg-rose-50 text-[9px] font-extrabold tracking-wider text-rose-600 uppercase border border-rose-100">
                          Overdue
                        </span>
                      ) : (
                        <span className="inline-flex px-2.5 py-1 rounded-full bg-gray-100 text-[9px] font-extrabold tracking-wider text-gray-600 uppercase border border-gray-200">
                          Closed
                        </span>
                      )}
                    </td>

                    {/* Submitted Date */}
                    <td className="data-td text-center">
                      {rec.submittedDate}
                    </td>

                    {/* Row inspection trigger button */}
                    <td className="py-4 px-5 text-right">
                      <div className="flex flex-col items-end gap-1.5">
                        <button
                          onClick={() => onNavigateToDossier?.(rec.studentId)}
                          className="text-[9px] font-black uppercase text-blue-700 hover:underline"
                        >
                          View Dossier
                        </button>
                        <button
                          onClick={() => onViewRecordDetail(rec.id)}
                          className="py-1.5 px-3 bg-white hover:bg-slate-50 text-brand-navy border border-slate-205 rounded-lg text-[10px] font-extrabold tracking-wide uppercase transition duration-150 cursor-pointer shadow-2xs"
                        >
                          View
                        </button>
                      </div>
                    </td>

                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-xs font-bold text-slate-400 font-sans">
                    No matching postgrad evaluation registry records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar block row */}
        <div id="records-pagination-footer" className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50">
          <span className="text-xs text-slate-500 font-medium font-sans text-left">
            Showing {filteredRecords.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to {Math.min(currentPage * itemsPerPage, filteredRecords.length)} of {filteredRecords.length} filtered records ({totalRecordCount} total).
          </span>

          <div className="flex items-center gap-1.5 font-sans">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-white hover:text-slate-800 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pageNum) => (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={`w-8 h-8 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                  currentPage === pageNum
                    ? 'bg-black text-white'
                    : 'border border-slate-200 hover:bg-white text-slate-600'
                }`}
              >
                {pageNum}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-white hover:text-slate-800 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
        </>
        )}

      </div>

    </div>
  );
};
