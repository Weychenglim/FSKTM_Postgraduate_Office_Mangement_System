/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CalendarClock, Lock } from 'lucide-react';

import type { EvaluationTask } from '../types';
import { formatDeadlineText } from '../utils/workflowAgeing';
import {
  PageHeader,
  PortalCard,
  StatusBadge,
} from './PortalPrimitives';

interface SubmittedMarkDetailProps {
  task: EvaluationTask;
  onBack: () => void;
}

export const SubmittedMarkDetail: React.FC<SubmittedMarkDetailProps> = ({
  task,
  onBack,
}) => {
  const components = task.components || [];
  const calculatedTotal = components.reduce(
    (total, component) => total + Number(component.marksAwarded || 0),
    0,
  );
  const maximum = components.reduce(
    (total, component) => total + Number(component.maxMarks),
    0,
  );
  const total = task.totalMark === null || task.totalMark === undefined
    ? calculatedTotal.toFixed(2)
    : Number(task.totalMark).toFixed(2);

  return (
    <div id="submitted-mark-detail-page" className="space-y-6 text-left">
      <PageHeader
        title="Submitted Mark Detail"
        subtitle="Review the persisted rubric scores and evaluator feedback for this locked submission."
        backLabel="Back to Marks Entry"
        onBack={onBack}
        actions={<StatusBadge tone="success" icon={Lock}>Submitted</StatusBadge>}
      />

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_300px] gap-6 items-start">
        <div className="space-y-6">
          <PortalCard padding="lg" className="rounded-lg">
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
              <div>
                <dt className="font-extrabold uppercase text-slate-400">Student</dt>
                <dd className="mt-1 text-sm font-extrabold text-brand-navy">{task.studentName}</dd>
                <dd className="mt-0.5 font-mono text-blue-700">{task.studentId}</dd>
              </div>
              <div>
                <dt className="font-extrabold uppercase text-slate-400">Evaluator role</dt>
                <dd className="mt-1 font-bold text-slate-700">{task.evaluatorRoleLabel || task.evaluatorRole || 'Evaluator'}</dd>
              </div>
              <div className="md:col-span-2">
                <dt className="font-extrabold uppercase text-slate-400">Research title</dt>
                <dd className="mt-1 font-bold leading-relaxed text-slate-700">{task.researchTitle}</dd>
              </div>
              <div>
                <dt className="font-extrabold uppercase text-slate-400">Semester</dt>
                <dd className="mt-1 font-bold text-slate-700">{task.semester}</dd>
              </div>
              <div>
                <dt className="font-extrabold uppercase text-slate-400">Submitted</dt>
                <dd className="mt-1 font-bold text-slate-700">{task.submittedDate || 'Submitted'}</dd>
              </div>
            </dl>
          </PortalCard>

          <PortalCard padding="none" className="overflow-hidden rounded-lg">
            <div className="border-b border-slate-100 bg-slate-50 px-5 py-4">
              <h2 className="text-xs font-extrabold uppercase text-slate-600">Rubric scores</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table min-w-[680px]">
                <thead>
                  <tr className="data-thead">
                    <th className="data-th">Component</th>
                    <th className="data-th text-center">Maximum</th>
                    <th className="data-th text-center">Awarded</th>
                    <th className="data-th">Feedback</th>
                  </tr>
                </thead>
                <tbody>
                  {components.map((component) => (
                    <tr key={component.id}>
                      <td className="data-td-strong">{component.name}</td>
                      <td className="data-td text-center">{component.maxMarks}</td>
                      <td className="data-td-strong text-center">{component.marksAwarded ?? '—'}</td>
                      <td className="data-td">{component.feedback || 'No component feedback'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-200 bg-slate-50">
                    <td className="px-4 py-3 text-xs font-extrabold text-slate-700">Total</td>
                    <td className="px-4 py-3 text-center text-xs font-bold text-slate-600">{maximum.toFixed(2)}</td>
                    <td className="px-4 py-3 text-center text-sm font-black text-brand-navy">{total}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </PortalCard>

          <PortalCard padding="lg" className="rounded-lg">
            <h2 className="text-xs font-extrabold uppercase text-slate-600">Overall comments</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
              {task.comments || 'No overall comments were entered.'}
            </p>
          </PortalCard>
        </div>

        <aside className="space-y-5 xl:sticky xl:top-6">
          <PortalCard padding="lg" className="rounded-lg bg-brand-navy text-white">
            <p className="text-[9px] font-black uppercase text-indigo-300">Submitted total</p>
            <p className="mt-2 text-4xl font-black">
              {total}
              <span className="text-sm text-slate-400"> / {maximum.toFixed(2)}</span>
            </p>
          </PortalCard>
          <PortalCard padding="lg" className="rounded-lg">
            <div className="flex items-start gap-3">
              <CalendarClock className="h-5 w-5 shrink-0 text-blue-600" />
              <div>
                <h2 className="text-xs font-extrabold uppercase text-slate-600">Deadline state</h2>
                <p className="mt-2 text-sm font-bold text-slate-800">{formatDeadlineText(task)}</p>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  This submission is locked. Authorized corrections are recorded by the postgraduate office.
                </p>
              </div>
            </div>
          </PortalCard>
        </aside>
      </div>
    </div>
  );
};
