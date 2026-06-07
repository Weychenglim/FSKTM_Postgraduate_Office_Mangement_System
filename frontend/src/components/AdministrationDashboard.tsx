/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import { 
  ChevronRight
} from 'lucide-react';
import { DashboardTimeline } from './DashboardTimeline';
import { MonitoringTasksCard } from './MonitoringTasksCard';
import { PageHeader, PortalToast } from './PortalPrimitives';
import { MOCK_DASHBOARD_ATTENTION_ROWS } from '../mocks/dashboard';
import { getPanelWorkloads } from '../services';

interface AdministrationDashboardProps {
  onNavigateToTab: (tabName: string) => void;
  onShowModal?: (modalType: 'period' | 'rubric' | 'generate' | 'help') => void;
  onNavigateToTimeline?: () => void;
}

export const AdministrationDashboard: React.FC<AdministrationDashboardProps> = ({ 
  onNavigateToTab,
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

  useEffect(() => {
    let active = true;
    getPanelWorkloads()
      .then((records) => {
        if (!active) return;
        const attentionCount = records.filter((record) =>
          record.availability === 'Near Limit' || record.availability === 'Full Load'
        ).length;
        setPanelWorkloadCount(attentionCount);
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

  const attentionRows = useMemo(() => MOCK_DASHBOARD_ATTENTION_ROWS.map((row) => {
    if (row.id !== 'attn_3') return row;
    return {
      ...row,
      count: panelWorkloadLoadFailed
        ? 'Unavailable'
        : panelWorkloadCount === null
        ? 'Loading...'
        : `${panelWorkloadCount} ${panelWorkloadCount === 1 ? 'lecturer' : 'lecturers'}`,
      detail: panelWorkloadLoadFailed
        ? 'Panel workload data could not be loaded. Opening workload monitoring for review...'
        : `${panelWorkloadCount ?? 0} lecturers are near or at the panel workload limit. Opening workload monitoring...`,
    };
  }), [panelWorkloadCount, panelWorkloadLoadFailed]);

  return (
    <div id="admin-dashboard-container" className="space-y-8 animate-fade-in text-left font-sans text-xs pb-16">
      
      <PortalToast message={toastMessage} />

      {/* Header Title & Actions section */}
      <PageHeader
        title="Administration Dashboard"
        subtitle="Overview administrative status, timeline intervals, and records requiring office review."
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
                            onNavigateToTab(row.targetTab);
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

        {/* Right (35% approx): Office Monitoring Tasks List Panel */}
        <div className="lg:col-span-4">
          <MonitoringTasksCard 
            onTaskClick={(taskId) => {
              if (taskId === 'task_upload') {
                onNavigateToTimeline?.();
              } else if (taskId === 'task_config') {
                onNavigateToTab('Marks Entry');
              } else if (taskId === 'task_rubric') {
                onNavigateToTab('Marks Entry');
              } else if (taskId === 'task_generate') {
                onNavigateToTab('Marks Entry');
              } else {
                triggerToast(`Accessing task audit trail log for ID: ${taskId}...`);
              }
            }}
          />
        </div>

      </div>
    </div>
  );
};
