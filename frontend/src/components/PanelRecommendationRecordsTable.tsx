import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Eye, Search } from 'lucide-react';
import { PanelRecommendationDraft } from '../types';
import { clampPage, paginate, paginationRange } from '../utils/pagination';
import {
  filterPanelRecommendationRecords,
  PanelRecommendationRecordGroup,
} from '../utils/panelRecommendationRecords';
import { PANEL_RECOMMENDATION_STATUS_LABELS } from '../utils/panelRecommendationWorkflow';
import { StatusBadge } from './PortalPrimitives';

interface PanelRecommendationRecordsTableProps {
  title: string;
  subtitle: string;
  records: PanelRecommendationDraft[];
  onView: (record: PanelRecommendationDraft) => void;
  showSupervisor?: boolean;
}

const statusTone = (status: PanelRecommendationDraft['status']) => {
  if (status === 'APPROVED') return 'success' as const;
  if (status === 'REJECTED_BY_PANEL' || status === 'REJECTED_BY_COORDINATOR') {
    return 'danger' as const;
  }
  if (status === 'CANCELLED_BY_SUPERVISOR') return 'neutral' as const;
  if (status === 'PENDING_COORDINATOR') return 'warning' as const;
  return 'info' as const;
};

export const PanelRecommendationRecordsTable: React.FC<PanelRecommendationRecordsTableProps> = ({
  title,
  subtitle,
  records,
  onView,
  showSupervisor = false,
}) => {
  const [query, setQuery] = useState('');
  const [statusGroup, setStatusGroup] = useState<PanelRecommendationRecordGroup>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const filteredRecords = useMemo(
    () => filterPanelRecommendationRecords(records, query, statusGroup),
    [records, query, statusGroup],
  );
  const pageRecords = useMemo(
    () => paginate(filteredRecords, currentPage, pageSize),
    [filteredRecords, currentPage],
  );
  const range = paginationRange(currentPage, filteredRecords.length, pageSize);

  useEffect(() => {
    setCurrentPage((page) => clampPage(page, filteredRecords.length, pageSize));
  }, [filteredRecords.length]);

  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-sm font-black text-brand-navy uppercase tracking-wider">{title}</h3>
        <p className="text-[11px] font-semibold text-slate-400 mt-1">{subtitle}</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-3xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 grid grid-cols-1 sm:grid-cols-[1fr_190px] gap-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search student, topic, panel or supervisor"
              className="form-control form-control-sm pl-10"
            />
          </div>
          <select
            value={statusGroup}
            onChange={(event) => {
              setStatusGroup(event.target.value as PanelRecommendationRecordGroup);
              setCurrentPage(1);
            }}
            className="form-control form-control-sm"
          >
            <option value="All">All statuses</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="data-table min-w-[820px] text-xs">
            <thead>
              <tr className="data-thead">
                <th className="data-th">Student</th>
                {showSupervisor && <th className="data-th">Supervisor</th>}
                <th className="data-th">Selected Panel</th>
                <th className="data-th">Panel Decision</th>
                <th className="data-th">Workflow Status</th>
                <th className="data-th">Updated</th>
                <th className="data-th text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {pageRecords.length === 0 ? (
                <tr>
                  <td colSpan={showSupervisor ? 7 : 6} className="py-10 text-center text-slate-400 font-bold">
                    No recommendation records match the current filters.
                  </td>
                </tr>
              ) : pageRecords.map((record) => (
                <tr key={String(record.id ?? `${record.studentId}-${record.updatedAt}`)} className="data-row">
                  <td className="data-td">
                    <span className="font-extrabold text-brand-navy block">{record.studentName}</span>
                    <span className="text-[10px] font-mono font-bold text-slate-400">{record.studentId}</span>
                  </td>
                  {showSupervisor && (
                    <td className="data-td font-bold text-slate-600">{record.supervisorName || 'Not available'}</td>
                  )}
                  <td className="data-td">
                    <span className="font-bold text-slate-700 block">{record.recommendedMember}</span>
                    <span className="text-[10px] font-mono font-bold text-slate-400">{record.recommendedMemberId}</span>
                  </td>
                  <td className="data-td">
                    {record.selectedPanelDecision ? (
                      <StatusBadge tone={record.selectedPanelDecision === 'ACCEPTED' ? 'success' : 'danger'} dot>
                        {record.selectedPanelDecision === 'ACCEPTED' ? 'Accepted' : 'Rejected'}
                      </StatusBadge>
                    ) : (
                      <span className="text-slate-400 font-bold">Awaiting decision</span>
                    )}
                  </td>
                  <td className="data-td">
                    <StatusBadge tone={statusTone(record.status)} dot>
                      {PANEL_RECOMMENDATION_STATUS_LABELS[record.status]}
                    </StatusBadge>
                  </td>
                  <td className="data-td font-bold text-slate-500">
                    {record.updatedAt
                      ? new Date(record.updatedAt).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })
                      : record.submittedDate}
                  </td>
                  <td className="data-td text-right">
                    <button
                      type="button"
                      onClick={() => onView(record)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-blue-600 font-extrabold text-[10px] uppercase tracking-wider"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <span className="text-slate-450 font-medium">
            Showing {range.start} to {range.end} of {range.total} records
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              aria-label="Previous page"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              className="w-8 h-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: range.totalPages }, (_, index) => index + 1).map((page) => (
              <button
                key={page}
                type="button"
                onClick={() => setCurrentPage(page)}
                className={`w-8 h-8 rounded-lg text-xs font-black ${
                  currentPage === page
                    ? 'bg-brand-navy text-white'
                    : 'border border-slate-200 bg-white text-slate-600'
                }`}
              >
                {page}
              </button>
            ))}
            <button
              type="button"
              aria-label="Next page"
              disabled={currentPage === range.totalPages}
              onClick={() => setCurrentPage((page) => Math.min(range.totalPages, page + 1))}
              className="w-8 h-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
