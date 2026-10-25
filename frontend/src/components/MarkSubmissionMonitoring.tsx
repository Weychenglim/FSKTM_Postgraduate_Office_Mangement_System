/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChartNoAxesCombined, CheckCircle2, ChevronDown, Clock, Hourglass, Search } from 'lucide-react';
import { PortalButton, PortalCard, ProgressBar, StatusBadge, StatusDot } from './PortalPrimitives';
import { MarksHeading } from './MarksPrimitives';
import { ErrorState, LoadingState } from './StateViews';
import { getMarkRecords } from '../services';
import { MarkRecord } from '../types';
import {
  filterMarkRecordsByStatusTab,
  getMarkRecordSummary,
  getOperationalMarkRecords,
  getMarkMonitoringSemesterLabel,
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

  const activeRecords = useMemo(() => getOperationalMarkRecords(records), [records]);
  const summary = useMemo(() => getMarkRecordSummary(activeRecords), [activeRecords]);
  const selectedRecords = useMemo(
    () => filterMarkRecordsByStatusTab(activeRecords, selectedStatusGroup).slice(0, 4),
    [activeRecords, selectedStatusGroup],
  );
  const semesterScope = getMarkMonitoringSemesterLabel(activeRecords);
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
    <PortalCard id="monitoring-card" padding="lg" className="min-w-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-1">
        <div>
          <MarksHeading icon={ChartNoAxesCombined}>Submission monitoring</MarksHeading>
          {summary.total > 0 ? <p className="card-description mt-1">Active tasks across evaluation periods.</p> : null}
        </div>
        {onViewRecords ? <PortalButton icon={Search} onClick={() => onViewRecords()}>View mark records</PortalButton> : null}
      </div>

      {loading ? (
        <LoadingState message="Loading mark submission monitoring…" />
      ) : error ? (
        <ErrorState message={error} onRetry={loadRecords} />
      ) : summary.total === 0 ? (
        <div className="mt-5 border-t border-slate-100 pt-5"><p className="text-sm font-semibold text-brand-navy">No active evaluation tasks</p><p className="card-description mt-2">Generate evaluation tasks to start tracking submissions.</p></div>
      ) : (
        <>
          <div id="semester-progress-hero" className="p-5 bg-slate-50/80 border border-slate-100 rounded-2xl my-6">
            <div className="flex justify-between items-start mb-3">
              <div className="flex flex-col">
                <span className="card-label">Semester scope</span>
                <span className="card-value mt-0.5">{semesterScope}</span>
              </div>
              <div className="flex flex-col text-right">
                <div className="flex items-baseline justify-end gap-1">
                  <span className="text-2xl font-extrabold text-brand-navy">{summary.submitted}</span>
                  <span className="card-value">/ {summary.total} submitted</span>
                </div>
                <span className="card-label mt-1 block">
                  {summary.incomplete} incomplete
                </span>
              </div>
            </div>
            <ProgressBar value={summary.submitted} max={summary.total || 1} tone="brand" trackClassName="h-2.5" />
            <p className="card-description mt-2">{submittedRatio}% submission completion</p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            {cards.map((card) => {
              const selected = selectedStatusGroup === card.label;
              return (
                <button
                  key={card.label}
                  aria-pressed={selected}
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
                  <span className="card-label block">
                    {card.label}
                  </span>
                  <span className={`card-metric block my-1 ${card.label === 'Overdue' && card.count > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                    {card.count}
                  </span>
                  <StatusBadge tone={card.count === 0 ? 'neutral' : statusTone[card.label]} className="rounded-md px-2 py-0.5">
                    {card.count === 0 ? card.label === 'Overdue' ? 'None overdue' : 'No records' : card.badge}
                  </StatusBadge>
                </button>
              );
            })}
          </div>

          <div className="mb-6 p-4 rounded-2xl border border-slate-100 bg-[#f8fafc]/90 text-left">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3">
              <span className="card-label">
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
                <p className="card-description py-2">No records match this status.</p>
              ) : (
                selectedRecords.map((record) => (
                  <div key={record.id} className="bg-white p-3 rounded-xl border border-slate-100 flex flex-wrap gap-3 justify-between items-center text-xs">
                    <div className="min-w-0 flex-1 basis-40">
                      <span className="card-description block">{record.panelMember}</span>
                      <span className="card-description block mt-0.5">
                        Student: {record.studentName} · {record.evaluatorRoleLabel || record.evaluatorRole || 'Evaluator'}
                      </span>
                    </div>
                    <StatusBadge
                      tone={record.status === 'Submitted' ? 'success' : record.status === 'Draft' ? 'info' : record.status === 'Overdue' ? 'danger' : 'neutral'}
                      className="marks-state shrink-0"
                    >
                      {record.status === 'Draft' ? 'Draft Saved' : record.status}
                    </StatusBadge>
                  </div>
                ))
              )}
            </div>
          </div>

          <details className="border-t border-slate-100">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded text-sm font-semibold text-slate-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 [&::-webkit-details-marker]:hidden">Follow-up and recent activity<ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0" /></summary>
          <div id="split-monitoring-columns" className="grid grid-cols-1 gap-6 pt-4 md:grid-cols-2">
            <div id="column-followup" className="flex flex-col text-left">
              <h3 className="text-sm font-semibold text-brand-navy mb-4">Needs follow-up</h3>
              <ul className="space-y-3.5 text-xs text-slate-600 font-medium">
                <li className="flex items-center gap-3">
                  <StatusDot tone={summary.overdue > 0 ? 'danger' : 'neutral'} />
                  <span className="card-description"><strong className="card-value">{summary.overdue} overdue</strong> mark entries</span>
                </li>
                <li className="flex items-center gap-3">
                  <StatusDot tone="neutral" />
                  <span className="card-description"><strong className="card-value">{summary.notStarted} tasks</strong> not started</span>
                </li>
                <li className="flex items-center gap-3">
                  <StatusDot tone="info" />
                  <span className="card-description"><strong className="card-value">{summary.draft} drafts</strong> not submitted</span>
                </li>
                <li className="flex items-center gap-2.5 p-3.5 bg-slate-50 border border-slate-100 text-slate-700 rounded-xl mt-3">
                  <Clock className="w-4 h-4 text-slate-500 shrink-0" />
                  <span className="card-value">
                    {summary.incomplete} total records still require monitoring
                  </span>
                </li>
              </ul>
            </div>

            <div id="column-recent-activity" className="flex flex-col text-left">
              <h3 className="text-sm font-semibold text-brand-navy mb-4">Recent activity</h3>
              <div className="space-y-4">
                {activeRecords.slice(0, 3).map((record) => (
                  <div key={`activity-${record.id}`} className="flex gap-3.5">
                    <div className="w-7 h-7 bg-blue-50 border border-blue-100/50 rounded-lg flex items-center justify-center shrink-0">
                      {record.status === 'Submitted' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Hourglass className="w-3.5 h-3.5 text-blue-500" />
                      )}
                    </div>
                    <div className="flex flex-col">
                      <p className="card-description leading-normal">
                        <strong className="card-value">{record.panelMember}</strong> · {record.studentName}
                      </p>
                      <span className="card-description mt-0.5">
                        {record.status === 'Submitted' ? `Submitted ${record.submittedDate}` : record.status === 'Draft' ? 'Draft saved' : record.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          </details>
        </>
      )}
    </PortalCard>
  );
};
