/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Download,
  Plus,
  Search,
  Trash2,
  Upload
} from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import {
  createTimelineEntry,
  deleteTimelineEntry,
  downloadTimelineTemplate,
  getActiveTimeline,
  getTimelineAuditLogs,
  saveBlob,
  timelineEntryToLegacy,
  updateTimelineEntry,
} from '../services';
import { ActiveSemesterTimeline, TimelineAuditLog, TimelineEntry } from '../types';
import { AddTimelineEntryDrawer } from './AddTimelineEntryDrawer';
import { EditTimelineEntryDrawer } from './EditTimelineEntryDrawer';
import { PageHeader, PortalButton, PortalToast, StatusBadge } from './PortalPrimitives';
import { SemesterTimeline } from './SemesterTimeline';
import { ErrorState, LoadingState } from './StateViews';
import { UploadTimelineDrawer } from './UploadTimelineDrawer';

// TimelineEntry now lives in src/types.

interface TimelineManagementProps {
  onBack: () => void;
}

const formatDisplayDate = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatSessionTitle = (session?: string) => {
  const match = session?.match(/\d{4}\/\d{4}/);
  return `Session ${match ? match[0] : session || '2025/2026'}`;
};

const actionLabel = (action: TimelineAuditLog['action']) => {
  switch (action) {
    case 'UPLOAD':
      return 'Uploaded timeline';
    case 'REPLACE':
      return 'Replaced timeline';
    case 'ADD_ENTRY':
      return 'Added entry';
    case 'EDIT_ENTRY':
      return 'Edited entry';
    case 'DELETE_ENTRY':
      return 'Deleted entry';
    default:
      return action;
  }
};

const actionColor = (action: TimelineAuditLog['action']) => {
  switch (action) {
    case 'UPLOAD':
    case 'REPLACE':
      return 'text-[#2563eb]';
    case 'ADD_ENTRY':
      return 'text-[#16a34a]';
    case 'EDIT_ENTRY':
      return 'text-[#d97706]';
    case 'DELETE_ENTRY':
      return 'text-[#dc2626]';
    default:
      return 'text-slate-600';
  }
};

