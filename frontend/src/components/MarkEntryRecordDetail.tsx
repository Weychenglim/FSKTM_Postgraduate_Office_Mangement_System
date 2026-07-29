/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  History,
  Lock,
  UserRound,
} from 'lucide-react';

import { getMarkRecordById } from '../services';
import type { MarkRecordDetail } from '../types';
import { formatDeadlineText } from '../utils/workflowAgeing';
import {
  PageHeader,
  PortalCard,
  StatusBadge,
  getStatusBadgeTone,
} from './PortalPrimitives';
import { ErrorState, LoadingState } from './StateViews';

interface MarkEntryRecordDetailProps {
  onBack: () => void;
  recordId: string;
}

const displayDateTime = (value: string | null) => {
  if (!value) return 'Not available';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Not available';
  return parsed.toLocaleString('en-MY', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const entryStatusLabel = (status: MarkRecordDetail['entry']['status']) => ({
  NOT_STARTED: 'Not Started',
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
})[status];

export const MarkEntryRecordDetail: React.FC<MarkEntryRecordDetailProps> = ({
  onBack,
  recordId,
}) => {
  const [record, setRecord] = useState<MarkRecordDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRecord = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRecord(await getMarkRecordById(recordId));
    } catch (loadError) {
      setRecord(null);
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Mark record could not be loaded.',
      );
    } finally {
      setLoading(false);
    }
  }, [recordId]);

  useEffect(() => {
    void loadRecord();
  }, [loadRecord]);

  if (loading) {
    return <LoadingState message="Loading mark record..." />;
  }

  if (error || !record) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Mark Entry Record Detail"
          backLabel="Back to Mark Entry Records"
          onBack={onBack}
        />
        <ErrorState
          message={error || 'Mark record was not found.'}
          onRetry={loadRecord}
        />
      </div>
    );
  }

  const statusLabel = entryStatusLabel(record.entry.status);
  const totalMark = record.entry.totalMark || '—';

  return (
    <div id="mark-entry-record-detail" className="space-y-7 animate-fade-in text-left">
      <PageHeader
        title="Mark Entry Record Detail"
        subtitle={`${record.recordId} · persisted evaluator submission and audit history`}
        backLabel="Back to Mark Entry Records"
        onBack={onBack}
        actions={(
          <StatusBadge tone={getStatusBadgeTone(statusLabel)} dot>
            {statusLabel}
          </StatusBadge>
        )}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 border-y border-slate-200">
        {[
          ['Total mark', `${totalMark} / ${record.rubric.targetMark}`],
          ['Deadline', formatDeadlineText(record.period)],
          ['Rubric', `${record.rubric.name} v${record.rubric.version}`],
          ['Evaluator role', record.evaluator.roleLabel],
        ].map(([label, value]) => (
          <div key={label} className="min-w-0 border-b border-r border-slate-200 p-4 last:border-r-0 lg:border-b-0">
            <span className="block text-[10px] font-extrabold uppercase text-slate-400">{label}</span>
            <span className="mt-1 block truncate text-sm font-extrabold text-brand-navy" title={value}>{value}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.4fr)_minmax(330px,0.6fr)] gap-6 items-start">
        <div className="space-y-6">
          <PortalCard padding="lg" className="rounded-lg">
            <div className="mb-5 flex items-center gap-2">
              <UserRound className="h-4 w-4 text-slate-500" />
              <h2 className="text-xs font-extrabold uppercase text-slate-600">
                Student and assignment
              </h2>
            </div>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5 text-xs">
              <div>
                <dt className="font-extrabold uppercase text-slate-400">Student</dt>
                <dd className="mt-1 text-sm font-extrabold text-brand-navy">{record.student.name}</dd>
                <dd className="mt-0.5 font-mono text-blue-700">{record.student.studentId}</dd>
              </div>
              <div>
                <dt className="font-extrabold uppercase text-slate-400">Programme</dt>
                <dd className="mt-1 font-bold text-slate-700">{record.student.programme}</dd>
              </div>
              <div className="md:col-span-2">
                <dt className="font-extrabold uppercase text-slate-400">Research title</dt>
                <dd className="mt-1 font-bold leading-relaxed text-slate-700">{record.student.researchTitle}</dd>
              </div>
              <div>
                <dt className="font-extrabold uppercase text-slate-400">Evaluator</dt>
                <dd className="mt-1 font-extrabold text-slate-800">{record.evaluator.name}</dd>
                <dd className="mt-0.5 text-slate-500">{record.evaluator.staffId || record.evaluator.email}</dd>
              </div>
              <div>
                <dt className="font-extrabold uppercase text-slate-400">Assigned</dt>
                <dd className="mt-1 font-bold text-slate-700">{displayDateTime(record.assignment.assignedAt)}</dd>
                <dd className="mt-0.5 text-slate-500">By {record.assignment.assignedBy || 'automatic assignment'}</dd>
              </div>
            </dl>
          </PortalCard>

          <PortalCard padding="none" className="overflow-hidden rounded-lg">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 text-slate-500" />
                <h2 className="text-xs font-extrabold uppercase text-slate-600">
                  Rubric breakdown
                </h2>
              </div>
              {record.entry.isLocked ? (
                <StatusBadge tone="neutral" icon={Lock}>Read-only</StatusBadge>
              ) : null}
            </div>
            <div className="overflow-x-auto">
              <table className="data-table min-w-[700px]">
                <thead>
                  <tr className="data-thead">
                    <th className="data-th">Component</th>
                    <th className="data-th text-center">Maximum</th>
                    <th className="data-th text-center">Awarded</th>
                    <th className="data-th">Feedback</th>
                  </tr>
                </thead>
                <tbody>
                  {record.rubric.components.map((component) => (
                    <tr key={component.id}>
                      <td className="data-td">
                        <span className="block font-extrabold text-slate-800">{component.name}</span>
                        {component.description ? <span className="mt-1 block text-[10px] text-slate-500">{component.description}</span> : null}
                      </td>
                      <td className="data-td text-center font-bold">{component.maxMarks}</td>
                      <td className="data-td text-center font-extrabold text-brand-navy">{component.marksAwarded ?? '—'}</td>
                      <td className="data-td">{component.feedback || 'No component feedback'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-200 bg-slate-50">
                    <td className="px-4 py-3 text-xs font-extrabold text-slate-700">Calculated total</td>
                    <td className="px-4 py-3 text-center text-xs font-bold text-slate-600">{record.rubric.targetMark}</td>
                    <td className="px-4 py-3 text-center text-sm font-black text-brand-navy">{totalMark}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </PortalCard>

          <PortalCard padding="lg" className="rounded-lg">
            <h2 className="text-xs font-extrabold uppercase text-slate-600">Overall comments</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
              {record.entry.comments || 'No overall comments were entered.'}
            </p>
          </PortalCard>
        </div>

        <aside className="space-y-6">
          <PortalCard padding="lg" className="rounded-lg">
            <div className="mb-5 flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-slate-500" />
              <h2 className="text-xs font-extrabold uppercase text-slate-600">Period status</h2>
            </div>
            <dl className="space-y-4 text-xs">
              <div>
                <dt className="font-extrabold uppercase text-slate-400">Period</dt>
                <dd className="mt-1 font-bold text-slate-700">{record.period.name}</dd>
              </div>
              <div>
                <dt className="font-extrabold uppercase text-slate-400">Window</dt>
                <dd className="mt-1 font-bold text-slate-700">{displayDateTime(record.period.opensAt)}</dd>
                <dd className="mt-0.5 font-bold text-slate-700">{displayDateTime(record.period.closesAt)}</dd>
              </div>
              <div>
                <dt className="font-extrabold uppercase text-slate-400">Submitted</dt>
                <dd className="mt-1 font-bold text-slate-700">{displayDateTime(record.entry.submittedAt)}</dd>
              </div>
              <div>
                <dt className="font-extrabold uppercase text-slate-400">Last updated</dt>
                <dd className="mt-1 font-bold text-slate-700">{displayDateTime(record.entry.updatedAt)}</dd>
              </div>
            </dl>
          </PortalCard>

          <PortalCard padding="lg" className="rounded-lg">
            <div className="mb-5 flex items-center gap-2">
              <History className="h-4 w-4 text-slate-500" />
              <h2 className="text-xs font-extrabold uppercase text-slate-600">Correction history</h2>
            </div>
            {record.correctionHistory.length === 0 ? (
              <p className="text-xs font-medium text-slate-500">No corrections or reopening events.</p>
            ) : (
              <div className="space-y-4">
                {record.correctionHistory.map((event) => (
                  <div key={event.id} className="border-l-2 border-blue-200 pl-3 text-xs">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
                      <span className="font-extrabold text-slate-700">{event.action}</span>
                    </div>
                    <p className="mt-1 font-semibold text-slate-600">{event.reason}</p>
                    <p className="mt-1 text-[10px] text-slate-400">{event.actorName} · {displayDateTime(event.createdAt)}</p>
                  </div>
                ))}
              </div>
            )}
          </PortalCard>

          {record.overrideHistory.length > 0 ? (
            <PortalCard padding="lg" className="rounded-lg">
              <h2 className="text-xs font-extrabold uppercase text-slate-600">Evaluator overrides</h2>
              <div className="mt-4 space-y-4">
                {record.overrideHistory.map((event) => (
                  <div key={event.id} className="text-xs">
                    <p className="font-bold text-slate-700">{event.newEvaluator}</p>
                    <p className="mt-1 text-slate-600">{event.reason}</p>
                    <p className="mt-1 text-[10px] text-slate-400">{displayDateTime(event.createdAt)}</p>
                  </div>
                ))}
              </div>
            </PortalCard>
          ) : null}
        </aside>
      </div>
    </div>
  );
};
