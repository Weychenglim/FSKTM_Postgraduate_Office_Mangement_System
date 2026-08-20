/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  Bell, 
  ChevronLeft,
  Search, 
  Mail, 
  MailOpen, 
  Calendar, 
  CheckCircle, 
  X, 
  ChevronDown,
  Info,
  Lock,
  Clock,
  ArrowUpRight,
  FileText,
  Download,
  Megaphone,
  BellOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PageHeader, PortalToast, StatusDot } from './PortalPrimitives';
import { LoadingState, ErrorState } from './StateViews';
import { NotificationItem } from '../types';
import { downloadAnnouncementAttachment } from '../services';
import { useNotifications } from '../context/NotificationsContext';

// ==================== DEDICATED ATOMIC UI PATTERNS ====================

interface PriorityBadgeProps {
  level: string;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ level }) => {
  const lower = level.toLowerCase();
  const tone = lower.includes('high')
    ? 'bg-rose-50 text-rose-600 border-rose-100'
    : lower.includes('medium')
    ? 'bg-blue-50 text-blue-600 border-blue-100'
    : 'bg-slate-100 text-slate-600 border-slate-200';
  return (
    <span className={`inline-flex items-center px-3.5 py-1.5 ${tone} border rounded-full text-[10px] font-black uppercase tracking-wider select-none`}>
      {level}
    </span>
  );
};

interface ModuleBadgeProps {
  label: string;
}

export const ModuleBadge: React.FC<ModuleBadgeProps> = ({ label }) => {
  return (
    <span className="inline-flex items-center px-4 py-1.5 bg-blue-50/80 text-blue-600 border border-blue-100 rounded-full text-[10px] font-black uppercase tracking-wider select-none">
      {label}
    </span>
  );
};

interface AttachmentCardProps {
  name: string;
  meta: string;
  disabled?: boolean;
}

export const AttachmentCard: React.FC<AttachmentCardProps> = ({ name, meta, disabled = true }) => {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-slate-50 border border-slate-200/85 rounded-xl gap-4 text-left transition hover:bg-slate-50/90 shadow-3xs">
      <div className="flex items-center gap-3">
        {/* PDF Block Icon */}
        <div className="w-10 h-12 bg-rose-100/60 rounded-lg flex flex-col items-center justify-center text-[10px] font-black text-rose-600 border border-rose-200 select-none relative overflow-hidden shrink-0">
          <span className="text-[7.5px] text-rose-500 uppercase font-black tracking-wider leading-none mt-1">DOC</span>
          <FileText className="w-4.5 h-4.5 text-rose-600 mt-0.5" />
          <div className="absolute bottom-0 inset-x-0 bg-rose-600 text-[8px] text-white text-center font-bold py-0.5 leading-none">
            PDF
          </div>
        </div>
        
        <div>
          <h4 className="text-[11px] font-extrabold text-slate-800 leading-snug">
            {name}
          </h4>
          <p className="text-[9.5px] text-slate-450 font-bold mt-0.5">
            {meta}
          </p>
        </div>
      </div>

      <div className="flex flex-col items-end gap-1.5 self-stretch sm:self-auto justify-center min-w-[130px]">
        <button
          type="button"
          disabled={disabled}
          className="w-full px-4 py-2 bg-slate-105 border border-slate-200 text-slate-400 rounded-lg text-[10px] font-black uppercase tracking-wide flex items-center justify-center gap-1.5 cursor-not-allowed select-none transition"
        >
          <Lock className="w-3.5 h-3.5 text-slate-400" />
          <span>Open Letter</span>
        </button>
        <span className="text-[9px] text-slate-400 font-extrabold tracking-wide uppercase italic leading-none">
          Available after approval
        </span>
      </div>
    </div>
  );
};

interface InfoNoteProps {
  text: string;
}

