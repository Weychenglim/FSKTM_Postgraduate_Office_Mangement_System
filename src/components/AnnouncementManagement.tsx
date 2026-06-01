/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
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
  FileText
} from 'lucide-react';
import { PortalButton, PortalToast } from './PortalPrimitives';
import { LoadingState, ErrorState } from './StateViews';
import { AnnouncementItem } from '../types';
import { getAnnouncements } from '../services';

// AnnouncementItem now lives in src/types.

export const AnnouncementManagement: React.FC = () => {
  // --- 1. Notification Toast and State Manager ---
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // --- 2. Live Broadcast History Data store (loaded from announcementsApi) ---
  const [historyItems, setHistoryItems] = useState<AnnouncementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnnouncements = useCallback(() => {
    setLoading(true);
    setError(null);
    getAnnouncements()
      .then(setHistoryItems)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load announcements.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadAnnouncements();
  }, [loadAnnouncements]);

  // --- 3. Draft Form States ---
  const [headline, setHeadline] = useState('');
  const [targetAudience, setTargetAudience] = useState<'All' | 'Lecturers' | 'Staff' | 'Coordinators'>('All');
  const [priorityLevel, setPriorityLevel] = useState<'Urgent' | 'Info' | 'General'>('Info');
  const [contentBody, setContentBody] = useState('');
  const [startDate, setStartDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [attachedFile, setAttachedFile] = useState<string | null>(null);

  // --- 4. Search and Table Pagination States ---
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 4;

  // --- 5. Handlers ---
  const handleAudienceClick = (audience: 'All' | 'Lecturers' | 'Staff' | 'Coordinators') => {
    setTargetAudience(audience);
  };

  const handlePriorityClick = (priority: 'Urgent' | 'Info' | 'General') => {
    setPriorityLevel(priority);
  };

  // Attach simulated files
  const handleAttachFile = () => {
    const fileOptions = ['exam_schedule_2026_draft.pdf', 'research_grant_circular_v2.docx', 'it_system_backup_notes.txt'];
    const randomFile = fileOptions[Math.floor(Math.random() * fileOptions.length)];
    setAttachedFile(randomFile);
    showToast(`Attached file: ${randomFile}`);
  };

  const handleRemoveAttachment = () => {
    setAttachedFile(null);
    showToast('Attachment removed.');
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

    const newAnnouncement: AnnouncementItem = {
      id: `ann-${Date.now()}`,
      title: headline,
      summary: contentBody.length > 90 ? `${contentBody.substring(0, 90)}...` : contentBody,
      target: targetAudience === 'All' ? 'All Students' : targetAudience,
      priority: priorityLevel,
      dateCreated: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      status: 'Active'
    };

    setHistoryItems(prev => [newAnnouncement, ...prev]);
    showToast('Success: Your announcement was published and broadcasted to the FSKTM portal!');
    resetForm();
  };

  // Submit flow: Save Draft
  const handleSaveDraft = (e: React.FormEvent) => {
    e.preventDefault();
    if (!headline.trim()) {
      showToast('Error: Please enter at least a headline before saving as draft.');
      return;
    }

    const newDraft: AnnouncementItem = {
      id: `ann-${Date.now()}`,
      title: `[Draft] ${headline}`,
      summary: contentBody || 'No description provided.',
      target: targetAudience === 'All' ? 'All Students' : targetAudience,
      priority: priorityLevel,
      dateCreated: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      status: 'Draft'
    };

    setHistoryItems(prev => [newDraft, ...prev]);
    showToast('Announcement saved inside local administrative drafts.');
    resetForm();
  };

  const resetForm = () => {
    setHeadline('');
    setTargetAudience('All');
    setPriorityLevel('Info');
    setContentBody('');
    setStartDate('');
    setExpiryDate('');
    setAttachedFile(null);
  };

  const handleDeleteHistoryItem = (id: string, title: string) => {
    setHistoryItems(prev => prev.filter(item => item.id !== id));
    showToast(`Removed broadcast record: "${title}"`);
  };

  // --- 6. Sorting & Search Filtering Logic ---
  const filteredAnnouncements = historyItems.filter(item => {
    const term = searchQuery.toLowerCase();
    return (
      item.title.toLowerCase().includes(term) ||
      item.summary.toLowerCase().includes(term) ||
      item.target.toLowerCase().includes(term) ||
      item.priority.toLowerCase().includes(term)
    );
  });

  // Calculate dynamic stats matching screenshot visual indicators
  const activeCount = historyItems.filter(item => item.status === 'Active').length;
  const urgentCount = historyItems.filter(item => item.priority === 'Urgent').length;
  const scheduledCount = historyItems.filter(item => item.status === 'Scheduled' || item.status === 'Draft').length;

  // Pagination bounds
  const totalPages = Math.ceil(filteredAnnouncements.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const displayedAnnouncements = filteredAnnouncements.slice(startIndex, startIndex + itemsPerPage);

  // CSS Priority badges helpers
  const getPriorityBadgeStyles = (pri: 'Urgent' | 'Info' | 'General') => {
    switch (pri) {
      case 'Urgent':
        return 'text-red-700 bg-red-100 border border-red-200';
      case 'Info':
        return 'text-[#1d4ed8] bg-blue-50 border border-blue-200';
      default:
        return 'text-[#475569] bg-slate-100 border border-slate-200';
    }
  };

  return (
    <div id="announcement-dashboard-view" className="font-sans text-brand-navy text-xs pb-12 animate-fade-in">
      
      <PortalToast message={toast} />

      {/* Grid containing two main panes of layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: DRAFT NEW ANNOUNCEMENT FORM (lg:col-span-6) */}
        <div className="lg:col-span-6 space-y-6">
          <form className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 space-y-5 text-left shadow-2xs">
            
            {/* Header Title inside form box */}
            <div>
              <h2 className="section-heading">
                Draft New Announcement
              </h2>
              <p className="text-slate-500 text-[11px] font-medium leading-relaxed mt-1">
                Craft your message for the FSKTM community.
              </p>
            </div>

            {/* Field A: Headline */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Headline
              </label>
              <input 
                type="text"
                placeholder="Enter a descriptive title..."
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                className="form-control form-control-md"
              />
            </div>

            {/* Field B: Target Audience Chips Row */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Target Audience
              </label>
              <div className="flex flex-wrap gap-2">
                {(['All', 'Lecturers', 'Staff', 'Coordinators'] as const).map((aud) => {
                  const isSelected = targetAudience === aud;
                  return (
                    <button
                      key={aud}
                      type="button"
                      onClick={() => handleAudienceClick(aud)}
                      className={`px-4 py-2 rounded-full text-[11px] font-extrabold tracking-wide transition duration-150 cursor-pointer ${
                        isSelected 
                          ? 'bg-brand-navy text-white shadow-xs' 
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {aud}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Field C: Priority Selector boxes */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
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
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
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
              </div>

              <div className="relative">
                <textarea
                  rows={6}
                  placeholder="Write your announcement content here..."
                  value={contentBody}
                  onChange={(e) => setContentBody(e.target.value)}
                  className="form-control form-control-md resize-none"
                />

                {attachedFile && (
                  <div className="absolute bottom-3 left-3 right-3 bg-white border border-slate-200 rounded-lg p-2 flex items-center justify-between text-[10px] shadow-2xs">
                    <div className="flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-blue-500" />
                      <span className="font-bold text-slate-700 truncate max-w-[200px]">{attachedFile}</span>
                    </div>
                    <button 
                      type="button" 
                      onClick={handleRemoveAttachment}
                      className="text-slate-400 hover:text-red-500 p-0.5 rounded transition"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Field E: Start Date & Auto Expiry Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Start Date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="form-control form-control-md"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Auto-Expiry
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="form-control form-control-md"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons Row */}
            <div className="pt-4 flex flex-col md:flex-row gap-4 items-center">
              <PortalButton
                type="button"
                onClick={handlePublishNow}
                variant="primary"
                size="lg"
                icon={Send}
                fullWidth
                className="md:w-auto"
              >
                Publish Now
              </PortalButton>

              <PortalButton
                type="button"
                onClick={handleSaveDraft}
                variant="secondary"
                size="lg"
                fullWidth
                className="md:w-auto"
              >
                Save Draft
              </PortalButton>
            </div>

          </form>
        </div>

        {/* RIGHT COLUMN: ANNOUNCEMENT HISTORY (lg:col-span-6) */}
        <div id="announcements-history-column" className="lg:col-span-6 space-y-6">
          
          {/* Header Title inside history pane block */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 text-left">
            <div>
              <h2 className="section-heading">
                Announcement History
              </h2>
              <p className="text-slate-500 text-[11px] font-semibold leading-relaxed mt-1">
                Monitoring {historyItems.length} active broadcasts across the faculty.
              </p>
            </div>

            {/* Real Search Input matching mockup placement */}
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
          </div>

          {/* 4 Summary Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            
            {/* Card 1: Active Now */}
            <div className="bg-white border-l-4 border-l-[#0c1424] border border-slate-150 p-4 rounded-xl text-left shadow-3xs">
              <p className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Active Now</p>
              <h3 className="text-xl md:text-2xl font-black text-slate-900 mt-1">
                {activeCount < 10 ? `0${activeCount}` : activeCount}
              </h3>
            </div>

            {/* Card 2: Urgent Alerts */}
            <div className="bg-white border-l-4 border-l-red-500 border border-slate-150 p-4 rounded-xl text-left shadow-3xs">
              <p className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Urgent Alerts</p>
              <h3 className="text-xl md:text-2xl font-black text-rose-600 mt-1">
                {urgentCount < 10 ? `0${urgentCount}` : urgentCount}
              </h3>
            </div>

            {/* Card 3: Avg. Reach */}
            <div className="bg-white border-l-4 border-l-[#3b82f6] border border-slate-150 p-4 rounded-xl text-left shadow-3xs">
              <p className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Avg. Reach</p>
              <h3 className="text-xl md:text-2xl font-black text-blue-700 mt-1">
                88%
              </h3>
            </div>

            {/* Card 4: Scheduled */}
            <div className="bg-white border-l-4 border-l-slate-400 border border-slate-150 p-4 rounded-xl text-left shadow-3xs">
              <p className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Scheduled (Drafts)</p>
              <h3 className="text-xl md:text-2xl font-black text-slate-650 mt-1">
                {scheduledCount < 10 ? `0${scheduledCount}` : scheduledCount}
              </h3>
            </div>

          </div>

          {/* Announcement history Table frame card structure */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-3xs overflow-hidden">
            
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
                              <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[8px] font-black uppercase tracking-wider">
                                Draft
                              </span>
                            )}
                            <span className="font-extrabold text-slate-800 text-[12px] leading-snug tracking-tight">
                              {item.title}
                            </span>
                            
                            {/* Priority visual mini circle tag */}
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${getPriorityBadgeStyles(item.priority)}`}>
                              {item.priority}
                            </span>
                          </div>
                          
                          <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
                            {item.summary}
                          </p>

                          <div className="flex items-center gap-3 text-[10px] text-slate-400 font-bold select-none pt-1">
                            <span>Broadcasted {item.dateCreated}</span>
                            <span>•</span>
                            <button
                              type="button"
                              onClick={() => handleDeleteHistoryItem(item.id, item.title)}
                              className="text-red-500 hover:text-red-700 transition inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Remove</span>
                            </button>
                          </div>
                        </td>

                        {/* Target tag */}
                        <td className="data-td text-right vertical-align-middle">
                          <span className="inline-block px-2.5 py-1 text-[9px] font-black uppercase bg-slate-50 border border-slate-200 text-slate-500 rounded-lg select-none">
                            {item.target}
                          </span>
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
                  <button
                    type="button"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-1 rounded bg-white border border-slate-200 text-slate-400 hover:text-slate-800 disabled:opacity-40 transition cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>

                  {Array.from({ length: totalPages }).map((_, i) => {
                    const pageNum = i + 1;
                    const isCurrent = currentPage === pageNum;
                    return (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-7 h-7 rounded text-[11px] font-black transition cursor-pointer ${
                          isCurrent
                            ? 'bg-brand-navy text-white'
                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="p-1 rounded bg-white border border-slate-200 text-slate-400 hover:text-slate-800 disabled:opacity-40 transition cursor-pointer"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

          </div>

        </div>

      </div>

    </div>
  );
};
