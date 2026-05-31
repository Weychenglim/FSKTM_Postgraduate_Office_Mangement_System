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
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// ==================== DEDICATED ATOMIC UI PATTERNS ====================

interface PriorityBadgeProps {
  level: string;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ level }) => {
  return (
    <span className="inline-flex items-center px-3.5 py-1.5 bg-rose-50 text-rose-600 border border-rose-100 rounded-full text-[10px] font-black uppercase tracking-wider select-none">
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

// ==================== NOTIFICATION CORE DATA ====================

interface NotificationItem {
  id: string;
  title: string;
  service: string;
  description: string;
  timeAgo: string;
  priority: 'high' | 'medium' | 'normal';
  isUnread: boolean;
  isAnnouncement: boolean;
  reference: string;
  recipient: string;
  detailedMessage?: string;
  moduleLabel?: string;
}

interface NotificationsAnnouncementsProps {
  onBack: () => void;
}

export const NotificationsAnnouncements: React.FC<NotificationsAnnouncementsProps> = ({ onBack }) => {
  // 1. Initial State Seed (Preset values designed to match reference layout and copy exactly)
  const [items, setItems] = useState<NotificationItem[]>([
    {
      id: 'notif-1',
      title: 'New Supervisor Request Submitted',
      service: 'System Sync Service',
      description: 'A new supervisor preference request has been submitted for Application #4421. The student has selected Dr. Sarah Chen...',
      detailedMessage: 'A new supervisor preference request has been submitted for Application #4421. The student has selected Dr. Sarah Chen as their primary choice.\n\nPlease review the attached academic credentials and approve the allocation within 48 hours to comply with the department SLAs.',
      timeAgo: '14 Nov 2023 — 09:42 AM',
      priority: 'high',
      isUnread: true,
      isAnnouncement: false,
      reference: 'APP-4421',
      recipient: 'Office Staff — Wey Cheng',
      moduleLabel: 'Supervisor Appointment'
    },
    {
      id: 'notif-2',
      title: 'Thesis Proposal Approval Notice',
      service: 'Academic Office',
      description: 'The thesis proposal submitted by candidate #9023 has been accepted by the review committee panel.',
      detailedMessage: 'The thesis proposal submitted by candidate #9023 has been officially verified and accepted by the review committee panel for Session 1 2024/2025. Please finalize the documentation logs inside the master schema.',
      timeAgo: '13 Nov 2023 — 11:15 AM',
      priority: 'medium',
      isUnread: true,
      isAnnouncement: false,
      reference: 'THESIS-9023',
      recipient: 'Office Staff — Wey Cheng',
      moduleLabel: 'Supervisor Appointment'
    },
    {
      id: 'notif-3',
      title: 'System Maintenance Window Scheduled',
      service: 'Database Manager',
      description: 'Filing repositories of the Postgraduate center will be temporarily offline for infrastructure redundancy updates.',
      detailedMessage: 'Filing repositories of the Postgraduate center will be temporarily offline for infrastructure redundancy updates from 02:00 AM to 05:00 AM. Access may be restricted during this time.',
      timeAgo: '12 Nov 2023 — 03:00 PM',
      priority: 'normal',
      isUnread: false,
      isAnnouncement: true,
      reference: 'SYS-MNT-92',
      recipient: 'All Staff Members',
      moduleLabel: 'General Notification'
    },
    {
      id: 'notif-4',
      title: 'Google Sheets Calendar Sync Complete',
      service: 'System Sync Service',
      description: 'Synchronization of candidate enrollment records from UM registrar database completed under token #2ECA.',
      detailedMessage: 'Synchronization of candidate enrollment records from UM registrar database completed under token #2ECA. All schedules are updated.',
      timeAgo: '11 Nov 2023 — 08:30 AM',
      priority: 'normal',
      isUnread: false,
      isAnnouncement: false,
      reference: 'SYNC-2ECA',
      recipient: 'Office Staff — Wey Cheng',
      moduleLabel: 'System Sync Logs'
    }
  ]);

  // Interactive dialog visibility states
  const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const handleMarkAllRead = () => {
    setItems(prev => prev.map(item => ({ ...item, isUnread: false })));
    triggerToast('All notifications marked as read.');
  };

  const handleToggleReadState = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Stop row click trigger
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const nextState = !item.isUnread;
        triggerToast(`Marked notification as ${nextState ? 'unread' : 'read'}.`);
        return { ...item, isUnread: nextState };
      }
      return item;
    }));
  };

  // Filtered computed list matches
  const filteredNotifications = items.filter(item => 
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.service.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div id="notifications-announcements-root" className="font-sans text-brand-navy text-xs pb-16 animate-fade-in relative min-h-[750px]">
      
      {/* Toast notifications */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-20 right-8 z-[120] bg-brand-navy text-white p-4 rounded-xl shadow-sm flex items-center gap-2.5 border border-white/10 font-bold"
          >
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-[11px] tracking-wide">{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER CONTROLS (Always Visible) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 text-left select-none">
        <div>
          <button 
            onClick={onBack}
            className="back-link group mb-3"
          >
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Dashboard</span>
          </button>
          
          <h1 className="page-title">
            My Notifications & Announcements
          </h1>
        </div>

        {/* Global check mark read button */}
        <button
          type="button"
          onClick={handleMarkAllRead}
          className="px-5 py-2.5 bg-[#001f3f] hover:bg-slate-850 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-xs transition cursor-pointer self-start md:self-auto"
        >
          Mark All as Read
        </button>
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
              placeholder="Search notifications, announcements..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#f8fafc] border border-slate-205 text-xs font-bold text-slate-700 pl-10 pr-4 py-2.5 rounded-xl placeholder:text-slate-450 outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-all"
            />
          </div>
          
          <div className="text-[10px] text-slate-400 font-bold shrink-0">
            Total {filteredNotifications.length} alerts
          </div>
        </div>

        {/* LIST FEED PORTLET OF ITEMS */}
        <div className="space-y-3.5">
          {filteredNotifications.map((it) => {
            const isHigh = it.priority === 'high';
            const isAnn = it.isAnnouncement;
            return (
              <button
                key={it.id}
                type="button"
                onClick={() => setSelectedNotification(it)}
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
                      <span className="w-2 h-2 rounded-full bg-blue-600 inline-block shrink-0" />
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
                  <PriorityBadge level="High Priority" />

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
                    <p>
                      A new supervisor preference request has been submitted for Application #4421. The student has selected Dr. Sarah Chen as their primary choice.
                    </p>
                    <p>
                      Please review the attached academic credentials and approve the allocation within 48 hours to comply with the department SLAs.
                    </p>
                  </div>
                </div>

                {/* Document Attachments Panel */}
                <div className="space-y-2.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    Attached Documents
                  </span>

                  {/* High Fidelity PDF Card with Disabled Open Letter button */}
                  <AttachmentCard 
                    name="Supervisor Confirmation Letter" 
                    meta={`Generated on ${selectedNotification.timeAgo.split(' — ')[0]} — PDF Format`}
                    disabled={true} // As requested to match screenshot exactly
                  />
                </div>

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
                    setItems(prev => prev.map(item => {
                      if (item.id === selectedNotification.id) {
                        return { ...item, isUnread: false };
                      }
                      return item;
                    }));
                    setSelectedNotification(null);
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