export const InfoNote: React.FC<InfoNoteProps> = ({ text }) => {
  return (
    <div className="flex items-start md:items-center gap-2 text-[10px] text-slate-450 font-bold select-none justify-start px-1">
      <Info className="w-4 h-4 text-slate-400 shrink-0" />
      <p className="leading-snug text-left">{text}</p>
    </div>
  );
};

interface MetadataGridProps {
  from: string;
  to: string;
  reference: string;
}

export const MetadataGrid: React.FC<MetadataGridProps> = ({ from, to, reference }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4 border-y border-slate-100 my-5 text-left">
      <div className="space-y-1">
        <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">From</span>
        <h4 className="text-xs font-black text-slate-800">{from}</h4>
      </div>
      <div className="space-y-1">
        <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">To</span>
        <h4 className="text-xs font-black text-slate-800">{to}</h4>
      </div>
      <div className="space-y-1">
        <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Reference</span>
        <h4 className="text-xs font-bold text-slate-800 tracking-wider font-mono bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100 inline-block">
          {reference}
        </h4>
      </div>
    </div>
  );
};

interface TabEmptyStateProps {
  tab: 'announcements' | 'notifications';
  searching: boolean;
}

export const TabEmptyState: React.FC<TabEmptyStateProps> = ({ tab, searching }) => {
  const isNotifications = tab === 'notifications';
  const Icon = searching ? Search : isNotifications ? BellOff : Megaphone;
  const title = searching
    ? 'No matches found'
    : isNotifications
    ? 'No notifications yet'
    : 'No announcements yet';
  const message = searching
    ? 'Try a different search term.'
    : isNotifications
    ? 'Updates about your supervisor appointment, panel assignment, and confirmation letters will appear here once those modules go live.'
    : 'Published announcements addressed to you will show up here.';
  return (
    <div className="bg-white border border-dashed border-slate-200 rounded-2xl py-16 px-6 flex flex-col items-center text-center select-none">
      <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-150 flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-slate-400" />
      </div>
      <h3 className="text-sm font-extrabold text-brand-navy tracking-tight">{title}</h3>
      <p className="text-[11px] text-slate-500 font-medium mt-1.5 max-w-sm leading-relaxed">{message}</p>
    </div>
  );
};

// ==================== NOTIFICATION CORE DATA ====================

// NotificationItem now lives in src/types.

interface NotificationsAnnouncementsProps {
  onBack: () => void;
  onOpenWorkflowRecord?: (notification: NotificationItem) => void;
}

