/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  Users, 
  FileText, 
  Database, 
  CheckCircle, 
  AlertTriangle, 
  Download, 
  Plus, 
  FolderSync, 
  HelpCircle,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { DashboardTimeline } from './DashboardTimeline';
import { MonitoringTasksCard } from './MonitoringTasksCard';
import { PageHeader, PortalButton, PortalToast, StatusBadge } from './PortalPrimitives';

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
  const [exporting, setExporting] = useState(false);
  const [newEntryModalOpen, setNewEntryModalOpen] = useState(false);
  const [newEntryData, setNewEntryData] = useState({
    title: '',
    category: 'Supervisor Appointment',
    startDate: '2025-10-01',
    endDate: '2025-10-15',
    status: 'Upcoming' as 'Completed' | 'Active' | 'Upcoming' | 'Deadline'
  });

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const handleExportReport = () => {
    setExporting(true);
    triggerToast('Compiling administrative statistics report...');
    setTimeout(() => {
      setExporting(false);
      triggerToast('Success! CSV report downloaded as FSKTM_Dashboard_Report_2025.csv');
    }, 1800);
  };

  const handleCreateNewEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEntryData.title.trim()) {
      triggerToast('Error: Please provide a descriptive title for this timeline entry.');
      return;
    }
    setNewEntryModalOpen(false);
    triggerToast(`Created new entry "${newEntryData.title}" under ${newEntryData.category} successfully!`);
    setNewEntryData({
      title: '',
      category: 'Supervisor Appointment',
      startDate: '2025-10-01',
      endDate: '2025-10-15',
      status: 'Upcoming'
    });
  };

  const attentionRows = [
    {
      id: 'attn_1',
      type: 'Students without approved supervisor',
      count: '12 records',
      status: 'OPEN',
      targetTab: 'Supervisor Appointments',
      detail: 'Redirecting to Supervisor Appointment allocation boards...'
    },
    {
      id: 'attn_2',
      type: 'Approved supervisor but no panel assigned',
      count: '5 records',
      status: 'OPEN',
      targetTab: 'Panel Appointments',
      detail: 'Redirecting to Panel Appointment scheduling and assignment portal...'
    },
    {
      id: 'attn_3',
      type: 'Lecturers near supervisor workload limit',
      count: '3 lecturers',
      status: 'OPEN',
      targetTab: 'Supervisor Appointments',
      detail: 'Opening lecturer workload monitor and limit audits...'
    },
    {
      id: 'attn_4',
      type: 'Lecturers near panel workload limit',
      count: '2 lecturers',
      status: 'OPEN',
      targetTab: 'Panel Appointments',
      detail: 'Opening panel workload list to resolve appointment gaps...'
    },
    {
      id: 'attn_5',
      type: 'Mark entry tasks not generated',
      count: '1 semester',
      status: 'OPEN',
      targetTab: 'Marks Entry',
      detail: 'Launching Marks & Evaluation generation engine...'
    }
  ];

  return (
    <div id="admin-dashboard-container" className="space-y-8 animate-fade-in text-left font-sans text-xs pb-16">
      
      <PortalToast message={toastMessage} />

      {/* Header Title & Actions section */}
      <PageHeader
        title="Administration Dashboard"
        subtitle="Overview administrative status, timeline intervals, and records requiring office review."
        actions={(
          <>
            <PortalButton
              variant="secondary"
              size="md"
              icon={Download}
              onClick={handleExportReport}
              isLoading={exporting}
            >
              {exporting ? 'Exporting' : 'Export Report'}
            </PortalButton>
            <PortalButton
              variant="primary"
              size="md"
              icon={Plus}
              onClick={() => setNewEntryModalOpen(true)}
            >
              New Entry
            </PortalButton>
          </>
        )}
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
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-full text-[9px] font-extrabold uppercase tracking-wider">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                        <span>{row.status}</span>
                      </span>
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
              if (taskId === 'task_config') {
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

      {/* Create New Timeline Event / Entry Modal Dialog overlay */}
      {newEntryModalOpen && createPortal(
        <div className="fixed inset-0 bg-brand-navy/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="absolute inset-0" onClick={() => setNewEntryModalOpen(false)} />
          <div className="bg-white rounded-2xl max-w-md w-full p-6 md:p-8 shadow-sm relative z-10 border border-slate-100 text-left font-sans">
            <div className="flex items-center gap-2 mb-4">
              <FolderSync className="w-5 h-5 text-indigo-500" />
              <h3 className="text-lg font-black text-brand-navy tracking-tight">Create Timeline Activity</h3>
            </div>
            
            <form onSubmit={handleCreateNewEntry} className="space-y-4">
              <div>
                <label className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider block mb-1.5">
                  Process Classification Row
                </label>
                <select
                  value={newEntryData.category}
                  onChange={(e) => setNewEntryData({...newEntryData, category: e.target.value})}
                  className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-lg focus:outline-none"
                >
                  <option value="Supervisor Appointment">Supervisor Appointment</option>
                  <option value="Panel Appointment">Panel Appointment</option>
                  <option value="Marks & Evaluation">Marks & Evaluation</option>
                  <option value="Document Submission">Document Submission</option>
                  <option value="Announcements / Release">Announcements / Release</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider block mb-1.5">
                  Activity Title Wording
                </label>
                <input
                  type="text"
                  placeholder="e.g. Schedule Verification Period"
                  value={newEntryData.title}
                  onChange={(e) => setNewEntryData({...newEntryData, title: e.target.value})}
                  className="w-full text-xs font-bold text-slate-800 border border-slate-205 px-3.5 py-2.5 rounded-lg focus:ring-1 focus:ring-slate-900 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider block mb-1.5">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={newEntryData.startDate}
                    onChange={(e) => setNewEntryData({...newEntryData, startDate: e.target.value})}
                    className="w-full text-xs text-slate-800 border border-slate-205 px-3.5 py-2.5 rounded-lg focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider block mb-1.5">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={newEntryData.endDate}
                    onChange={(e) => setNewEntryData({...newEntryData, endDate: e.target.value})}
                    className="w-full text-xs text-slate-800 border border-slate-205 px-3.5 py-2.5 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider block mb-1.5">
                  Visual Category Type
                </label>
                <select
                  value={newEntryData.status}
                  onChange={(e) => setNewEntryData({...newEntryData, status: e.target.value as any})}
                  className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-lg focus:outline-none"
                >
                  <option value="Active">Active (Navy Blue style)</option>
                  <option value="Completed">Completed (Slate grey style)</option>
                  <option value="Upcoming">Upcoming (Ice Blue style)</option>
                  <option value="Deadline">Deadline (Orange Warning style)</option>
                </select>
              </div>

              <div className="flex items-center gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setNewEntryModalOpen(false)}
                  className="flex-1 py-3 border border-slate-300 hover:bg-slate-50 text-slate-700 font-extrabold uppercase text-[10px] tracking-wider rounded-xl transition"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-brand-navy hover:bg-slate-800 text-white font-extrabold uppercase text-[10px] tracking-wider rounded-xl transition cursor-pointer text-center"
                >
                  SAVE ENTRY
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};
