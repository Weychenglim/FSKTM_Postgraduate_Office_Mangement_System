import { MarksHeading, MarksSummaryCard } from './MarksPrimitives';
import { PortalSelect } from './PortalSelect';
import { WorkspaceFilterCard } from './RequestWorkspacePrimitives';
import { completeDecision } from '../utils/decisionSubmission';
import { ApiError } from '../services/apiClient';
import { useListState } from './ListState';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { CheckSquare, Clock, FilePenLine, CheckCircle, Search, type LucideIcon } from 'lucide-react';
import { MarkEntryDetail } from './MarkEntryDetail';
import { MarksEntryHistory } from './MarksEntryHistory';
import { LecturerMarkingNavigation } from './LecturerMarkingNavigation';
import { SubmittedMarkDetail } from './SubmittedMarkDetail';
import { PageHeader, PortalButton, PortalCard, PortalToast, StatusBadge } from './PortalPrimitives';
import { LoadingState, ErrorState, EmptyState } from './StateViews';
import { formatDeadlineText } from '../utils/workflowAgeing';
import { replaceEvaluationTask } from '../utils/marksProductionManagement';
import { getMarkTaskSemesters, filterMarkTasks } from '../utils/marksSemesterFilters';
import { EvaluationTask, EvaluationStatus, EvaluationTaskRole } from '../types';
import { getEvaluationTasks, saveMarkDraft, submitMarkEntry } from '../services';
import { initialMarkingRole, markingWorkspaces, orderMarkingTasks, tasksForMarkingRole } from '../utils/lecturerMarking';

// ==================== TYPE DEFINITIONS ====================

// EvaluationStatus and EvaluationTask now live in src/types/marks.ts; the tasks
// are served by marksApi (getEvaluationTasks).

interface LecturerMarksEntryProps {
  onBackToDashboard?: () => void;
  onNavigateToDossier?: (studentId: string) => void;
}

// ==================== SUB-COMPONENTS ====================

// Reuse the Marks summary treatment across lecturer responsibilities.
interface CustomSummaryCardProps {
  title: string;
  value: number;
  subtext?: string;
  icon: LucideIcon;
}

export const CustomSummaryCard: React.FC<CustomSummaryCardProps> = ({ title, value, subtext, icon }) => (
  <MarksSummaryCard title={title} value={value} description={subtext} icon={icon} />
);

const StatusChip: React.FC<{ type: EvaluationStatus }> = ({ type }) => {
  switch (type) {
    case 'NOT STARTED':
      return <StatusBadge tone="neutral" className="text-xs px-2.5 py-0.5">Not Started</StatusBadge>;
    case 'DRAFT SAVED':
      return <StatusBadge tone="info" className="text-xs px-2.5 py-0.5">Draft Saved</StatusBadge>;
    case 'SUBMITTED':
      return <StatusBadge tone="success" className="text-xs px-2.5 py-0.5">Submitted</StatusBadge>;
    default:
      return null;
  }
};

// ==================== MAIN COMPONENT ====================