const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'OS';

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

  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [timeline, setTimeline] = useState<ActiveSemesterTimeline | null>(null);
  const [auditLogs, setAuditLogs] = useState<TimelineAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scheduleRefreshKey, setScheduleRefreshKey] = useState(0);

  const loadEntries = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([getActiveTimeline(), getTimelineAuditLogs()])
      .then(([activeTimeline, logs]) => {
        setTimeline(activeTimeline);
        setEntries(activeTimeline.available
          ? activeTimeline.levels.flatMap((group) => group.entries.map(timelineEntryToLegacy))
          : []);
        setAuditLogs(logs);
        setScheduleRefreshKey((value) => value + 1);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load timeline entries.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

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
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimelineEntry | null>(null);
  const [entryToDelete, setEntryToDelete] = useState<{id: string, name: string} | null>(null);

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

  const handleAddEntry = (newEntryVal: Omit<TimelineEntry, 'id' | 'status'>) => {
    createTimelineEntry(newEntryVal)
      .then((savedEntry) => {
        const normalizedEntry = timelineEntryToLegacy(savedEntry);
        setEntries(prev => [...prev, normalizedEntry]);
        triggerToast(`Successfully created timeline entry: "${normalizedEntry.event}"`);
        setAddDrawerOpen(false);
        loadEntries();
      })
      .catch((e) => {
        triggerToast(e instanceof Error ? e.message : 'Failed to create timeline entry.');
      });
  };

  const handleEditEntry = (updated: Omit<TimelineEntry, 'status'>) => {
    updateTimelineEntry(updated.id, updated)
      .then((savedEntry) => {
        const normalizedEntry = timelineEntryToLegacy(savedEntry);
        setEntries(prev => prev.map(ent => (ent.id === updated.id ? normalizedEntry : ent)));

        triggerToast(`Successfully modified entry: "${normalizedEntry.event}"`);
        setEditDrawerOpen(false);
        loadEntries();
      })
      .catch((e) => {
        triggerToast(e instanceof Error ? e.message : 'Failed to update timeline entry.');
      });
  };

  const handleDeleteEntry = (id: string, name: string) => {
    setEntryToDelete({ id, name });
  };

  const confirmDeleteEntry = () => {
    if (!entryToDelete) return;
    const { id, name } = entryToDelete;
    deleteTimelineEntry(id)
      .then(() => {
        setEntries(prev => prev.filter(ent => ent.id !== id));
        triggerToast(`Deleted entry "${name}" from master record.`);
        loadEntries();
      })
      .catch((e) => {
        triggerToast(e instanceof Error ? e.message : 'Failed to delete timeline entry.');
      })
      .finally(() => {
        setEntryToDelete(null);
      });
  };

  const handleDownloadTemplate = () => {
    triggerToast('Generating Excel master schedule template...');
    downloadTimelineTemplate()
      .then((blob) => {
        saveBlob(blob, 'FSKTM_Semester_Timeline_Template.xlsx');
        triggerToast('Success! FSKTM_Semester_Timeline_Template.xlsx downloaded.');
      })
      .catch((e) => {
        triggerToast(e instanceof Error ? e.message : 'Failed to download timeline template.');
      });
  };

  const handleUploadTimeline = () => {
    setUploadDrawerOpen(true);
  };

  const handleImportSuccess = (importedEvents: TimelineEntry[], importedCount?: number) => {
    setEntries(importedEvents);
    triggerToast(`Import completed! ${importedCount ?? importedEvents.length} entries committed.`);
    loadEntries();
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
            {timeline?.available ? formatSessionTitle(timeline.session) : 'No active session'}
          </span>
        </div>

        {/* Card 2: Timeline Status with live active indicator */}
        <div className="bg-white border border-[#e2e8f0] rounded-2xl p-5 pl-6 text-left shadow-3xs">
          <span className="text-[9px] font-extrabold uppercase text-slate-400 tracking-widest block">
            TIMELINE STATUS
          </span>
          <div className="flex items-center gap-2 mt-3.5">
            <StatusBadge tone="success" dot pulse className="text-[11px]">
              {timeline?.available ? 'Active' : 'Not Uploaded'}
            </StatusBadge>
          </div>
        </div>

        {/* Card 3: Last Updated tracking */}
        <div className="bg-white border border-[#e2e8f0] rounded-2xl p-5 pl-6 text-left shadow-3xs">
          <span className="text-[9px] font-extrabold uppercase text-slate-400 tracking-widest block">
            LAST UPDATED
          </span>
          <span className="text-[17px] font-black text-brand-navy block mt-3 tracking-tight">
            {timeline?.available ? formatDisplayDate(timeline.uploadedAt) : '-'}
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
      <SemesterTimeline refreshKey={scheduleRefreshKey} />

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
              <option value="Research Project (P1)">Research Project (P1)</option>
              <option value="Research Project (P2)">Research Project (P2)</option>
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
              {loading ? (
                <tr>
                  <td colSpan={4} className="p-0">
                    <LoadingState message="Loading audit log..." />
                  </td>
                </tr>
              ) : auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-slate-400 italic">
                    No timeline audit records are available yet.
                  </td>
                </tr>
              ) : auditLogs.map((log) => (
                <tr key={log.id} className="data-row">
                  {/* User identity cell with photo avatar */}
                  <td className="data-td flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full border border-slate-200 bg-slate-100 text-[9px] font-black text-slate-600 flex items-center justify-center">
                      {initials(log.actorName)}
                    </span>
                    <span className="font-bold text-brand-navy">{log.actorName}</span>
                  </td>

                  {/* Operation date log */}
                  <td className="data-td">
                    {formatDisplayDate(log.createdAt)}
                  </td>

                  {/* Operational tag action color mapping */}
                  <td className="data-td font-extrabold">
                    <span className={actionColor(log.action)}>
                      {actionLabel(log.action)}
                    </span>
                  </td>

                  {/* Details summary */}
                  <td className="data-td">
                    {log.summary}
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

      {/* Delete Confirmation Modal */}
      {entryToDelete && (
        <div className="fixed inset-0 bg-brand-navy/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 text-left animate-fade-in">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl space-y-6">
            <div>
              <h3 className="text-sm font-black text-brand-navy tracking-tight mb-2">Delete Timeline Entry</h3>
              <p className="text-slate-600 leading-relaxed text-xs">
                Are you sure you want to permanently remove <span className="font-bold text-slate-800">"{entryToDelete.name}"</span> from the postgraduate master timeline? This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <PortalButton variant="ghost" onClick={() => setEntryToDelete(null)}>
                Cancel
              </PortalButton>
              <PortalButton variant="danger" icon={Trash2} onClick={confirmDeleteEntry}>
                Delete Entry
              </PortalButton>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
