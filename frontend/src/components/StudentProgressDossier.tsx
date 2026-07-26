import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  GraduationCap,
  History,
  PanelTop,
  UserRound,
} from 'lucide-react';

import type {
  PanelDossierRecord,
  StudentProgressDossier as StudentProgressDossierData,
  StudentProgressSection,
  StudentProgressTab,
  StudentProgressTarget,
  SupervisorDossierRecord,
  SupervisorWorkflowEvent,
  UserRole,
} from '../types';
import { getStudentProgressDossier } from '../services';
import { ApiError } from '../services/apiClient';
import {
  formatProgressStatus,
  resolveStudentProgressRecordRoute,
  visibleProgressTabs,
} from '../utils/studentProgress';
import { EmptyState, ErrorState, LoadingState } from './StateViews';
import {
  PageHeader,
  PortalButton,
  PortalCard,
  StatusBadge,
  getStatusBadgeTone,
} from './PortalPrimitives';

interface StudentProgressDossierProps {
  studentId?: string;
  currentUserRole: UserRole;
  onBack: () => void;
  onNavigateToRoute: (route: string) => void;
}

const TAB_LABELS: Record<StudentProgressTab, string> = {
  OVERVIEW: 'Overview',
  SUPERVISOR: 'Supervisor',
  PANEL: 'Panel',
  MARKS: 'Marks',
  TIMELINE: 'Timeline',
};

