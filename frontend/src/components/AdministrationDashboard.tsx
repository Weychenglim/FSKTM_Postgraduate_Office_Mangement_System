/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, ChevronRight } from 'lucide-react';
import { DashboardTimeline } from './DashboardTimeline';
import { MonitoringTasksCard } from './MonitoringTasksCard';
import { PageHeader, PortalButton, PortalToast } from './PortalPrimitives';
import { getDashboardSummary, getPanelWorkloads } from '../services';
import { DashboardAttentionRow, DashboardSummary, DashboardTask } from '../types';
import { APP_ROUTES, sidebarItemForPath } from '../constants/routes';
import { MarkRecordStatusTab } from '../utils/markRecords';
import { resolveDashboardTaskRoute } from '../utils/workflowAgeing';

interface AdministrationDashboardProps {
  onNavigateToTab: (tabName: string) => void;
  onNavigateToRoute?: (route: string) => void;
  onNavigateToMarksRecords?: (statusTab?: MarkRecordStatusTab) => void;
  onShowModal?: (modalType: 'period' | 'rubric' | 'generate' | 'help') => void;
  onNavigateToTimeline?: () => void;
}

export const AdministrationDashboard: React.FC<AdministrationDashboardProps> = ({ 
  onNavigateToTab,
  onNavigateToRoute,
  onNavigateToMarksRecords,
  onShowModal,
  onNavigateToTimeline
}) => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const [panelWorkloadCount, setPanelWorkloadCount] = useState<number | null>(null);
  const [panelWorkloadLoadFailed, setPanelWorkloadLoadFailed] = useState(false);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([getPanelWorkloads(), getDashboardSummary()])
      .then(([records, dashboardSummary]) => {
        if (!active) return;
        const attentionCount = records.filter((record) =>
          record.availability === 'Near Limit' || record.availability === 'Full Load'
        ).length;
        setPanelWorkloadCount(attentionCount);
        setSummary(dashboardSummary);
        setPanelWorkloadLoadFailed(false);
      })
      .catch(() => {
        if (!active) return;
        setPanelWorkloadCount(null);
        setPanelWorkloadLoadFailed(true);
      });

    return () => {
      active = false;
    };
  }, []);

  const attentionRows = useMemo<DashboardAttentionRow[]>(() => [
    {
      id: 'pending-supervisor',
      type: 'Pending supervisor requests',
      count: summary === null ? 'Loading...' : String(summary.pendingSupervisorRequests),
      targetTab: 'Supervisor Appointments',
      detail: 'Opening supervisor appointment records requiring review.',
    },
    {
      id: 'pending-panel',
      type: 'Pending panel approvals',
      count: summary === null ? 'Loading...' : String(summary.pendingPanelApprovals),
      targetTab: 'Panel Appointments',
      detail: 'Opening panel recommendations awaiting final confirmation.',
    },
    {
      id: 'incomplete-marks',
      type: 'Incomplete mark entries',
      count: summary === null ? 'Loading...' : String(summary.incompleteMarkEntries),
      targetTab: 'Marks Entry',
      markStatusTab: 'All Records',
      detail: summary === null
        ? 'Opening mark entries that have not been submitted.'
        : `Opening ${summary.supervisorMarkTasks ?? 0} supervisor and ${summary.panelMarkTasks ?? 0} panel mark tasks that require monitoring.`,
    },
    {
      id: 'backup-marks',
      type: 'Backup evaluator assignments',
      count: summary === null ? 'Loading...' : String(summary.backupMarkTasks ?? 0),
      targetTab: 'Marks Entry',
      markStatusTab: 'All Records',
      detail: 'Opening exception/manual override mark assignments.',
    },
    {
      id: 'panel-workload',
      type: 'Lecturers near panel workload limit',
      count: panelWorkloadLoadFailed
        ? 'Unavailable'
        : panelWorkloadCount === null
        ? 'Loading...'
        : String(panelWorkloadCount),
      targetTab: 'Panel Appointments',
      detail: 'Opening panel workload monitoring.',
    },
  ], [panelWorkloadCount, panelWorkloadLoadFailed, summary]);

  const navigateToAction = (task: DashboardTask) => {
    const route = resolveDashboardTaskRoute(task);
    if (onNavigateToRoute) {
      onNavigateToRoute(route);
      return;
    }
    if (task.targetModule === 'DASHBOARD' && onNavigateToTimeline) {
      onNavigateToTimeline();
      return;
    }
    onNavigateToTab(sidebarItemForPath(route));
  };

  return (
    <div id="admin-dashboard-container" className="space-y-8 animate-fade-in text-left font-sans text-xs pb-16">
      
      <PortalToast message={toastMessage} />

      {/* Header Title & Actions section */}
      <PageHeader
        title="Administration Dashboard"
        subtitle="Overview administrative status, timeline intervals, and records requiring office review."
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

      {/* 1. Semester Timeline Section */}
      <DashboardTimeline onTimelineUpdate={triggerToast} onManageTimeline={onNavigateToTimeline} />

      {/* 2. Lower Content Workflows Layout Grid */}
      <div id="dashboard-lower-layout" className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left (65% approx): Records Needing Attention Table */}
        <div className="lg:col-span-8 bg-white border border-[#e2e8f0] rounded-2xl p-6 shadow-sm space-y-4">
          <div className="space-y-1 block text-left">
            <h3 className="text-sm font-black text-brand-navy tracking-tight">
              Records Needing Attention
            </h3>
            <p className="text-slate-500 font-bold text-[10.5px]">
              Records that may require office review or follow-up.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="data-table mt-2">
              <thead>
                <tr className="data-thead">
                  <th className="data-th text-left">Record Type</th>
                  <th className="data-th text-left">Impact Count</th>
                  <th className="data-th text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {attentionRows.map((row) => (
                  <tr key={row.id} className="data-row">
                    {/* Record type text */}
                    <td className="data-td-strong max-w-[280px]">
                      {row.type}
                    </td>

                    {/* Impact amount count */}
                    <td className="data-td">
                      {row.count}
                    </td>

                    {/* Trigger Navigation callback action */}
                    <td className="data-td text-right">
                      <button
                        onClick={() => {
                          triggerToast(row.detail);
                          setTimeout(() => {
                            if (row.targetTab === 'Marks Entry' && onNavigateToMarksRecords) {
                              onNavigateToMarksRecords(row.markStatusTab);
                            } else {
                              onNavigateToTab(row.targetTab);
                            }
                          }, 1000);
                        }}
                        className="text-[#2563eb] hover:text-[#1d4ed8] font-black text-xs hover:underline cursor-pointer flex items-center justify-end gap-1 ml-auto"
                      >
                        <span>Open</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right (35% approx): persisted role-scoped action centre */}
        <div className="lg:col-span-4">
          <MonitoringTasksCard onTaskClick={navigateToAction} />
        </div>

      </div>
    </div>
  );
};
