/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ActiveSemesterTimeline } from '../types';
import { ErrorState, LoadingState } from './StateViews';
import { TimelineCalendar } from './TimelineCalendar';

interface SemesterTimelineProps {
  timeline: ActiveSemesterTimeline | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

export const SemesterTimeline: React.FC<SemesterTimelineProps> = ({ timeline, loading, error, onRetry }) => {
  return (
    <div
      id="semester-master-schedule-timeline-container"
      className="bg-white border border-[#e2e8f0] rounded-2xl p-6 shadow-xs text-left font-sans space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h3 id="semester-master-schedule-header" className="text-sm font-black text-brand-navy">
            Semester Master Schedule
          </h3>
          <p className="text-[11px] font-semibold text-slate-500 mt-1">
            Manage the selected semester timeline by project phase.
          </p>
        </div>
        {!loading && !error && timeline?.available && (
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            {timeline.semester} {timeline.session}
          </span>
        )}
      </div>

      {loading ? (
        <LoadingState message="Loading semester master schedule..." />
      ) : error ? (
        <ErrorState message={error} onRetry={onRetry} />
      ) : !timeline?.available ? (
        <div className="rounded-2xl border border-dashed border-slate-250 bg-slate-50/60 px-5 py-8 text-center">
          <p className="text-sm font-black text-brand-navy">
            {timeline?.message || 'No timeline available at now'}
          </p>
          <p className="text-[11px] font-semibold text-slate-500 mt-1">
            Upload the structured Excel template to create this semester's P1/P2 timeline.
          </p>
        </div>
      ) : (
        <TimelineCalendar groups={timeline.levels} />
      )}
    </div>
  );
};
