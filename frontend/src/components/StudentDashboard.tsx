/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AlertTriangle, Files } from 'lucide-react';
import { DashboardTimeline } from './DashboardTimeline';
import { MonitoringTasksCard } from './MonitoringTasksCard';
import { PageHeader, PortalButton, PortalToast } from './PortalPrimitives';
import type { DashboardTask } from '../types';
import { routeForStudentProgress, sidebarItemForPath } from '../constants/routes';
import { resolveDashboardTaskRoute } from '../utils/workflowAgeing';
import { ActiveSemesterContext } from './ActiveSemesterContext';
import { StudentAppointmentStatusCards } from './StudentAppointmentStatusCards';

interface StudentDashboardProps {
  studentName: string;
  studentId?: string;
  programme?: string;
  lifecycleStatus?: string | null;
  onNavigateToTab: (tabName: string) => void;
  onNavigateToRoute?: (route: string) => void;
}

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

      <StudentAppointmentStatusCards onNavigateToTab={onNavigateToTab} />

      <MonitoringTasksCard
        title="Student Action Centre"
        onTaskClick={navigateToAction}
      />
    </div>
  );
};
