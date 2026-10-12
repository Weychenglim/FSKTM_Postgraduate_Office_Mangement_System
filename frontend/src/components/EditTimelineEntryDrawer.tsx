import { RecordPage } from './RecordPage';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Calendar,
  Layers,
  Save,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PortalButton } from './PortalPrimitives';

interface TimelineEntry {
  id: string;
  event: string;
  category: 'Supervisor Appointment' | 'Panel Appointment' | 'Document Submission' | 'Announcements' | 'Marks & Evaluation' | 'Research Project (P1)' | 'Research Project (P2)';
  startDate: string;
  endDate: string;
  targetRole: ('STUDENT' | 'LECTURER' | 'OFFICE_STAFF')[];
  description?: string;
}

interface EditTimelineEntryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  entry: TimelineEntry | null;
  onSave: (updatedEntry: TimelineEntry) => void;
  timelineLabel: string;
  busy?: boolean;
}

export const EditTimelineEntryDrawer: React.FC<EditTimelineEntryDrawerProps> = ({
  isOpen,
  onClose,
  entry,
  onSave,
  timelineLabel,
  busy = false,
}) => {
  const [eventName, setEventName] = useState('');
  const [category, setCategory] = useState<TimelineEntry['category']>('Research Project (P1)');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [targetRole, setTargetRole] = useState<TimelineEntry['targetRole']>([]);
  const [description, setDescription] = useState('');

  // Synchronize when the entry is passed into the drawer
  useEffect(() => {
    if (entry) {
      setEventName(entry.event || '');
      setCategory(entry.category || 'Research Project (P1)');
      
      // Map display format dates like "01 Oct 2025" into "2025-10-01" to match HTML input types
      setStartDate(convertToInputDate(entry.startDate));
      setEndDate(convertToInputDate(entry.endDate));
      
      setTargetRole(entry.targetRole || []);
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
        description
      });
    }
  };

  const toggleRole = (role: TimelineEntry['targetRole'][number]) => {
    if (targetRole.includes(role)) {
      setTargetRole(prev => prev.filter(r => r !== role));
    } else {
      setTargetRole(prev => [...prev, role]);
    }
  };

  if (!isOpen || !entry) return null;
  return <RecordPage title="Edit Timeline Entry" backLabel="Back to Timeline Management" onBack={onClose} pageKey="timeline-edit" dirty={eventName !== entry.event || category !== entry.category || startDate !== convertToInputDate(entry.startDate) || endDate !== convertToInputDate(entry.endDate) || description !== (entry.description ?? '') || targetRole.join() !== entry.targetRole.join()} busy={busy}>{requestBack => <form
              onSubmit={handleSubmit}
              className="space-y-5 rounded-2xl border border-slate-200 bg-white"
            >
              <div 
                id="edit-drawer-body" 
                className="drawer-body"
              >
                {/* Context Indicator Alert banner */}
                <div className="bg-[#f8fafc] border border-slate-200 rounded-2xl p-4 space-y-1">
                  <span className="card-label block">
                    Target Context Info
                  </span>
                  <p className="card-description">
                    You are updating a milestone in <strong className="card-value text-indigo-650">{timelineLabel}</strong>. Saved changes are persisted immediately.
                  </p>
                </div>

                {/* Field 1: Event title */}
                <div className="space-y-1.5">
                  <label className="form-label block">
                    Title
                  </label>
                  <input
                    type="text"
                    required
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    placeholder="Enter explicit milestone title"
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
                    Detail / Description
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter specific event instruction notes, requirements or descriptions..."
                    className="form-control form-control-sm resize-none leading-relaxed"
                  />
                </div>

              </div>

              {/* Action Buttons Footer section */}
              <div 
                id="edit-drawer-footer"
                className="drawer-footer"
              >
                <PortalButton
                  type="button"
                  onClick={requestBack}
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
                  icon={Save}
                >
                  Save Changes
                </PortalButton>
              </div>
            </form>}</RecordPage>;
};
