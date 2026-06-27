/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle,
  Calendar,
  Check,
  CheckCircle2,
  Download,
  Eye,
  Filter,
  Mail,
  RefreshCw,
  ShieldAlert,
  Sliders,
  Users,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PageHeader, PortalToast } from './PortalPrimitives';
import { LoadingState, ErrorState } from './StateViews';
import { SummaryCard } from './SummaryCard';
import {
  EvaluationPeriodOption,
  EvaluationPreviewStatus,
  EvaluationPreviewTask,
  EvaluationTaskRole,
  MarksAssignmentOptions,
} from '../types';
import {
  createBackupEvaluationTask,
  generateEvaluationTasks,
  getEvaluationPeriods,
  getEvaluationPreviewTasks,
  getMarksAssignmentOptions,
} from '../services';

interface EvaluationTaskAssignmentProps {
  onBack: () => void;
}

interface ActivityItem {
  id: string;
  date: string;
  action: string;
  details: string;
  performedBy: string;
}

interface BackupFormState {
  periodId: string;
  studentId: string;
  evaluatorId: string;
  originalTaskId: string;
  reason: string;
  confirmed: boolean;
}

const ALL_ROLES = 'ALL';
const ALL_STATUSES = 'ALL';

const roleLabel = (role?: EvaluationTaskRole, fallback?: string): string => {
  if (fallback) return fallback;
  if (role === 'SUPERVISOR') return 'Supervisor';
  if (role === 'BACKUP') return 'Backup / Manual Override';
  return 'Panel';
};

const statusLabel = (status: EvaluationPreviewStatus): string => {
  const labels: Record<EvaluationPreviewStatus, string> = {
    GENERATED: 'Generated',
    PENDING: 'Pending',
    NOTIFIED: 'Notified',
    NOT_STARTED: 'Not Started',
    DRAFT: 'Draft',
    SUBMITTED: 'Submitted',
    OVERDUE: 'Overdue',
  };
  return labels[status] || status;
};

const formatDate = (value: string | null): string => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '-'
    : date.toLocaleDateString(undefined, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
};

const taskMatchesPeriod = (task: EvaluationPreviewTask, periodId: string): boolean =>
  !periodId || !task.periodId || String(task.periodId) === periodId;

const deriveTotals = (
  tasks: EvaluationPreviewTask[],
  period?: EvaluationPeriodOption,
) => {
  if (period) return period.taskTotals;
  const submitted = tasks.filter((task) => task.status === 'SUBMITTED').length;
  return {
    total: tasks.length,
    supervisor: tasks.filter((task) => task.evaluatorRole === 'SUPERVISOR').length,
    panel: tasks.filter((task) => (task.evaluatorRole || 'PANEL') === 'PANEL').length,
    backup: tasks.filter((task) => task.evaluatorRole === 'BACKUP').length,
    submitted,
    incomplete: tasks.length - submitted,
    overdue: 0,
  };
};

