/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import {
  PageHeader,
  PortalButton,
  PortalToast,
  ProgressBar,
  BadgeTone,
  StatusBadge,
  StatusDot,
  getStatusBadgeTone,
} from './PortalPrimitives';
import { ErrorState, LoadingState } from './StateViews';
import { getPanelWorkloads } from '../services';
import { PanelWorkloadRecord } from '../types';
import { downloadCsv } from '../utils/csvExport';
import { getPanelWorkloadSummary } from '../utils/panelWorkloadRecords';

interface PanelWorkloadMonitoringProps {
  onBack: () => void;
}

const itemsPerPage = 5;
const distributionRows: Array<{ label: string; tone: BadgeTone; key: 'available' | 'nearLimit' | 'fullLoad' }> = [
  { label: 'Available', tone: 'success', key: 'available' },
  { label: 'Near Limit', tone: 'warning', key: 'nearLimit' },
  { label: 'Full Load', tone: 'danger', key: 'fullLoad' },
];

const utilization = (record: PanelWorkloadRecord) =>
  record.workloadLimit > 0 ? Math.round((record.currentStudents / record.workloadLimit) * 100) : 0;

export const PanelWorkloadMonitoring: React.FC<PanelWorkloadMonitoringProps> = ({ onBack }) => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [records, setRecords] = useState<PanelWorkloadRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLecturer, setSelectedLecturer] = useState<PanelWorkloadRecord | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('All Departments');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [appliedFilters, setAppliedFilters] = useState({
    search: '',
    department: 'All Departments',
    status: 'All Statuses',
  });
  const [currentPage, setCurrentPage] = useState(1);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const loadWorkloads = useCallback(() => {
    setLoading(true);
    setError(null);
    getPanelWorkloads()
      .then(setRecords)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load panel workload records.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadWorkloads();
  }, [loadWorkloads]);

  const departmentOptions = useMemo(
    () => ['All Departments', ...Array.from(new Set(records.map((record) => record.department).filter(Boolean)))],
    [records],
  );

  const filteredLecturers = useMemo(() => {
    return records.filter((record) => {
      const searchLower = appliedFilters.search.toLowerCase();
      const matchSearch = !searchLower ||
        record.name.toLowerCase().includes(searchLower) ||
        record.id.toLowerCase().includes(searchLower) ||
        record.department.toLowerCase().includes(searchLower);
      const matchDept = appliedFilters.department === 'All Departments' ||
        record.department === appliedFilters.department;
      const matchStatus = appliedFilters.status === 'All Statuses' ||
        record.availability === appliedFilters.status;
      return matchSearch && matchDept && matchStatus;
    });
  }, [records, appliedFilters]);

  const paginatedLecturers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredLecturers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredLecturers, currentPage]);

  const totalPages = Math.ceil(filteredLecturers.length / itemsPerPage) || 1;
  const summary = useMemo(() => getPanelWorkloadSummary(filteredLecturers), [filteredLecturers]);
  const availablePercentage = summary.totalPanels > 0
    ? Math.round((summary.available / summary.totalPanels) * 100)
    : 0;

  const handleApplyFilters = () => {
    setAppliedFilters({
      search: searchQuery,
      department: departmentFilter,
      status: statusFilter,
    });
    setCurrentPage(1);
    showToast('Workload filters applied.');
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setDepartmentFilter('All Departments');
    setStatusFilter('All Statuses');
    setAppliedFilters({
      search: '',
      department: 'All Departments',
      status: 'All Statuses',
    });
    setCurrentPage(1);
    showToast('Workload filters reset.');
  };

  const handleExportCSV = () => {
    if (filteredLecturers.length === 0) {
      showToast('No panel workload records match the current filters.');
      return;
    }

    downloadCsv('panel_workload_monitoring_report.csv', filteredLecturers, [
      { header: 'Staff ID', value: (record) => record.id },
      { header: 'Lecturer Name', value: (record) => record.name },
      { header: 'Department', value: (record) => record.department },
      { header: 'Reserved Panel Seats', value: (record) => record.currentStudents },
      { header: 'Workload Limit', value: (record) => record.workloadLimit },
      { header: 'Utilization Percent', value: (record) => utilization(record) },
      { header: 'Availability', value: (record) => record.availability },
      { header: 'Confirmed Appointments', value: (record) => record.confirmedAppointments },
      { header: 'Pending Nominations', value: (record) => record.pendingNominations },
      {
        header: 'Workload Items',
        value: (record) => record.workloadItems
          .map((item) => `${item.type}: ${item.studentName} (${item.studentId}) - ${item.researchTitle}`)
          .join(' | '),
      },
    ]);
    showToast(`Downloaded panel_workload_monitoring_report.csv with ${filteredLecturers.length} lecturers.`);
  };

  return (
    <div id="panel-workload-viewport" className="space-y-8 animate-fade-in text-left font-sans">
      <PortalToast message={toastMessage} />

      <PageHeader
        title="Panel Workload Monitoring"
        subtitle="Monitor lecturer panel workload using confirmed active appointments plus active pending nominations."
        backLabel="Back to Panel Appointment Management"
        onBack={onBack}
        subtitleClassName="leading-relaxed max-w-3xl"
      />

      <div id="workload-vitals-row" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-3xs">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block leading-none">
            Total Panel Lecturers
          </span>
          <span className="text-3xl font-black text-brand-navy block mt-3">{summary.totalPanels}</span>
        </div>

        <div className="bg-white border-l-4 border-l-emerald-500 border border-y-slate-200 border-r-slate-200 rounded-xl p-5 shadow-3xs">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block leading-none">
            Available
          </span>
          <div className="flex items-baseline gap-2 mt-3">
            <span className="text-3xl font-black text-slate-850">{summary.available}</span>
            <span className="text-xs font-bold text-emerald-600">{availablePercentage}%</span>
          </div>
        </div>

        <div className="bg-white border-l-4 border-l-amber-500 border border-y-slate-200 border-r-slate-200 rounded-xl p-5 shadow-3xs">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block leading-none">
            Near Limit
          </span>
          <span className="text-3xl font-black text-amber-500 block mt-3">{summary.nearLimit}</span>
        </div>

        <div className="bg-white border-l-4 border-l-red-500 border border-y-slate-200 border-r-slate-200 rounded-xl p-5 shadow-3xs">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block leading-none">
            Full Load
          </span>
          <span className="text-3xl font-black text-red-600 block mt-3">{summary.fullLoad}</span>
        </div>
      </div>

      <div id="operations-layout-grid" className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 items-start text-xs font-sans">
        <div className="lg:col-span-8 bg-white border border-slate-200 p-6 rounded-2xl shadow-3xs space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3.5">
            <SlidersHorizontal className="w-4 h-4 text-slate-400" />
            <span className="font-extrabold text-brand-navy uppercase tracking-wider text-xs">
              Filter Panel Workload
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="search-input" className="form-label block">Search</label>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  id="search-input"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Lecturer, ID, department"
                  className="form-control form-control-sm pl-10 pr-4"
                />
              </div>
            </div>

            <div>
              <label htmlFor="dept-selection" className="form-label block">Department</label>
              <div className="relative">
                <select
                  id="dept-selection"
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="form-control form-control-sm appearance-none pr-9"
                >
                  {departmentOptions.map((department) => (
                    <option key={department}>{department}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5 pointer-events-none" />
              </div>
            </div>

            <div>
              <label htmlFor="status-selection" className="form-label block">Workload Status</label>
              <div className="relative">
                <select
                  id="status-selection"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="form-control form-control-sm appearance-none pr-9"
                >
                  <option>All Statuses</option>
                  <option>Available</option>
                  <option>Near Limit</option>
                  <option>Full Load</option>
                </select>
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <PortalButton variant="secondary" size="md" onClick={handleResetFilters}>
              Reset
            </PortalButton>
            <PortalButton variant="primary" size="md" icon={CheckSquare} onClick={handleApplyFilters}>
              Apply Filters
            </PortalButton>
          </div>
        </div>

        <div className="lg:col-span-4 bg-white border border-slate-200 p-6 rounded-2xl shadow-3xs">
          <span className="text-[10px] font-black text-brand-navy uppercase tracking-widest block border-b border-slate-100 pb-3">
            Workload Distribution
          </span>
          <div className="space-y-4 pt-5">
            {distributionRows.map(({ label, tone, key }) => (
              <div key={label} className="space-y-1">
                <div className="flex justify-between items-center text-[11px] font-bold">
                  <div className="flex items-center gap-1.5">
                    <StatusDot tone={tone} />
                    <span className="text-slate-700 font-semibold">{label}</span>
                  </div>
                  <span className="text-slate-850 font-extrabold">{summary[key]}</span>
                </div>
                <ProgressBar value={summary[key]} max={summary.totalPanels} tone={tone} trackClassName="h-2 bg-slate-105" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div id="workload-records-card" className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs text-left">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <span className="font-extrabold text-brand-navy text-xs uppercase tracking-wider">
            Panel Workload Records
          </span>
          <PortalButton onClick={handleExportCSV} variant="secondary" size="sm" icon={Download}>
            Export CSV
          </PortalButton>
        </div>

        <div className="overflow-x-auto">
          <table className="data-table min-w-[900px] text-xs">
            <thead>
              <tr className="data-thead bg-slate-50 select-none">
                <th className="data-th">Lecturer ID</th>
                <th className="data-th">Lecturer Name</th>
                <th className="data-th">Department</th>
                <th className="data-th text-center">Reserved Workload</th>
                <th className="data-th text-center">Confirmed</th>
                <th className="data-th text-center">Pending</th>
                <th className="data-th text-center">Limit</th>
                <th className="data-th text-center">Availability</th>
                <th className="data-th text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={9} className="p-0">
                    <LoadingState message="Loading panel workload records..." />
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={9} className="p-0">
                    <ErrorState message={error} onRetry={loadWorkloads} />
                  </td>
                </tr>
              ) : paginatedLecturers.length > 0 ? (
                paginatedLecturers.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-55 transition-colors">
                    <td className="data-td font-semibold text-slate-500 font-mono text-[11px]">{record.id}</td>
                    <td className="data-td">
                      <div className="flex items-center gap-3 text-left">
                        <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-extrabold tracking-wider text-[11px]">
                          {record.initials}
                        </div>
                        <span className="font-extrabold text-brand-navy text-xs">{record.name}</span>
                      </div>
                    </td>
                    <td className="data-td font-bold text-slate-600">{record.department || 'Not recorded'}</td>
                    <td className="data-td text-center font-black text-brand-navy text-sm">{record.currentStudents}</td>
                    <td className="data-td text-center font-bold text-emerald-600">{record.confirmedAppointments}</td>
                    <td className="data-td text-center font-bold text-amber-600">{record.pendingNominations}</td>
                    <td className="data-td text-center font-bold text-slate-400 text-xs">{record.workloadLimit}</td>
                    <td className="data-td">
                      <div className="flex items-center justify-center">
                        <StatusBadge tone={getStatusBadgeTone(record.availability)} dot className="text-[9px] px-2.5 py-0.5">
                          {record.availability}
                        </StatusBadge>
                      </div>
                    </td>
                    <td className="data-td text-right">
                      <PortalButton
                        onClick={() => {
                          setSelectedLecturer(record);
                          setIsDrawerOpen(true);
                        }}
                        variant="soft"
                        size="sm"
                        icon={Eye}
                      >
                        View
                      </PortalButton>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-450 font-semibold whitespace-nowrap">
                    No lecturer panel workload records match the applied filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="bg-slate-50/50 p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 font-sans text-xs">
          <span className="text-slate-450 font-semibold">
            Showing {filteredLecturers.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to {Math.min(currentPage * itemsPerPage, filteredLecturers.length)} of {filteredLecturers.length} panel lecturers
          </span>
          <div className="flex items-center gap-1.5 select-none">
            <PortalButton
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              variant="secondary"
              size="icon"
              icon={ChevronLeft}
              className="w-8 h-8"
              aria-label="Previous page"
            />
            {Array.from({ length: totalPages }).map((_, index) => {
              const page = index + 1;
              return (
                <PortalButton
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  variant={currentPage === page ? 'primary' : 'secondary'}
                  size="sm"
                  className="w-8 h-8 p-0 text-xs"
                >
                  {page}
                </PortalButton>
              );
            })}
            <PortalButton
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              variant="secondary"
              size="icon"
              icon={ChevronRight}
              className="w-8 h-8"
              aria-label="Next page"
            />
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isDrawerOpen && selectedLecturer && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className="fixed inset-0 bg-brand-navy/60 z-40 backdrop-blur-sm cursor-pointer"
            />

            <motion.div
              initial={{ x: '100%', opacity: 0.9 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0.9 }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed right-0 top-0 bottom-0 h-full w-full max-w-xl bg-slate-50 shadow-sm z-50 overflow-hidden flex flex-col border-l border-slate-200 text-left font-sans"
            >
              <div className="bg-white p-5 border-b border-slate-200 flex items-center justify-between shadow-3xs">
                <h3 className="text-base font-extrabold text-brand-navy tracking-tight">
                  Lecturer Workload Detail
                </h3>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-brand-navy hover:bg-slate-100 transition focus:outline-none cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-3xs space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-xl bg-blue-50 text-blue-650 flex items-center justify-center font-black text-lg border border-blue-100 uppercase">
                      {selectedLecturer.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h4 className="font-extrabold text-brand-navy text-sm truncate leading-tight">
                          {selectedLecturer.name}
                        </h4>
                        <StatusBadge tone={getStatusBadgeTone(selectedLecturer.availability)} dot className="text-[8px] px-2 py-0.5">
                          {selectedLecturer.availability}
                        </StatusBadge>
                      </div>
                      <div className="mt-2.5 space-y-1.5 text-[11px] font-semibold text-slate-500">
                        <div className="flex justify-between">
                          <span className="text-slate-400">ID</span>
                          <span className="font-mono text-brand-navy font-bold">{selectedLecturer.id}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Dept.</span>
                          <span className="text-brand-navy truncate max-w-[260px] text-right">{selectedLecturer.department}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-3xs space-y-4">
                  <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
                    <span className="font-extrabold text-brand-navy text-[10px] uppercase tracking-wider">
                      Reserved Workload Summary
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md">
                      Confirmed + Pending
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-2.5 text-center">
                    <div className="p-2 border-r border-slate-100">
                      <span className="text-2xl font-black text-brand-navy block leading-none">
                        {selectedLecturer.currentStudents}
                      </span>
                      <span className="text-[8.5px] font-bold text-slate-450 uppercase block mt-1.5 leading-tight">
                        Reserved
                      </span>
                    </div>
                    <div className="p-2 border-r border-slate-100">
                      <span className="text-2xl font-black text-emerald-600 block leading-none">
                        {selectedLecturer.confirmedAppointments}
                      </span>
                      <span className="text-[8.5px] font-bold text-slate-450 uppercase block mt-1.5 leading-tight">
                        Confirmed
                      </span>
                    </div>
                    <div className="p-2 border-r border-slate-100">
                      <span className="text-2xl font-black text-amber-600 block leading-none">
                        {selectedLecturer.pendingNominations}
                      </span>
                      <span className="text-[8.5px] font-bold text-slate-450 uppercase block mt-1.5 leading-tight">
                        Pending
                      </span>
                    </div>
                    <div className="p-2">
                      <span className="text-2xl font-black text-blue-600 block leading-none">
                        {Math.max(0, selectedLecturer.workloadLimit - selectedLecturer.currentStudents)}
                      </span>
                      <span className="text-[8.5px] font-bold text-slate-450 uppercase block mt-1.5 leading-tight">
                        Slots
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-1.5">
                    <div className="flex justify-between items-center text-[11px] font-semibold text-slate-500">
                      <span>Capacity Utilization</span>
                      <span className="text-brand-navy font-bold">{utilization(selectedLecturer)}%</span>
                    </div>
                    <ProgressBar
                      value={selectedLecturer.currentStudents}
                      max={selectedLecturer.workloadLimit}
                      tone={getStatusBadgeTone(selectedLecturer.availability)}
                      trackClassName="h-2 bg-slate-110"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="font-extrabold text-brand-navy text-[10px] uppercase tracking-wider block text-left">
                    Workload Items
                  </span>
                  <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-3xs">
                    <table className="data-table text-[11px]">
                      <thead>
                        <tr className="data-thead bg-slate-50">
                          <th className="data-th w-5/12">Student & ID</th>
                          <th className="data-th w-5/12">Research Topic</th>
                          <th className="data-th w-2/12 text-right">Type</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedLecturer.workloadItems.length > 0 ? (
                          selectedLecturer.workloadItems.map((item) => (
                            <tr key={`${item.type}-${item.studentId}`} className="hover:bg-slate-50/50 transition-colors">
                              <td className="data-td">
                                <div className="font-extrabold text-brand-navy break-words">{item.studentName}</div>
                                <div className="text-[10px] font-bold text-slate-400 font-mono mt-0.5">{item.studentId}</div>
                              </td>
                              <td className="data-td text-slate-600 font-medium leading-relaxed break-words py-2.5">
                                {item.researchTitle}
                              </td>
                              <td className="data-td text-right">
                                <StatusBadge tone={item.type === 'Confirmed Appointment' ? 'success' : 'warning'} className="text-[8px] px-2 py-0.5">
                                  {item.type === 'Confirmed Appointment' ? 'Confirmed' : 'Pending'}
                                </StatusBadge>
                                <span className="block text-[9px] font-bold text-slate-400 mt-1">{item.date}</span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={3} className="py-6 text-center text-slate-400 font-medium">
                              No confirmed appointments or pending nominations for this lecturer.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="bg-white p-5 border-t border-slate-200 flex items-center justify-end gap-3 shadow-sm">
                <PortalButton onClick={() => setIsDrawerOpen(false)} variant="secondary" size="md">
                  Close
                </PortalButton>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
