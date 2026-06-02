/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  ChevronLeft,
  Download, 
  Plus, 
  Upload, 
  MoreVertical, 
  Search, 
  ChevronRight,
  HelpCircle,
  Clock,
  CheckCircle,
  AlertTriangle,
  Calendar,
  Layers,
  Edit2,
  Trash2,
  X,
  Sliders,
  FileSpreadsheet
} from 'lucide-react';
import { SemesterTimeline } from './SemesterTimeline';
import { UploadTimelineDrawer } from './UploadTimelineDrawer';
import { EditTimelineEntryDrawer } from './EditTimelineEntryDrawer';
import { AddTimelineEntryDrawer } from './AddTimelineEntryDrawer';
import { PageHeader, PortalButton, PortalToast, StatusBadge } from './PortalPrimitives';
import { LoadingState, ErrorState } from './StateViews';
import { TimelineEntry } from '../types';
import { getTimelineEntries } from '../services';

// TimelineEntry now lives in src/types.

interface UpdateLog {
  id: string;
  user: string;
  avatar: string;
  date: string;
  action: string;
  actionColor: string;
  details: string;
}

interface TimelineManagementProps {
  onBack: () => void;
}

export const TimelineManagement: React.FC<TimelineManagementProps> = ({ onBack }) => {
  // Toast overlay
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  // Upload Timeline Drawer Slide-in state
  const [uploadDrawerOpen, setUploadDrawerOpen] = useState(false);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Timeline rows loaded from timelineApi (mock-backed today).
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEntries = useCallback(() => {
    setLoading(true);
    setError(null);
    getTimelineEntries()
      .then(setEntries)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load timeline entries.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  // Recent Update Track Log data
  const [updateLogs, setUpdateLogs] = useState<UpdateLog[]>([
    {
      id: 'log_1',
      user: 'Admin Office Staff',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&fit=crop&q=60',
      date: '20 Nov 2025',
      action: 'Replaced timeline',
      actionColor: 'text-[#2563eb]',
      details: 'Imported Sem 1 2025/2026 timeline'
    },
    {
      id: 'log_2',
      user: 'Admin Office Staff',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&fit=crop&q=60',
      date: '10 Nov 2025',
      action: 'Edited entry',
      actionColor: 'text-[#d97706]',
      details: 'Updated mark entry period'
    },
    {
      id: 'log_3',
      user: 'Admin Office Staff',
      avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80&fit=crop&q=60',
      date: '01 Nov 2025',
      action: 'Added entry',
      actionColor: 'text-[#16a34a]',
      details: 'Added evaluation schedule release'
    }
  ]);

  // Search and Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [roleFilter, setRoleFilter] = useState('All');

  // Applied internal filter results
  const [appliedSearch, setAppliedSearch] = useState('');
  const [appliedCategory, setAppliedCategory] = useState('All');
  const [appliedStatus, setAppliedStatus] = useState('All');
  const [appliedRole, setAppliedRole] = useState('All');

  const filteredEntries = entries.filter((ent) => {
    const matchSearch = ent.event.toLowerCase().includes(appliedSearch.toLowerCase());
    const matchCategory = appliedCategory === 'All' || ent.category === appliedCategory;
    const matchStatus = appliedStatus === 'All' || ent.status === appliedStatus;
    const matchRole = appliedRole === 'All' || ent.targetRole.includes(appliedRole as any);

    return matchSearch && matchCategory && matchStatus && matchRole;
  });

  // Entry Management Modals & Drawers
  const [addDrawerOpen, setAddDrawerOpen] = useState(false);
  const [editDrawerOpen, setEditDrawerOpen] = useState(true);
  const [editingEntry, setEditingEntry] = useState<TimelineEntry | null>({
    id: 'ent_2',
    event: 'Panel Recommendation Period',
    category: 'Panel Appointment',
    startDate: '16 Oct 2025',
    endDate: '30 Oct 2025',
    targetRole: ['LECTURER'],
    status: 'Active'
  });

  const handleApplyFilters = () => {
    setAppliedSearch(searchTerm);
    setAppliedCategory(categoryFilter);
    setAppliedStatus(statusFilter);
    setAppliedRole(roleFilter);
    triggerToast('Applied query filters to database records matching your scope.');
  };

  const handleOpenAddModal = () => {
    setAddDrawerOpen(true);
  };

  const handleOpenEditModal = (ent: TimelineEntry) => {
    setEditingEntry(ent);
    setEditDrawerOpen(true);
  };

  const handleAddEntry = (newEntryVal: Omit<TimelineEntry, 'id'>) => {
    const newEnt: TimelineEntry = {
      id: `ent_${Date.now()}`,
      ...newEntryVal
    };
    setEntries(prev => [...prev, newEnt]);

    // Log action
    const newLog: UpdateLog = {
      id: `log_${Date.now()}`,
      user: 'Admin Office Staff',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&fit=crop&q=60',
      date: '27 May 2026',
      action: 'Added entry',
      actionColor: 'text-[#16a34a]',
      details: `Created new timeline milestone: ${newEntryVal.event}`
    };
    setUpdateLogs(prev => [newLog, ...prev]);

    triggerToast(`Successfully created timeline entry: "${newEntryVal.event}"`);
    setAddDrawerOpen(false);
  };

  const handleEditEntry = (updated: TimelineEntry) => {
    setEntries(prev => prev.map(ent => (ent.id === updated.id ? updated : ent)));

    // Log action
    const newLog: UpdateLog = {
      id: `log_${Date.now()}`,
      user: 'Admin Office Staff',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&fit=crop&q=60',
      date: '27 May 2026',
      action: 'Edited entry',
      actionColor: 'text-[#d97706]',
      details: `Updated entry: ${updated.event}`
    };
    setUpdateLogs(prev => [newLog, ...prev]);

    triggerToast(`Successfully modified entry: "${updated.event}"`);
    setEditDrawerOpen(false);
  };

  const handleDeleteEntry = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to permanently remove "${name}" from the postgraduate master timeline?`)) {
      setEntries(prev => prev.filter(ent => ent.id !== id));
      triggerToast(`Deleted entry "${name}" from master record.`);
    }
  };

  const handleDownloadTemplate = () => {
    triggerToast('Generating CSV Master Schedule Layout Template...');
    setTimeout(() => {
      // Simulate file download
      const element = document.createElement("a");
      const file = new Blob(["Event_Name,Category,Start_Date,End_Date,Target_Role,Status\nSupervisor Request Period,Supervisor Appointment,2025-10-01,2025-10-15,STUDENT,Completed"], {type: 'text/csv'});
      element.href = URL.createObjectURL(file);
      element.download = "FSKTM_Timeline_Template.csv";
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      triggerToast('Success! FSKTM_Timeline_Template.csv downloaded.');
    }, 1200);
  };

  const handleUploadTimeline = () => {
    setUploadDrawerOpen(true);
  };

  const handleImportSuccess = (importedEvents: any[]) => {
    // Add a new timeline update log
    const newLog: UpdateLog = {
      id: `log_${Date.now()}`,
      user: 'Admin Office Staff',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&fit=crop&q=60',
      date: '27 May 2026',
      action: 'Replaced timeline',
      actionColor: 'text-[#2563eb]',
      details: 'Imported timeline layout via Excel template'
    };

    // Replace entries with the validated imported records
    setEntries(importedEvents);
    setUpdateLogs(prev => [newLog, ...prev]);
    triggerToast('Import completed! Successfully re-compiled master schedule records.');
  };

  const handleMoreOptions = () => {
    triggerToast('Advanced schedule audit logs compiled. Exporting system telemetry...');
  };

  const getStatusTone = (status: TimelineEntry['status']) => {
    switch (status) {
      case 'Completed':
        return 'neutral';
      case 'Active':
        return 'info';
      case 'Deadline':
        return 'danger';
      case 'Upcoming':
        return 'warning';
      default:
        return 'neutral';
    }
  };

  return (
    <div id="timeline-management-universe" className="space-y-8 animate-fade-in text-left font-sans text-xs pb-16">
      
      <PortalToast message={toastMessage} />

      {/* Head section title with actions buttons Row */}
      <PageHeader
        title="Timeline Management"
        subtitle="View, upload, and manage semester timeline entries."
        backLabel="Back to Office Dashboard"
        onBack={onBack}
        actions={(
          <>
            <PortalButton variant="secondary" size="md" icon={Download} onClick={handleDownloadTemplate}>
              Download Template
            </PortalButton>
            <PortalButton variant="soft" size="md" icon={Plus} onClick={handleOpenAddModal}>
              Add Timeline Entry
            </PortalButton>
            <PortalButton variant="primary" size="md" icon={Upload} onClick={handleUploadTimeline}>
              Upload Timeline
            </PortalButton>
            <PortalButton variant="secondary" size="icon" icon={MoreVertical} onClick={handleMoreOptions} title="More Options" />
          </>
        )}
      />

      {/* Grid: Four Top Summary Cards matching mock parameters exactly */}
      <div id="timeline-summary-cards" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Card 1: Active Semester */}
        <div className="bg-white border border-[#e2e8f0] rounded-2xl p-5 pl-6 text-left shadow-3xs">
          <span className="text-[9px] font-extrabold uppercase text-slate-400 tracking-widest block">
            ACTIVE SEMESTER
          </span>
          <span className="text-[17px] font-black text-brand-navy block mt-3 tracking-tight">
            Sem 1 2025/2026
          </span>
        </div>

        {/* Card 2: Timeline Status with live active indicator */}
        <div className="bg-white border border-[#e2e8f0] rounded-2xl p-5 pl-6 text-left shadow-3xs">
          <span className="text-[9px] font-extrabold uppercase text-slate-400 tracking-widest block">
            TIMELINE STATUS
          </span>
          <div className="flex items-center gap-2 mt-3.5">
            <StatusBadge tone="success" dot pulse className="text-[11px]">
              Active
            </StatusBadge>
          </div>
        </div>

        {/* Card 3: Last Updated tracking */}
        <div className="bg-white border border-[#e2e8f0] rounded-2xl p-5 pl-6 text-left shadow-3xs">
          <span className="text-[9px] font-extrabold uppercase text-slate-400 tracking-widest block">
            LAST UPDATED
          </span>
          <span className="text-[17px] font-black text-brand-navy block mt-3 tracking-tight">
            20 Nov 2025
          </span>
        </div>

        {/* Card 4: Total events counting */}
        <div className="bg-white border border-[#e2e8f0] rounded-2xl p-5 pl-6 text-left shadow-3xs">
          <span className="text-[9px] font-extrabold uppercase text-slate-400 tracking-widest block">
            TOTAL EVENTS
          </span>
          <span className="text-2xl font-black text-brand-navy block mt-2.5 tracking-tight">
            {entries.length}
          </span>
        </div>

      </div>

      {/* Interactive visual Gantt timeline charts */}
      <SemesterTimeline onTimelineUpdate={triggerToast} />

      {/* 2. Timeline Entries Table Section */}
      <div id="timeline-records-box" className="bg-white border border-[#e2e8f0] rounded-2xl p-6 shadow-xs space-y-6 text-left">
        
        <div className="space-y-1 block text-left">
          <h2 className="text-sm font-black text-brand-navy tracking-tight">
            Timeline Entries
          </h2>
        </div>

        {/* Query filter controls bar block */}
        <div className="filter-toolbar grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          
          {/* Search bar input text input column */}
          <div className="md:col-span-4 relative">
            <input
              type="text"
              placeholder="Search event name"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-control form-control-sm pl-10 pr-4"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 shrink-0" />
          </div>

          {/* Select filter 1: Category */}
          <div className="md:col-span-2 relative">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="form-control form-control-sm appearance-none cursor-pointer"
            >
              <option value="All">Category: All</option>
              <option value="Supervisor Appointment">Supervisor Appointment</option>
              <option value="Panel Appointment">Panel Appointment</option>
              <option value="Document Submission">Document Submission</option>
              <option value="Announcements">Announcements</option>
              <option value="Marks & Evaluation">Marks & Evaluation</option>
            </select>
          </div>

          {/* Select filter 2: Status */}
          <div className="md:col-span-2 relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="form-control form-control-sm appearance-none cursor-pointer"
            >
              <option value="All">Status: All</option>
              <option value="Completed">Completed</option>
              <option value="Active">Active</option>
              <option value="Deadline">Deadline</option>
              <option value="Upcoming">Upcoming</option>
            </select>
          </div>

          {/* Select filter 3: Target Role */}
          <div className="md:col-span-2 relative">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="form-control form-control-sm appearance-none cursor-pointer"
            >
              <option value="All">Target Role: All</option>
              <option value="STUDENT">Student</option>
              <option value="LECTURER">Lecturer</option>
            </select>
          </div>

          {/* Action Trigger Filter criteria */}
          <div className="md:col-span-2">
            <PortalButton
              variant="soft"
              size="sm"
              fullWidth
              onClick={handleApplyFilters}
            >
              Apply Filters
            </PortalButton>
          </div>

        </div>

        {/* Data list Table layout */}
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr className="data-thead select-none">
                <th className="data-th">Event</th>
                <th className="data-th">Category</th>
                <th className="data-th">Start Date</th>
                <th className="data-th">End Date</th>
                <th className="data-th">Target Role</th>
                <th className="data-th text-center">Status</th>
                <th className="data-th text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-0">
                    <LoadingState message="Loading timeline…" />
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="p-0">
                    <ErrorState message={error} onRetry={loadEntries} />
                  </td>
                </tr>
              ) : filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 italic">
                    No timeline schedule events found matching your filter scope criteria.
                  </td>
                </tr>
              ) : (
                filteredEntries.map((ent) => (
                  <tr key={ent.id} className="data-row">
                    {/* Event name banner */}
                    <td className="data-td-strong max-w-[240px]">
                      {ent.event}
                    </td>

                    {/* Category Label description */}
                    <td className="data-td">
                      {ent.category}
                    </td>

                    {/* Start timeline */}
                    <td className="data-td font-mono">
                      {ent.startDate}
                    </td>

                    {/* End timeline */}
                    <td className="data-td font-mono">
                      {ent.endDate}
                    </td>

                    {/* Target Roles Badge Chips */}
                    <td className="data-td">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {ent.targetRole.map((role) => (
                          <span
                            key={role}
                            className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wider leading-none shrink-0 ${
                              role === 'STUDENT'
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-150/40'
                                : 'bg-slate-100 text-slate-700 border border-slate-200/50'
                            }`}
                          >
                            {role}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Status indicator pill with colored bullet code */}
                    <td className="data-td text-center">
                      <StatusBadge tone={getStatusTone(ent.status)} dot pulse={ent.status === 'Deadline'}>
                        {ent.status}
                      </StatusBadge>
                    </td>

                    {/* Manage row edit handler link */}
                    <td className="data-td text-right">
                      <div className="flex items-center justify-end gap-2.5">
                        <button
                          onClick={() => handleOpenEditModal(ent)}
                          className="text-[#2563eb] hover:text-[#1d4ed8] font-bold text-xs hover:underline cursor-pointer"
                        >
                          Edit
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          onClick={() => handleDeleteEntry(ent.id, ent.event)}
                          className="text-slate-400 hover:text-red-600 transition"
                          title="Delete Timeline Step"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* 3. Recent Updates Track Section */}
      <div id="recent-timeline-updates-card" className="bg-white border border-[#e2e8f0] rounded-2xl p-6 shadow-xs space-y-4 text-left">
        <h3 className="text-sm font-black text-brand-navy tracking-tight">
          Recent Timeline Updates
        </h3>

        <div className="overflow-x-auto pt-1">
          <table className="data-table">
            <thead>
              <tr className="data-thead select-none">
                <th className="data-th text-left">USER</th>
                <th className="data-th text-left">DATE</th>
                <th className="data-th text-left">ACTION</th>
                <th className="data-th text-left">DETAILS</th>
              </tr>
            </thead>
            <tbody>
              {updateLogs.map((log) => (
                <tr key={log.id} className="data-row">
                  {/* User identity cell with photo avatar */}
                  <td className="data-td flex items-center gap-3">
                    <img
                      src={log.avatar}
                      alt={log.user}
                      className="w-7 h-7 rounded-full object-cover border border-slate-200 text-[9px]"
                      referrerPolicy="no-referrer"
                    />
                    <span className="font-bold text-brand-navy">{log.user}</span>
                  </td>

                  {/* Operation date log */}
                  <td className="data-td">
                    {log.date}
                  </td>

                  {/* Operational tag action color mapping */}
                  <td className="data-td font-extrabold">
                    <span className={log.actionColor}>
                      {log.action}
                    </span>
                  </td>

                  {/* Details summary */}
                  <td className="data-td">
                    {log.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Timeline Slide-in Drawer */}
      <AddTimelineEntryDrawer
        isOpen={addDrawerOpen}
        onClose={() => setAddDrawerOpen(false)}
        onSave={handleAddEntry}
      />

      {/* Edit Timeline Slide-in Drawer */}
      <EditTimelineEntryDrawer
        isOpen={editDrawerOpen}
        onClose={() => {
          setEditDrawerOpen(false);
          setEditingEntry(null);
        }}
        entry={editingEntry}
        onSave={handleEditEntry}
      />

      {/* Upload Timeline Slide-in Drawer */}
      <UploadTimelineDrawer 
        isOpen={uploadDrawerOpen} 
        onClose={() => setUploadDrawerOpen(false)} 
        onImportSuccess={handleImportSuccess} 
      />

    </div>
  );
};
