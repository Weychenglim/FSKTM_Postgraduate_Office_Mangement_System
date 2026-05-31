/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Calendar,
  Layers,
  Clock,
  Users,
  FileText,
  Save,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface TimelineEntry {
  id: string;
  event: string;
  category: 'Supervisor Appointment' | 'Panel Appointment' | 'Document Submission' | 'Announcements' | 'Marks & Evaluation';
  startDate: string;
  endDate: string;
  targetRole: ('STUDENT' | 'LECTURER')[];
  status: 'Completed' | 'Active' | 'Deadline' | 'Upcoming';
  description?: string;
}

interface EditTimelineEntryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  entry: TimelineEntry | null;
  onSave: (updatedEntry: TimelineEntry) => void;
}

export const EditTimelineEntryDrawer: React.FC<EditTimelineEntryDrawerProps> = ({
  isOpen,
  onClose,
  entry,
  onSave
}) => {
  const [eventName, setEventName] = useState('');
  const [category, setCategory] = useState<TimelineEntry['category']>('Supervisor Appointment');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [targetRole, setTargetRole] = useState<('STUDENT' | 'LECTURER')[]>([]);
  const [status, setStatus] = useState<TimelineEntry['status']>('Upcoming');
  const [description, setDescription] = useState('');

  // Synchronize when the entry is passed into the drawer
  useEffect(() => {
    if (entry) {
      setEventName(entry.event || '');
      setCategory(entry.category || 'Supervisor Appointment');
      
      // Map display format dates like "01 Oct 2025" into "2025-10-01" to match HTML input types
      setStartDate(convertToInputDate(entry.startDate));
      setEndDate(convertToInputDate(entry.endDate));
      
      setTargetRole(entry.targetRole || []);
      setStatus(entry.status || 'Upcoming');
      setDescription(entry.description || '');
    }
  }, [entry, isOpen]);

  // Helper code to map visual text format dates into HTML date fields
  const convertToInputDate = (dateText: string): string => {
    if (!dateText) return '';
    const parts = dateText.split(' ');
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const monthStr = parts[1].toLowerCase();
      const year = parts[2];
      
      const months: { [key: string]: string } = {
        jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
        jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
      };
      
      const month = months[monthStr.slice(0, 3)] || '10';
      return `${year}-${month}-${day}`;
    }
    return dateText; // Fallback
  };

  // Helper code to map HTML values back into aesthetic user presentation dates
  const formatToDisplayDate = (inputDate: string): string => {
    if (!inputDate) return '';
    const date = new Date(inputDate);
    if (isNaN(date.getTime())) return inputDate;
    
    const day = String(date.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    
    return `${day} ${month} ${year}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventName.trim()) return;

    if (entry) {
      onSave({
        ...entry,
        event: eventName,
        category,
        startDate: formatToDisplayDate(startDate),
        endDate: formatToDisplayDate(endDate),
        targetRole,
        status,
        description
      });
    }
  };

  const toggleRole = (role: 'STUDENT' | 'LECTURER') => {
    if (targetRole.includes(role)) {
      setTargetRole(prev => prev.filter(r => r !== role));
    } else {
      setTargetRole(prev => [...prev, role]);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          id="edit-timeline-entry-drawer" 
          className="fixed inset-0 z-50 flex justify-end font-sans text-xs text-left"
        >
          {/* Dimmed Background Overlay */}
          <motion.div
            id="edit-drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-brand-navy backdrop-blur-sm cursor-pointer"
            onClick={onClose}
          />

          {/* Slide-In Custom Side Panel */}
          <motion.div
            id="edit-drawer-panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 220 }}
            className="relative w-full max-w-md sm:max-w-xl h-full bg-white shadow-sm flex flex-col z-10 border-l border-slate-205"
          >
            {/* Header section with closing element */}
            <div 
              id="edit-drawer-header" 
              className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white shrink-0 select-none"
            >
              <div className="flex items-center gap-2.5">
                <Calendar className="w-5 h-5 text-indigo-500" />
                <h3 className="font-black text-brand-navy text-[15px] tracking-tight">
                  Edit Timeline Entry
                </h3>
              </div>
              
              <button
                id="edit-drawer-close-button"
                onClick={onClose}
                className="w-9 h-9 hover:bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center transition text-slate-400 hover:text-slate-800"
                aria-label="Close edit drawer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Main Form content wrapper with neat spacing limits */}
            <form 
              onSubmit={handleSubmit}
              className="flex-1 flex flex-col h-full overflow-hidden"
            >
              <div 
                id="edit-drawer-body" 
                className="flex-1 overflow-y-auto px-6 py-5 space-y-4 bg-white"
              >
                {/* Context Indicator Alert banner */}
                <div className="bg-[#f8fafc] border border-slate-200 rounded-2xl p-4 space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                    Target Context Info
                  </span>
                  <p className="text-brand-navy font-semibold text-[11px] leading-relaxed">
                    You are updating a postgraduate calendar milestone event for <strong className="font-extrabold text-indigo-650">Sem 1 2025/2026</strong>. Changes reflect instantly to all system modules.
                  </p>
                </div>

                {/* Field 1: Event Name */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider block">
                    Event Name
                  </label>
                  <input
                    type="text"
                    required
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    placeholder="Enter explicit milestone title"
                    className="w-full text-xs font-bold text-slate-800 border border-slate-200 px-3.5 py-2.5 rounded-xl focus:ring-1 focus:ring-slate-900 focus:outline-none transition-all placeholder:text-slate-300"
                  />
                </div>

                {/* Field 2: Category Classification Selection */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider block">
                    Category classification
                  </label>
                  <div className="relative">
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as any)}
                      className="w-full text-xs font-bold text-slate-800 bg-white border border-slate-200 px-3.5 py-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer appearance-none"
                    >
                      <option value="Supervisor Appointment">Supervisor Appointment</option>
                      <option value="Panel Appointment">Panel Appointment</option>
                      <option value="Marks & Evaluation">Marks & Evaluation</option>
                      <option value="Document Submission">Document Submission</option>
                      <option value="Announcements">Announcements</option>
                    </select>
                    <Layers className="w-3.5 h-3.5 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
                  </div>
                </div>

                {/* Field 3: Date Inputs grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider block">
                      Start Date
                    </label>
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full text-xs font-bold text-slate-800 border border-slate-200 px-3.5 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-900 text-left cursor-text"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider block">
                      End Date
                    </label>
                    <input
                      type="date"
                      required
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full text-xs font-bold text-slate-800 border border-slate-200 px-3.5 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-900 text-left cursor-text"
                    />
                  </div>
                </div>

                {/* Field 4: Target Roles multi checkboxes */}
                <div className="space-y-2 pt-1">
                  <label className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider block">
                    Target Roles
                  </label>
                  <div className="flex items-center gap-4 flex-wrap">
                    <button
                      type="button"
                      onClick={() => toggleRole('STUDENT')}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-[10px] font-extrabold uppercase tracking-wider transition ${
                        targetRole.includes('STUDENT')
                          ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                          : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      <div className={`w-3.5 h-3.5 rounded-md border flex items-center justify-center transition-all ${
                        targetRole.includes('STUDENT') ? 'bg-indigo-650 border-indigo-700 text-white' : 'bg-transparent border-slate-300'
                      }`}>
                        {targetRole.includes('STUDENT') && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                      <span>Student</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleRole('LECTURER')}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-[10px] font-extrabold uppercase tracking-wider transition ${
                        targetRole.includes('LECTURER')
                          ? 'bg-slate-100 border-slate-300 text-slate-800'
                          : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      <div className={`w-3.5 h-3.5 rounded-md border flex items-center justify-center transition-all ${
                        targetRole.includes('LECTURER') ? 'bg-slate-700 border-slate-800 text-white' : 'bg-transparent border-slate-300'
                      }`}>
                        {targetRole.includes('LECTURER') && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                      <span>Lecturer</span>
                    </button>
                  </div>
                </div>

                {/* Field 5: Status State Radio dropdown option */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider block">
                    Status State
                  </label>
                  <div className="relative">
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as any)}
                      className="w-full text-xs font-bold text-slate-800 bg-white border border-slate-200 px-3.5 py-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer appearance-none"
                    >
                      <option value="Completed">Completed (Inactive grey theme)</option>
                      <option value="Active">Active (Navy blue theme)</option>
                      <option value="Deadline">Deadline (Urgent warning theme)</option>
                      <option value="Upcoming">Upcoming (Amber waiting theme)</option>
                    </select>
                    <Clock className="w-3.5 h-3.5 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
                  </div>
                </div>

                {/* Field 6: Description or notes field */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider block">
                    Description or Notes
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter specific event instruction notes, requirements or descriptions..."
                    className="w-full text-xs font-medium text-slate-800 border border-slate-200 px-3.5 py-2.5 rounded-xl focus:ring-1 focus:ring-slate-900 focus:outline-none transition-all placeholder:text-slate-300 resize-none leading-relaxed"
                  />
                </div>

              </div>

              {/* Action Buttons Footer section */}
              <div 
                id="edit-drawer-footer"
                className="px-6 py-5.5 border-t border-slate-100 bg-white flex items-center justify-end gap-3 shrink-0"
              >
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-3 border border-slate-300 hover:bg-slate-50 text-slate-700 font-extrabold uppercase text-[10px] tracking-wider rounded-xl transition cursor-pointer shadow-3xs"
                >
                  Cancel
                </button>
                
                <button
                  type="submit"
                  disabled={!eventName.trim() || targetRole.length === 0}
                  className="px-5.5 py-3 bg-brand-navy hover:bg-slate-800 text-white font-extrabold uppercase text-[10px] tracking-wider rounded-xl transition flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
