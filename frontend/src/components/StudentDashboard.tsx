/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AlertTriangle, Award, ChevronRight, Files, UserCheck } from 'lucide-react';
import { DashboardTimeline } from './DashboardTimeline';
import { MonitoringTasksCard } from './MonitoringTasksCard';
import { PageHeader, PortalButton, PortalToast, StatusBadge } from './PortalPrimitives';
import type { DashboardTask } from '../types';
import { routeForStudentProgress, sidebarItemForPath } from '../constants/routes';
import { resolveDashboardTaskRoute } from '../utils/workflowAgeing';
import { ActiveSemesterContext } from './ActiveSemesterContext';

interface StudentDashboardProps {
  studentName: string;
  studentId?: string;
  programme?: string;
  lifecycleStatus?: string | null;
  onNavigateToTab: (tabName: string) => void;
  onNavigateToRoute?: (route: string) => void;
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
  title,
  value,
  subtext,
  badge,
  badgeTone,
  icon: Icon,
  actionLabel,
  onClick
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

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  studentId,
  lifecycleStatus,
  onNavigateToTab,
  onNavigateToRoute,
}) => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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
    <div id="student-dashboard-container" className="space-y-8 animate-fade-in text-left font-sans text-xs pb-16">
      <PortalToast message={toastMessage} />

      <PageHeader
        title="Student Dashboard"
        subtitle="Track your semester timeline, appointment status, submissions, and official document requests."
        actions={studentId && onNavigateToRoute ? (
          <PortalButton
            variant="primary"
            icon={Files}
            onClick={() => onNavigateToRoute(routeForStudentProgress())}
          >
            View My Progress
          </PortalButton>
        ) : undefined}
      />

      {lifecycleStatus && lifecycleStatus !== 'ACTIVE' && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <div>
            <strong className="block">Academic status: {lifecycleStatus.charAt(0) + lifecycleStatus.slice(1).toLowerCase()}</strong>
            <p className="mt-1 text-[11px]">Your historical records remain available, but new workflow submissions and academic decisions are currently read-only.</p>
          </div>
        </div>
      )}

      <ActiveSemesterContext />

      <DashboardTimeline
        showManageTimeline={false}
        onTimelineUpdate={triggerToast}
        visibleRoles={['STUDENT']}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <StatusCard
          title="Supervisor Status"
          value="Approved"
          subtext="Dr. Siti Noor is assigned as your current supervisor."
          badge="Active"
          badgeTone="success"
          icon={UserCheck}
          actionLabel="View supervisor"
          onClick={() => onNavigateToTab('Supervisor Appointments')}
        />
        <StatusCard
          title="Panel Appointment"
          value="Pending"
          subtext="Panel recommendation is in progress and will be released after approval."
          badge="Awaiting release"
          badgeTone="warning"
          icon={Award}
          actionLabel="Check panel"
          onClick={() => onNavigateToTab('Panel Appointments')}
        />
      </div>

      <MonitoringTasksCard
        title="Student Action Centre"
        onTaskClick={navigateToAction}
      />
    </div>
  );
};
