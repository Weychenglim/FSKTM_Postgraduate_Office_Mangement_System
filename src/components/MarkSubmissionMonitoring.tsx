/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Calendar, 
  Clock, 
  Hourglass, 
  AlertTriangle, 
  Activity, 
  UserX, 
  Mail, 
  CheckCircle2, 
  Search 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PortalButton, PortalCard, ProgressBar, StatusBadge, StatusDot } from './PortalPrimitives';

interface MarkSubmissionMonitoringProps {
  onViewRecords?: () => void;
}

export const MarkSubmissionMonitoring: React.FC<MarkSubmissionMonitoringProps> = ({ onViewRecords }) => {
  // Clickable state to inspect sub-item details for increased utility
  const [selectedStatusGroup, setSelectedStatusGroup] = useState<'submitted' | 'draft' | 'pending' | 'overdue' | null>(null);

  // Lists of mock lecturers for each category to display when clicking the status boxes
  const statusDetailsList = {
    submitted: [
      { code: 'MCS6001', course: 'Advanced Software Eng.', lecturer: 'Dr. Sarah Lim', student: 'Nurul Huda', date: 'Today, 8:45 AM' },
      { code: 'MCS6002', course: 'Machine Learning Theory', lecturer: 'Prof. Dr. Ahmad', student: 'Fatimah Al-Zahra', date: 'Yesterday' },
      { code: 'MCS6005', course: 'Distributed Systems', lecturer: 'Dr. Adrian Tan', student: 'Tan Wei Jin', date: '25 Dec 2025' }
    ],
    draft: [
      { code: 'MCS6003', course: 'Neural Networks & Deep Learning', lecturer: 'Dr. Ibrahim Ali', student: 'Marcus Thorne', progress: '80%' },
      { code: 'MCS6008', course: 'Advanced Database Core', lecturer: 'Assoc. Prof. Dr. Linda', student: 'Amiruddin Aziz', progress: '50%' }
    ],
    pending: [
      { code: 'MCS6020', course: 'Academic Thesis Defense', lecturer: 'Prof. Dr. Aminah R.', student: 'Zainab Binti Jasni', assigned: '05 Nov 2025' },
      { code: 'MCS6022', course: 'Doctoral Proposal Exam', lecturer: 'Dr. Kevin Wong', student: 'Gregory Hans', assigned: '10 Nov 2025' }
    ],
    overdue: [
      { code: 'MCS6011', course: 'Natural Language Processing', lecturer: 'Prof. Dr. Aminah R.', student: 'Subramaniam A/L Raj', daysOverdue: 3 },
      { code: 'MCS6015', course: 'Information Security System', lecturer: 'Dr. Yusuf Kamal', student: 'Chloe Tan Xuan', daysOverdue: 5 }
    ]
  };

  const ringClassMap = {
    submitted: 'border-emerald-500/30 bg-emerald-50 text-emerald-800',
    draft: 'border-blue-500/30 bg-blue-50 text-blue-800',
    pending: 'border-slate-500/30 bg-slate-50 text-slate-800',
    overdue: 'border-red-500/30 bg-rose-50 text-rose-800'
  };

  return (
    <PortalCard id="monitoring-card" padding="lg">
      <div className="flex justify-between items-center mb-1">
        <h3 className="text-lg font-extrabold text-brand-navy tracking-tight">
          Mark Submission Monitoring
        </h3>
        <StatusBadge tone="brand" icon={Activity}>Live Pulse</StatusBadge>
      </div>
      <p className="text-slate-500 text-xs font-medium mb-6">
        Real-time status of mark entry completion for the active semester.
      </p>

      {/* Hero Semester Details header */}
      <div id="semester-progress-hero" className="p-5 bg-slate-50/80 border border-slate-100 rounded-2xl mb-6">
        <div className="flex justify-between items-start mb-3">
          <div className="flex flex-col">
            <span className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase">Active Semester</span>
            <span className="text-sm font-extrabold text-brand-navy mt-0.5">Sem 1 2025/2026</span>
          </div>

          <div className="flex flex-col text-right">
            <div className="flex items-baseline justify-end gap-1">
              <span className="text-2xl font-extrabold text-brand-navy">32</span>
              <span className="text-xs text-slate-400 font-bold">/ 48 submitted</span>
            </div>
            <span className="text-[9px] font-extrabold text-red-600 tracking-wider mt-1 block uppercase">
              DEADLINE: 10 DEC 2025
            </span>
          </div>
        </div>

        {/* Outer progress bar */}
        <ProgressBar value={32} max={48} tone="brand" trackClassName="h-2.5" />
      </div>

      {/* Grid count matrix dashboard boxes (Interactive status selectors) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        
        {/* Submitted Box */}
        <button
          type="button"
          onClick={() => setSelectedStatusGroup(selectedStatusGroup === 'submitted' ? null : 'submitted')}
          className={`p-3.5 rounded-2xl text-center border transition-all cursor-pointer ${
            selectedStatusGroup === 'submitted'
              ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-100'
              : 'bg-slate-50/50 hover:bg-slate-50 border-slate-100'
          }`}
        >
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Submitted</span>
          <span className="text-xl font-black text-slate-800 tracking-tight block my-1">32</span>
          <StatusBadge tone="success" className="rounded-md px-2 py-0.5 text-[9px]">
            DONE
          </StatusBadge>
        </button>

        {/* Draft Saved Box */}
        <button
          type="button"
          onClick={() => setSelectedStatusGroup(selectedStatusGroup === 'draft' ? null : 'draft')}
          className={`p-3.5 rounded-2xl text-center border transition-all cursor-pointer ${
            selectedStatusGroup === 'draft'
              ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-100'
              : 'bg-slate-50/50 hover:bg-slate-50 border-slate-100'
          }`}
        >
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Draft Saved</span>
          <span className="text-xl font-black text-slate-800 tracking-tight block my-1">6</span>
          <StatusBadge tone="info" className="rounded-md px-2 py-0.5 text-[9px]">
            IN PROGRESS
          </StatusBadge>
        </button>

        {/* Not Started Box */}
        <button
          type="button"
          onClick={() => setSelectedStatusGroup(selectedStatusGroup === 'pending' ? null : 'pending')}
          className={`p-3.5 rounded-2xl text-center border transition-all cursor-pointer ${
            selectedStatusGroup === 'pending'
              ? 'bg-slate-100 border-slate-500 ring-2 ring-slate-200'
              : 'bg-slate-50/50 hover:bg-slate-50 border-slate-100'
          }`}
        >
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Not Started</span>
          <span className="text-xl font-black text-slate-800 tracking-tight block my-1">8</span>
          <StatusBadge tone="neutral" className="rounded-md px-2 py-0.5 text-[9px]">
            PENDING
          </StatusBadge>
        </button>

        {/* Overdue Box */}
        <button
          type="button"
          onClick={() => setSelectedStatusGroup(selectedStatusGroup === 'overdue' ? null : 'overdue')}
          className={`p-3.5 rounded-2xl text-center border transition-all cursor-pointer ${
            selectedStatusGroup === 'overdue'
              ? 'bg-rose-50 border-rose-500 ring-2 ring-rose-100'
              : 'bg-slate-50/50 hover:bg-slate-50 border-slate-100'
          }`}
        >
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Overdue</span>
          <span className="text-xl font-black text-[#dc2626] tracking-tight block my-1">2</span>
          <StatusBadge tone="danger" className="rounded-md px-2 py-0.5 text-[9px]">
            URGENT
          </StatusBadge>
        </button>

      </div>

      {/* Interactive Detail list overlay for the selected status item */}
      <AnimatePresence>
        {selectedStatusGroup && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 p-4 rounded-2xl border border-slate-100 bg-[#f8fafc]/90 text-left overflow-hidden"
          >
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-extrabold uppercase tracking-wide text-slate-700">
                Auditing {selectedStatusGroup.toUpperCase()} tasks ({statusDetailsList[selectedStatusGroup].length} records)
              </span>
              <button 
                onClick={() => setSelectedStatusGroup(null)}
                className="text-[10px] font-bold text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                Clear Filter x
              </button>
            </div>

            <div className="space-y-2.5">
              {statusDetailsList[selectedStatusGroup].map((rec: any, idx: number) => (
                <div key={idx} className="bg-white p-3 rounded-xl border border-slate-100 flex justify-between items-center text-xs">
                  <div>
                    <span className="font-semibold text-slate-800 block">{rec.lecturer}</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">{rec.course} • Student: {rec.student}</span>
                  </div>
                  <div className="text-right">
                    {selectedStatusGroup === 'submitted' && <span className="text-[10px] font-bold text-emerald-600 block">Submitted {rec.date}</span>}
                    {selectedStatusGroup === 'draft' && <span className="text-[10px] font-bold text-blue-600 block">Saved ({rec.progress} done)</span>}
                    {selectedStatusGroup === 'pending' && <span className="text-[10px] font-bold text-slate-500 block">Assigned {rec.assigned}</span>}
                    {selectedStatusGroup === 'overdue' && (
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[10px] font-mono font-extrabold text-[#dc2626] bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
                          {rec.daysOverdue} DAYS OVERDUE
                        </span>
                        <button 
                          onClick={() => alert(`Warning letter emailed to ${rec.lecturer}.`)}
                          className="text-[10px] text-blue-600 font-bold hover:underline flex items-center gap-0.5"
                        >
                          <Mail className="w-3 h-3" /> Remind
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Two columns: Needs Follow-up and Recent Activity */}
      <div id="split-monitoring-columns" className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-100">
        
        {/* Left Column: Needs Follow-up */}
        <div id="column-followup" className="flex flex-col text-left">
          <span className="text-[11px] font-extrabold text-brand-navy tracking-wider uppercase mb-4 block">
            Needs Follow-up
          </span>
          <ul className="space-y-3.5 text-xs text-slate-600 font-medium">
            <li className="flex items-center gap-3">
              <StatusDot tone="danger" />
              <span><strong>2 overdue</strong> mark entries</span>
            </li>
            <li className="flex items-center gap-3">
              <StatusDot tone="neutral" />
              <span><strong>8 tasks</strong> not started</span>
            </li>
            <li className="flex items-center gap-3">
              <StatusDot tone="info" />
              <span><strong>6 drafts</strong> not submitted</span>
            </li>
            <li className="flex items-center gap-2.5 p-3.5 bg-rose-50/60 border border-rose-100 text-rose-800 rounded-xl mt-3">
              <Clock className="w-4 h-4 text-rose-500 shrink-0" />
              <span className="font-extrabold text-xs">
                3 days left before deadline
              </span>
            </li>
          </ul>
        </div>

        {/* Right Column: Recent Activity */}
        <div id="column-recent-activity" className="flex flex-col text-left">
          <span className="text-[11px] font-extrabold text-brand-navy tracking-wider uppercase mb-4 block">
            Recent Activity
          </span>
          <div className="space-y-4">
            {/* Audit Row 1 */}
            <div className="flex gap-3.5">
              <div className="w-7 h-7 bg-indigo-50 border border-indigo-100/50 rounded-lg flex items-center justify-center shrink-0">
                <Clock className="w-3.5 h-3.5 text-indigo-500" />
              </div>
              <div className="flex flex-col">
                <p className="text-xs font-semibold text-slate-700 leading-normal">
                  <strong>Dr. Sarah Lim</strong> submitted marks for <span className="text-brand-navy font-bold">Nurul Huda</span>
                </p>
                <span className="text-[10px] text-slate-400 font-medium mt-0.5">2 mins ago</span>
              </div>
            </div>

            {/* Audit Row 2 */}
            <div className="flex gap-3.5">
              <div className="w-7 h-7 bg-blue-50 border border-blue-100/50 rounded-lg flex items-center justify-center shrink-0">
                <Hourglass className="w-3.5 h-3.5 text-blue-500" />
              </div>
              <div className="flex flex-col">
                <p className="text-xs font-semibold text-slate-700 leading-normal">
                  <strong>Dr. Ibrahim Ali</strong> saved draft marks for <span className="text-brand-navy font-bold">Marcus Thorne</span>
                </p>
                <span className="text-[10px] text-slate-400 font-medium mt-0.5">1 hour ago</span>
              </div>
            </div>

            {/* Audit Row 3 */}
            <div className="flex gap-3.5">
              <div className="w-7 h-7 bg-rose-50 border border-rose-100/50 rounded-lg flex items-center justify-center shrink-0">
                <AlertTriangle className="w-3.5 h-3.5 text-[#dc2626]" />
              </div>
              <div className="flex flex-col">
                <p className="text-xs font-semibold text-slate-700 leading-normal">
                  <strong>Prof. Dr. Aminah R.</strong> has <span className="text-[#dc2626] font-bold">1 overdue task</span>
                </p>
                <span className="text-[10px] text-slate-400 font-medium mt-0.5">Yesterday</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Action Button to request evaluation list excel spreadsheets */}
      <div className="mt-8 pt-4 border-t border-slate-100 flex justify-center">
        <PortalButton
          variant="primary"
          size="lg"
          icon={Search}
          onClick={onViewRecords}
          fullWidth
          className="sm:w-auto"
        >
          View All Mark Records
        </PortalButton>
      </div>

    </PortalCard>
  );
};
