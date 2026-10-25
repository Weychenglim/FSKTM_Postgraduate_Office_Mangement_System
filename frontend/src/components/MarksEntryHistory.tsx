import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Eye, Search } from 'lucide-react';
import type { EvaluationTask, EvaluationTaskRole } from '../types';
import { getSubmittedEvaluations } from '../services/marksApi';
import { markingWorkspaces, tasksForMarkingRole } from '../utils/lecturerMarking';
import { filterSubmissionHistory } from '../utils/marksSubmissionHistory';
import { formatMalaysiaDate, toMalaysiaDateTimeLocalValue } from '../utils/malaysiaDateTime';
import { useListState } from './ListState';
import { LecturerMarkingNavigation } from './LecturerMarkingNavigation';
import { MarksHeading } from './MarksPrimitives';
import { PortalSelect } from './PortalSelect';
import { WorkspaceFilterCard } from './RequestWorkspacePrimitives';
import { PageHeader, PortalButton, PortalCard, StatusBadge } from './PortalPrimitives';
import { EmptyState, ErrorState, LoadingState } from './StateViews';

interface MarksEntryHistoryProps {
  onBack: () => void;
  onSelectRecord: (task: EvaluationTask) => void;
  initialRole?: EvaluationTaskRole;
  onRoleChange?: (role: EvaluationTaskRole) => void;
}

