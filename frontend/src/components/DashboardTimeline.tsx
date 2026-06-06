/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { CalendarCog, ListTodo, RefreshCw } from 'lucide-react';
import { getActiveTimeline } from '../services';
import { ActiveSemesterTimeline } from '../types';
import { PortalButton, StatusDot } from './PortalPrimitives';
import { ErrorState, LoadingState } from './StateViews';
import { TimelineCalendar } from './TimelineCalendar';

interface DashboardTimelineProps {
  onTimelineUpdate?: (message: string) => void;
  onManageTimeline?: () => void;
  showManageTimeline?: boolean;
}

const formatDisplayDate = (value: string) => {
  if (!value) return '';
  if (!/^\d{4}-\d{2}-\d{2}/.test(value)) return value;
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${String(day).padStart(2, '0')} ${months[month - 1]} ${year}`;
};

export const DashboardTimeline: React.FC<DashboardTimelineProps> = ({
  onTimelineUpdate,
  onManageTimeline,
  showManageTimeline = true
}) => {
  const [timeline, setTimeline] = useState<ActiveSemesterTimeline | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    onTimelineUpdate?.(msg);
  };

  const loadTimeline = () => {
    setLoading(true);
    setError(null);
    getActiveTimeline()
      .then(setTimeline)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load semester timeline.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadTimeline();
  }, []);

  return (
    <div
      id="dashboard-semester-timeline-container"
      className="bg-white border border-[#e2e8f0] rounded-2xl p-6 shadow-sm text-left font-sans space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#f1f5f9] pb-4">
        <div id="timeline-title-meta" className="space-y-1 text-left">
          <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-widest leading-none">
            Semester Timeline
          </h3>
          <span className="text-lg font-black text-brand-navy block mt-1 tracking-tight">
            {timeline?.available ? `${timeline.semester} ${timeline.session}` : 'Active Semester Timeline'}
          </span>
          <span className="text-[10px] text-slate-400 font-bold block">
            {timeline?.available && timeline.uploadedAt
              ? `Active - Uploaded ${formatDisplayDate(timeline.uploadedAt)}`
              : 'Timeline status updates when office staff upload the active semester file'}
          </span>
        </div>

        <div className="flex items-center flex-wrap gap-3">
          <PortalButton
            onClick={loadTimeline}
            variant="secondary"
            size="md"
            icon={RefreshCw}
            isLoading={loading}
          >
            Refresh
          </PortalButton>

          {showManageTimeline && (
            <PortalButton
              onClick={onManageTimeline}
              variant="primary"
              size="md"
              icon={CalendarCog}
            >
              Manage Timeline
            </PortalButton>
          )}
        </div>
      </div>

      {loading ? (
        <LoadingState message="Loading active semester timeline..." />
      ) : error ? (
        <ErrorState message={error} onRetry={loadTimeline} />
      ) : !timeline?.available ? (
        <div className="rounded-2xl border border-dashed border-slate-250 bg-slate-50/60 px-5 py-8 text-center">
          <ListTodo className="w-6 h-6 text-slate-400 mx-auto mb-3" />
          <p className="text-sm font-black text-brand-navy">
            {timeline?.message || 'No timeline available at now'}
          </p>
        </div>
      ) : (
        <TimelineCalendar groups={timeline.levels} />
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-[#f1f5f9] text-[10px] select-none text-slate-400">
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

        <PortalButton
          onClick={() => triggerToast('Opening active semester timeline details...')}
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
