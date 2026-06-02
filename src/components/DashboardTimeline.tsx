/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { TimelineBar } from './TimelineBar';
import { Calendar, ChevronDown, Sliders, Info, ListTodo } from 'lucide-react';
import { PortalButton, SegmentedControl, StatusDot } from './PortalPrimitives';

interface DashboardTimelineProps {
  onTimelineUpdate?: (message: string) => void;
  onManageTimeline?: () => void;
  showManageTimeline?: boolean;
}

export const DashboardTimeline: React.FC<DashboardTimelineProps> = ({
  onTimelineUpdate,
  onManageTimeline,
  showManageTimeline = true
}) => {
  const [activeTab, setActiveTab] = useState<'MONTH' | 'QUARTER' | 'YEAR'>('QUARTER');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedSemester, setSelectedSemester] = useState('Sem 1 2025/2026');

  const triggerToast = (msg: string) => {
    if (onTimelineUpdate) {
      onTimelineUpdate(msg);
    }
  };

  return (
    <div
      id="dashboard-semester-timeline-container"
      className="bg-white border border-[#e2e8f0] rounded-2xl p-6 shadow-sm text-left font-sans space-y-6"
    >
      {/* Timeline Controls Top bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#f1f5f9] pb-4">
        {/* Title and metadata info block */}
        <div id="timeline-title-meta" className="space-y-1 text-left">
          <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-widest leading-none">
            Semester Timeline
          </h3>
          <span className="text-lg font-black text-brand-navy block mt-1 tracking-tight">
            {selectedSemester}
          </span>
          <span className="text-[10px] text-slate-400 font-bold block">
            Active • Updated 20 Nov 2025
          </span>
        </div>

        {/* Action Toggle buttons */}
        <div className="flex items-center flex-wrap gap-3">
          <SegmentedControl
            options={['MONTH', 'QUARTER', 'YEAR'] as const}
            value={activeTab}
            onChange={(tab) => {
              setActiveTab(tab);
              triggerToast(`Switched view timeline perspective to ${tab}`);
            }}
          />

          {showManageTimeline && (
            <div className="relative">
              <PortalButton
                onClick={() => {
                  if (onManageTimeline) {
                    onManageTimeline();
                  } else {
                    setIsDropdownOpen(!isDropdownOpen);
                  }
                }}
                variant="primary"
                size="md"
                icon={ChevronDown}
                iconPosition="right"
              >
                Manage Timeline
              </PortalButton>

              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-205 rounded-2xl shadow-sm p-2 z-30 font-sans text-xs">
                  <button
                    onClick={() => {
                      setSelectedSemester('Sem 1 2025/2026');
                      setIsDropdownOpen(false);
                      triggerToast('Configured Active Semester: Sem 1 2025/2026');
                    }}
                    className="w-full text-left p-2.5 hover:bg-slate-50 rounded-lg font-bold text-slate-805"
                  >
                    Sem 1 2025/2026
                  </button>
                  <button
                    onClick={() => {
                      setSelectedSemester('Sem 2 2025/2026');
                      setIsDropdownOpen(false);
                      triggerToast('Configured Active Semester: Sem 2 2025/2026');
                    }}
                    className="w-full text-left p-2.5 hover:bg-slate-50 rounded-lg font-bold text-slate-505"
                  >
                    Sem 2 2025/2026
                  </button>
                  <div className="h-px bg-slate-100 my-1" />
                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      triggerToast('Opening Advanced Timeline Settings...');
                    }}
                    className="w-full text-left p-2.5 hover:bg-slate-50 rounded-lg font-bold text-indigo-600 flex items-center gap-2"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Advanced Layout Editor</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Grid Timeline Scheduler Board */}
      <div className="overflow-x-auto">
        <div className="min-w-[680px] w-full text-left space-y-4">
          {/* Horizontal Headers: Three Months Columns header block */}
          <div className="grid grid-cols-12 gap-2 text-center select-none pt-2">
            {/* Header Column 1: Month labels */}
            <div className="col-span-3 text-[10px] font-extrabold text-transparent uppercase tracking-wider text-left pl-2">
              PROCESS TYPE
            </div>
            {/* Month: OCTOBER */}
            <div className="col-span-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest py-1 border-r border-[#f1f5f9] last:border-0">
              OCTOBER
            </div>
            {/* Month: NOVEMBER */}
            <div className="col-span-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest py-1 border-r border-[#f1f5f9] last:border-0">
              NOVEMBER
            </div>
            {/* Month: DECEMBER */}
            <div className="col-span-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest py-1">
              DECEMBER
            </div>
          </div>

          {/* Timeline Process List Rows */}
          <div className="divide-y divide-[#efecf6]/10 divide-slate-100 space-y-5">
            {/* 1. Supervisor Appointment Row */}
            <div className="grid grid-cols-12 items-center gap-2 pt-4">
              <div className="col-span-3 flex items-center gap-2 text-left pl-2">
                <Calendar className="w-4 h-4 text-indigo-500 shrink-0" />
                <span className="text-[11px] font-black text-brand-navy tracking-wide">
                  Supervisor Appointment
                </span>
              </div>
              <div className="col-span-9 grid grid-cols-9 gap-2">
                <TimelineBar
                  label="Supervisor Request Period"
                  gridStart={1}
                  gridSpan={4}  // Occupies first half of October and part of Nov representation
                  status="Upcoming"
                  onClick={() => triggerToast("Supervisor Request window loaded: 01 Oct - 25 Oct")}
                />
              </div>
            </div>

            {/* 2. Panel Appointment Row */}
            <div className="grid grid-cols-12 items-center gap-2 pt-4">
              <div className="col-span-3 flex items-center gap-2 text-left pl-2">
                <Calendar className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="text-[11px] font-black text-brand-navy tracking-wide">
                  Panel Appointment
                </span>
              </div>
              <div className="col-span-9 grid grid-cols-9 gap-2">
                <TimelineBar
                  label="Panel Recommendation Period"
                  gridStart={4}
                  gridSpan={3}  // Middle columns representing Nov focus
                  status="Active"
                  onClick={() => triggerToast("Panel Recommendation window active: 10 Nov - 28 Nov")}
                />
              </div>
            </div>

            {/* 3. Marks & Evaluation Row */}
            <div className="grid grid-cols-12 items-center gap-2 pt-4">
              <div className="col-span-3 flex items-center gap-2 text-left pl-2">
                <Calendar className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="text-[11px] font-black text-brand-navy tracking-wide">
                  Marks & Evaluation
                </span>
              </div>
              <div className="col-span-9 grid grid-cols-9 gap-2 items-center">
                <TimelineBar
                  label="Mark Entry"
                  gridStart={7}
                  gridSpan={1}  // Early Dec
                  status="Upcoming"
                  onClick={() => triggerToast("Mark Entry: 01 Dec - 10 Dec")}
                  className="relative"
                />
                <TimelineBar
                  label="Evaluation Deadline"
                  gridStart={8}
                  gridSpan={2}  // Mid Dec
                  status="Deadline"
                  onClick={() => triggerToast("Evaluation Final Grading Cut-off: 15 Dec - 20 Dec")}
                  className="font-black border-[#fed7aa] bg-[#ffedd5] text-[#c2410c]"
                />
              </div>
            </div>

            {/* 4. Document Submission Row */}
            <div className="grid grid-cols-12 items-center gap-2 pt-4">
              <div className="col-span-3 flex items-center gap-2 text-left pl-2">
                <Calendar className="w-4 h-4 text-purple-500 shrink-0" />
                <span className="text-[11px] font-black text-brand-navy tracking-wide">
                  Document Submission
                </span>
              </div>
              <div className="col-span-9 grid grid-cols-9 gap-2 items-center">
                <TimelineBar
                  label="Proposal Due"
                  gridStart={2}
                  gridSpan={2}
                  status="Deadline"
                  onClick={() => triggerToast("Proposal Submission Deadline: 18 Oct")}
                />
                <TimelineBar
                  label="Final Submission"
                  gridStart={8}
                  gridSpan={2}
                  status="Upcoming"
                  onClick={() => triggerToast("Final Thesis Report Submission: 22 Dec")}
                />
              </div>
            </div>

            {/* 5. Announcements / Release Row */}
            <div className="grid grid-cols-12 items-center gap-2 pt-4">
              <div className="col-span-3 flex items-center gap-2 text-left pl-2">
                <Calendar className="w-4 h-4 text-blue-500 shrink-0" />
                <span className="text-[11px] font-black text-brand-navy tracking-wide">
                  Announcements / Release
                </span>
              </div>
              <div className="col-span-9 grid grid-cols-9 gap-2">
                <TimelineBar
                  label="Schedule Release"
                  gridStart={7}
                  gridSpan={3}
                  status="Upcoming"
                  onClick={() => triggerToast("Release schedule is pending active rubric completion checks.")}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Legend and Navigation Foot bottom bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-[#f1f5f9] text-[10px] select-none text-slate-400">
        {/* Color representation bullets */}
        <div className="flex items-center flex-wrap gap-5">
          <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider">
            <StatusDot tone="neutral" className="w-2.5 h-2.5 bg-slate-200 border border-slate-300/40" />
            <span>Completed</span>
          </div>

          <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider">
            <StatusDot tone="brand" className="w-2.5 h-2.5 bg-brand-navy" />
            <span>Active</span>
          </div>

          <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider">
            <StatusDot tone="neutral" className="w-2.5 h-2.5 bg-slate-100 border border-slate-200" />
            <span>Upcoming</span>
          </div>

          <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider">
            <StatusDot tone="warning" className="w-2.5 h-2.5 bg-orange-100 border border-orange-200" />
            <span className="text-[#c2410c] font-black">Deadline</span>
          </div>
        </div>

        {/* View Full Timeline Link */}
        <PortalButton
          onClick={() => triggerToast('Navigating to standard PDF semester calendar release...')}
          variant="ghost"
          size="sm"
          className="text-blue-600 hover:text-blue-700"
        >
          View Full Timeline &gt;
        </PortalButton>
      </div>
    </div>
  );
};