export const NotificationsAnnouncements: React.FC<NotificationsAnnouncementsProps> = ({
  onBack,
  onOpenWorkflowRecord,
}) => {
  // 1. Notifications come from the shared store so reading here updates the
  //    header bell badge instantly (and vice versa).
  const { items, loading, error, reload, markRead, markAllRead } = useNotifications();

  // Interactive dialog visibility states
  const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  // Bell view is split into two tabs. Announcements are the broadcast feed
  // (already built); Notifications are personal system events (supervisor
  // appointment updates, confirmation letters, …) and stay empty until those
  // modules publish non-announcement notifications.
  const [activeTab, setActiveTab] = useState<'announcements' | 'notifications'>('announcements');

  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const priorityLabel = (priority: string) =>
    priority === 'high' ? 'High Priority' : priority === 'medium' ? 'Medium Priority' : 'General';

  const handleMarkAllRead = async () => {
    try {
      await markAllRead();
      triggerToast('All notifications marked as read.');
    } catch (err) {
      triggerToast(`Error: ${err instanceof Error ? err.message : 'Failed to update.'}`);
    }
  };

  const handleToggleReadState = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Stop row click trigger
    const target = items.find(it => it.id === id);
    if (!target) return;
    const nextUnread = !target.isUnread;
    try {
      await markRead(id, !nextUnread);
      triggerToast(`Marked notification as ${nextUnread ? 'unread' : 'read'}.`);
    } catch (err) {
      triggerToast(`Error: ${err instanceof Error ? err.message : 'Failed to update.'}`);
    }
  };

  const handleDownloadAttachment = async (notif: NotificationItem) => {
    if (!notif.announcementId || !notif.attachmentName) return;
    try {
      await downloadAnnouncementAttachment(notif.announcementId, notif.attachmentName);
      triggerToast(`Downloading ${notif.attachmentName}…`);
    } catch (err) {
      triggerToast(`Error: ${err instanceof Error ? err.message : 'Download failed.'}`);
    }
  };

  // Split the shared feed into the two tabs by the backend `isAnnouncement` flag.
  const announcementFeed = items.filter((it) => it.isAnnouncement);
  const notificationFeed = items.filter((it) => !it.isAnnouncement);
  const activeFeed = activeTab === 'announcements' ? announcementFeed : notificationFeed;

  // Filtered computed list matches (scoped to the active tab).
  const filteredNotifications = activeFeed.filter(item =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.service.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const noun = activeTab === 'announcements' ? 'announcements' : 'notifications';

  const openNotification = async (notification: NotificationItem) => {
    if (notification.isUnread) {
      // A retracted announcement's rows are deleted server-side, so an already
      // loaded feed can hold an id that now 404s. Opening it must still work.
      await markRead(notification.id, true).catch(() => undefined);
    }
    if (
      !notification.isAnnouncement
      && notification.targetModule
      && notification.recordId
      && onOpenWorkflowRecord
    ) {
      onOpenWorkflowRecord(notification);
      return;
    }
    setSelectedNotification(notification);
  };

  return (
    <div id="notifications-announcements-root" className="font-sans text-brand-navy text-xs pb-16 animate-fade-in relative min-h-[750px]">
      
      <PortalToast message={toast} />

      <PageHeader
        title="Notifications & Announcements"
        subtitle="Broadcast announcements and your personal system notifications."
        backLabel="Back to Dashboard"
        onBack={onBack}
        className="mb-6 select-none"
        actions={(
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="px-5 py-2.5 bg-[#001f3f] hover:bg-slate-850 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-xs transition cursor-pointer self-start md:self-auto"
          >
            Mark All as Read
          </button>
        )}
      />

      {/* TAB SWITCHER — Announcements (built) vs Notifications (reserved) */}
      <div className="flex items-center gap-1 mb-6 border-b border-slate-200 select-none">
        {([
          { id: 'announcements' as const, label: 'Announcements', count: announcementFeed.length },
          { id: 'notifications' as const, label: 'Notifications', count: notificationFeed.length },
        ]).map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => { setActiveTab(tab.id); setSearchQuery(''); }}
              className={`relative px-4 py-3 text-[11px] md:text-xs font-extrabold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-2 ${
                active ? 'text-brand-navy' : 'text-slate-400 hover:text-slate-600'
              }`}
              role="tab"
              aria-selected={active}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black leading-none ${
                active ? 'bg-brand-navy text-white' : 'bg-slate-100 text-slate-500'
              }`}>
                {tab.count}
              </span>
              {active && <span className="absolute -bottom-px inset-x-0 h-0.5 bg-brand-navy rounded-full" />}
            </button>
          );
        })}
      </div>

      {/* FILTER SEARCH WRAPPER CARD */}
      <div>
        
        {/* Dynamic Search row */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between gap-4 mb-6 select-none">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4 text-slate-400" />
            </span>
            <input
              type="text"
              placeholder={`Search ${noun}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-control form-control-sm pl-10 pr-4"
            />
          </div>

          <div className="text-[10px] text-slate-400 font-bold shrink-0">
            Total {filteredNotifications.length} {noun}
          </div>
        </div>

        {/* LIST FEED PORTLET OF ITEMS */}
        <div className="space-y-3.5">
          {loading ? (
            <LoadingState message={`Loading ${noun}…`} />
          ) : error ? (
            <ErrorState message={error} onRetry={reload} />
          ) : filteredNotifications.length === 0 ? (
            <TabEmptyState tab={activeTab} searching={searchQuery.trim().length > 0} />
          ) : filteredNotifications.map((it) => {
            const isHigh = it.priority === 'high';
            const isAnn = it.isAnnouncement;
            return (
              <button
                key={it.id}
                type="button"
                onClick={() => void openNotification(it)}
                className={`w-full text-left bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-5 hover:shadow-2xs transition duration-150 flex items-start justify-between gap-4 cursor-pointer relative block ${
                  it.isUnread ? 'ring-1 ring-blue-500/10 bg-slate-50/20' : ''
                }`}
              >
                {/* Left Indicator Strip color */}
                <div className={`absolute top-0 bottom-0 left-0 w-1 rounded-l-xl ${
                  isHigh ? 'bg-rose-500' : isAnn ? 'bg-indigo-500' : 'bg-slate-350'
                }`} />

                <div className="space-y-1 pl-2">
                  <div className="flex items-center gap-2">
                    {it.isUnread && (
                      <StatusDot tone="info" className="w-2 h-2" />
                    )}
                    <h3 className="text-xs md:text-sm font-black text-brand-navy tracking-tight hover:text-blue-600 transition-colors">
                      {it.title}
                    </h3>
                  </div>

                  <span className="block text-[9.5px] font-black uppercase text-slate-400 tracking-wider">
                    {it.service}
                  </span>

                  <p className="text-[11px] text-slate-500 font-semibold line-clamp-2 leading-relaxed">
                    {it.description}
                  </p>
                </div>

                {/* Right stamp column */}
                <div className="flex items-center gap-4 text-right text-[10px] font-bold text-slate-400 shrink-0 select-none">
                  <span className="hidden sm:inline-block truncate max-w-[120px]">{it.timeAgo.split(' — ')[0]}</span>
                  <button
                    type="button"
                    onClick={(e) => handleToggleReadState(it.id, e)}
                    className="p-1.5 rounded hover:bg-slate-100 text-slate-600 transition cursor-pointer shrink-0"
                    title={it.isUnread ? 'Mark as Read' : 'Mark as Unread'}
                  >
                    {it.isUnread ? <Mail className="w-4 h-4" /> : <MailOpen className="w-4 h-4 text-slate-400" />}
                  </button>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ==================== SCREEN COMPONENT: DIALOG WINDOW CONTEXT ==================== */}
      
      {createPortal(
        <AnimatePresence>
          {selectedNotification && (
          <div
            id="notification-modal-overlay"
            className="fixed inset-0 bg-brand-navy/60 backdrop-blur-sm flex items-center justify-center z-[90] p-4 animate-fade-in"
          >
            {/* Backdrop Dimmer dismiss area */}
            <div 
              id="backdrop-overlay-dismiss"
              className="absolute inset-0" 
              onClick={() => setSelectedNotification(null)} 
            />

            {/* Centered Modal Frame Card */}
            <motion.div
              layoutId={`modal-card-${selectedNotification.id}`}
              initial={{ scale: 0.96, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 15 }}
              className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-sm relative z-[100] border border-slate-100 flex flex-col text-left"
            >
              
              {/* Modal Header Panel - Deep Midnight Theme */}
              <div id="modal-header-panel" className="bg-[#121c2e] px-6 py-4.5 flex items-center justify-between text-white border-b border-white/5 select-none text-left">
                <div className="flex items-center gap-2.5">
                  {/* High visual fidelity red bar indicator segment */}
                  <div className="h-4.5 w-1 bg-red-600 rounded-full shrink-0" />
                  
                  <h2 className="text-xs md:text-sm font-black tracking-tight leading-none uppercase text-white truncate max-w-[380px] md:max-w-xl">
                    {selectedNotification.title}
                  </h2>
                </div>

                {/* Dismiss icon action top right */}
                <button
                  type="button"
                  onClick={() => setSelectedNotification(null)}
                  className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition cursor-pointer"
                  title="Close Dialog Window"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body Scroll container */}
              <div className="p-6 md:p-8 space-y-5">
                
                {/* Priority, Timestamp and Module Badge Row Segment */}
                <div className="flex flex-wrap items-center gap-3.5 select-none">
                  {/* Priority Badge */}
                  <PriorityBadge level={priorityLabel(selectedNotification.priority)} />

                  {/* Timestamp Calendar Badge */}
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200/60 rounded-full text-[10px] font-black text-slate-505 select-none leading-none">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{selectedNotification.timeAgo}</span>
                  </div>

                  {/* Module Badge */}
                  <ModuleBadge label={selectedNotification.moduleLabel || 'Supervisor Appointment'} />
                </div>

                {/* Metadata Grid (FROM, TO, REFERENCE) */}
                <MetadataGrid 
                  from={selectedNotification.service}
                  to={selectedNotification.recipient}
                  reference={selectedNotification.reference}
                />

                {/* Message text body content paragraphs */}
                <div className="space-y-4">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                    Message
                  </span>
                  
                  <div className="text-xs font-semibold text-slate-700 leading-relaxed space-y-3 prose pr-2">
                    {(selectedNotification.detailedMessage || selectedNotification.description)
                      .split('\n')
                      .filter((line) => line.trim().length > 0)
                      .map((line, idx) => (
                        <p key={idx}>{line}</p>
                      ))}
                  </div>
                </div>

                {/* Document Attachments Panel — only when the announcement carries a file */}
                {selectedNotification.attachmentName && (
                  <div className="space-y-2.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                      Attached Documents
                    </span>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-slate-50 border border-slate-200/85 rounded-xl gap-4 text-left shadow-3xs">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-12 bg-blue-100/60 rounded-lg flex flex-col items-center justify-center border border-blue-200 select-none shrink-0">
                          <FileText className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="text-[11px] font-extrabold text-slate-800 leading-snug break-all">
                            {selectedNotification.attachmentName}
                          </h4>
                          <p className="text-[9.5px] text-slate-450 font-bold mt-0.5">
                            Attached by {selectedNotification.service}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDownloadAttachment(selectedNotification)}
                        className="w-full sm:w-auto px-4 py-2 bg-brand-navy hover:bg-slate-800 text-white rounded-lg text-[10px] font-black uppercase tracking-wide flex items-center justify-center gap-1.5 transition cursor-pointer shrink-0"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Automatic Notice Info Stamp Footer Note */}
                <div className="pt-2 border-t border-slate-100">
                  <InfoNote text="This notification was generated automatically by the system. No reply is required." />
                </div>

              </div>

              {/* Footer CTA dismiss bar action buttons properly layout */}
              <div className="bg-slate-50/80 px-6 py-4.5 border-t border-slate-200/60 flex items-center justify-end gap-3 select-none">
                <button
                  type="button"
                  onClick={() => setSelectedNotification(null)}
                  className="px-5 py-2 hover:bg-slate-100 text-slate-550 hover:text-slate-900 font-extrabold uppercase tracking-wide rounded-xl text-[10px] transition cursor-pointer"
                >
                  Close Archive
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    const id = selectedNotification.id;
                    setSelectedNotification(null);
                    void markRead(id, true).catch(() => undefined);
                    triggerToast('Logged notification read and archived successfully.');
                  }}
                  className="px-5 py-2.5 bg-brand-navy hover:bg-slate-800 text-white font-extrabold uppercase tracking-wider rounded-xl text-[10px] transition shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                >
                  <CheckCircle className="w-3.5 h-3.5 text-indigo-300" />
                  <span>Mark Resolved</span>
                </button>
              </div>

            </motion.div>
          </div>
        )}
        </AnimatePresence>,
        document.body
      )}

    </div>
  );
};
