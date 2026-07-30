import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  CalendarDays,
  Clock3,
  Download,
  FileSpreadsheet,
  RefreshCw,
} from 'lucide-react';

import type {
  ReportModuleSummary,
  UserRole,
  WorkflowReport,
  WorkflowReportFilters,
} from '../types';
import { downloadWorkflowReport, getWorkflowReport } from '../services';
import {
  formatReportMetric,
  reportLabel,
  resolveWorkflowReportRecordRoute,
} from '../utils/workflowReports';
import { routeForStudentProgress } from '../constants/routes';
import { EmptyState, ErrorState, LoadingState } from './StateViews';
import {
  PageHeader,
  PortalButton,
  PortalCard,
  PortalToast,
  StatusBadge,
} from './PortalPrimitives';

interface WorkflowReportsProps {
  currentUserRole: UserRole;
  onBack: () => void;
  onNavigateToRoute: (route: string) => void;
}

const Distribution: React.FC<{
  title: string;
  values: Record<string, number>;
  total: number;
}> = ({ title, values, total }) => (
  <div className="space-y-3">
    <h4 className="text-[10px] font-black uppercase text-slate-500">{title}</h4>
    {Object.keys(values).length === 0 ? (
      <p className="text-xs font-semibold text-slate-400">No records in this range.</p>
    ) : (
      Object.entries(values).map(([label, count]) => {
        const width = total > 0 ? Math.min(100, Math.max(0, (count / total) * 100)) : 0;
        return (
          <div key={label} className="space-y-1.5">
            <div className="flex items-center justify-between gap-3 text-[11px]">
              <span className="font-bold text-slate-600">{reportLabel(label)}</span>
              <span className="font-black text-brand-navy">{count}</span>
            </div>
            <div className="h-2 rounded bg-slate-100 overflow-hidden">
              <div className="h-full bg-blue-600 rounded" style={{ width: `${width}%` }} />
            </div>
          </div>
        );
      })
    )}
  </div>
);

const WorkflowSection: React.FC<{
  title: string;
  summary: ReportModuleSummary;
}> = ({ title, summary }) => (
  <PortalCard padding="md" className="rounded-lg">
    <div className="flex items-center justify-between gap-4 mb-5">
      <div>
        <h3 className="text-sm font-black text-brand-navy">{title}</h3>
        <p className="text-[10.5px] font-semibold text-slate-400 mt-1">
          Current persisted lifecycle records
        </p>
      </div>
      <StatusBadge tone="info">{summary.total} records</StatusBadge>
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Distribution title="Lifecycle status" values={summary.statusCounts} total={summary.total} />
      <Distribution title="Waiting owner" values={summary.waitingOwnerCounts} total={summary.total} />
      <Distribution title="Age bands (calendar days)" values={summary.ageBands} total={summary.total} />
    </div>
  </PortalCard>
);

