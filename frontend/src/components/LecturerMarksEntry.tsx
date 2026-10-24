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
import { CheckSquare, Clock, Mail, CheckCircle, Search, type LucideIcon } from 'lucide-react';
import { MarkEntryDetail } from './MarkEntryDetail';
import { MarksEntryHistory } from './MarksEntryHistory';
import { SubmittedMarkDetail } from './SubmittedMarkDetail';
import { PageHeader, PortalToast, StatusBadge } from './PortalPrimitives';
import { LoadingState, ErrorState } from './StateViews';
import { formatDeadlineText } from '../utils/workflowAgeing';
import { replaceEvaluationTask } from '../utils/marksProductionManagement';
import { getMarkTaskSemesters, filterMarkTasks } from '../utils/marksSemesterFilters';
import { EvaluationTask, EvaluationStatus } from '../types';
import { getEvaluationTasks, saveMarkDraft, submitMarkEntry } from '../services';

// ==================== TYPE DEFINITIONS ====================

// EvaluationStatus and EvaluationTask now live in src/types/marks.ts; the tasks
// are served by marksApi (getEvaluationTasks).

const evaluatorRoleLabel = (task: EvaluationTask): string =>
  task.evaluatorRoleLabel || (
    task.evaluatorRole === 'SUPERVISOR'
      ? 'Supervisor'
      : task.evaluatorRole === 'BACKUP'
      ? 'Backup'
      : 'Panel'
  );

interface LecturerMarksEntryProps {
  onBackToDashboard?: () => void;
  onNavigateToDossier?: (studentId: string) => void;
}

// ==================== SUB-COMPONENTS ====================

// 1. Customized Summary Card matching screenshot
interface CustomSummaryCardProps {
  title: string;
  value: number;
  subtext?: string;
  icon: LucideIcon;
}

export const CustomSummaryCard: React.FC<CustomSummaryCardProps> = ({ title, value, subtext, icon }) => (
  <MarksSummaryCard title={title} value={value} description={subtext} icon={icon} />
);

// ==================== MAIN COMPONENT ====================