export const EvaluationTaskAssignment: React.FC<EvaluationTaskAssignmentProps> = ({ onBack }) => {
  const [tasks, setTasks] = useState<EvaluationPreviewTask[]>([]);
  const [periods, setPeriods] = useState<EvaluationPeriodOption[]>([]);
  const [options, setOptions] = useState<MarksAssignmentOptions>({
    students: [],
    lecturers: [],
    tasks: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriodId, setSelectedPeriodId] = useState('');
  const [roleFilter, setRoleFilter] = useState<typeof ALL_ROLES | EvaluationTaskRole>(ALL_ROLES);
  const [statusFilter, setStatusFilter] = useState<typeof ALL_STATUSES | EvaluationPreviewStatus>(ALL_STATUSES);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<EvaluationPreviewTask | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [submittingBackup, setSubmittingBackup] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [backupForm, setBackupForm] = useState<BackupFormState>({
    periodId: '',
    studentId: '',
    evaluatorId: '',
    originalTaskId: '',
    reason: '',
    confirmed: false,
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    window.setTimeout(() => setToastMessage(null), 3500);
  };

  const loadWorkspace = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [loadedTasks, loadedPeriods, loadedOptions] = await Promise.all([
        getEvaluationPreviewTasks(),
        getEvaluationPeriods(),
        getMarksAssignmentOptions(),
      ]);
      setTasks(loadedTasks);
      setPeriods(loadedPeriods);
      setOptions(loadedOptions);
      setSelectedPeriodId((current) => current || (loadedPeriods[0] ? String(loadedPeriods[0].id) : ''));
      setBackupForm((current) => ({
        ...current,
        periodId: current.periodId || (loadedPeriods[0] ? String(loadedPeriods[0].id) : ''),
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load evaluation assignment workspace.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  const selectedPeriod = useMemo(
    () => periods.find((period) => String(period.id) === selectedPeriodId),
    [periods, selectedPeriodId],
  );

  const filteredTasks = useMemo(() => tasks.filter((task) => {
    const matchesPeriod = taskMatchesPeriod(task, selectedPeriodId);
    const matchesRole = roleFilter === ALL_ROLES || (task.evaluatorRole || 'PANEL') === roleFilter;
    const matchesStatus = statusFilter === ALL_STATUSES || task.status === statusFilter;
    return matchesPeriod && matchesRole && matchesStatus;
  }), [tasks, selectedPeriodId, roleFilter, statusFilter]);

  const totals = useMemo(
    () => deriveTotals(tasks.filter((task) => taskMatchesPeriod(task, selectedPeriodId)), selectedPeriod),
    [tasks, selectedPeriod, selectedPeriodId],
  );

  const studentsForPeriod = useMemo(() => options.students.filter((student) => (
    !selectedPeriod || student.semester === selectedPeriod.semester || !student.semester
  )), [options.students, selectedPeriod]);

  const originalTaskOptions = useMemo(() => options.tasks.filter((task) => (
    (!backupForm.periodId || !task.periodId || String(task.periodId) === backupForm.periodId)
    && (!backupForm.studentId || task.studentId === backupForm.studentId)
    && task.evaluatorRole !== 'BACKUP'
  )), [backupForm.periodId, backupForm.studentId, options.tasks]);

  const selectedBackupStudent = options.students.find((student) => student.studentId === backupForm.studentId);
  const selectedBackupLecturer = options.lecturers.find((lecturer) => String(lecturer.userId) === backupForm.evaluatorId);

  const handleGenerateTasks = async () => {
    if (!selectedPeriodId) {
      showToast('Select an evaluation period before generating tasks.');
      return;
    }
    setGenerating(true);
    try {
      const result = await generateEvaluationTasks(Number(selectedPeriodId));
      showToast(
        `Generated ${result.createdCount} missing task(s): ${result.supervisorCreatedCount} supervisor, ${result.panelCreatedCount} panel.`,
      );
      setActivities(prev => [{
        id: String(Date.now()),
        date: 'Today',
        action: 'Generated missing tasks',
        details: `${result.createdCount} created, ${result.totalCount} total for selected period`,
        performedBy: 'Office Staff/Admin',
      }, ...prev]);
      await loadWorkspace();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to generate evaluation tasks.');
    } finally {
      setGenerating(false);
    }
  };

  const openBackupDrawer = () => {
    setFormError(null);
    setBackupForm({
      periodId: selectedPeriodId,
      studentId: '',
      evaluatorId: '',
      originalTaskId: '',
      reason: '',
      confirmed: false,
    });
    setDrawerOpen(true);
  };

  const validateBackupForm = (): string | null => {
    if (!backupForm.periodId) return 'Evaluation period is required.';
    if (!backupForm.studentId) return 'Student is required.';
    if (!backupForm.evaluatorId) return 'Backup lecturer is required.';
    if (!backupForm.reason.trim()) return 'Backup assignment reason is required.';
    if (!backupForm.confirmed) return 'Confirm that this is an exception assignment before submitting.';
    return null;
  };

  const handleBackupSubmit = async () => {
    const validation = validateBackupForm();
    if (validation) {
      setFormError(validation);
      return;
    }
    setSubmittingBackup(true);
    setFormError(null);
    try {
      const task = await createBackupEvaluationTask(Number(backupForm.periodId), {
        studentId: backupForm.studentId,
        evaluatorId: Number(backupForm.evaluatorId),
        reason: backupForm.reason.trim(),
        originalTaskId: backupForm.originalTaskId ? Number(backupForm.originalTaskId) : undefined,
      });
      showToast(`Backup evaluator task created for ${task.studentName}.`);
      setActivities(prev => [{
        id: String(Date.now()),
        date: 'Today',
        action: 'Backup evaluator assigned',
        details: `${task.studentId} assigned as ${task.evaluatorRoleLabel || 'Backup / Manual Override'}`,
        performedBy: 'Office Staff/Admin',
      }, ...prev]);
      setDrawerOpen(false);
      await loadWorkspace();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Failed to create backup evaluator task.');
    } finally {
      setSubmittingBackup(false);
    }
  };

  const handleNotifyPanel = () => {
    showToast('Notification dispatch will use the in-app notification workflow when marks notifications are enabled.');
  };

  const handleExportPDF = () => {
    showToast('Export queued. The current filtered assignment list is ready for reporting integration.');
  };

  return (
    <div id="eval-assignment-workspace" className="space-y-8 animate-fade-in relative text-left">
      <PortalToast message={toastMessage} />

      <PageHeader
        title="Evaluation Task Assignment"
        subtitle="Generate and monitor supervisor, panel, and backup mark-entry tasks for active evaluation periods."
        backLabel="Back to Marks & Evaluation Management"
        onBack={onBack}
        subtitleClassName="leading-relaxed"
      />

      {loading ? (
        <LoadingState message="Loading evaluation assignment workspace…" />
      ) : error ? (
        <ErrorState message={error} onRetry={loadWorkspace} />
      ) : (
        <>
          <div id="summary-cards-row" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <SummaryCard
              title="Evaluation Period"
              badgeText={selectedPeriod?.isOpen ? 'Open' : 'Closed'}
              badgeType={selectedPeriod?.isOpen ? 'active' : 'generated'}
              subtext={selectedPeriod ? `${selectedPeriod.name} · ${selectedPeriod.semester}` : 'No period selected'}
              icon={Calendar}
              onClick={() => {}}
            />
            <SummaryCard
              title="Supervisor Tasks"
              badgeText={String(totals.supervisor)}
              badgeType="ready"
              subtext="Supervisor mark-entry assignments"
              icon={Users}
              onClick={() => setRoleFilter('SUPERVISOR')}
            />
            <SummaryCard
              title="Panel Tasks"
              badgeText={String(totals.panel)}
              badgeType="active"
              subtext="Panel member mark-entry assignments"
              icon={Sliders}
              onClick={() => setRoleFilter('PANEL')}
            />
            <SummaryCard
              title="Backup Tasks"
              badgeText={String(totals.backup)}
              badgeType={totals.backup > 0 ? 'ratio' : 'ready'}
              subtext="Exception/manual override assignments"
              icon={ShieldAlert}
              onClick={() => setRoleFilter('BACKUP')}
            />
          </div>

          <div id="assignment-controls" className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-6">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 md:p-8 shadow-3xs">
              <div className="flex items-center justify-between pb-5 border-b border-slate-100 gap-4 flex-wrap">
                <div>
                  <h3 className="text-sm font-black text-brand-navy tracking-tight">Generate Missing Tasks</h3>
                  <p className="text-xs font-semibold text-slate-500 mt-1">
                    Creates only missing supervisor and panel tasks. Existing and submitted marks are preserved.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={loadWorkspace}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-black text-slate-600 hover:bg-slate-50"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Refresh
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-5">
                <label className="block">
                  <span className="form-label block">Evaluation Period</span>
                  <select
                    className="form-control form-control-md"
                    value={selectedPeriodId}
                    onChange={(event) => {
                      setSelectedPeriodId(event.target.value);
                      setBackupForm((current) => ({ ...current, periodId: event.target.value }));
                    }}
                  >
                    <option value="">Select period</option>
                    {periods.map((period) => (
                      <option key={period.id} value={period.id}>
                        {period.name} · {period.semester}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 text-xs">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2">
                    Selected Period
                  </span>
                  <p className="font-black text-brand-navy">{selectedPeriod?.rubricName || 'No rubric selected'}</p>
                  <p className="text-slate-500 font-semibold mt-1">
                    {formatDate(selectedPeriod?.opensAt || null)} → {formatDate(selectedPeriod?.closesAt || null)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
                {[
                  ['Total', totals.total],
                  ['Submitted', totals.submitted],
                  ['Incomplete', totals.incomplete],
                  ['Overdue', totals.overdue],
                ].map(([label, value]) => (
                  <div key={String(label)} className="rounded-xl border border-slate-200 bg-white p-3">
                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">{label}</span>
                    <span className="block text-xl font-black text-brand-navy mt-1">{value}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-3 mt-6">
                <button
                  type="button"
                  disabled={!selectedPeriodId || generating}
                  onClick={handleGenerateTasks}
                  className="px-5 py-3 bg-brand-navy hover:bg-slate-900 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl text-xs font-extrabold tracking-wider uppercase flex items-center gap-2.5 transition"
                >
                  <Check className="w-4 h-4" />
                  {generating ? 'Generating…' : 'Generate Missing Tasks'}
                </button>
                <button
                  type="button"
                  onClick={openBackupDrawer}
                  className="px-5 py-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-extrabold tracking-wider uppercase flex items-center gap-2.5 transition-all shadow-xs"
                >
                  <AlertCircle className="w-4.5 h-4.5 text-amber-500" />
                  Assign Backup Evaluator
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-3xs">
              <h3 className="text-sm font-black text-brand-navy tracking-tight">Readiness Checks</h3>
              <ul className="space-y-4 pt-5">
                {[
                  ['Evaluation period selected', Boolean(selectedPeriodId)],
                  ['Rubric configured', Boolean(selectedPeriod?.rubricName)],
                  ['Eligible students available', studentsForPeriod.length > 0],
                  ['Backup lecturers available', options.lecturers.length > 0],
                ].map(([label, passed]) => (
                  <li key={String(label)} className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-semibold">{label}</span>
                    <span className={`inline-flex items-center gap-1.5 font-extrabold text-[10px] uppercase ${passed ? 'text-blue-600' : 'text-amber-600'}`}>
                      {passed ? 'Passed' : 'Check'}
                      {passed ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div id="evaluation-preview-card" className="bg-white rounded-2xl border border-slate-200/80 p-6 md:p-8 text-left shadow-3xs">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-5 border-b border-slate-100 mb-5">
              <div>
                <h3 className="text-lg font-extrabold text-brand-navy tracking-tight">Generated Evaluation Tasks</h3>
                <p className="text-slate-400 text-xs font-semibold mt-1">
                  Filter official supervisor/panel tasks and backup exception assignments.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <label className="block">
                  <span className="form-label block">Role</span>
                  <select
                    className="form-control form-control-sm min-w-[150px]"
                    value={roleFilter}
                    onChange={(event) => setRoleFilter(event.target.value as typeof ALL_ROLES | EvaluationTaskRole)}
                  >
                    <option value={ALL_ROLES}>All roles</option>
                    <option value="SUPERVISOR">Supervisor</option>
                    <option value="PANEL">Panel</option>
                    <option value="BACKUP">Backup</option>
                  </select>
                </label>
                <label className="block">
                  <span className="form-label block">Status</span>
                  <select
                    className="form-control form-control-sm min-w-[150px]"
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value as typeof ALL_STATUSES | EvaluationPreviewStatus)}
                  >
                    <option value={ALL_STATUSES}>All statuses</option>
                    <option value="NOT_STARTED">Not Started</option>
                    <option value="DRAFT">Draft</option>
                    <option value="SUBMITTED">Submitted</option>
                  </select>
                </label>
                <button
                  onClick={handleExportPDF}
                  className="self-end px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2.5 transition-all shadow-xs"
                >
                  <Download className="w-4 h-4 text-slate-500" />
                  Export
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="data-table min-w-[900px]">
                <thead>
                  <tr className="data-thead">
                    <th className="data-th">Student ID</th>
                    <th className="data-th">Student Name</th>
                    <th className="data-th">Research Title</th>
                    <th className="data-th">Evaluator</th>
                    <th className="data-th">Role</th>
                    <th className="data-th">Semester</th>
                    <th className="data-th text-center">Status</th>
                    <th className="data-th text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 divide-dashed font-sans">
                  {filteredTasks.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center">
                        <Filter className="w-6 h-6 text-slate-300 mx-auto mb-3" />
                        <p className="text-xs font-bold text-slate-400">No evaluation tasks match the selected filters.</p>
                      </td>
                    </tr>
                  ) : filteredTasks.map((task) => (
                    <tr key={task.taskId ?? task.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="data-td-strong font-mono">{task.studentId}</td>
                      <td className="data-td">{task.studentName}</td>
                      <td className="data-td max-w-[240px] truncate" title={task.researchTitle}>{task.researchTitle}</td>
                      <td className="data-td">{task.panelMember}</td>
                      <td className="data-td">
                        <span className={`inline-flex px-3 py-1 rounded-full text-[9px] font-extrabold tracking-wider uppercase border ${
                          task.evaluatorRole === 'BACKUP'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-slate-50 text-slate-600 border-slate-200'
                        }`}>
                          {roleLabel(task.evaluatorRole, task.evaluatorRoleLabel)}
                        </span>
                      </td>
                      <td className="data-td">{task.semester}</td>
                      <td className="data-td text-center">
                        <span className="inline-flex px-3 py-1 rounded-full bg-blue-50 text-[9px] font-extrabold tracking-wider text-blue-600 uppercase border border-blue-100">
                          {statusLabel(task.status)}
                        </span>
                      </td>
                      <td className="data-td text-right">
                        <button
                          onClick={() => setSelectedTask(task)}
                          className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div id="task-actions-wrapper" className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 bg-slate-50 border border-slate-100 p-5 rounded-2xl">
            <div className="flex flex-wrap items-center gap-4">
              <button
                onClick={handleNotifyPanel}
                className="px-5 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold tracking-wider uppercase flex items-center gap-2.5 transition-all shadow-sm"
              >
                <Mail className="w-4.5 h-4.5 text-blue-200" />
                Notify Evaluators
              </button>
              <button
                onClick={() => setRoleFilter(ALL_ROLES)}
                className="px-5 py-3.5 bg-white hover:bg-slate-50 text-blue-600 border border-blue-200 hover:border-blue-300 rounded-xl text-xs font-extrabold tracking-wider uppercase flex items-center gap-2.5 transition-all shadow-xs"
              >
                <Eye className="w-4.5 h-4.5 text-blue-500" />
                View All Tasks
              </button>
            </div>
            <p className="text-[11px] text-slate-550 font-bold leading-relaxed max-w-[360px] text-left lg:text-right">
              Backup assignments are exception records and do not modify official supervisor or panel appointments.
            </p>
          </div>

          <div id="recent-assignment-activity-panel" className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden text-left shadow-3xs">
            <div className="p-6 pb-4 border-b border-slate-100">
              <h3 className="text-sm font-extrabold text-brand-navy tracking-tight">Recent Assignment Activity</h3>
            </div>
            {activities.length === 0 ? (
              <div className="p-8 text-xs font-semibold text-slate-400">
                Assignment actions taken in this session will appear here.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table min-w-[650px]">
                  <thead>
                    <tr className="data-thead bg-slate-50/50">
                      <th className="data-th">Date</th>
                      <th className="data-th">Action</th>
                      <th className="data-th">Details</th>
                      <th className="data-th">Performed By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {activities.map((act) => (
                      <tr key={act.id} className="hover:bg-slate-50/20 transition-colors">
                        <td className="data-td">{act.date}</td>
                        <td className="data-td">{act.action}</td>
                        <td className="data-td">{act.details}</td>
                        <td className="data-td">{act.performedBy}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {createPortal(
        <AnimatePresence>
          {drawerOpen && (
            <div className="fixed inset-0 z-50 flex justify-end font-sans text-xs text-left">
              <div className="fixed inset-0 bg-brand-navy/60 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
              <motion.aside
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 260 }}
                className="relative w-full max-w-xl h-full bg-white shadow-sm border-l border-slate-200 flex flex-col z-10"
              >
                <div className="drawer-header">
                  <div>
                    <h3 className="font-black text-brand-navy text-[15px] tracking-tight">Assign Backup Evaluator</h3>
                    <p className="text-[11px] text-slate-500 font-semibold mt-1">
                      Exception-only assignment with audit reason.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDrawerOpen(false)}
                    className="icon-button w-9 h-9"
                    aria-label="Close backup evaluator drawer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="drawer-body">
                  {formError && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 text-rose-700 p-3 font-bold">
                      {formError}
                    </div>
                  )}

                  <label className="block">
                    <span className="form-label block">Evaluation Period</span>
                    <select
                      className="form-control form-control-md"
                      value={backupForm.periodId}
                      onChange={(event) => setBackupForm((current) => ({
                        ...current,
                        periodId: event.target.value,
                        originalTaskId: '',
                      }))}
                    >
                      <option value="">Select period</option>
                      {periods.map((period) => (
                        <option key={period.id} value={period.id}>{period.name} · {period.semester}</option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="form-label block">Student</span>
                    <select
                      className="form-control form-control-md"
                      value={backupForm.studentId}
                      onChange={(event) => setBackupForm((current) => ({
                        ...current,
                        studentId: event.target.value,
                        originalTaskId: '',
                      }))}
                    >
                      <option value="">Select student</option>
                      {studentsForPeriod.map((student) => (
                        <option key={student.studentId} value={student.studentId}>
                          {student.studentName} · {student.studentId}
                        </option>
                      ))}
                    </select>
                    {selectedBackupStudent && (
                      <p className="mt-2 text-[11px] text-slate-500 font-semibold">
                        {selectedBackupStudent.researchTitle}
                      </p>
                    )}
                  </label>

                  <label className="block">
                    <span className="form-label block">Backup Lecturer</span>
                    <select
                      className="form-control form-control-md"
                      value={backupForm.evaluatorId}
                      onChange={(event) => setBackupForm((current) => ({
                        ...current,
                        evaluatorId: event.target.value,
                      }))}
                    >
                      <option value="">Select backup lecturer</option>
                      {options.lecturers.map((lecturer) => (
                        <option key={lecturer.userId} value={lecturer.userId}>
                          {lecturer.fullName} · {lecturer.staffId || lecturer.email}
                        </option>
                      ))}
                    </select>
                    {selectedBackupLecturer && (
                      <p className="mt-2 text-[11px] text-slate-500 font-semibold">
                        {selectedBackupLecturer.department || 'Department not recorded'} · {selectedBackupLecturer.email}
                      </p>
                    )}
                  </label>

                  <label className="block">
                    <span className="form-label block">Original Task Covered</span>
                    <select
                      className="form-control form-control-md"
                      value={backupForm.originalTaskId}
                      onChange={(event) => setBackupForm((current) => ({
                        ...current,
                        originalTaskId: event.target.value,
                      }))}
                    >
                      <option value="">No specific original task</option>
                      {originalTaskOptions.map((task) => (
                        <option key={task.taskId ?? task.id} value={task.taskId}>
                          {roleLabel(task.evaluatorRole, task.evaluatorRoleLabel)} · {task.panelMember}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="form-label block">Reason</span>
                    <textarea
                      className="form-control form-control-md min-h-[120px]"
                      value={backupForm.reason}
                      onChange={(event) => setBackupForm((current) => ({
                        ...current,
                        reason: event.target.value,
                      }))}
                      placeholder="Example: Appointed evaluator is unavailable due to medical leave."
                    />
                  </label>

                  <label className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={backupForm.confirmed}
                      onChange={(event) => setBackupForm((current) => ({
                        ...current,
                        confirmed: event.target.checked,
                      }))}
                    />
                    <span className="font-bold leading-relaxed">
                      I confirm this is an exception assignment. It does not change the official supervisor or panel appointment.
                    </span>
                  </label>
                </div>

                <div className="drawer-footer">
                  <button
                    type="button"
                    onClick={() => setDrawerOpen(false)}
                    className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-black uppercase tracking-wider"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={submittingBackup}
                    onClick={handleBackupSubmit}
                    className="px-5 py-2.5 rounded-xl bg-brand-navy hover:bg-slate-900 disabled:bg-slate-300 text-white font-black uppercase tracking-wider"
                  >
                    {submittingBackup ? 'Assigning…' : 'Assign Backup'}
                  </button>
                </div>
              </motion.aside>
            </div>
          )}
        </AnimatePresence>,
        document.body,
      )}

      {createPortal(
        <AnimatePresence>
          {selectedTask && (
            <div className="fixed inset-0 bg-brand-navy/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="absolute inset-0" onClick={() => setSelectedTask(null)} />
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl max-w-md w-full p-6 md:p-8 shadow-sm border border-slate-100 text-left relative z-10"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                  <h4 className="font-extrabold text-brand-navy text-sm">Evaluation Task Details</h4>
                  <button
                    onClick={() => setSelectedTask(null)}
                    className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition"
                  >
                    &times;
                  </button>
                </div>

                <div className="space-y-4 text-xs">
                  <div>
                    <span className="text-slate-400 font-extrabold uppercase tracking-wide block mb-1">Student</span>
                    <span className="font-extrabold text-blue-900 block text-sm">
                      {selectedTask.studentName} ({selectedTask.studentId})
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-extrabold uppercase tracking-wide block mb-1">Research Title</span>
                    <p className="font-medium text-slate-700 italic leading-relaxed">{selectedTask.researchTitle}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-extrabold uppercase tracking-wide block mb-1">Assigned Evaluator</span>
                    <span className="font-extrabold text-brand-navy block">{selectedTask.panelMember}</span>
                    <span className="inline-flex mt-2 px-2.5 py-1 rounded-full bg-slate-50 text-[9px] font-extrabold tracking-wider text-slate-600 uppercase border border-slate-200">
                      {roleLabel(selectedTask.evaluatorRole, selectedTask.evaluatorRoleLabel)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-50">
                    <div>
                      <span className="text-slate-400 font-extrabold uppercase tracking-wide block mb-1">Semester</span>
                      <span className="font-bold text-slate-800">{selectedTask.semester}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-extrabold uppercase tracking-wide block mb-1">Status</span>
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-extrabold tracking-wide uppercase rounded">
                        {statusLabel(selectedTask.status)}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedTask(null)}
                  className="w-full py-3 bg-brand-navy hover:bg-slate-850 text-white rounded-xl text-xs font-extrabold uppercase tracking-widest mt-6"
                >
                  Close
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
};