export const MarksEntryHistory: React.FC<MarksEntryHistoryProps> = ({ onBack, onSelectRecord, initialRole = 'SUPERVISOR', onRoleChange }) => {
  const [records, setRecords] = useState<EvaluationTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);
  const loadHistory = useCallback(async () => {
    const request = ++generation.current;
    setLoading(true);
    setError(null);
    try {
      const history = await getSubmittedEvaluations();
      if (generation.current === request) setRecords(history);
    } catch (failure) {
      if (generation.current === request) setError(failure instanceof Error ? failure.message : 'Submitted evaluations could not be loaded.');
    } finally {
      if (generation.current === request) setLoading(false);
    }
  }, []);
  useEffect(() => { void loadHistory(); return () => { generation.current++; }; }, [loadHistory]);

  const [role, setRole] = useState(initialRole);
  const [query, setQuery] = useListState('MarksEntryHistory', 'query', '');
  const [semester, setSemester] = useListState('MarksEntryHistory', 'semester', 'All semesters');
  const [from, setFrom] = useListState('MarksEntryHistory', 'from', '');
  const [to, setTo] = useListState('MarksEntryHistory', 'to', '');
  const roleRecords = tasksForMarkingRole(records, role).filter(task => task.status === 'SUBMITTED');
  const semesters = [...new Set(records.map(task => task.semester))].sort();
  const submitted = filterSubmissionHistory(records, role, query, semester, from, to);
  const invalidRange = !!from && !!to && from > to;
  const clear = () => { setQuery(''); setSemester('All semesters'); setFrom(''); setTo(''); };

  return <div id="marks-entry-history" className="marks-workspace space-y-6 text-left">
    <PageHeader title="Marks Entry History" subtitle={`Review your submitted evaluations as ${markingWorkspaces[role].roleLabel}.`}
      backLabel="Back to Marks Entry" onBack={onBack} />
    <LecturerMarkingNavigation tasks={records} role={role} controls="submitted-evaluation-results" history countsKnown={!loading && !error}
      onChange={next => { setRole(next); onRoleChange?.(next); }} />
    <PortalCard padding="md" className="space-y-5">
      <MarksHeading icon={Search}>Find submitted evaluations</MarksHeading>
      <WorkspaceFilterCard onReset={clear} fieldsClassName="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <label htmlFor="marks-history-search" className="form-label min-w-0">Search submitted evaluations
          <span className="relative mt-1 block">
            <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input id="marks-history-search" type="search" value={query} onChange={event => setQuery(event.target.value)}
              placeholder="Student, ID, research or period" className="form-control form-control-sm pl-10 pr-3" />
          </span>
        </label>
        <label className="form-label min-w-0">Semester
          <PortalSelect aria-label="Semester" value={semester} onChange={event => setSemester(event.target.value)} className="form-control form-control-sm mt-1">
            <option>All semesters</option>
            {semesters.map(value => <option key={value}>{value}</option>)}
          </PortalSelect>
        </label>
        <label htmlFor="marks-history-from" className="form-label min-w-0">Submitted from
          <input id="marks-history-from" type="date" value={from} onChange={event => setFrom(event.target.value)} className="form-control form-control-sm mt-1" />
        </label>
        <label htmlFor="marks-history-to" className="form-label min-w-0">Submitted to
          <input id="marks-history-to" type="date" value={to} onChange={event => setTo(event.target.value)}
            aria-invalid={invalidRange || undefined} aria-describedby={invalidRange ? 'history-date-error' : undefined} className="form-control form-control-sm mt-1" />
        </label>
      </WorkspaceFilterCard>
      <div id="submitted-evaluation-results" aria-live="polite">
        {loading ? <LoadingState message="Loading submitted evaluations…" /> : error ? <ErrorState message={error} onRetry={loadHistory} /> : invalidRange ? (
          <p id="history-date-error" role="alert" className="card-description text-amber-800">Submitted to must be on or after Submitted from.</p>
        ) : submitted.length === 0 ? (
          <EmptyState title={roleRecords.length ? 'No submissions match your filters' : 'No submitted evaluations yet'}
            description={roleRecords.length ? 'Try another search or clear the filters.' : 'Your submitted evaluations for this responsibility will appear here.'} />
        ) : (
          <div role="region" aria-label="Submitted evaluation results" tabIndex={0} className="overflow-x-auto focus-visible:outline-2 focus-visible:outline-blue-600">
            <table role="table" className="data-table block sm:table sm:min-w-[760px]">
              <caption className="sr-only">Submitted evaluations as {markingWorkspaces[role].roleLabel}, matching the current filters</caption>
              <thead role="rowgroup" className="hidden sm:table-header-group"><tr role="row" className="data-thead">
                {['Student', 'Research / evaluation', 'Total mark', 'Submitted (Malaysia)', 'Action'].map(label => <th key={label} scope="col" className="data-th">{label}</th>)}
              </tr></thead>
              <tbody role="rowgroup" className="block space-y-3 sm:table-row-group sm:space-y-0">
                {submitted.map(task => <tr role="row" key={task.id} className="grid grid-cols-2 gap-x-3 rounded-xl border border-slate-200 p-3 sm:table-row sm:rounded-none sm:border-0 sm:p-0">
                  <td role="cell" className="data-td col-span-2 block min-w-0 px-0 py-2 [overflow-wrap:anywhere] sm:table-cell sm:px-5 sm:py-4">
                    <span className="card-value block text-slate-800">{task.studentName}</span>
                    <span className="card-caption mt-1 block font-mono">{task.studentId}</span>
                  </td>
                  <td role="cell" className="data-td col-span-2 block min-w-0 px-0 py-2 [overflow-wrap:anywhere] sm:table-cell sm:max-w-[300px] sm:px-5 sm:py-4">
                    <span className="card-value line-clamp-2">{task.researchTitle}</span>
                    <p className="card-description mt-1">{task.periodName ? `${task.periodName} · ${task.semester}` : task.semester}</p>
                    {task.taskLifecycleStatus && task.taskLifecycleStatus !== 'ACTIVE' ? <StatusBadge tone="neutral">{task.taskLifecycleStatus === 'RETIRED' ? 'Assignment ended' : 'Assignment paused'}</StatusBadge> : null}
                  </td>
                  <td role="cell" className="data-td-strong block min-w-0 px-0 py-2 sm:table-cell sm:px-5 sm:py-4">
                    <span className="card-label mb-1 block sm:hidden">Total mark</span>{task.totalMark ?? '—'}
                  </td>
                  <td role="cell" className="data-td block min-w-0 px-0 py-2 sm:table-cell sm:px-5 sm:py-4">
                    <span className="card-label mb-1 block sm:hidden">Submitted (Malaysia)</span>
                    {task.submittedAt ? <><span className="block">{formatMalaysiaDate(task.submittedAt)}</span><span className="card-description block">{toMalaysiaDateTimeLocalValue(task.submittedAt).slice(11, 16)}</span></> : 'Date unavailable'}
                  </td>
                  <td role="cell" className="data-td col-span-2 block px-0 py-2 sm:table-cell sm:px-5 sm:py-4">
                    <PortalButton icon={Eye} onClick={() => onSelectRecord(task)}>View submission</PortalButton>
                  </td>
                </tr>)}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {!loading && !error && !invalidRange ? <p role="status" className="card-description border-t border-slate-100 pt-4">{submitted.length} of {roleRecords.length} submissions</p> : null}
    </PortalCard>
  </div>;
};