export const LecturerMarksEntry: React.FC<LecturerMarksEntryProps> = ({
  onBackToDashboard,
  onNavigateToDossier,
}) => {
  // Evaluation tasks are loaded from the persisted lecturer assignment API.
  const [tasks, setTasks] = useState<EvaluationTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTasks = useCallback((propagateError = false) => {
    setLoading(true);
    setError(null);
    return getEvaluationTasks()
      .then(setTasks)
      .catch((e) => { setError(e instanceof Error ? e.message : 'Failed to load evaluation tasks.'); if (propagateError) throw e; })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // 2. Filters & Searches State
  const [searchTerm, setSearchTerm] = useListState('LecturerMarksEntry', 'searchTerm', '');
  const [selectedSemester, setSelectedSemester] = useListState('LecturerMarksEntry', 'selectedSemester', 'All Semesters');
  const [selectedStatus, setSelectedStatus] = useListState('LecturerMarksEntry', 'selectedStatus', 'All Statuses');
  
  // View state: 'dashboard' | 'history'
  const [currentView, setCurrentView] = useListState<'dashboard' | 'history'>('LecturerMarksEntry', 'currentView', 'dashboard');

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

  // Filter computation
  const semesterOptions = getMarkTaskSemesters(tasks);
  const filteredTasks = filterMarkTasks(tasks, searchTerm, selectedSemester, selectedStatus);

  // Calculate dynamic summary stats
  const statAssigned = tasks.length;
  const statNotStarted = tasks.filter(t => t.status === 'NOT STARTED').length;
  const statDraft = tasks.filter(t => t.status === 'DRAFT SAVED').length;
  const statSubmitted = tasks.filter(t => t.status === 'SUBMITTED').length;

  // 4. Form controller actions
  const handleOpenForm = (task: EvaluationTask) => {
    setActiveFormTask(task);
  };

  // Status Chip Component matching screenshot styling
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

  return (
    <div id="lecturer-marks-entry-container" className="marks-workspace space-y-6">
      
      <PortalToast message={toastMessage} tone="success" />

      <>
        {currentView === 'history' ? (
            <MarksEntryHistory
              onBack={() => setCurrentView('dashboard')}
              onSelectRecord={(task) => setActiveFormTask(task)}
              tasksState={tasks}
            />
          ) : (
            /* ==================== 1. MAIN ENTRY TASKS DASHBOARD VIEW ==================== */
            <div className="space-y-6">
            <PageHeader
              title="Marks Entry"
              subtitle="Enter and submit marks for your assigned evaluation tasks."
              className="select-none"
            />

            {/* 4 Summary Cards Grid matching reference */}
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
                icon={Mail}
              />
              <CustomSummaryCard 
                title="Submitted"
                value={statSubmitted} 
                icon={CheckCircle}
              />
            </div> : null}

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

            {/* My Mark Entry Tasks Table Card matches layout & alignment perfectly */}
            <div id="mark-entry-tasks-list-block" className="bg-white border border-[#e2e8f0]/80 rounded-2xl p-6 shadow-3xs text-left space-y-5">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
                <div className="space-y-0.5">
                  <MarksHeading icon={CheckSquare}>My mark entry tasks</MarksHeading>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    onClick={() => setCurrentView('history')}
                    className="inline-flex items-center gap-1.5 border border-[#e2e8f0]/80 bg-white hover:bg-slate-50 py-2 px-4 rounded-xl text-xs font-bold text-slate-700 transition cursor-pointer shadow-3xs"
                  >
                    <span>View submission history</span>
                  </button>

                </div>
              </div>

              {/* Data Table */}
              <div role="region" aria-label="My mark entry tasks" tabIndex={0} className="overflow-x-auto focus-visible:outline-2 focus-visible:outline-blue-600">
                    <table className="data-table min-w-[900px] text-xs">
                  <caption className="sr-only">Your evaluation tasks matching the current filters</caption>
                  <thead>
                    <tr className="data-thead">
                      <th scope="col" className="data-th">Student ID</th>
                      <th scope="col" className="data-th">Student name</th>
                      <th scope="col" className="data-th">Research title</th>
                      <th scope="col" className="data-th">Role</th>
                      <th scope="col" className="data-th">Semester</th>
                      <th scope="col" className="data-th">Deadline</th>
                      <th scope="col" className="data-th">Status</th>
                      <th scope="col" className="data-th text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/60 font-sans text-brand-navy/90">
                    {loading ? (
                      <tr>
                        <td colSpan={8} className="card-description p-0">
                          <LoadingState message="Loading evaluation tasks…" />
                        </td>
                      </tr>
                    ) : error ? (
                      <tr>
                        <td colSpan={8} className="card-description p-0">
                          <ErrorState message={error} onRetry={loadTasks} />
                        </td>
                      </tr>
                    ) : filteredTasks.length > 0 ? (
                      filteredTasks.map((task) => {
                        const isOverdue = task.deadlineState === 'OVERDUE';
                        
                        return (
                          <tr key={`${task.id ?? task.studentId}-${task.evaluatorRole ?? 'task'}`} className="hover:bg-slate-50/20 transition-colors">
                            {/* ID */}
                            <td className="py-4.5 pr-2 font-mono font-bold text-slate-900">
                              {task.studentId}
                            </td>
                            {/* Name */}
                            <td className="text-xs font-semibold text-slate-500 py-4.5 pr-4">
                              <div className="flex items-center gap-3">
                                <div className="w-[30px] h-[30px] rounded-lg bg-indigo-50 border border-blue-100/50 text-blue-650 text-blue-600 font-black text-xs flex items-center justify-center shrink-0">
                                  {task.initials}
                                </div>
                                <span className="card-value text-slate-900 leading-snug">
                                  {task.studentName}
                                </span>
                              </div>
                            </td>
                            {/* Research Title */}
                            <td className="text-xs font-semibold text-slate-500 py-4.5 pr-4 max-w-[280px]">
                              <p className="card-description text-slate-650 text-slate-500 leading-relaxed line-clamp-2">
                                {task.researchTitle}
                              </p>
                            </td>
                            <td className="text-xs font-semibold text-slate-500 py-4.5 pr-4">
                              <span className="inline-flex px-3 py-1 rounded-full bg-slate-50 text-xs font-extrabold tracking-wider text-slate-600 uppercase border border-slate-200">
                                {evaluatorRoleLabel(task)}
                              </span>
                            </td>
                            {/* Semester */}
                            <td className="text-xs font-semibold text-slate-500 py-4.5 pr-2 text-slate-605 text-slate-500">
                              {task.semester}
                            </td>
                            {/* Deadline */}
                            <td className={`text-xs py-4.5 pr-2 font-bold ${isOverdue ? 'text-rose-500' : 'text-slate-500'}`}>
                              <span className="block">{task.effectiveDueAt ? new Date(task.effectiveDueAt).toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' }) + ' (Malaysia)' : task.deadline}</span>
                              {task.completionWindow ? <span className="card-description block text-sky-700">Completion window · {task.completionWindow.status}</span> : null}
                              <span className={`card-caption block mt-1 ${isOverdue ? 'text-rose-500' : 'text-slate-500'}`}>
                                {formatDeadlineText(task)}
                              </span>
                            </td>
                            {/* Status */}
                            <td className="text-xs font-semibold text-slate-500 py-4.5 pr-2">
                              <StatusChip type={task.status} />
                              {task.periodEffectiveStatus ? <span className="card-description block">Period: {task.periodEffectiveStatus}</span> : null}
                            </td>
                            {/* Action Button */}
                            <td className="text-xs font-semibold text-slate-500 py-4.5 text-center">
                              <div className="flex flex-col items-center gap-1.5">
                                {onNavigateToDossier ? <button
                                  type="button"
                                  onClick={() => onNavigateToDossier(task.studentId)}
                                  className="text-xs font-black uppercase text-blue-700 hover:underline"
                                >
                                  View student record
                                </button> : null}
                                {task.status === 'SUBMITTED' || task.canEdit !== true ? (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenForm(task)}
                                    className="border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700 px-4 py-1.5 rounded-lg text-xs font-extrabold transition uppercase tracking-wider cursor-pointer"
                                  >
                                    View
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenForm(task)}
                                    className="bg-brand-navy hover:bg-slate-800 text-white px-4 py-1.5 rounded-lg text-xs font-extrabold transition uppercase tracking-wider cursor-pointer shadow-3xs"
                                  >
                                    Open
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={8} className="card-description py-12 text-center">
                          <div className="card-description text-slate-400">
                            {tasks.length === 0 ? 'No evaluation tasks assigned yet.' : 'No tasks match your filters. Try another search or clear the filters.'}
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {!loading && !error ? <p role="status" className="card-description border-t border-slate-100 pt-4">
                {filteredTasks.length} of {tasks.length} tasks
              </p> : null}
            </div>
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
              setActiveFormTask(null);
              triggerToast(`Draft saved successfully for ${savedTask.studentName}!`);
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
