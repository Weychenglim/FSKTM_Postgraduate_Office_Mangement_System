/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Megaphone,
  Search, 
  Paperclip, 
  Calendar, 
  AlertTriangle, 
  Info, 
  HelpCircle, 
  CheckCircle, 
  Trash2, 
  X, 
  ChevronLeft, 
  ChevronRight,
  Sparkles,
  Users,
  ShieldAlert,
  Send,
  Eye,
  FileText,
  Pencil
} from 'lucide-react';
import { PageHeader, PortalButton, PortalConfirmModal, PortalToast, SegmentedControl, StatusBadge, getStatusBadgeTone } from './PortalPrimitives';
import { StatCard } from './StatCard';
import { LoadingState, ErrorState } from './StateViews';
import { AnnouncementItem } from '../types';
import { getAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement } from '../services';

// AnnouncementItem now lives in src/types.

// Target-audience chip options. "All" reaches everyone; "Students" is students-only.
type AudienceOption = 'All' | 'Students' | 'Lecturers' | 'Staff' | 'Coordinators';
const AUDIENCE_OPTIONS: AudienceOption[] = ['All', 'Students', 'Lecturers', 'Staff', 'Coordinators'];

// Map the chip choice to the backend target value, and back again when editing.
const targetForAudience = (a: AudienceOption): AnnouncementItem['target'] =>
  a === 'Students' ? 'All Students' : a;
const audienceFromTarget = (target: string): AudienceOption =>
  target === 'All Students'
    ? 'Students'
    : (['All', 'Lecturers', 'Staff', 'Coordinators'].includes(target) ? (target as AudienceOption) : 'All');