const dateText = (value: string | null | undefined): string =>
  value
    ? new Date(value).toLocaleDateString('en-MY', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : 'Not recorded';

const statusTone = (status: string | null | undefined) => {
  const normalized = formatProgressStatus(status);
  if (normalized.includes('Rejected') || normalized.includes('Cancelled') || normalized === 'Overdue') {
    return 'danger' as const;
  }
  if (normalized.includes('Pending') || normalized.includes('Processing') || normalized === 'Draft') {
    return 'warning' as const;
  }
  if (normalized.includes('Approved') || normalized.includes('Submitted') || normalized === 'Active') {
    return 'success' as const;
  }
  return getStatusBadgeTone(normalized);
};

const AuditTrail: React.FC<{ events?: SupervisorWorkflowEvent[] }> = ({ events = [] }) => {
  if (events.length === 0) return null;
  return (
    <div className="mt-4 border-t border-slate-100 pt-4">
      <p className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase text-slate-500">
        <History className="h-3.5 w-3.5" />
        Workflow audit
      </p>
      <div className="space-y-3 border-l-2 border-slate-200 pl-4">
        {events.map((event) => (
          <div key={event.id}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] font-black text-brand-navy">
                {formatProgressStatus(event.action)}
              </p>
              <time className="text-[9px] font-bold text-slate-400">
                {dateText(event.createdAt)}
              </time>
            </div>
            <p className="mt-1 text-[10px] font-semibold text-slate-500">
              {event.actorName} · {event.actorRole}
            </p>
            {event.reason && (
              <p className="mt-1 text-[10px] font-semibold text-slate-600">{event.reason}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const RecordAction: React.FC<{
  target: StudentProgressTarget;
  onNavigate: (route: string) => void;
}> = ({ target, onNavigate }) => (
  <PortalButton
    size="sm"
    variant="ghost"
    icon={ArrowUpRight}
    onClick={() => onNavigate(resolveStudentProgressRecordRoute(target))}
  >
    Open record
  </PortalButton>
);

const SupervisorRecord: React.FC<{
  record: SupervisorDossierRecord;
  isCurrent: boolean;
  internal: boolean;
  onNavigate: (route: string) => void;
}> = ({ record, isCurrent, internal, onNavigate }) => (
  <PortalCard padding="md" className={isCurrent ? 'border-l-4 border-l-blue-600' : ''}>
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge tone={statusTone(record.status)}>{formatProgressStatus(record.status)}</StatusBadge>
          {isCurrent && <StatusBadge tone="info">Current</StatusBadge>}
        </div>
        <h3 className="mt-3 text-sm font-black text-brand-navy">{record.researchTitle}</h3>
        <p className="mt-1 text-xs font-semibold text-slate-500">
          Proposed supervisor: {record.proposedSupervisor}
        </p>
      </div>
      {internal && <RecordAction target={record} onNavigate={onNavigate} />}
    </div>
    <div className="mt-4 grid grid-cols-1 gap-3 text-[11px] sm:grid-cols-3">
      <p><span className="font-black text-slate-500">Submitted:</span> {dateText(record.submittedAt)}</p>
      <p><span className="font-black text-slate-500">Waiting:</span> {record.waitingDays === null ? 'Not waiting' : `${record.waitingDays} days`}</p>
      <p><span className="font-black text-slate-500">Appointment:</span> {record.appointment ? dateText(record.appointment.appointmentDate) : 'Not appointed'}</p>
    </div>
    {(record.rejectionReason || record.cancellationReason) && (
      <p className="mt-4 border-l-2 border-rose-300 pl-3 text-[11px] font-semibold text-rose-700">
        {record.rejectionReason || record.cancellationReason}
      </p>
    )}
    <AuditTrail events={record.workflow} />
  </PortalCard>
);

const PanelRecord: React.FC<{
  record: PanelDossierRecord;
  isCurrent: boolean;
  internal: boolean;
  onNavigate: (route: string) => void;
}> = ({ record, isCurrent, internal, onNavigate }) => (
  <PortalCard padding="md" className={isCurrent ? 'border-l-4 border-l-cyan-600' : ''}>
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge tone={statusTone(record.status)}>{formatProgressStatus(record.status)}</StatusBadge>
          {isCurrent && <StatusBadge tone="info">Current</StatusBadge>}
        </div>
        <p className="mt-3 text-xs font-semibold text-slate-600">
          {record.appointment
            ? `Appointed panel member: ${record.appointment.panelMember}`
            : record.recommendedMember
            ? `Recommended member: ${record.recommendedMember}`
            : 'Panel appointment is being processed by the faculty.'}
        </p>
      </div>
      {internal && record.recordId && <RecordAction target={record} onNavigate={onNavigate} />}
    </div>
    <div className="mt-4 grid grid-cols-1 gap-3 text-[11px] sm:grid-cols-3">
      <p><span className="font-black text-slate-500">Submitted:</span> {dateText(record.submittedAt)}</p>
      <p><span className="font-black text-slate-500">Waiting:</span> {record.waitingDays === null ? 'Not waiting' : `${record.waitingDays} days`}</p>
      <p><span className="font-black text-slate-500">Decision:</span> {dateText(record.coordinatorDecisionAt || record.panelDecisionAt || record.decisionAt)}</p>
    </div>
    {(record.rejectionReason || record.cancellationReason) && (
      <p className="mt-4 border-l-2 border-rose-300 pl-3 text-[11px] font-semibold text-rose-700">
        {record.rejectionReason || record.cancellationReason}
      </p>
    )}
    <AuditTrail events={record.workflow} />
  </PortalCard>
);

export const StudentProgressDossier: React.FC<StudentProgressDossierProps> = ({
  studentId,
  currentUserRole,
  onBack,
  onNavigateToRoute,
}) => {
  const [dossier, setDossier] = useState<StudentProgressDossierData | null>(null);
  const [activeTab, setActiveTab] = useState<StudentProgressTab>('OVERVIEW');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const loadDossier = useCallback(() => {
    if (!studentId) {
      setLoading(false);
      setNotFound(true);
      return;
    }
    setLoading(true);
    setError(null);
    setNotFound(false);
    getStudentProgressDossier(studentId)
      .then((result) => {
        setDossier(result);
        setActiveTab('OVERVIEW');
      })
      .catch((reason) => {
        if (reason instanceof ApiError && reason.status === 404) {
          setNotFound(true);
          return;
        }
        setError(reason instanceof Error ? reason.message : 'Unable to load student progress.');
      })
      .finally(() => setLoading(false));
  }, [studentId]);

  useEffect(() => {
    loadDossier();
  }, [loadDossier]);

  const tabs = useMemo(
    () => visibleProgressTabs(dossier?.visibleSections ?? []),
    [dossier],
  );

  if (loading) return <LoadingState message="Loading student progress dossier..." />;
  if (notFound) {
    return (
      <div className="space-y-5">
        <PageHeader title="Student Progress Dossier" backLabel="Back" onBack={onBack} />
        <EmptyState
          title="Dossier not available"
          description="The student record was not found or is outside your authorised scope."
          icon={AlertTriangle}
        />
      </div>
    );
  }
  if (error || !dossier) {
    return <ErrorState message={error ?? 'Unable to load student progress.'} onRetry={loadDossier} />;
  }

  const internal = dossier.visibility === 'INTERNAL';
  const statusItems = [
    { section: 'SUPERVISOR', label: 'Supervisor', value: dossier.overview.supervisorStatus, icon: UserRound },
    { section: 'PANEL', label: 'Panel', value: dossier.overview.panelStatus, icon: PanelTop },
    { section: 'MARKS', label: 'Marks', value: dossier.overview.marksStatus, icon: FileText },
    { section: 'TIMELINE', label: 'Active milestones', value: String(dossier.overview.activeTimelineEntries), icon: CalendarDays },
  ].filter((item) => dossier.visibleSections.includes(item.section as StudentProgressSection));

  return (
    <div id="student-progress-dossier" className="space-y-6 pb-16 text-left">
      <PageHeader
        title="Student Progress Dossier"
        subtitle={internal
          ? 'Authorised current state and complete persisted workflow history.'
          : 'Your current research progress, deadlines, and faculty processing status.'}
        backLabel="Back"
        onBack={onBack}
      />

      <PortalCard padding="md" className="border-t-4 border-t-brand-navy rounded-lg">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-brand-navy text-white">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-black text-brand-navy">{dossier.student.studentName}</h2>
              <p className="mt-1 text-xs font-bold text-slate-500">
                {dossier.student.studentId} · {dossier.student.programme}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <StatusBadge tone={statusTone(dossier.student.status)}>{dossier.student.status}</StatusBadge>
                <StatusBadge tone={dossier.overview.attentionCount > 0 ? 'warning' : 'success'}>
                  {dossier.overview.attentionCount} attention items
                </StatusBadge>
              </div>
            </div>
          </div>
          <div className="max-w-xl lg:text-right">
            <p className="text-[10px] font-black uppercase text-slate-400">Research topic</p>
            <p className="mt-1 text-sm font-bold text-slate-700">
              {dossier.student.research?.title ?? 'Research profile not yet available'}
            </p>
            {dossier.student.research && (
              <p className="mt-1 text-xs font-semibold text-slate-500">
                {dossier.student.research.researchArea} · {dossier.student.research.semester}
              </p>
            )}
          </div>
        </div>
      </PortalCard>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {statusItems.map(({ label, value, icon: Icon }) => (
          <PortalCard key={label} padding="sm" className="rounded-lg min-h-[96px]">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[9px] font-black uppercase text-slate-400">{label}</p>
              <Icon className="h-4 w-4 text-slate-400" />
            </div>
            <p className="mt-4 text-sm font-black text-brand-navy">
              {label === 'Active milestones' ? value : formatProgressStatus(value)}
            </p>
          </PortalCard>
        ))}
      </div>

      <div className="border-b border-slate-200 overflow-x-auto">
        <div className="flex min-w-max gap-6" role="tablist" aria-label="Dossier sections">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              onClick={() => setActiveTab(tab)}
              className={`border-b-2 px-1 pb-3 text-[11px] font-black uppercase ${
                activeTab === tab
                  ? 'border-brand-navy text-brand-navy'
                  : 'border-transparent text-slate-400 hover:text-slate-700'
              }`}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'OVERVIEW' && (
        <section className="space-y-4">
          <div>
            <h2 className="text-sm font-black text-brand-navy">Attention and next milestones</h2>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              Persisted deadlines and active workflow waits, ordered by priority.
            </p>
          </div>
          {dossier.attention.length === 0 ? (
            <EmptyState
              title="No active attention items"
              description="There are no overdue tasks, waiting approvals, or active milestones."
              icon={CheckCircle2}
            />
          ) : (
            <div className="divide-y divide-slate-100 border-y border-slate-200">
              {dossier.attention.map((item, index) => (
                <div
                  key={`${item.kind}-${item.recordType}-${item.recordId ?? index}`}
                  className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-start gap-3">
                    <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    <div>
                      <p className="text-xs font-black text-brand-navy">{item.label}</p>
                      <p className="mt-1 text-[10px] font-semibold text-slate-500">
                        {item.waitingDays !== null
                          ? `${item.waitingDays} calendar days`
                          : item.dueAt
                          ? `Date: ${dateText(item.dueAt)}`
                          : formatProgressStatus(item.kind)}
                      </p>
                    </div>
                  </div>
                  {(internal || item.targetModule !== 'MARKS') && (
                    <RecordAction target={item} onNavigate={onNavigateToRoute} />
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === 'SUPERVISOR' && dossier.supervisor && (
        <section className="space-y-4">
          <h2 className="text-sm font-black text-brand-navy">Supervisor lifecycle</h2>
          {dossier.supervisor.records.length === 0 ? (
            <EmptyState title="No Supervisor records" description="No persisted Supervisor applications are available." />
          ) : dossier.supervisor.records.map((record, index) => (
            <SupervisorRecord
              key={record.recordId}
              record={record}
              isCurrent={record.recordId === dossier.supervisor?.currentRecordId || (!internal && index === 0)}
              internal={internal}
              onNavigate={onNavigateToRoute}
            />
          ))}
        </section>
      )}

      {activeTab === 'PANEL' && dossier.panel && (
        <section className="space-y-4">
          <h2 className="text-sm font-black text-brand-navy">Panel lifecycle</h2>
          {dossier.panel.records.length === 0 ? (
            <EmptyState title="No Panel records" description="No persisted Panel recommendations are available." />
          ) : dossier.panel.records.map((record, index) => (
            <PanelRecord
              key={record.recordId ?? `${record.status}-${record.submittedAt}-${index}`}
              record={record}
              isCurrent={record.recordId
                ? record.recordId === dossier.panel?.currentRecordId
                : index === 0}
              internal={internal}
              onNavigate={onNavigateToRoute}
            />
          ))}
        </section>
      )}

      {activeTab === 'MARKS' && dossier.marks && (
        <section className="space-y-4">
          <h2 className="text-sm font-black text-brand-navy">Marks tracking</h2>
          {dossier.marks.tasks.length === 0 ? (
            <EmptyState title="No Marks tasks" description="No persisted evaluation tasks are available." />
          ) : (
            <div className="overflow-x-auto border-y border-slate-200">
              <table className="data-table">
                <thead>
                  <tr className="data-thead">
                    <th className="data-th text-left">Period</th>
                    <th className="data-th text-left">Status</th>
                    {internal && <th className="data-th text-left">Evaluator</th>}
                    <th className="data-th text-left">Deadline</th>
                    {internal && <th className="data-th text-right">Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {dossier.marks.tasks.map((task, index) => (
                    <tr key={task.taskId ?? `${task.period}-${index}`} className="data-row">
                      <td className="data-td-strong">{task.period}<span className="block text-[9px] text-slate-400">{task.semester}</span></td>
                      <td className="data-td"><StatusBadge tone={statusTone(task.status)}>{formatProgressStatus(task.status)}</StatusBadge></td>
                      {internal && <td className="data-td">{task.evaluator}<span className="block text-[9px] text-slate-400">{formatProgressStatus(task.evaluatorRole)}</span></td>}
                      <td className="data-td">{dateText(task.dueAt)}<span className="block text-[9px] text-slate-400">{formatProgressStatus(task.deadlineState)}</span></td>
                      {internal && (
                        <td className="data-td text-right">
                          <RecordAction target={task} onNavigate={onNavigateToRoute} />
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {activeTab === 'TIMELINE' && dossier.timeline && (
        <section className="space-y-4">
          <div>
            <h2 className="text-sm font-black text-brand-navy">Active Timeline milestones</h2>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              {dossier.timeline.semester && dossier.timeline.session
                ? `${dossier.timeline.semester} · ${dossier.timeline.session}`
                : 'No active Timeline'}
            </p>
          </div>
          {dossier.timeline.entries.length === 0 ? (
            <EmptyState title="No active milestones" description="The active Timeline has no Student-targeted entries." />
          ) : (
            <div className="space-y-0 border-y border-slate-200">
              {dossier.timeline.entries.map((entry) => (
                <div key={entry.recordId} className="grid gap-3 border-b border-slate-100 py-4 last:border-b-0 sm:grid-cols-[90px_1fr_auto] sm:items-center">
                  <StatusBadge tone={statusTone(entry.status)}>{formatProgressStatus(entry.status)}</StatusBadge>
                  <div>
                    <p className="text-xs font-black text-brand-navy">{entry.title}</p>
                    <p className="mt-1 text-[10px] font-semibold text-slate-500">{entry.detail}</p>
                  </div>
                  <p className="text-[10px] font-bold text-slate-500">{dateText(entry.deadlineStart)} – {dateText(entry.deadlineEnd)}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <p className="text-[10px] font-semibold text-slate-400">
        Viewing as {currentUserRole}. Generated {new Date(dossier.generatedAt).toLocaleString('en-MY')}.
      </p>
    </div>
  );
};