export const LecturerMarksEntry: React.FC<LecturerMarksEntryProps> = ({
  onNavigateToDossier,
}) => {
  // Evaluation tasks are loaded from the persisted lecturer assignment API.
  const [tasks, setTasks] = useState<EvaluationTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rememberedRole, setRememberedRole] = useListState<EvaluationTaskRole | null>('LecturerMarksEntry', 'markingRole', null);

  const [currentView, setCurrentView] = useListState<'dashboard' | 'history'>('LecturerMarksEntry', 'currentView', 'dashboard');

  const loadTasks = useCallback((propagateError = false) => {
    setLoading(true);
    setError(null);
    return getEvaluationTasks()
      .then(loaded => {
        setTasks(loaded);
        setRememberedRole(current => initialMarkingRole(loaded, current));
      })
      .catch((e) => { setError(e instanceof Error ? e.message : 'Failed to load evaluation tasks.'); if (propagateError) throw e; })
      .finally(() => setLoading(false));
  }, [setRememberedRole]);

  useEffect(() => {
    if (currentView === 'dashboard') loadTasks();
  }, [loadTasks, currentView]);

  // 2. Filters & Searches State
  const [searchTerm, setSearchTerm] = useListState('LecturerMarksEntry', 'searchTerm', '');
  const [selectedSemester, setSelectedSemester] = useListState('LecturerMarksEntry', 'selectedSemester', 'All Semesters');
  const [selectedStatus, setSelectedStatus] = useListState('LecturerMarksEntry', 'selectedStatus', 'All Statuses');
  
  // Active form view state
  const [activeFormTask, setActiveFormTask] = useState<EvaluationTask | null>(null);

  // Submit Feedback notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Helper trigger action message
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // 3. Filter actions
  const clearFilters = () => {
    setSearchTerm('');
    setSelectedSemester('All Semesters');
    setSelectedStatus('All Statuses');
  };

  const selectedRole = initialMarkingRole(tasks, rememberedRole);
  const workspace = markingWorkspaces[selectedRole];
  const roleTasks = tasksForMarkingRole(tasks, selectedRole);
  const semesterOptions = getMarkTaskSemesters(tasks);
  const filteredTasks = orderMarkingTasks(filterMarkTasks(roleTasks, searchTerm.trim(), selectedSemester, selectedStatus));
  const summaryTasks = filterMarkTasks(roleTasks, '', selectedSemester, 'All Statuses');
  const statAssigned = summaryTasks.length;
  const statNotStarted = summaryTasks.filter(task => task.status === 'NOT STARTED').length;
  const statDraft = summaryTasks.filter(task => task.status === 'DRAFT SAVED').length;
  const statSubmitted = summaryTasks.filter(task => task.status === 'SUBMITTED').length;

  // 4. Form controller actions
  const handleOpenForm = (task: EvaluationTask) => {
    setActiveFormTask(task);
  };

  return (
    <div id="lecturer-marks-entry-container" className="marks-workspace space-y-6">
      
      <PortalToast message={toastMessage} tone="success" />

      <>
        {currentView === 'history' ? (
            <MarksEntryHistory
              onBack={() => setCurrentView('dashboard')}
              onSelectRecord={task => setActiveFormTask(task)}
              initialRole={rememberedRole ?? selectedRole}
              onRoleChange={setRememberedRole}
            />
          ) : (
            /* Lecturer task workspace */
            <div className="space-y-6">
            <PageHeader
              title="Marks Entry"
              subtitle="Enter and submit marks for your assigned evaluation tasks."
              className="select-none"
            />

            <LecturerMarkingNavigation tasks={tasks} role={selectedRole} onChange={setRememberedRole}
              controls="lecturer-marking-workspace" countsKnown={!loading && !error} />

            <section id="lecturer-marking-workspace" aria-label={workspace.title} className="space-y-5">
            {/* Counts cover this responsibility and selected semester, before search/status filters. */}
            {!loading && !error ? <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
              <CustomSummaryCard 
                title="Assigned tasks"
                value={statAssigned} 
                icon={CheckSquare}
              />
              <CustomSummaryCard 
                title="Not started"
                value={statNotStarted} 
                icon={Clock}
              />
              <CustomSummaryCard 
                title="Draft saved"
                value={statDraft} 
                icon={FilePenLine}
              />
              <CustomSummaryCard 
                title="Submitted"
                value={statSubmitted} 
                icon={CheckCircle}
              />
            </div> : null}

            <PortalCard id="mark-entry-tasks-list-block" padding="md" className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <MarksHeading icon={CheckSquare}>{workspace.title}</MarksHeading>
                <PortalButton onClick={() => setCurrentView('history')}>View submission history</PortalButton>
              </div>

            <WorkspaceFilterCard onReset={clearFilters} fieldsClassName="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
              <label htmlFor="lecturer-marks-search" className="form-label min-w-0 sm:col-span-2 xl:col-span-1">Search students
                <span className="relative mt-1 block">
                  <Search aria-hidden="true" className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input id="lecturer-marks-search" type="search" value={searchTerm} onChange={event => setSearchTerm(event.target.value)} placeholder="Student, ID or research title" className="form-control form-control-sm pl-10 pr-4" />
                </span>
              </label>
              <label className="form-label min-w-0">Semester
                <PortalSelect aria-label="Semester" value={selectedSemester} onChange={event => setSelectedSemester(event.target.value)} className="form-control form-control-sm mt-1">
                  <option>All Semesters</option>
                  {semesterOptions.map(semester => <option key={semester} value={semester}>{semester}</option>)}
                </PortalSelect>
              </label>
              <label className="form-label min-w-0">Status
                <PortalSelect aria-label="Task status" value={selectedStatus} onChange={event => setSelectedStatus(event.target.value)} className="form-control form-control-sm mt-1">
                  <option value="All Statuses">All statuses</option>
                  <option value="NOT STARTED">Not started</option>
                  <option value="DRAFT SAVED">Draft saved</option>
                  <option value="SUBMITTED">Submitted</option>
                </PortalSelect>
              </label>
            </WorkspaceFilterCard>

              {loading ? <LoadingState message="Loading evaluation tasks…" /> : error ? <ErrorState message={error} onRetry={loadTasks} /> : filteredTasks.length === 0 ? (
                <EmptyState title={roleTasks.length === 0 ? workspace.empty : 'No tasks match your filters'}
                  description={roleTasks.length === 0 ? undefined : 'Try another search or clear the filters.'} />
              ) : (
                <div role="region" aria-label={workspace.title} tabIndex={0} className="overflow-x-auto focus-visible:outline-2 focus-visible:outline-blue-600">
                  <table role="table" className="data-table block text-xs sm:table sm:min-w-[720px]">
                    <caption className="sr-only">{workspace.title} matching the current filters</caption>
                    <thead role="rowgroup" className="hidden sm:table-header-group"><tr role="row" className="data-thead">
                      {['Student', 'Research / semester', 'Due', 'Status', 'Action'].map(label => <th key={label} scope="col" className="data-th">{label}</th>)}
                    </tr></thead>
                    <tbody role="rowgroup" className="block space-y-3 sm:table-row-group sm:space-y-0">
                      {filteredTasks.map(task => {
                        const overdue = task.deadlineState === 'OVERDUE';
                        const action = task.status === 'SUBMITTED' ? 'View submission' : task.canEdit !== true ? 'View' : task.status === 'DRAFT SAVED' ? 'Continue marking' : 'Start marking';
                        return <tr role="row" key={task.id ?? `${task.studentId}-${task.semester}-${selectedRole}`} className="grid grid-cols-2 gap-x-3 rounded-xl border border-slate-200 p-3 sm:table-row sm:rounded-none sm:border-0 sm:p-0">
                          <td role="cell" className="data-td col-span-2 block min-w-0 px-0 py-2 [overflow-wrap:anywhere] sm:table-cell sm:px-5 sm:py-4">
                            <span className="card-value block text-slate-900">{task.studentName}</span>
                            <span className="card-caption mt-1 block font-mono">{task.studentId}</span>
                          </td>
                          <td role="cell" className="data-td col-span-2 block min-w-0 px-0 py-2 [overflow-wrap:anywhere] sm:table-cell sm:max-w-[260px] sm:px-5 sm:py-4">
                            <p className="card-value line-clamp-2">{task.researchTitle}</p>
                            <p className="card-description mt-1">{task.semester}</p>
                          </td>
                          <td role="cell" className={`data-td block min-w-0 px-0 py-2 [overflow-wrap:anywhere] sm:table-cell sm:px-5 sm:py-4 ${overdue ? 'text-rose-700' : ''}`}>
                            <span className="card-label mb-1 block sm:hidden">Due</span>
                            <span className="block">{task.effectiveDueAt ? new Date(task.effectiveDueAt).toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' }) + ' (Malaysia)' : task.deadline}</span>
                            <span className="card-description mt-1 block">{formatDeadlineText(task)}</span>
                            {task.completionWindow?.status === 'ACTIVE' ? <span className="card-description block text-sky-700">Extended deadline</span> : null}
                          </td>
                          <td role="cell" className="data-td block min-w-0 px-0 py-2 sm:table-cell sm:px-5 sm:py-4">
                            <span className="card-label mb-1 block sm:hidden">Status</span>
                            <StatusChip type={task.status} />
                            {task.status !== 'SUBMITTED' && task.canEdit !== true ? <span className="card-description mt-1 block">{task.periodEffectiveStatus === 'SCHEDULED' ? 'Period has not opened' : task.periodEffectiveStatus === 'CLOSED' || task.periodEffectiveStatus === 'ARCHIVED' ? 'Period closed' : 'Read only'}</span> : null}
                          </td>
                          <td role="cell" className="data-td col-span-2 block px-0 py-2 sm:table-cell sm:px-5 sm:py-4">
                            <div className="flex flex-col items-start gap-2">
                              <PortalButton variant={task.canEdit === true && task.status !== 'SUBMITTED' ? 'primary' : 'secondary'} onClick={() => handleOpenForm(task)}>{action}</PortalButton>
                              {onNavigateToDossier ? <button type="button" onClick={() => onNavigateToDossier(task.studentId)} className="card-description text-blue-700 hover:underline">View student record</button> : null}
                            </div>
                          </td>
                        </tr>;
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              {!loading && !error ? <p role="status" className="card-description border-t border-slate-100 pt-4">
                {filteredTasks.length} of {roleTasks.length} tasks
              </p> : null}
            </PortalCard>
            </section>
          </div>
          )}
        {activeFormTask ? activeFormTask.status === 'SUBMITTED' ? (
          <SubmittedMarkDetail
            task={activeFormTask}
            backLabel={currentView === 'history' ? 'Back to Marks Entry History' : 'Back to Marks Entry'}
            onBack={() => setActiveFormTask(null)}
          />
        ) : (
          <MarkEntryDetail
            task={activeFormTask}
            backLabel={currentView === 'history' ? 'Back to Marks Entry History' : 'Back to Marks Entry'}
            onBack={() => setActiveFormTask(null)}
            onSave={async (updatedTask) => {
              const savedTask = await saveMarkDraft(updatedTask);
              setTasks((current) => replaceEvaluationTask(current, savedTask));
              setActiveFormTask(savedTask);
              triggerToast(`Draft saved for ${savedTask.studentName}.`);
            }}
            onReload={async () => {
              try {
                const latestTasks = await getEvaluationTasks();
                setTasks(latestTasks);
                const latest = latestTasks.find(task => task.id === activeFormTask.id);
                if (!latest) {
                  setActiveFormTask(current => current ? {...current, canEdit: false, canSubmit: false} : current);
                  throw new Error('This evaluation task is no longer available.');
                }
                setActiveFormTask(latest);
              } catch (failure) {
                if (failure instanceof ApiError && (failure.status === 403 || failure.status === 404)) {
                  setActiveFormTask(current => current ? {...current, canEdit: false, canSubmit: false} : current);
                }
                throw failure;
              }
            }}
            onSubmit={async (updatedTask) => completeDecision(async () => {
              const submittedTask = await submitMarkEntry(updatedTask);
              setTasks((current) => replaceEvaluationTask(current, submittedTask));
            }, () => loadTasks(true))}
          />
        ) : null}
      </>

    </div>
  );
};
