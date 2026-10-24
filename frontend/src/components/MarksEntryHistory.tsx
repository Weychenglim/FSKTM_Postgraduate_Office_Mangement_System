import { MarksHeading } from './MarksPrimitives';
import { PortalSelect } from './PortalSelect';
import { WorkspaceFilterCard } from './RequestWorkspacePrimitives';
import { useListState } from './ListState';
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
  const [query, setQuery] = useListState('MarksEntryHistory', 'query', '');
  const [semester, setSemester] = useListState('MarksEntryHistory', 'semester', 'All semesters');

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
    <div id="marks-entry-history" className="marks-workspace space-y-6 text-left">
      <PageHeader
        title="Marks Entry History"
        subtitle="Review your submitted evaluations."
        backLabel="Back to Marks Entry"
        onBack={onBack}
      />

      <PortalCard padding="md" className="rounded-2xl space-y-4">
        <MarksHeading icon={Search}>Find submitted evaluations</MarksHeading>
        <WorkspaceFilterCard onReset={() => { setQuery(''); setSemester('All semesters'); }} fieldsClassName="grid grid-cols-1 items-end gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,240px)]">
          <label htmlFor="marks-history-search" className="form-label min-w-0">Search submitted evaluations
            <span className="relative mt-1 block">
            <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="marks-history-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Student, ID or research title"
              className="form-control form-control-sm pl-10 pr-3"
            />
            </span>
          </label>
          <label className="form-label min-w-0">Semester
          <PortalSelect
            aria-label="Semester"
            value={semester}
            onChange={(event) => setSemester(event.target.value)}
            className="form-control form-control-sm mt-1"
          >
            <option>All semesters</option>
            {semesters.map((value) => <option key={value}>{value}</option>)}
          </PortalSelect>
          </label>
        </WorkspaceFilterCard>
      </PortalCard>

      {submitted.length === 0 ? (
        <EmptyState
          title={tasksState.some(task => task.status === 'SUBMITTED') ? 'No submissions match your filters' : 'No submitted evaluations yet'}
          description={tasksState.some(task => task.status === 'SUBMITTED') ? 'Try another search or clear the filters.' : 'Your submitted evaluations will appear here.'}
        />
      ) : (
        <PortalCard padding="none" className="overflow-hidden rounded-lg">
          <div role="region" aria-label="Submitted evaluation results" tabIndex={0} className="overflow-x-auto focus-visible:outline-2 focus-visible:outline-blue-600">
            <table className="data-table min-w-[820px]">
              <caption className="sr-only">Your submitted evaluations matching the current filters</caption>
              <thead>
                <tr className="data-thead">
                  <th scope="col" className="data-th">Student</th>
                  <th scope="col" className="data-th">Research title</th>
                  <th scope="col" className="data-th">Semester</th>
                  <th scope="col" className="data-th">Evaluator role</th>
                  <th scope="col" className="data-th">Total</th>
                  <th scope="col" className="data-th">Submitted</th>
                  <th scope="col" className="data-th text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {submitted.map((task) => (
                  <tr key={`${task.id}-${task.studentId}`}>
                    <td className="data-td">
                      <span className="card-value block text-slate-800">{task.studentName}</span>
                      <span className="mt-0.5 block font-mono text-[10px] text-blue-700">{task.studentId}</span>
                    </td>
                    <td className="data-td max-w-[300px]">
                      <span className="line-clamp-2 font-semibold text-slate-700">{task.researchTitle}</span>
                    </td>
                    <td className="data-td">{task.semester}</td>
                    <td className="data-td">{task.evaluatorRoleLabel || task.evaluatorRole || 'Evaluator'}</td>
                    <td className="data-td-strong">{task.totalMark ?? '-'}</td>
                    <td className="data-td">
                      <StatusBadge tone="success">{task.submittedDate || 'Submitted'}</StatusBadge>
                    </td>
                    <td className="data-td text-right">
                      <PortalButton
                        size="icon"
                        variant="ghost"
                        icon={Eye}
                        aria-label={`View submitted marks for ${task.studentName}`}
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
