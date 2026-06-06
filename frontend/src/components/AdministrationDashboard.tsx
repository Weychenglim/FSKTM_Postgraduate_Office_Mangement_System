/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Users, 
  CheckCircle, 
  AlertTriangle, 
  ChevronRight
} from 'lucide-react';
import { DashboardTimeline } from './DashboardTimeline';
import { MonitoringTasksCard } from './MonitoringTasksCard';
import { PageHeader, PortalToast, StatusBadge } from './PortalPrimitives';
import { MOCK_DASHBOARD_ATTENTION_ROWS } from '../mocks/dashboard';

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

  const attentionRows = MOCK_DASHBOARD_ATTENTION_ROWS;

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

      {/* 2. Four Integrated Summary Cards Grid */}
      <div id="stat-cards-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Card 1: Students Without Supervisor */}
        <div className="bg-white border border-[#e2e8f0] rounded-2xl p-5 pl-6 relative text-left shadow-2xs hover:border-slate-300 transition-all">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">
              Students Without Supervisor
            </span>
            <StatusBadge tone="danger" className="rounded-md px-2 py-0.5 text-[9px]">Critical</StatusBadge>
          </div>

          <div className="flex items-baseline gap-2 mt-4">
            <span className="text-brand-navy font-black text-3xl md:text-4xl tracking-tight leading-none">
              12
            </span>
          </div>

          <p className="text-slate-400 font-bold text-[10.5px] mt-2.5">
            No approved supervisor record.
          </p>

          <div className="absolute right-5 bottom-4 text-slate-300">
            <AlertTriangle className="w-5 h-5 text-rose-500/20" />
          </div>
        </div>

        {/* Card 2: Supervisor Records */}
        <div className="bg-white border border-[#e2e8f0] rounded-2xl p-5 pl-6 relative text-left shadow-2xs hover:border-slate-300 transition-all">
          <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider block">
            Supervisor Records
          </span>

          <div className="flex items-baseline gap-2 mt-4">
            <span className="text-brand-navy font-black text-3xl md:text-4xl tracking-tight leading-none">
              8
            </span>
          </div>

          <p className="text-slate-400 font-bold text-[10.5px] mt-2.5">
            Pending or incomplete records.
          </p>

          <div className="absolute right-5 bottom-4 text-slate-300">
            <Users className="w-5 h-5 text-blue-500/20" />
          </div>
        </div>

        {/* Card 3: Panel Records */}
        <div className="bg-white border border-[#e2e8f0] rounded-2xl p-5 pl-6 relative text-left shadow-2xs hover:border-slate-300 transition-all">
          <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider block">
            Panel Records
          </span>

          <div className="flex items-baseline gap-2 mt-4">
            <span className="text-brand-navy font-black text-3xl md:text-4xl tracking-tight leading-none">
              5
            </span>
          </div>

          <p className="text-slate-400 font-bold text-[10.5px] mt-2.5">
            Panel appointment gaps detected.
          </p>

          <div className="absolute right-5 bottom-4 text-slate-300">
            <Users className="w-5 h-5 text-indigo-500/20" />
          </div>
        </div>

        {/* Card 4: Mark Entry Setup */}
        <div className="bg-white border border-[#e2e8f0] rounded-2xl p-5 pl-6 relative text-left shadow-2xs hover:border-slate-300 transition-all">
          <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider block">
            Mark Entry Setup
          </span>

          <div className="flex items-baseline gap-2 mt-4 text-emerald-600">
            <span className="font-extrabold text-2xl tracking-tight uppercase leading-none">
              Active
            </span>
          </div>

          <p className="text-slate-400 font-bold text-[10.5px] mt-3.5">
            Rubric and entry period configured.
          </p>

          <div className="absolute right-5 bottom-4 text-slate-300">
            <CheckCircle className="w-5 h-5 text-emerald-500/20" />
          </div>
        </div>

      </div>

      {/* 3. Lower Content Workflows Layout Grid */}
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
                  <th className="data-th text-center">Status</th>
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

                    {/* Status Badge */}
                    <td className="data-td text-center">
                      <StatusBadge tone="info" dot pulse className="text-[9px]">
                        {row.status}
                      </StatusBadge>
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
