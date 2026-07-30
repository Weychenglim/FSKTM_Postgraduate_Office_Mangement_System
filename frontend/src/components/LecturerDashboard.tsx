/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Award, BarChart3, CheckSquare, ChevronRight, UsersRound } from 'lucide-react';
import { DashboardTimeline } from './DashboardTimeline';
import { MonitoringTasksCard } from './MonitoringTasksCard';
import { PageHeader, PortalButton, PortalToast, StatusBadge } from './PortalPrimitives';
import { getDashboardSummary } from '../services';
import { DashboardSummary, DashboardTask } from '../types';
import { APP_ROUTES, sidebarItemForPath } from '../constants/routes';
import { resolveDashboardTaskRoute } from '../utils/workflowAgeing';
import { ActiveSemesterContext } from './ActiveSemesterContext';

interface LecturerDashboardProps {
  onNavigateToTab: (tabName: string) => void;
  onNavigateToRoute?: (route: string) => void;
}

interface LecturerSummaryCardProps {
  title: string;
  value: string;
  subtext: string;
  badge: string;
  badgeTone: 'success' | 'warning' | 'info' | 'neutral';
  icon: React.ComponentType<{ className?: string }>;
  actionLabel: string;
  onClick: () => void;
}

const LecturerSummaryCard: React.FC<LecturerSummaryCardProps> = ({
  title,
  value,
  subtext,
  badge,
  badgeTone,
  icon: Icon,
  actionLabel,
  onClick,
}) => (
  <button
    type="button"
    onClick={onClick}
    className="bg-white border border-[#e2e8f0] rounded-2xl p-5 text-left shadow-3xs hover:border-slate-300 transition-all cursor-pointer group min-h-[150px] flex flex-col justify-between"
  >
    <div className="flex items-start justify-between gap-4">
      <div>
        <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider block">
          {title}
        </span>
        <span className="text-2xl font-black text-brand-navy tracking-tight block mt-3">
          {value}
        </span>
      </div>
      <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-150 flex items-center justify-center text-slate-500 shrink-0">
        <Icon className="w-4.5 h-4.5" />
      </div>
    </div>

    <div className="space-y-3 pt-4">
      <StatusBadge tone={badgeTone} className="text-[9px]">{badge}</StatusBadge>
      <p className="text-[10.5px] text-slate-400 font-bold leading-relaxed">
        {subtext}
      </p>
      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-blue-600 group-hover:text-blue-800">
        {actionLabel}
        <ChevronRight className="w-3.5 h-3.5" />
      </span>
    </div>
  </button>
);

export const LecturerDashboard: React.FC<LecturerDashboardProps> = ({
  onNavigateToTab,
  onNavigateToRoute,
}) => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);

  useEffect(() => {
    getDashboardSummary().then(setSummary).catch(() => setSummary(null));
  }, []);

  const triggerToast = (message: string) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(null), 3500);
  };

  const navigateToAction = (task: DashboardTask) => {
    const route = resolveDashboardTaskRoute(task);
    if (onNavigateToRoute) {
      onNavigateToRoute(route);
      return;
    }
    onNavigateToTab(sidebarItemForPath(route));
  };

  return (
    <div id="lecturer-dashboard-container" className="space-y-8 animate-fade-in text-left font-sans text-xs pb-16">
      <PortalToast message={toastMessage} />

      <PageHeader
        title="Lecturer Dashboard"
        subtitle="Track your semester timeline, supervisee records, panel appointments, and upcoming academic actions."
        actions={(
          <PortalButton
            variant="secondary"
            icon={BarChart3}
            onClick={() => onNavigateToRoute?.(APP_ROUTES.dashboardReports)}
          >
            View Workflow Reports
          </PortalButton>
        )}
      />

      <ActiveSemesterContext />

      <DashboardTimeline
        showManageTimeline={false}
        onTimelineUpdate={triggerToast}
        visibleRoles={['LECTURER']}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
        <LecturerSummaryCard
          title="Students Under Supervision"
          value={summary === null ? '…' : String(summary.pendingSupervisorRequests)}
          subtext="Supervisor appointment requests awaiting your decision."
          badge="Pending requests"
          badgeTone={(summary?.pendingSupervisorRequests ?? 0) > 0 ? 'warning' : 'success'}
          icon={UsersRound}
          actionLabel="View supervisees"
          onClick={() => onNavigateToTab('Supervisor Appointments')}
        />
        <LecturerSummaryCard
          title="Panel Appointment for Students"
          value={summary === null ? '…' : String(summary.pendingPanelReviews)}
          subtext="Panel recommendations awaiting your acceptance or rejection."
          badge="Pending reviews"
          badgeTone={(summary?.pendingPanelReviews ?? 0) > 0 ? 'warning' : 'info'}
          icon={Award}
          actionLabel="View panels"
          onClick={() => onNavigateToTab('Panel Appointments')}
        />
        <LecturerSummaryCard
          title="Assigned Mark Entries"
          value={summary === null ? '…' : String(summary.incompleteMarkEntries)}
          subtext={`${summary?.supervisorMarkTasks ?? 0} supervisor, ${summary?.panelMarkTasks ?? 0} panel, ${summary?.backupMarkTasks ?? 0} backup task(s).`}
          badge="Incomplete marks"
          badgeTone={(summary?.incompleteMarkEntries ?? 0) > 0 ? 'warning' : 'success'}
          icon={CheckSquare}
          actionLabel="Open marks"
          onClick={() => onNavigateToTab('Marks Entry')}
        />
      </div>

      <MonitoringTasksCard
        title="Lecturer Action Centre"
        onTaskClick={navigateToAction}
      />
    </div>
  );
};
