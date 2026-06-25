/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, CheckCircle2, Clock, Hourglass, Search } from 'lucide-react';
import { PortalButton, PortalCard, ProgressBar, StatusBadge, StatusDot } from './PortalPrimitives';
import { ErrorState, LoadingState } from './StateViews';
import { getMarkRecords } from '../services';
import { MarkRecord } from '../types';
import {
  filterMarkRecordsByStatusTab,
  getMarkRecordSummary,
  MarkRecordStatusTab,
} from '../utils/markRecords';

interface MarkSubmissionMonitoringProps {
  onViewRecords?: (statusTab?: MarkRecordStatusTab) => void;
}

const statusTone = {
  Submitted: 'success',
  'Draft Saved': 'info',
  'Not Started': 'neutral',
  Overdue: 'danger',
} as const;

export const MarkSubmissionMonitoring: React.FC<MarkSubmissionMonitoringProps> = ({ onViewRecords }) => {
  const [records, setRecords] = useState<MarkRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatusGroup, setSelectedStatusGroup] = useState<MarkRecordStatusTab>('All Records');

  const loadRecords = useCallback(() => {
    setLoading(true);
    setError(null);
    getMarkRecords()
      .then(setRecords)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load mark submission records.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const summary = useMemo(() => getMarkRecordSummary(records), [records]);
  const selectedRecords = useMemo(
    () => filterMarkRecordsByStatusTab(records, selectedStatusGroup).slice(0, 4),
    [records, selectedStatusGroup],
  );
  const activeSemester = records[0]?.semester || 'No active evaluation period';
  const submittedRatio = summary.total > 0 ? Math.round((summary.submitted / summary.total) * 100) : 0;

  const cards: Array<{
    label: Exclude<MarkRecordStatusTab, 'All Records'>;
    count: number;
    badge: string;
  }> = [
    { label: 'Submitted', count: summary.submitted, badge: 'Done' },
    { label: 'Draft Saved', count: summary.draft, badge: 'In Progress' },
    { label: 'Not Started', count: summary.notStarted, badge: 'Pending' },
    { label: 'Overdue', count: summary.overdue, badge: 'Urgent' },
  ];

  return (
    <PortalCard id="monitoring-card" padding="lg">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-1">
        <div>
          <h3 className="text-lg font-extrabold text-brand-navy tracking-tight">
            Mark Submission Monitoring
          </h3>
          <p className="text-slate-500 text-xs font-medium mt-1">
            Live status of mark entry completion for the active evaluation period.
          </p>
        </div>
        <StatusBadge tone="brand" icon={Activity}>Live Data</StatusBadge>
      </div>

      {loading ? (
        <LoadingState message="Loading mark submission monitoring…" />
      ) : error ? (
        <ErrorState message={error} onRetry={loadRecords} />
      ) : (
        <>
          <div id="semester-progress-hero" className="p-5 bg-slate-50/80 border border-slate-100 rounded-2xl my-6">
            <div className="flex justify-between items-start mb-3">
              <div className="flex flex-col">
                <span className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase">Active Semester</span>
                <span className="text-sm font-extrabold text-brand-navy mt-0.5">{activeSemester}</span>
              </div>
              <div className="flex flex-col text-right">
                <div className="flex items-baseline justify-end gap-1">
                  <span className="text-2xl font-extrabold text-brand-navy">{summary.submitted}</span>
                  <span className="text-xs text-slate-400 font-bold">/ {summary.total} submitted</span>
                </div>
                <span className="text-[9px] font-extrabold text-slate-500 tracking-wider mt-1 block uppercase">
                  {summary.incomplete} incomplete
                </span>
              </div>
            </div>
            <ProgressBar value={summary.submitted} max={summary.total || 1} tone="brand" trackClassName="h-2.5" />
            <p className="text-[10px] font-bold text-slate-400 mt-2">{submittedRatio}% submission completion</p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            {cards.map((card) => {
              const selected = selectedStatusGroup === card.label;
              return (
                <button
                  key={card.label}
                  type="button"
                  onClick={() => {
                    setSelectedStatusGroup(card.label);
                    onViewRecords?.(card.label);
                  }}
                  className={`p-3.5 rounded-2xl text-center border transition-all cursor-pointer ${
                    selected
                      ? 'bg-slate-50 border-brand-navy/30 ring-2 ring-slate-100'
                      : 'bg-slate-50/50 hover:bg-slate-50 border-slate-100'
                  }`}
                >
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
                    {card.label}
                  </span>
                  <span className={`text-xl font-black tracking-tight block my-1 ${card.label === 'Overdue' ? 'text-rose-600' : 'text-slate-800'}`}>
                    {card.count}
                  </span>
                  <StatusBadge tone={statusTone[card.label]} className="rounded-md px-2 py-0.5 text-[9px]">
                    {card.badge}
                  </StatusBadge>
                </button>
              );
            })}
          </div>

          <div className="mb-6 p-4 rounded-2xl border border-slate-100 bg-[#f8fafc]/90 text-left">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3">
              <span className="text-xs font-extrabold uppercase tracking-wide text-slate-700">
                {selectedStatusGroup === 'All Records' ? 'Recent mark records' : `${selectedStatusGroup} records`}
              </span>
              <PortalButton
                size="sm"
                variant="secondary"
                icon={Search}
                onClick={() => onViewRecords?.(selectedStatusGroup)}
              >
                Open Filtered Records
              </PortalButton>
            </div>

            <div className="space-y-2.5">
              {selectedRecords.length === 0 ? (
                <p className="text-xs font-bold text-slate-400 py-2">No records match this status.</p>
              ) : (
                selectedRecords.map((record) => (
                  <div key={record.id} className="bg-white p-3 rounded-xl border border-slate-100 flex justify-between items-center text-xs">
                    <div>
                      <span className="font-semibold text-slate-800 block">{record.panelMember}</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        Student: {record.studentName} · {record.evaluatorRoleLabel || record.evaluatorRole || 'Evaluator'}
                      </span>
                    </div>
                    <StatusBadge
                      tone={record.status === 'Submitted' ? 'success' : record.status === 'Draft' ? 'info' : record.status === 'Overdue' ? 'danger' : 'neutral'}
                      className="text-[9px]"
                    >
                      {record.status === 'Draft' ? 'Draft Saved' : record.status}
                    </StatusBadge>
                  </div>
                ))
              )}
            </div>
          </div>

          <div id="split-monitoring-columns" className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-100">
            <div id="column-followup" className="flex flex-col text-left">
              <span className="text-[11px] font-extrabold text-brand-navy tracking-wider uppercase mb-4 block">
                Needs Follow-up
              </span>
              <ul className="space-y-3.5 text-xs text-slate-600 font-medium">
                <li className="flex items-center gap-3">
                  <StatusDot tone="danger" />
                  <span><strong>{summary.overdue} overdue</strong> mark entries</span>
                </li>
                <li className="flex items-center gap-3">
                  <StatusDot tone="neutral" />
                  <span><strong>{summary.notStarted} tasks</strong> not started</span>
                </li>
                <li className="flex items-center gap-3">
                  <StatusDot tone="info" />
                  <span><strong>{summary.draft} drafts</strong> not submitted</span>
                </li>
                <li className="flex items-center gap-2.5 p-3.5 bg-slate-50 border border-slate-100 text-slate-700 rounded-xl mt-3">
                  <Clock className="w-4 h-4 text-slate-500 shrink-0" />
                  <span className="font-extrabold text-xs">
                    {summary.incomplete} total records still require monitoring
                  </span>
                </li>
              </ul>
            </div>

            <div id="column-recent-activity" className="flex flex-col text-left">
              <span className="text-[11px] font-extrabold text-brand-navy tracking-wider uppercase mb-4 block">
                Recent Activity
              </span>
              <div className="space-y-4">
                {records.slice(0, 3).map((record) => (
                  <div key={`activity-${record.id}`} className="flex gap-3.5">
                    <div className="w-7 h-7 bg-blue-50 border border-blue-100/50 rounded-lg flex items-center justify-center shrink-0">
                      {record.status === 'Submitted' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Hourglass className="w-3.5 h-3.5 text-blue-500" />
                      )}
                    </div>
                    <div className="flex flex-col">
                      <p className="text-xs font-semibold text-slate-700 leading-normal">
                        <strong>{record.panelMember}</strong> · {record.studentName}
                      </p>
                      <span className="text-[10px] text-slate-400 font-medium mt-0.5">
                        {record.status === 'Submitted' ? `Submitted ${record.submittedDate}` : record.status === 'Draft' ? 'Draft saved' : record.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </PortalCard>
  );
};