export const WorkflowReports: React.FC<WorkflowReportsProps> = ({
  currentUserRole,
  onBack,
  onNavigateToRoute,
}) => {
  const [report, setReport] = useState<WorkflowReport | null>(null);
  const [filters, setFilters] = useState<WorkflowReportFilters>({ semester: 'active' });
  const [draftFilters, setDraftFilters] = useState<WorkflowReportFilters>({ semester: 'active' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const loadReport = useCallback(() => {
    setLoading(true);
    setError(null);
    getWorkflowReport(filters)
      .then(setReport)
      .catch((reason) => {
        setError(reason instanceof Error ? reason.message : 'Unable to load workflow reports.');
      })
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const applyFilters = () => {
    if (
      draftFilters.startDate
      && draftFilters.endDate
      && draftFilters.startDate > draftFilters.endDate
    ) {
      setValidationError('End date must be on or after start date.');
      return;
    }
    setValidationError(null);
    setFilters({ ...draftFilters });
  };

  const resetFilters = () => {
    setValidationError(null);
    setDraftFilters({ semester: 'active' });
    setFilters({ semester: 'active' });
  };

  const exportWorkbook = async () => {
    setExporting(true);
    try {
      await downloadWorkflowReport(filters);
      setToast('Downloaded workflow_analytics_report.xlsx');
      window.setTimeout(() => setToast(null), 3200);
    } catch (reason) {
      setToast(reason instanceof Error ? reason.message : 'Unable to download the workbook.');
      window.setTimeout(() => setToast(null), 3200);
    } finally {
      setExporting(false);
    }
  };

  const kpis = useMemo(() => report ? [
    { label: 'Records in scope', value: formatReportMetric(report.overview.totalRecords) },
    { label: 'Pending approvals', value: formatReportMetric(report.overview.pendingApprovals) },
    { label: 'Average waiting', value: report.overview.averageWaitingDays === null ? '—' : `${report.overview.averageWaitingDays} days` },
    { label: 'Longest waiting', value: report.overview.longestWaitingDays === null ? '—' : `${report.overview.longestWaitingDays} days` },
    { label: 'Marks completion', value: formatReportMetric(report.overview.marksCompletionRate, '%') },
    { label: 'Active milestones', value: formatReportMetric(report.overview.activeTimelineEntries) },
  ] : [], [report]);

  return (
    <div id="workflow-reports-workspace" className="space-y-6 pb-16 text-left">
      <PortalToast message={toast} />
      <PageHeader
        title="Workflow Analytics"
        subtitle="Current persisted state across authorised workflow, marks, and timeline records."
        backLabel="Back to Dashboard"
        onBack={onBack}
        actions={(
          <PortalButton
            variant="primary"
            icon={Download}
            onClick={exportWorkbook}
            isLoading={exporting}
            disabled={!report}
          >
            Download XLSX
          </PortalButton>
        )}
      />

      <PortalCard padding="md" className="rounded-lg">
        <div className="flex items-center gap-2 mb-4">
          <CalendarDays className="w-4 h-4 text-blue-600" />
          <h2 className="text-xs font-black text-brand-navy">Report filters</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 items-end">
          <label className="space-y-1.5 text-[10px] font-black uppercase text-slate-500">
            <span>Start date</span>
            <input
              type="date"
              value={draftFilters.startDate ?? ''}
              onChange={(event) => setDraftFilters((current) => ({ ...current, startDate: event.target.value }))}
              className="form-input w-full"
            />
          </label>
          <label className="space-y-1.5 text-[10px] font-black uppercase text-slate-500">
            <span>End date</span>
            <input
              type="date"
              value={draftFilters.endDate ?? ''}
              onChange={(event) => setDraftFilters((current) => ({ ...current, endDate: event.target.value }))}
              className="form-input w-full"
            />
          </label>
          <label className="space-y-1.5 text-[10px] font-black uppercase text-slate-500">
            <span>Academic semester</span>
            <select
              value={draftFilters.semester ?? 'active'}
              onChange={(event) => setDraftFilters((current) => ({ ...current, semester: event.target.value }))}
              className="form-input w-full"
            >
              <option value="active">Active semester</option>
              <option value="all">All semesters</option>
              <option value="unassigned">Legacy / Unassigned</option>
              {report?.filters.availableSemesters.map((semester) => (
                <option key={semester.semesterCode} value={semester.semesterCode}>
                  {semester.semester}
                </option>
              ))}
            </select>
          </label>
          {currentUserRole === 'Office Staff/Admin' && (
            <label className="space-y-1.5 text-[10px] font-black uppercase text-slate-500">
              <span>Programme</span>
              <select
                value={draftFilters.programme ?? ''}
                onChange={(event) => setDraftFilters((current) => ({ ...current, programme: event.target.value }))}
                className="form-input w-full"
              >
                <option value="">All authorised programmes</option>
                {report?.filters.availableProgrammes.map((programme) => (
                  <option key={programme} value={programme}>{programme}</option>
                ))}
              </select>
            </label>
          )}
          <div className="flex gap-2">
            <PortalButton variant="primary" icon={BarChart3} onClick={applyFilters}>Apply</PortalButton>
            <PortalButton variant="secondary" icon={RefreshCw} onClick={resetFilters}>Reset</PortalButton>
          </div>
        </div>
        {validationError && (
          <p role="alert" className="text-[11px] font-bold text-rose-600 mt-3">{validationError}</p>
        )}
      </PortalCard>

      {loading ? (
        <LoadingState message="Loading workflow analytics..." />
      ) : error ? (
        <ErrorState message={error} onRetry={loadReport} />
      ) : !report ? null : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            {kpis.map((kpi) => (
              <PortalCard key={kpi.label} padding="sm" className="rounded-lg min-h-[92px]">
                <p className="text-[9px] font-black uppercase text-slate-400">{kpi.label}</p>
                <p className="text-xl font-black text-brand-navy mt-3">{kpi.value}</p>
              </PortalCard>
            ))}
          </div>

          {report.overview.totalRecords === 0 ? (
            <EmptyState
              title="No records in this range"
              description="Adjust the report dates or programme filter to include persisted records."
              icon={FileSpreadsheet}
            />
          ) : (
            <div className="space-y-5">
              {report.supervisor && <WorkflowSection title="Supervisor Appointments" summary={report.supervisor} />}
              {report.panel && <WorkflowSection title="Panel Appointments" summary={report.panel} />}

              {report.marks && (
                <PortalCard padding="md" className="rounded-lg">
                  <div className="flex items-center justify-between gap-4 mb-5">
                    <h3 className="text-sm font-black text-brand-navy">Marks Tracking</h3>
                    <StatusBadge tone={report.overview.overdueMarks > 0 ? 'warning' : 'success'}>
                      {report.overview.overdueMarks} overdue
                    </StatusBadge>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Distribution title="Task status" values={report.marks.statusCounts} total={report.marks.total} />
                    <Distribution title="Deadline state" values={report.marks.deadlineStateCounts} total={report.marks.total} />
                    <Distribution title="Evaluator role" values={report.marks.evaluatorRoleCounts} total={report.marks.total} />
                  </div>
                </PortalCard>
              )}

              {report.timeline && (
                <PortalCard padding="md" className="rounded-lg">
                  <h3 className="text-sm font-black text-brand-navy mb-5">Timeline Milestones</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Distribution title="Current status" values={report.timeline.statusCounts} total={report.timeline.total} />
                    <Distribution title="Research project" values={report.timeline.levelCounts} total={report.timeline.total} />
                    <Distribution title="Target role" values={report.timeline.targetRoleCounts} total={report.timeline.total} />
                  </div>
                </PortalCard>
              )}
            </div>
          )}

          <PortalCard padding="none" className="rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <Clock3 className="w-4 h-4 text-amber-600" />
              <h3 className="text-sm font-black text-brand-navy">Records Requiring Attention</h3>
            </div>
            {report.attention.length === 0 ? (
              <EmptyState
                title="No waiting or overdue records"
                description="No authorised records currently require attention."
                className="py-10"
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr className="data-thead">
                      <th className="data-th text-left">Record</th>
                      <th className="data-th text-left">Programme</th>
                      <th className="data-th text-left">State</th>
                      <th className="data-th text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.attention.map((item) => (
                      <tr key={`${item.recordType}-${item.recordId}`} className="data-row">
                        <td className="data-td-strong">{item.label}</td>
                        <td className="data-td">{item.programme}</td>
                        <td className="data-td">
                          {item.kind === 'WAITING'
                            ? `${item.waitingDays ?? 0} days - ${reportLabel(item.waitingOn ?? 'Waiting')}`
                            : `Overdue - ${item.dueAt ?? 'No date'}`}
                        </td>
                        <td className="data-td text-right">
                          <div className="flex flex-wrap justify-end gap-2">
                            <PortalButton
                              size="sm"
                              variant="ghost"
                              onClick={() => onNavigateToRoute(routeForStudentProgress(item.studentId))}
                            >
                              View Dossier
                            </PortalButton>
                            <PortalButton
                              size="sm"
                              variant="ghost"
                              onClick={() => onNavigateToRoute(resolveWorkflowReportRecordRoute(item))}
                            >
                              Open
                            </PortalButton>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </PortalCard>
        </>
      )}
    </div>
  );
};
