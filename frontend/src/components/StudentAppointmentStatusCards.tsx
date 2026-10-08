import React, { useEffect, useState } from 'react';
import { Award, ChevronRight, UserCheck } from 'lucide-react';
import type { StudentPanelAppointmentView, SupervisorApplicationRecord } from '../types';
import { getMySupervisorApplications, getStudentPanelAppointment } from '../services/appointmentsApi';
import { getPanelReadinessCopy } from '../utils/panelReadiness';
import { ErrorState, LoadingState } from './StateViews';
import { StatusBadge } from './PortalPrimitives';

interface NavigationProps {
  onNavigateToTab: (tabName: string) => void;
}

interface StatusCardProps {
  title: string;
  value: string;
  subtext: string;
  badge: string;
  badgeTone: 'success' | 'warning' | 'info' | 'neutral';
  icon: React.ComponentType<{ className?: string }>;
  actionLabel: string;
  onClick: () => void;
}

const StatusCard: React.FC<StatusCardProps> = ({
  title, value, subtext, badge, badgeTone, icon: Icon, actionLabel, onClick,
}) => (
  <button
    type="button"
    onClick={onClick}
    className="bg-white border border-[#e2e8f0] rounded-2xl p-5 text-left shadow-3xs hover:border-slate-300 transition-all cursor-pointer group min-h-[150px] flex flex-col justify-between"
  >
    <div className="flex items-start justify-between gap-4">
      <div>
        <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider block">{title}</span>
        <span className="text-2xl font-black text-brand-navy tracking-tight block mt-3">{value}</span>
      </div>
      <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-150 flex items-center justify-center text-slate-500 shrink-0">
        <Icon className="w-4.5 h-4.5" />
      </div>
    </div>
    <div className="space-y-3 pt-4">
      <StatusBadge tone={badgeTone} className="text-[9px]">{badge}</StatusBadge>
      <p className="text-[10.5px] text-slate-400 font-bold leading-relaxed">{subtext}</p>
      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-blue-600 group-hover:text-blue-800">
        {actionLabel}<ChevronRight className="w-3.5 h-3.5" />
      </span>
    </div>
  </button>
);

interface StatusCardsViewProps extends NavigationProps {
  applications: SupervisorApplicationRecord[];
  panel: StudentPanelAppointmentView | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

export const StudentAppointmentStatusCardsView: React.FC<StatusCardsViewProps> = ({
  applications, panel, loading, error, onRetry, onNavigateToTab,
}) => {
  if (loading) return <LoadingState message="Loading appointment status..." />;
  if (error || !panel) return <ErrorState message={error || 'Appointment status could not be loaded.'} onRetry={onRetry} />;

  // Approval history alone does not establish an active appointment. Keep the
  // incumbent visible while a replacement application is under review.
  const active = applications.find(app => app.status === 'APPROVED' && app.appointmentLifecycle?.status === 'ACTIVE');
  const pending = applications.find(app => ['SUBMITTED_TO_SUPERVISOR', 'PENDING_COORDINATOR'].includes(app.status));
  const supervisor = active
    ? { value: 'Approved', badge: 'Active', badgeTone: 'success' as const,
        subtext: `${active.proposedSupervisor} is assigned as your current supervisor.` }
    : pending
      ? { value: 'Pending', badge: 'Awaiting approval', badgeTone: 'warning' as const,
          subtext: 'Your supervisor request is awaiting review and final programme approval.' }
      : { value: 'Not assigned', badge: 'No active supervisor', badgeTone: 'neutral' as const,
          subtext: 'No active supervisor appointment is recorded. View your applications to continue.' };
  const confirmed = panel.status === 'CONFIRMED';
  const ready = panel.readinessState === 'READY_FOR_PANEL_RECOMMENDATION';
  const readiness = getPanelReadinessCopy(panel.readinessState);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
      <StatusCard title="Supervisor Status" {...supervisor} icon={UserCheck} actionLabel="View supervisor"
        onClick={() => onNavigateToTab('Supervisor Appointments')} />
      <StatusCard title="Panel Appointment" value={confirmed ? 'Confirmed' : ready ? 'Ready' : 'Pending'}
        badge={confirmed ? 'Active' : readiness.title} badgeTone={confirmed ? 'success' : 'warning'}
        subtext={confirmed ? `${panel.panelMemberName || 'Your confirmed Panel member'} is assigned as your current Panel member.` : readiness.detail}
        icon={Award} actionLabel="Check panel" onClick={() => onNavigateToTab('Panel Appointments')} />
    </div>
  );
};

export const StudentAppointmentStatusCards: React.FC<NavigationProps> = (props) => {
  const [applications, setApplications] = useState<SupervisorApplicationRecord[]>([]);
  const [panel, setPanel] = useState<StudentPanelAppointmentView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    Promise.all([getMySupervisorApplications(), getStudentPanelAppointment()])
      .then(([records, appointment]) => {
        if (!active) return;
        setApplications(records);
        setPanel(appointment);
      })
      .catch(reason => {
        if (active) setError(reason instanceof Error ? reason.message : 'Appointment status could not be loaded.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [attempt]);

  const retry = () => {
    setLoading(true);
    setError(null);
    setApplications([]);
    setPanel(null);
    setAttempt(value => value + 1);
  };
  return <StudentAppointmentStatusCardsView {...props} applications={applications} panel={panel}
    loading={loading} error={error} onRetry={retry} />;
};
