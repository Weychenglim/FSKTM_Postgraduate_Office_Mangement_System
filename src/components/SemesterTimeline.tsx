/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Calendar, ChevronDown, Check, AlertCircle } from 'lucide-react';

interface SemesterTimelineProps {
  onTimelineUpdate?: (msg: string) => void;
}

export const SemesterTimeline: React.FC<SemesterTimelineProps> = ({ onTimelineUpdate }) => {
  const [activeTab, setActiveTab] = useState<'MONTH' | 'QUARTER' | 'YEAR'>('QUARTER');

  const triggerToast = (msg: string) => {
    if (onTimelineUpdate) {
      onTimelineUpdate(msg);
    }
  };

  return (
    <div
      id="semester-master-schedule-timeline-container"
      className="bg-white border border-[#e2e8f0] rounded-2xl p-6 shadow-xs text-left font-sans space-y-6"
    >
      {/* Top row with Title and Month/Quarter/Year switch Toggles */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h3 id="semester-master-schedule-header" className="text-sm font-black text-[#0c1424]">
          Semester Master Schedule
        </h3>

        {/* View tab selection */}
        <div className="bg-[#f1f5f9] p-1 rounded-xl flex items-center border border-slate-100 select-none">
          {(['MONTH', 'QUARTER', 'YEAR'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => {
                setActiveTab(tab);
                triggerToast(`Switched view timeline perspective to ${tab}`);
              }}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-extrabold tracking-wider transition-all cursor-pointer ${
                activeTab === tab
                  ? 'bg-[#0c1424] text-white shadow-3xs'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-250/30'
              }`}
            >
              {tab === 'QUARTER' ? 'QUARTER' : tab === 'MONTH' ? 'MONTH' : 'YEAR'}
            </button>
          ))}
        </div>
      </div>

      {/* Grid view wrapper */}
      <div className="overflow-x-auto pt-2">
        <div className="min-w-[720px] w-full text-left space-y-0.5 border border-[#e2e8f0] rounded-xl overflow-hidden">
          
          {/* Header Row: Column month titles */}
          <div className="grid grid-cols-12 bg-slate-50/50 border-b border-[#e2e8f0] py-2 text-center select-none">
            {/* Header Column 1: Labels column spacer */}
            <div className="col-span-3 text-[10px] font-extrabold text-transparent uppercase tracking-wider text-left pl-4">
              PROCESS ROW TYPE
            </div>
            {/* OCTOBER Column */}
            <div className="col-span-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest py-1 border-r border-[#e2e8f0]">
              OCTOBER
            </div>
            {/* NOVEMBER Column */}
            <div className="col-span-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest py-1 border-r border-[#e2e8f0]">
              NOVEMBER
            </div>
            {/* DECEMBER Column */}
            <div className="col-span-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest py-1">
              DECEMBER
            </div>
          </div>

          {/* Table Timeline Row 1: Supervisor Appointment */}
          <div className="grid grid-cols-12 items-center min-h-[66px] border-b border-[#e2e8f0] hover:bg-slate-50/20 transition-all">
            <div className="col-span-3 py-3 px-4 flex items-center gap-2.5 text-left">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-[11px] font-bold text-[#0c1424] tracking-wide">
                Supervisor Appointment
              </span>
            </div>
            <div className="col-span-9 h-full grid grid-cols-9 relative items-center px-4">
              {/* Custom Timeline visual block representing 'Request Period' with indicator pin */}
              <div 
                className="col-span-3 bg-slate-200 text-slate-650 rounded-lg text-[9px] font-black tracking-wider uppercase py-2 px-3 flex items-center justify-between border border-slate-350/20 transition-all hover:bg-slate-300 shadow-3xs cursor-pointer select-none"
                onClick={() => triggerToast('Supervisor Request Period: 01 Oct - 15 Oct (Completed)')}
              >
                <span>REQUEST PERIOD (COMPLETED)</span>
              </div>
              
              {/* Vertical pin representation at the border of Oct/Nov */}
              <div className="absolute left-[33.3%] top-0 bottom-0 flex flex-col items-center z-10 pointers-events-none">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-xs border border-white" />
                <div className="w-0.5 flex-1 bg-amber-400/80" />
              </div>
            </div>
          </div>

          {/* Table Timeline Row 2: Panel Appointment */}
          <div className="grid grid-cols-12 items-center min-h-[66px] border-b border-[#e2e8f0] hover:bg-slate-50/20 transition-all">
            <div className="col-span-3 py-3 px-4 flex items-center gap-2.5 text-left">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-[11px] font-bold text-[#0c1424] tracking-wide">
                Panel Appointment
              </span>
            </div>
            <div className="col-span-9 h-full grid grid-cols-9 items-center gap-3 px-4">
              {/* Panel active bar */}
              <div 
                className="col-start-4 col-span-3 bg-[#0c1424] text-white rounded-lg text-[9px] font-black tracking-wider uppercase py-2 px-4 text-center transition-all hover:bg-slate-800 shadow-3xs cursor-pointer select-none"
                onClick={() => triggerToast('Panel Recommendation Period: 16 Oct - 30 Oct (Active)')}
              >
                <span>ACTIVE: RECOMMENDATION PERIOD</span>
              </div>
              {/* Upcoming schedule block */}
              <div 
                className="col-start-7 col-span-2 bg-slate-100 text-slate-500 rounded-lg text-[9px] font-bold tracking-wider uppercase py-2 px-1 text-center transition-all hover:bg-slate-150 border border-slate-200/50 shadow-3xs cursor-pointer select-none"
                onClick={() => triggerToast('Upcoming Allocation Adjustments Scheduled')}
              >
                <span>UPCOMING</span>
              </div>
            </div>
          </div>

          {/* Table Timeline Row 3: Marks & Evaluation */}
          <div className="grid grid-cols-12 items-center min-h-[66px] border-b border-[#e2e8f0] hover:bg-slate-50/20 transition-all">
            <div className="col-span-3 py-3 px-4 flex items-center gap-2.5 text-left">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-[11px] font-bold text-[#0c1424] tracking-wide">
                Marks & Evaluation
              </span>
            </div>
            <div className="col-span-9 h-full grid grid-cols-9 relative items-center px-4">
              
              {/* Vertical evaluation release pin */}
              <div className="absolute left-[66.6%] top-0 bottom-0 flex flex-col items-center z-10 pointer-events-none">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-600 shadow-xs border border-white" />
                <div className="w-0.5 flex-1 bg-blue-500/80" />
              </div>

              {/* Mark Entry Period slider bar (Dec timeline layout matching raw preview image) */}
              <div className="col-start-7 col-span-2 relative">
                <div 
                  className="bg-slate-100 text-slate-600 rounded-lg text-[9px] font-black tracking-wider uppercase py-2 px-2 text-center border border-slate-200 hover:bg-slate-150 transition-all cursor-pointer select-none shadow-3xs"
                  onClick={() => triggerToast('Mark Entry Period: 01 Dec - 10 Dec (Upcoming)')}
                >
                  <span>MARK ENTRY</span>
                </div>
                
                {/* Red deadline indicator line at the edge of the entry period */}
                <div className="absolute -right-1 top-0 bottom-0 w-0.5 bg-red-650 bg-red-500 z-10" />
              </div>
            </div>
          </div>

          {/* Table Timeline Row 4: Document Submission */}
          <div className="grid grid-cols-12 items-center min-h-[66px] border-b border-[#e2e8f0] hover:bg-slate-50/20 transition-all">
            <div className="col-span-3 py-3 px-4 flex items-center gap-2.5 text-left">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-[11px] font-bold text-[#0c1424] tracking-wide">
                Document Submission
              </span>
            </div>
            <div className="col-span-9 h-full grid grid-cols-9 items-center px-4">
              {/* Proposal Submission layout deadline box */}
              <div 
                className="col-start-4 col-span-2 bg-amber-50 text-amber-700 rounded-lg text-[9px] font-black tracking-wider uppercase py-2 px-2 text-center border border-[#fed7aa] transition-all hover:bg-amber-100 shadow-3xs cursor-pointer select-none"
                onClick={() => triggerToast('Proposal Due: 18 Oct (Deadline)')}
              >
                <span>PROPOSAL DUE</span>
              </div>
            </div>
          </div>

          {/* Table Timeline Row 5: Announcements */}
          <div className="grid grid-cols-12 items-center min-h-[66px] hover:bg-slate-50/20 transition-all">
            <div className="col-span-3 py-3 px-4 flex items-center gap-2.5 text-left">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-[11px] font-bold text-[#0c1424] tracking-wide">
                Announcements
              </span>
            </div>
            <div className="col-span-9 h-full grid grid-cols-9 items-center px-4">
              {/* Schedule release block */}
              <div 
                className="col-start-8 col-span-2 bg-slate-100 text-slate-605 text-slate-500 rounded-lg text-[9px] font-bold tracking-wider uppercase py-2 px-2 text-center border border-slate-200 transition-all hover:bg-slate-150 shadow-3xs cursor-pointer select-none"
                onClick={() => triggerToast('Final Release Announcement: Pending mark audit checks.')}
              >
                <span>FINAL RELEASE</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
