/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Filter,
  Info,
  Search,
  Users,
} from 'lucide-react';

import { getSupervisorWorkloads } from '../services';
import type { SupervisorWorkloadRecord } from '../types';
import { downloadCsv } from '../utils/csvExport';
import {
  PageHeader,
  PortalButton,
  PortalToast,
  ProgressBar,
  StatusBadge,
  StatusDot,
  getStatusBadgeTone,
} from './PortalPrimitives';
import { RightDrawer } from './RightDrawer';
import { EmptyState, ErrorState, LoadingState } from './StateViews';

interface SupervisorWorkloadMonitoringProps {
  onBack: () => void;
}

const ITEMS_PER_PAGE = 5;

const percentage = (value: number, total: number) => (
  total > 0 ? Math.round((value / total) * 100) : 0
);

export const SupervisorWorkloadMonitoring: React.FC<
  SupervisorWorkloadMonitoringProps
> = ({ onBack }) => {
  const [records, setRecords] = useState<SupervisorWorkloadRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('All Departments');
  const [selectedStatus, setSelectedStatus] = useState('All Statuses');
  const [filters, setFilters] = useState({
    search: '',
    department: 'All Departments',
    status: 'All Statuses',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLecturer, setSelectedLecturer] =
    useState<SupervisorWorkloadRecord | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(null), 3000);
  };

  const loadRecords = useCallback(() => {
    setLoading(true);
    setError(null);
    getSupervisorWorkloads()
      .then(setRecords)
      .catch((reason) => {
        setError(
          reason instanceof Error
            ? reason.message
            : 'Supervisor workload could not be loaded.',
        );
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const departments = useMemo(
    () => Array.from(
      new Set(records.map((record) => record.department).filter(Boolean)),
    ).sort(),
    [records],
  );

  const filteredRecords = useMemo(() => {
    const query = filters.search.trim().toLowerCase();
    return records.filter((record) => {
      const matchesSearch = !query
        || record.lecturerName.toLowerCase().includes(query)
        || record.lecturerId.toLowerCase().includes(query)
        || record.department.toLowerCase().includes(query);
      const matchesDepartment = filters.department === 'All Departments'
        || record.department === filters.department;
      const matchesStatus = filters.status === 'All Statuses'
        || record.availability === filters.status;
      return matchesSearch && matchesDepartment && matchesStatus;
    });
  }, [filters, records]);

  const summary = useMemo(() => {
    const total = records.length;
    const available = records.filter(
      (record) => record.availability === 'Available',
    ).length;
    const nearLimit = records.filter(
      (record) => record.availability === 'Near Limit',
    ).length;
    const fullLoad = records.filter(
      (record) => record.availability === 'Full Load',
    ).length;
    const currentStudents = records.reduce(
      (totalStudents, record) => totalStudents + record.currentStudents,
      0,
    );
    return {
      total,
      available,
      nearLimit,
      fullLoad,
      average: total > 0 ? currentStudents / total : 0,
    };
  }, [records]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredRecords.length / ITEMS_PER_PAGE),
  );
  const safePage = Math.min(currentPage, totalPages);
  const paginatedRecords = filteredRecords.slice(
    (safePage - 1) * ITEMS_PER_PAGE,
    safePage * ITEMS_PER_PAGE,
  );

  const applyFilters = () => {
    setFilters({
      search: searchTerm,
      department: selectedDepartment,
      status: selectedStatus,
    });
    setCurrentPage(1);
    showToast('Supervisor workload filters applied.');
  };

  const exportRecords = () => {
    downloadCsv(
      'supervisor-workload-monitoring.csv',
      filteredRecords,
      [
        { header: 'Lecturer ID', value: (record) => record.lecturerId },
        { header: 'Lecturer Name', value: (record) => record.lecturerName },
        { header: 'Department', value: (record) => record.department },
        { header: 'Current Students', value: (record) => record.currentStudents },
        { header: 'Workload Limit', value: (record) => record.workloadLimit },
        { header: 'Availability', value: (record) => record.availability },
        { header: 'Email', value: (record) => record.email },
      ],
    );
    showToast('Supervisor workload CSV exported.');
  };

  return (
    <div className="space-y-6 animate-fade-in text-left text-xs">
      <PortalToast message={toastMessage} />

      <PageHeader
        title="Supervisor Workload Monitoring"
        subtitle="Monitor current active supervision loads and configured capacity."
        backLabel="Back to Supervisor Appointment Management"
        onBack={onBack}
        actions={(
          <span className="bg-brand-navy text-white text-[10px] font-black uppercase tracking-wider px-4 py-2 rounded-lg">
            Live workload
          </span>
        )}
      />

      {loading && <LoadingState message="Loading supervisor workload..." />}
      {!loading && error && (
        <ErrorState message={error} onRetry={loadRecords} />
      )}

      {!loading && !error && (
        <>
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              ['Total Supervisors', summary.total, 'text-brand-navy'],
              ['Available', summary.available, 'text-emerald-600'],
              ['Near Limit', summary.nearLimit, 'text-amber-600'],
              ['Full Load', summary.fullLoad, 'text-rose-600'],
            ].map(([label, value, tone]) => (
              <div
                key={String(label)}
                className="bg-white border border-slate-200 rounded-lg p-5 shadow-3xs"
              >
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  {label}
                </span>
                <div className={`text-3xl font-black mt-3 ${tone}`}>
                  {value}
                </div>
              </div>
            ))}
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-8 bg-white border border-slate-200 p-6 space-y-5">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Filter className="w-4 h-4 text-brand-navy" />
                <h2 className="text-xs font-black text-brand-navy uppercase tracking-wider">
                  Filter Supervisors
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <label className="space-y-1.5">
                  <span className="form-label block">Search</span>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <input
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      className="form-control form-control-sm pl-10"
                      placeholder="Name, ID, or department"
                    />
                  </div>
                </label>
                <label className="space-y-1.5">
                  <span className="form-label block">Department</span>
                  <select
                    value={selectedDepartment}
                    onChange={(event) => setSelectedDepartment(event.target.value)}
                    className="form-control form-control-sm"
                  >
                    <option>All Departments</option>
                    {departments.map((department) => (
                      <option key={department}>{department}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1.5">
                  <span className="form-label block">Workload Status</span>
                  <select
                    value={selectedStatus}
                    onChange={(event) => setSelectedStatus(event.target.value)}
                    className="form-control form-control-sm"
                  >
                    <option>All Statuses</option>
                    <option>Available</option>
                    <option>Near Limit</option>
                    <option>Full Load</option>
                  </select>
                </label>
              </div>
              <div className="flex justify-end">
                <PortalButton onClick={applyFilters} variant="primary" size="sm">
                  Apply Filters
                </PortalButton>
              </div>
            </div>

            <div className="lg:col-span-4 bg-white border border-slate-200 p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Users className="w-4 h-4 text-brand-navy" />
                <h2 className="text-xs font-black text-brand-navy uppercase tracking-wider">
                  Workload Distribution
                </h2>
              </div>
              {[
                ['Available', summary.available, 'success'],
                ['Near Limit', summary.nearLimit, 'warning'],
                ['Full Load', summary.fullLoad, 'danger'],
              ].map(([label, value, tone]) => (
                <div key={String(label)} className="space-y-1.5">
                  <div className="flex justify-between font-bold text-slate-600">
                    <span className="flex items-center gap-2">
                      <StatusDot tone={tone as 'success' | 'warning' | 'danger'} />
                      {label}
                    </span>
                    <span>{value}</span>
                  </div>
                  <ProgressBar
                    value={Number(value)}
                    max={Math.max(summary.total, 1)}
                    tone={tone as 'success' | 'warning' | 'danger'}
                  />
                </div>
              ))}
              <p className="pt-3 border-t border-slate-100 text-[11px] font-semibold text-slate-500">
                Average active load: {summary.average.toFixed(1)} students per supervisor.
              </p>
            </div>
          </section>

          <section className="bg-white border border-slate-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xs font-black text-brand-navy uppercase tracking-wider">
                  Supervisor Workload Records
                </h2>
                <p className="text-[10px] font-semibold text-slate-400 mt-1">
                  Active appointments against each configured supervision limit.
                </p>
              </div>
              <PortalButton
                onClick={exportRecords}
                variant="secondary"
                size="sm"
                icon={Download}
              >
                Export CSV
              </PortalButton>
            </div>

            {records.length === 0 ? (
              <EmptyState
                title="No supervisor workload records"
                description="No active supervisor profiles are available."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table min-w-[760px]">
                  <thead>
                    <tr className="data-thead">
                      <th className="data-th">Lecturer</th>
                      <th className="data-th">Department</th>
                      <th className="data-th text-center">Current</th>
                      <th className="data-th text-center">Limit</th>
                      <th className="data-th text-center">Utilization</th>
                      <th className="data-th text-center">Status</th>
                      <th className="data-th text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedRecords.map((record) => (
                      <tr key={record.lecturerId}>
                        <td className="data-td">
                          <div className="font-black text-slate-800">
                            {record.lecturerName}
                          </div>
                          <div className="font-mono text-[10px] text-slate-400 mt-1">
                            {record.lecturerId}
                          </div>
                        </td>
                        <td className="data-td font-semibold text-slate-500">
                          {record.department || '-'}
                        </td>
                        <td className="data-td text-center font-black">
                          {record.currentStudents}
                        </td>
                        <td className="data-td text-center font-black">
                          {record.workloadLimit}
                        </td>
                        <td className="data-td text-center font-bold text-slate-600">
                          {percentage(
                            record.currentStudents,
                            record.workloadLimit,
                          )}%
                        </td>
                        <td className="data-td text-center">
                          <StatusBadge
                            tone={getStatusBadgeTone(record.availability)}
                            dot
                          >
                            {record.availability}
                          </StatusBadge>
                        </td>
                        <td className="data-td text-center">
                          <PortalButton
                            variant="soft"
                            size="sm"
                            icon={Eye}
                            onClick={() => setSelectedLecturer(record)}
                          >
                            View
                          </PortalButton>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {filteredRecords.length > 0 && (
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                  Showing {(safePage - 1) * ITEMS_PER_PAGE + 1}-
                  {Math.min(safePage * ITEMS_PER_PAGE, filteredRecords.length)}
                  {' '}of {filteredRecords.length}
                </span>
                <div className="flex items-center gap-2">
                  <PortalButton
                    variant="secondary"
                    size="icon"
                    icon={ChevronLeft}
                    disabled={safePage === 1}
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                    aria-label="Previous workload page"
                  />
                  <span className="text-xs font-black text-slate-600">
                    {safePage}/{totalPages}
                  </span>
                  <PortalButton
                    variant="secondary"
                    size="icon"
                    icon={ChevronRight}
                    disabled={safePage === totalPages}
                    onClick={() => setCurrentPage(
                      (page) => Math.min(totalPages, page + 1),
                    )}
                    aria-label="Next workload page"
                  />
                </div>
              </div>
            )}
          </section>

          <div className="bg-blue-50 border border-blue-100 p-5 flex gap-3">
            <Info className="w-5 h-5 text-blue-600 shrink-0" />
            <p className="text-xs font-semibold text-slate-600 leading-relaxed">
              Workload is calculated from persisted active supervisor appointments.
              Capacity is read from each supervisor profile.
            </p>
          </div>
        </>
      )}

      <RightDrawer
        isOpen={selectedLecturer !== null}
        onClose={() => setSelectedLecturer(null)}
        title={selectedLecturer
          ? `Supervisor Workload: ${selectedLecturer.lecturerId}`
          : 'Supervisor Workload'}
      >
        {selectedLecturer && (
          <div className="space-y-5">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-sm font-black text-brand-navy">
                {selectedLecturer.lecturerName}
              </h3>
              <p className="text-xs font-semibold text-slate-500 mt-1">
                {selectedLecturer.department || 'Department not recorded'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {selectedLecturer.email}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 p-3">
                <span className="text-[9px] font-black uppercase text-slate-400">
                  Active students
                </span>
                <div className="text-xl font-black text-brand-navy mt-1">
                  {selectedLecturer.currentStudents}
                </div>
              </div>
              <div className="bg-slate-50 p-3">
                <span className="text-[9px] font-black uppercase text-slate-400">
                  Configured limit
                </span>
                <div className="text-xl font-black text-brand-navy mt-1">
                  {selectedLecturer.workloadLimit}
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-3">
                Active supervisees
              </h4>
              {selectedLecturer.supervisees.length === 0 ? (
                <p className="text-xs text-slate-500">
                  No active supervisees.
                </p>
              ) : (
                <div className="space-y-3">
                  {selectedLecturer.supervisees.map((supervisee) => (
                    <div
                      key={supervisee.id}
                      className="border border-slate-200 p-3"
                    >
                      <div className="flex justify-between gap-3">
                        <div>
                          <div className="text-xs font-black text-brand-navy">
                            {supervisee.name}
                          </div>
                          <div className="font-mono text-[10px] text-slate-400 mt-1">
                            {supervisee.id}
                          </div>
                        </div>
                        <StatusBadge tone="success">
                          {supervisee.status}
                        </StatusBadge>
                      </div>
                      <p className="text-[11px] font-semibold text-slate-600 mt-3">
                        {supervisee.topic}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-2">
                        {supervisee.programme} · Appointed {supervisee.appointmentDate}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </RightDrawer>
    </div>
  );
};
