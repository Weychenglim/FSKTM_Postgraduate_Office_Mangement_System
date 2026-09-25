/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { Eye, Search } from 'lucide-react';

import type { EvaluationTask } from '../types';
import {
  PageHeader,
  PortalButton,
  PortalCard,
  StatusBadge,
} from './PortalPrimitives';
import { EmptyState } from './StateViews';

interface MarksEntryHistoryProps {
  onBack: () => void;
  onSelectRecord: (task: EvaluationTask) => void;
  tasksState: EvaluationTask[];
}

export const MarksEntryHistory: React.FC<MarksEntryHistoryProps> = ({
  onBack,
  onSelectRecord,
  tasksState,
}) => {
  const [query, setQuery] = useState('');
  const [semester, setSemester] = useState('All semesters');

  const semesters = useMemo(
    () => [...new Set(tasksState.map((task) => task.semester))].sort(),
    [tasksState],
  );
  const submitted = useMemo(
    () => tasksState
      .filter((task) => task.status === 'SUBMITTED')
      .filter((task) => semester === 'All semesters' || task.semester === semester)
      .filter((task) => {
        const normalized = query.trim().toLowerCase();
        return !normalized || [
          task.studentName,
          task.studentId,
          task.researchTitle,
        ].some((value) => value.toLowerCase().includes(normalized));
      })
      .sort((left, right) => (
        String(right.submittedDate || '').localeCompare(String(left.submittedDate || ''))
      )),
    [query, semester, tasksState],
  );

  return (
    <div id="marks-entry-history" className="space-y-6 text-left">
      <PageHeader
        title="Marks Entry History"
        subtitle="Review your persisted submitted evaluations. Submitted records remain locked."
        backLabel="Back to Marks Entry"
        onBack={onBack}
      />

      <PortalCard padding="md" className="rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_240px] gap-3">
          <label className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search student, matric number, or research title"
              className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-3 text-xs"
            />
          </label>
          <select
            value={semester}
            onChange={(event) => setSemester(event.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2.5 text-xs font-semibold"
          >
            <option>All semesters</option>
            {semesters.map((value) => <option key={value}>{value}</option>)}
          </select>
        </div>
      </PortalCard>

      {submitted.length === 0 ? (
        <EmptyState
          title="No submitted evaluations"
          description="Submitted marks matching the current filters will appear here."
        />
      ) : (
        <PortalCard padding="none" className="overflow-hidden rounded-lg">
          <div className="overflow-x-auto">
            <table className="data-table min-w-[820px]">
              <thead>
                <tr className="data-thead">
                  <th className="data-th">Student</th>
                  <th className="data-th">Research title</th>
                  <th className="data-th">Semester</th>
                  <th className="data-th">Evaluator role</th>
                  <th className="data-th">Total</th>
                  <th className="data-th">Submitted</th>
                  <th className="data-th text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {submitted.map((task) => (
                  <tr key={`${task.id}-${task.studentId}`}>
                    <td className="data-td">
                      <span className="block font-extrabold text-slate-800">{task.studentName}</span>
                      <span className="mt-0.5 block font-mono text-[10px] text-blue-700">{task.studentId}</span>
                    </td>
                    <td className="data-td max-w-[300px]">
                      <span className="line-clamp-2 font-semibold text-slate-700">{task.researchTitle}</span>
                    </td>
                    <td className="data-td">{task.semester}</td>
                    <td className="data-td">{task.evaluatorRoleLabel || task.evaluatorRole || 'Evaluator'}</td>
                    <td className="data-td font-extrabold">{task.totalMark ?? '—'}</td>
                    <td className="data-td">
                      <StatusBadge tone="success">{task.submittedDate || 'Submitted'}</StatusBadge>
                    </td>
                    <td className="data-td text-right">
                      <PortalButton
                        size="icon"
                        variant="ghost"
                        icon={Eye}
                        title="View submitted marks"
                        onClick={() => onSelectRecord(task)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </PortalCard>
      )}
    </div>
  );
};