export const AnnouncementManagement: React.FC = () => {
  // --- 1. Notification Toast and State Manager ---
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // --- View state: 'create' (draft form) vs 'history' (broadcast records) ---
  const [view, setView] = useState<'create' | 'history'>('create');

  // --- 2. Live Broadcast History Data store (loaded from announcementsApi) ---
  const [historyItems, setHistoryItems] = useState<AnnouncementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnnouncements = useCallback(() => {
    setLoading(true);
    setError(null);
    getAnnouncements()
      .then(setHistoryItems)
      .catch((e) => {
        // A stale list would keep offering Publish/Delete on items that may
        // already have changed, so clear it and show the error instead.
        setHistoryItems([]);
        setError(e instanceof Error ? e.message : 'Failed to load announcements.');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadAnnouncements();
  }, [loadAnnouncements]);

  // --- 3. Draft Form States ---
  const [headline, setHeadline] = useState('');
  const [targetAudience, setTargetAudience] = useState<AudienceOption>('All');
  const [priorityLevel, setPriorityLevel] = useState<'Urgent' | 'Info' | 'General'>('Info');
  const [contentBody, setContentBody] = useState('');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  // When set, the form edits an existing announcement (PATCH) instead of creating one.
  const [editingId, setEditingId] = useState<string | null>(null);
  // A published announcement stays published when saved; a draft stays a draft.
  const [editingStatus, setEditingStatus] = useState<'Active' | 'Draft'>('Draft');
  const [existingAttachmentName, setExistingAttachmentName] = useState<string | null>(null);
  const [removeExistingAttachment, setRemoveExistingAttachment] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<AnnouncementItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // --- 4. Search and Table Pagination States ---
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 4;

  // --- 5. Handlers ---
  const handleAudienceClick = (audience: AudienceOption) => {
    setTargetAudience(audience);
  };

  const handlePriorityClick = (priority: 'Urgent' | 'Info' | 'General') => {
    setPriorityLevel(priority);
  };

  // Open the OS file picker (the hidden <input> below does the real work).
  const handleAttachFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (file) {
      setAttachedFile(file);
      showToast(`Attached file: ${file.name}`);
    }
  };

  const handleRemoveAttachment = () => {
    if (attachedFile) {
      setAttachedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      showToast('Attachment removed.');
      return;
    }
    setRemoveExistingAttachment(true);
    showToast('The current attachment will be removed when you save.');
  };

  // Shared submit: creates a new announcement, or updates the draft being edited.
  // Publishing (status Active) makes the backend fan it out to the target audience.
  const submitAnnouncement = async (status: 'Active' | 'Draft') => {
    setSubmitting(true);
    try {
      const payload = {
        title: headline.trim(),
        content: contentBody,
        target: targetForAudience(targetAudience),
        priority: priorityLevel,
        status,
        attachment: attachedFile,
        removeAttachment: removeExistingAttachment,
      };
      const wasPublished = editingId !== null && editingStatus === 'Active';
      const saved = editingId
        ? await updateAnnouncement(editingId, payload)
        : await createAnnouncement(payload);
      const reach = saved.deliveredTo ?? 0;
      if (status === 'Active') {
        showToast(
          wasPublished
            ? `Changes saved. ${reach} recipient${reach === 1 ? '' : 's'} see the updated announcement.`
            : `Success: Announcement published and delivered to ${reach} recipient${reach === 1 ? '' : 's'}.`,
        );
      } else if (wasPublished) {
        showToast('Moved back to drafts. Recipients no longer see it.');
      } else {
        showToast(editingId ? 'Draft updated and saved.' : 'Announcement saved as a draft.');
      }
      resetForm();
      loadAnnouncements();
    } catch (err) {
      showToast(`Error: ${err instanceof Error ? err.message : 'Failed to save announcement.'}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Load a draft, or a published announcement, back into the form for editing.
  const handleEditDraft = (draft: AnnouncementItem) => {
    const published = draft.status === 'Active';
    setView('create');
    setEditingId(draft.id);
    setEditingStatus(published ? 'Active' : 'Draft');
    setHeadline(draft.title);
    setContentBody(draft.content ?? draft.summary ?? '');
    setTargetAudience(audienceFromTarget(draft.target));
    setPriorityLevel(draft.priority);
    setExistingAttachmentName(draft.attachmentName ?? null);
    setRemoveExistingAttachment(false);
    setAttachedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast(published ? `Editing published announcement: "${draft.title}"` : `Editing draft: "${draft.title}"`);
  };

  // Publish a draft straight from the list (no need to open it first).
  const handlePublishDraft = async (draft: AnnouncementItem) => {
    try {
      const saved = await updateAnnouncement(draft.id, {
        title: draft.title,
        content: draft.content ?? draft.summary ?? '',
        target: draft.target,
        priority: draft.priority,
        status: 'Active',
        attachment: null,
      });
      const reach = saved.deliveredTo ?? 0;
      showToast(`Draft published and delivered to ${reach} recipient${reach === 1 ? '' : 's'}.`);
      if (editingId === draft.id) resetForm();
      loadAnnouncements();
    } catch (err) {
      showToast(`Error: ${err instanceof Error ? err.message : 'Failed to publish draft.'}`);
    }
  };

  const handleCancelEdit = () => {
    resetForm();
    showToast('Edit cancelled.');
  };

  // Submit flow: Publish Now
  const handlePublishNow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!headline.trim()) {
      showToast('Error: Please enter a descriptive headline title.');
      return;
    }
    if (!contentBody.trim()) {
      showToast('Error: Please provide descriptive Content Body details.');
      return;
    }
    void submitAnnouncement('Active');
  };

  // Submit flow: Save Draft
  const handleSaveDraft = (e: React.FormEvent) => {
    e.preventDefault();
    if (!headline.trim()) {
      showToast('Error: Please enter at least a headline before saving as draft.');
      return;
    }
    void submitAnnouncement('Draft');
  };

  const resetForm = () => {
    setHeadline('');
    setTargetAudience('All');
    setPriorityLevel('Info');
    setContentBody('');
    setAttachedFile(null);
    setEditingId(null);
    setEditingStatus('Draft');
    setExistingAttachmentName(null);
    setRemoveExistingAttachment(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Deleting is permanent and also removes every recipient's copy, so it is
  // always confirmed first.
  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const { id, title } = pendingDelete;
    setDeleting(true);
    try {
      await deleteAnnouncement(id);
      setHistoryItems(prev => prev.filter(item => item.id !== id));
      if (editingId === id) resetForm();
      showToast(`Removed announcement: "${title}"`);
    } catch (err) {
      showToast(`Error: ${err instanceof Error ? err.message : 'Failed to remove announcement.'}`);
    } finally {
      setDeleting(false);
      setPendingDelete(null);
    }
  };

  // Pull a published announcement back to drafts; recipients' copies are withdrawn.
  const handleWithdraw = async (item: AnnouncementItem) => {
    try {
      await updateAnnouncement(item.id, {
        title: item.title,
        content: item.content ?? item.summary ?? '',
        target: item.target,
        priority: item.priority,
        status: 'Draft',
        attachment: null,
      });
      showToast(`"${item.title}" moved back to drafts. Recipients no longer see it.`);
      loadAnnouncements();
    } catch (err) {
      showToast(`Error: ${err instanceof Error ? err.message : 'Failed to withdraw announcement.'}`);
    }
  };

  // --- 6. Split drafts (their own section) from published records (history) ---
  const drafts = historyItems.filter(item => item.status === 'Draft');
  const publishedItems = historyItems.filter(item => item.status !== 'Draft');

  // History search runs over published records only (drafts live below the form).
  const filteredAnnouncements = publishedItems.filter(item => {
    const term = searchQuery.toLowerCase();
    return (
      item.title.toLowerCase().includes(term) ||
      item.summary.toLowerCase().includes(term) ||
      item.target.toLowerCase().includes(term) ||
      item.priority.toLowerCase().includes(term)
    );
  });

  // Counts shown on the history cards, all taken from the loaded records.
  const activeCount = publishedItems.filter(item => item.status === 'Active').length;
  const urgentCount = publishedItems.filter(
    item => item.status === 'Active' && item.priority === 'Urgent',
  ).length;
  const draftCount = drafts.length;

  // Pagination bounds (a shrinking search result never leaves an empty page)
  const totalPages = Math.ceil(filteredAnnouncements.length / itemsPerPage) || 1;
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * itemsPerPage;
  const displayedAnnouncements = filteredAnnouncements.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div id="announcement-module" className="text-left font-sans text-brand-navy text-xs pb-16 animate-fade-in">

      <PortalToast message={toast} />

      {view === 'create' ? (
      /* ==================== CREATE ANNOUNCEMENT VIEW ==================== */
      <div className="space-y-8">

        <PageHeader
          title={
            editingId
              ? editingStatus === 'Active' ? 'Edit Published Announcement' : 'Edit Draft Announcement'
              : 'Draft New Announcement'
          }
          subtitle={
            editingId
              ? editingStatus === 'Active'
                ? 'Changes reach recipients as soon as you save.'
                : 'Update the draft below, then save it or publish it.'
              : 'Craft your message for the FSKTM community.'
          }
          actions={(
            <div className="flex items-center gap-2 shrink-0">
              {editingId && (
                <PortalButton
                  type="button"
                  variant="ghost"
                  size="md"
                  icon={X}
                  onClick={handleCancelEdit}
                >
                  Cancel Edit
                </PortalButton>
              )}
              <PortalButton
                type="button"
                variant="secondary"
                size="md"
                icon={Eye}
                onClick={() => setView('history')}
              >
                View Announcement History
              </PortalButton>
            </div>
          )}
        />

        {/* Draft form. Enter must not trigger a native submit, which reloaded
            the page and lost the draft; the buttons below do the saving. */}
        <form
          onSubmit={(e) => e.preventDefault()}
          className="bg-white border border-slate-200/80 rounded-2xl p-6 md:p-8 space-y-5 text-left shadow-3xs"
        >

            {/* Field A: Headline */}
            <div className="space-y-1.5">
              <label htmlFor="announcement-headline" className="form-label block">
                Headline
              </label>
              <input
                id="announcement-headline" 
                type="text"
                placeholder="Enter a descriptive title..."
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                className="form-control form-control-md"
              />
            </div>

            {/* Field B: Target Audience Chips Row */}
            <div className="space-y-2">
              <label className="form-label block">
                Target Audience
              </label>
              <SegmentedControl
                options={AUDIENCE_OPTIONS}
                value={targetAudience}
                onChange={handleAudienceClick}
                className="inline-flex flex-wrap"
              />
              <p className="text-[10px] text-slate-400 font-semibold">
                {targetAudience === 'All'
                  ? 'Reaches everyone (students, lecturers, staff, coordinators).'
                  : `Reaches ${targetAudience} only.`}
              </p>
            </div>

            {/* Field C: Priority Selector boxes */}
            <div className="space-y-2">
              <label className="form-label block">
                Priority Level
              </label>
              <div className="grid grid-cols-3 gap-3">
                {/* Urgent */}
                <button
                  type="button"
                  onClick={() => handlePriorityClick('Urgent')}
                  className={`border rounded-xl p-3 flex flex-col items-center justify-center space-y-1.5 transition-all text-center cursor-pointer ${
                    priorityLevel === 'Urgent'
                      ? 'border-red-400 bg-red-50/50 ring-1 ring-red-500'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <AlertTriangle className={`w-4 h-4 ${priorityLevel === 'Urgent' ? 'text-red-500' : 'text-slate-400'}`} />
                  <span className={`text-[9px] uppercase font-black tracking-widest ${priorityLevel === 'Urgent' ? 'text-red-700' : 'text-slate-500'}`}>
                    Urgent
                  </span>
                </button>

                {/* Info */}
                <button
                  type="button"
                  onClick={() => handlePriorityClick('Info')}
                  className={`border rounded-xl p-3 flex flex-col items-center justify-center space-y-1.5 transition-all text-center cursor-pointer ${
                    priorityLevel === 'Info'
                      ? 'border-blue-400 bg-blue-50/50 ring-1 ring-blue-500'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Info className={`w-4 h-4 ${priorityLevel === 'Info' ? 'text-blue-500' : 'text-slate-400'}`} />
                  <span className={`text-[9px] uppercase font-black tracking-widest ${priorityLevel === 'Info' ? 'text-blue-700' : 'text-slate-500'}`}>
                    Info
                  </span>
                </button>

                {/* General */}
                <button
                  type="button"
                  onClick={() => handlePriorityClick('General')}
                  className={`border rounded-xl p-3 flex flex-col items-center justify-center space-y-1.5 transition-all text-center cursor-pointer ${
                    priorityLevel === 'General'
                      ? 'border-slate-450 bg-slate-100 ring-1 ring-slate-800'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span className="font-extrabold text-slate-400 tracking-wide text-center leading-none">—</span>
                  <span className={`text-[9px] uppercase font-black tracking-widest ${priorityLevel === 'General' ? 'text-slate-800' : 'text-slate-500'}`}>
                    General
                  </span>
                </button>
              </div>
            </div>

            {/* Field D: Content Body Textarea with dynamic attach button */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="announcement-content" className="form-label block">
                  Content Body
                </label>
                <button
                  type="button"
                  onClick={handleAttachFile}
                  className="inline-flex items-center gap-1.5 text-[10px] font-extrabold text-slate-600 hover:text-blue-600 transition"
                >
                  <Paperclip className="w-3.5 h-3.5" />
                  <span>Attach File</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelected}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.txt"
                />
              </div>

              <div className="relative">
                <textarea
                  id="announcement-content"
                  rows={6}
                  placeholder="Write your announcement content here..."
                  value={contentBody}
                  onChange={(e) => setContentBody(e.target.value)}
                  className="form-control form-control-md resize-none"
                />

                {(attachedFile || existingAttachmentName) && (
                  <div className="absolute bottom-3 left-3 right-3 bg-white border border-slate-200 rounded-lg p-2 flex items-center justify-between text-[10px] shadow-2xs">
                    <div className="flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-blue-500" />
                      <span className={`font-bold truncate max-w-[200px] ${removeExistingAttachment && !attachedFile ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                        {attachedFile ? attachedFile.name : existingAttachmentName}
                      </span>
                      {!attachedFile && existingAttachmentName && (
                        <span className="text-slate-400 font-semibold italic">
                          {removeExistingAttachment ? '(will be removed when saved)' : '(current — upload to replace)'}
                        </span>
                      )}
                    </div>
                    {!(removeExistingAttachment && !attachedFile) && (
                      <button
                        type="button"
                        aria-label="Remove attachment"
                        onClick={handleRemoveAttachment}
                        className="text-slate-400 hover:text-red-500 p-0.5 rounded transition"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons Row */}
            <div className="pt-6 border-t border-slate-100 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
              <PortalButton
                type="button"
                onClick={handleSaveDraft}
                variant="secondary"
                size="md"
                disabled={submitting}
              >
                {editingId ? (editingStatus === 'Active' ? 'Move to Drafts' : 'Update Draft') : 'Save Draft'}
              </PortalButton>

              <PortalButton
                type="button"
                onClick={handlePublishNow}
                variant="primary"
                size="md"
                icon={Send}
                disabled={submitting}
              >
                {submitting
                  ? 'Saving…'
                  : editingId
                    ? editingStatus === 'Active' ? 'Save & Keep Published' : 'Publish Draft'
                    : 'Publish Now'}
              </PortalButton>
            </div>

        </form>

        {loading && <LoadingState message="Loading your announcements…" />}
        {!loading && error && <ErrorState message={error} onRetry={loadAnnouncements} />}

        {/* ==================== SAVED DRAFTS (below the form, not in history) ==================== */}
        {drafts.length > 0 && (
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 md:p-8 space-y-4 text-left shadow-3xs">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="section-label">Saved Drafts</h3>
                <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                  Unpublished announcements. Edit to keep working, or publish to broadcast.
                </p>
              </div>
              <StatusBadge tone="warning" className="rounded-lg px-2.5 py-1 text-[9px] shrink-0">
                {drafts.length} draft{drafts.length === 1 ? '' : 's'}
              </StatusBadge>
            </div>

            <div className="divide-y divide-slate-100">
              {drafts.map((draft) => (
                <div
                  key={draft.id}
                  className={`py-3.5 flex flex-col md:flex-row md:items-start md:justify-between gap-3 ${
                    editingId === draft.id ? 'bg-blue-50/40 -mx-2 px-2 rounded-lg' : ''
                  }`}
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-slate-800 text-[12px] leading-snug">
                        {draft.title || 'Untitled draft'}
                      </span>
                      <StatusBadge tone={getStatusBadgeTone(draft.priority)} className="rounded-md px-1.5 py-0.5 text-[8px]">
                        {draft.priority}
                      </StatusBadge>
                      <StatusBadge tone="neutral" className="rounded-md px-1.5 py-0.5 text-[8px]">
                        {draft.target}
                      </StatusBadge>
                      {editingId === draft.id && (
                        <StatusBadge tone="info" className="rounded-md px-1.5 py-0.5 text-[8px]">
                          Editing
                        </StatusBadge>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 font-semibold leading-relaxed line-clamp-2">
                      {draft.summary || 'No content yet.'}
                    </p>
                    <p className="text-[10px] text-slate-400 font-bold">By {draft.createdBy || 'Postgraduate Office'}</p>
                    {draft.attachmentName && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 font-bold">
                        <Paperclip className="w-3 h-3" />
                        {draft.attachmentName}
                      </span>
                    )}
                  </div>

                  {draft.canManage !== false && (
                  <div className="flex items-center gap-2 shrink-0">
                    <PortalButton
                      type="button"
                      variant="secondary"
                      size="sm"
                      icon={Pencil}
                      onClick={() => handleEditDraft(draft)}
                    >
                      Edit
                    </PortalButton>
                    <PortalButton
                      type="button"
                      variant="primary"
                      size="sm"
                      icon={Send}
                      onClick={() => handlePublishDraft(draft)}
                    >
                      Publish
                    </PortalButton>
                    <PortalButton
                      type="button"
                      variant="ghost"
                      size="sm"
                      icon={Trash2}
                      onClick={() => setPendingDelete(draft)}
                      className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                    >
                      Delete
                    </PortalButton>
                  </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
      ) : (
      /* ==================== ANNOUNCEMENT HISTORY VIEW ==================== */
      <div id="announcements-history-view" className="space-y-8">

        <PageHeader
          title="Announcement History"
          subtitle="Review and manage past announcements broadcast to the FSKTM community."
          backLabel="Back to Draft Announcement"
          onBack={() => setView('create')}
          actions={(
            <div className="relative max-w-xs w-full">
              <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
                <Search className="w-3.5 h-3.5 text-slate-400" />
              </span>
              <input
                type="text"
                placeholder="Search announcements..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="w-full bg-white border border-slate-205 text-xs font-bold text-slate-800 pl-9 pr-3 py-2 rounded-xl placeholder:text-slate-400 outline-none focus:ring-1 focus:ring-brand-navy focus:border-brand-navy transition-all shadow-3xs"
              />
            </div>
          )}
        />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Active Now" value={activeCount} caption="Live for recipients" icon={Megaphone} tone="green" />
            <StatCard label="Urgent Alerts" value={urgentCount} caption="Active and urgent" icon={AlertTriangle} tone="rose" />
            <StatCard label="Drafts" value={draftCount} caption="Not published yet" icon={Pencil} tone="blue" />
            {/* Everything published so far, including expired */}
            <StatCard label="Published (All)" value={publishedItems.length} caption="Including expired" icon={Send} tone="slate" />
          </div>

          {/* Announcement history Table frame card structure */}
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-3xs overflow-hidden">
            
            <div className="overflow-x-auto">
              <table className="data-table text-xs">
                <thead>
                  <tr className="data-thead bg-[#f8fafc]">
                    <th className="data-th">Title & Content</th>
                    <th className="data-th text-right">Target</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={2} className="p-0">
                        <LoadingState message="Loading announcements…" />
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan={2} className="p-0">
                        <ErrorState message={error} onRetry={loadAnnouncements} />
                      </td>
                    </tr>
                  ) : displayedAnnouncements.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="px-5 py-12 text-center text-slate-400 font-medium">
                        No stored broadcasts found matching &quot;{searchQuery}&quot;.
                      </td>
                    </tr>
                  ) : (
                    displayedAnnouncements.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition">
                        
                        {/* Title & summary block */}
                        <td className="data-td text-left max-w-sm space-y-1">
                          <div className="flex items-center gap-2">
                            {item.status === 'Draft' && (
                              <StatusBadge tone="warning" className="rounded-md px-1.5 py-0.5 text-[8px]">
                                Draft
                              </StatusBadge>
                            )}
                            <span className="font-extrabold text-slate-800 text-[12px] leading-snug tracking-tight">
                              {item.title}
                            </span>
                            
                            {/* Priority visual mini circle tag */}
                            <StatusBadge
                              tone={getStatusBadgeTone(item.priority)}
                              className="rounded-md px-1.5 py-0.5 text-[8px]"
                            >
                              {item.priority}
                            </StatusBadge>
                          </div>
                          
                          <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
                            {item.summary}
                          </p>

                          <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-400 font-bold select-none pt-1">
                            <span>Broadcasted {item.dateCreated} by {item.createdBy || 'Postgraduate Office'}</span>
                            {item.status !== 'Active' && (
                              <StatusBadge tone="neutral" className="rounded-md px-1.5 py-0.5 text-[8px]">
                                {item.status}
                              </StatusBadge>
                            )}
                            {item.canManage !== false && (
                              <>
                                <span>•</span>
                                {item.status === 'Active' && (
                                  <>
                                    <PortalButton
                                      type="button"
                                      onClick={() => handleEditDraft(item)}
                                      variant="ghost"
                                      size="sm"
                                      icon={Pencil}
                                      className="px-1 py-0 h-auto"
                                    >
                                      Edit
                                    </PortalButton>
                                    <PortalButton
                                      type="button"
                                      onClick={() => handleWithdraw(item)}
                                      variant="ghost"
                                      size="sm"
                                      className="px-1 py-0 h-auto"
                                    >
                                      Move to Drafts
                                    </PortalButton>
                                  </>
                                )}
                                <PortalButton
                                  type="button"
                                  onClick={() => setPendingDelete(item)}
                                  variant="ghost"
                                  size="sm"
                                  icon={Trash2}
                                  className="px-1 py-0 h-auto text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                                >
                                  Remove
                                </PortalButton>
                              </>
                            )}
                          </div>
                        </td>

                        {/* Target tag */}
                        <td className="data-td text-right vertical-align-middle">
                          <StatusBadge tone="neutral" className="rounded-lg px-2.5 py-1 text-[9px]">
                            {item.target}
                          </StatusBadge>
                        </td>

                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Interactive custom pagination layout block */}
            {totalPages > 1 && (
              <div className="bg-[#f8fafc]/50 border-t border-slate-150 px-5 py-4 flex items-center justify-between select-none">
                <span className="text-[10px] font-bold text-slate-400">
                  Showing {startIndex + 1} - {Math.min(startIndex + itemsPerPage, filteredAnnouncements.length)} of {filteredAnnouncements.length} records
                </span>

                <div className="flex items-center gap-1.5">
                  <PortalButton
                    type="button"
                    onClick={() => setCurrentPage(Math.max(safePage - 1, 1))}
                    disabled={safePage === 1}
                    variant="secondary"
                    size="icon"
                    icon={ChevronLeft}
                    className="w-8 h-8"
                    aria-label="Previous page"
                  />

                  {Array.from({ length: totalPages }).map((_, i) => {
                    const pageNum = i + 1;
                    const isCurrent = safePage === pageNum;
                    return (
                      <PortalButton
                        key={pageNum}
                        type="button"
                        onClick={() => setCurrentPage(pageNum)}
                        variant={isCurrent ? 'primary' : 'secondary'}
                        size="sm"
                        className="w-7 h-7 p-0 text-[11px]"
                      >
                        {pageNum}
                      </PortalButton>
                    );
                  })}

                  <PortalButton
                    type="button"
                    onClick={() => setCurrentPage(Math.min(safePage + 1, totalPages))}
                    disabled={safePage === totalPages}
                    variant="secondary"
                    size="icon"
                    icon={ChevronRight}
                    className="w-8 h-8"
                    aria-label="Next page"
                  />
                </div>
              </div>
            )}

          </div>

        </div>

      )}

      <PortalConfirmModal
        isOpen={pendingDelete !== null}
        title="Remove this announcement?"
        message={
          pendingDelete
            ? `"${pendingDelete.title}" will be deleted permanently${
                pendingDelete.status === 'Active' ? ' and removed from every recipient\'s notifications' : ''
              }.`
            : ''
        }
        confirmLabel="Remove"
        tone="danger"
        isLoading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />

    </div>
  );
};
