/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Calendar,
  Layers,
  Check,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PortalButton } from './PortalPrimitives';

interface TimelineEntry {
  id: string;
  event: string;
  category: 'Supervisor Appointment' | 'Panel Appointment' | 'Document Submission' | 'Announcements' | 'Marks & Evaluation' | 'Research Project (P1)' | 'Research Project (P2)';
  startDate: string;
  endDate: string;
  targetRole: ('STUDENT' | 'LECTURER' | 'OFFICE_STAFF' | 'ALL')[];
  status: 'Completed' | 'Active' | 'Deadline' | 'Upcoming';
  description?: string;
}

interface AddTimelineEntryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newEntry: Omit<TimelineEntry, 'id'>) => void;
}

export const AddTimelineEntryDrawer: React.FC<AddTimelineEntryDrawerProps> = ({
  isOpen,
  onClose,
  onSave
}) => {
  const [eventName, setEventName] = useState('');
  const [category, setCategory] = useState<TimelineEntry['category']>('Research Project (P1)');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [targetRole, setTargetRole] = useState<TimelineEntry['targetRole']>(['STUDENT']);
  const [description, setDescription] = useState('');

  // Reset fields on open
  useEffect(() => {
    if (isOpen) {
      setEventName('');
      setCategory('Research Project (P1)');
      setStartDate('2026-03-16');
      setEndDate('2026-03-20');
      setTargetRole(['STUDENT']);
      setDescription('');
    }
  }, [isOpen]);

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

  const deriveStatus = (): TimelineEntry['status'] => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 'Upcoming';
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    if (today < start) return 'Upcoming';
    if (today > end) return 'Completed';
    if (start.getTime() === end.getTime()) return 'Deadline';
    return 'Active';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventName.trim() || targetRole.length === 0) return;

    onSave({
      event: eventName,
      category,
      startDate: formatToDisplayDate(startDate),
      endDate: formatToDisplayDate(endDate),
      targetRole,
      status: deriveStatus(),
      description
    });
  };

  const toggleRole = (role: TimelineEntry['targetRole'][number]) => {
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
          id="add-timeline-entry-drawer" 
          className="fixed inset-0 z-50 flex justify-end font-sans text-xs text-left"
        >
          {/* Dimmed Background Overlay */}
          <motion.div
            id="add-drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-brand-navy backdrop-blur-sm cursor-pointer"
            onClick={onClose}
          />

          {/* Slide-In Custom Side Panel */}
          <motion.div
            id="add-drawer-panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 220 }}
            className="drawer-panel"
          >
            {/* Header section with closing element */}
            <div 
              id="add-drawer-header" 
              className="drawer-header"
            >
              <div className="flex items-center gap-2.5">
                <Plus className="w-5 h-5 text-indigo-500 stroke-[2.5]" />
                <h3 className="font-black text-brand-navy text-[15px] tracking-tight">
                  Add Timeline Entry
                </h3>
              </div>
              
              <button
                id="add-drawer-close-button"
                onClick={onClose}
                className="icon-button w-9 h-9"
                aria-label="Close add drawer"
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
                id="add-drawer-body" 
                className="drawer-body"
              >
                {/* Context Indicator Alert banner */}
                <div className="bg-[#f8fafc] border border-slate-200 rounded-2xl p-4 space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                    Postgraduate Milestone Info
                  </span>
                  <p className="text-brand-navy font-semibold text-[11px] leading-relaxed">
                    Create a new calendar session milestone for <strong className="font-extrabold text-indigo-650">Sem 1 2025/2026</strong>. Please confirm start & end ranges.
                  </p>
                </div>

                {/* Field 1: Event Name */}
                <div className="space-y-1.5">
                  <label className="form-label block">
                    Event Name
                  </label>
                  <input
                    type="text"
                    required
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    placeholder="e.g. Panel Recommendation Period"
                    className="form-control form-control-sm"
                  />
                </div>

                {/* Field 2: Category Classification Selection */}
                <div className="space-y-1.5">
                  <label className="form-label block">
                    Category classification
                  </label>
                  <div className="relative">
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as any)}
                      className="form-control form-control-sm appearance-none pr-9 cursor-pointer"
                    >
                      <option value="Research Project (P1)">Research Project (P1)</option>
                      <option value="Research Project (P2)">Research Project (P2)</option>
                    </select>
                    <Layers className="w-3.5 h-3.5 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
                  </div>
                </div>

                {/* Field 3: Date Inputs grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="form-label block">
                      Start Date
                    </label>
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="form-control form-control-sm cursor-text"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="form-label block">
                      End Date
                    </label>
                    <input
                      type="date"
                      required
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="form-control form-control-sm cursor-text"
                    />
                  </div>
                </div>

                {/* Field 4: Target Roles multi checkboxes */}
                <div className="space-y-2 pt-1">
                  <label className="form-label block">
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

                    <button
                      type="button"
                      onClick={() => toggleRole('OFFICE_STAFF')}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-[10px] font-extrabold uppercase tracking-wider transition ${
                        targetRole.includes('OFFICE_STAFF')
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                          : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      <div className={`w-3.5 h-3.5 rounded-md border flex items-center justify-center transition-all ${
                        targetRole.includes('OFFICE_STAFF') ? 'bg-emerald-600 border-emerald-700 text-white' : 'bg-transparent border-slate-300'
                      }`}>
                        {targetRole.includes('OFFICE_STAFF') && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                      <span>Office Staff</span>
                    </button>
                  </div>
                </div>

                {/* Field 6: Description or notes field */}
                <div className="space-y-1.5">
                  <label className="form-label block">
                    Description or Notes
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter specific event instruction notes..."
                    className="form-control form-control-sm resize-none leading-relaxed"
                  />
                </div>

              </div>

              {/* Action Buttons Footer section */}
              <div 
                id="add-drawer-footer"
                className="drawer-footer"
              >
                <PortalButton
                  type="button"
                  onClick={onClose}
                  variant="secondary"
                  size="md"
                >
                  Cancel
                </PortalButton>
                
                <PortalButton
                  type="submit"
                  disabled={!eventName.trim() || targetRole.length === 0}
                  variant="primary"
                  size="md"
                  icon={Plus}
                >
                  Add Entry
                </PortalButton>
              </div>
            </form>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
