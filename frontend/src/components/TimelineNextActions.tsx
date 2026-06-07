/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Award,
  CalendarCheck,
  ChevronRight,
  ClipboardList,
  FileText,
  LucideIcon,
  UploadCloud,
  UserCheck,
} from 'lucide-react';
import { getActiveTimeline } from '../services';
import { ActiveSemesterTimeline, SemesterTimelineEntry, TimelineRole, TimelineStatus } from '../types';
import { SIDEBAR_ITEMS } from '../constants/navigation';
import { PortalCard, StatusBadge } from './PortalPrimitives';
import { EmptyState, ErrorState, LoadingState } from './StateViews';

interface TimelineNextActionsProps {
  title: string;
  subtitle?: string;
  visibleRoles: TimelineRole[];
  onNavigateToTab: (tabName: string) => void;
}

const roleLabels: Record<TimelineRole, string> = {
  STUDENT: 'Student',
  LECTURER: 'Lecturer',
  OFFICE_STAFF: 'Office Staff',
};

const statusTone: Record<TimelineStatus, 'success' | 'brand' | 'warning' | 'danger'> = {
  Completed: 'success',
  Active: 'brand',
  Upcoming: 'warning',
  Deadline: 'danger',
};

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const parseDate = (value: string) => {
  if (!value) return new Date(Number.NaN);
  return new Date(`${value.slice(0, 10)}T00:00:00`);
};

const formatDate = (value: string) => {
  const date = parseDate(value);
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date);
};

const formatDateRange = (entry: SemesterTimelineEntry) => {
  const start = formatDate(entry.deadlineStart);
  const end = formatDate(entry.deadlineEnd);
  return start === end ? start : `${start} - ${end}`;
};

const todayAtMidnight = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

const routeForEntry = (entry: SemesterTimelineEntry) => {
  const text = `${entry.title} ${entry.detail} ${entry.action}`.toLowerCase();
  if (text.includes('supervisor')) return SIDEBAR_ITEMS.SUPERVISOR_APPOINTMENTS;
  if (text.includes('panel') || text.includes('presentation') || text.includes('examiner')) {
    return SIDEBAR_ITEMS.PANEL_APPOINTMENTS;
  }
  if (text.includes('mark')) return SIDEBAR_ITEMS.MARKS_ENTRY;
  if (
    text.includes('submit') ||
    text.includes('upload') ||
    text.includes('document') ||
    text.includes('proposal') ||
    text.includes('report') ||
    text.includes('form')
  ) {
    return SIDEBAR_ITEMS.FILE_MANAGEMENT;
  }
  if (text.includes('letter')) return SIDEBAR_ITEMS.LETTER_GENERATION;
  return SIDEBAR_ITEMS.DASHBOARD;
};

const iconForEntry = (entry: SemesterTimelineEntry): LucideIcon => {
  const text = `${entry.title} ${entry.detail} ${entry.action}`.toLowerCase();
  if (text.includes('supervisor')) return UserCheck;
  if (text.includes('panel') || text.includes('presentation') || text.includes('examiner')) return Award;
  if (text.includes('submit') || text.includes('upload')) return UploadCloud;
  if (text.includes('document') || text.includes('report') || text.includes('proposal')) return FileText;
  return CalendarCheck;
};

export const TimelineNextActions: React.FC<TimelineNextActionsProps> = ({
  title,
  subtitle = 'Important semester timeline events assigned to your role.',
  visibleRoles,
  onNavigateToTab,
}) => {
  const [timeline, setTimeline] = useState<ActiveSemesterTimeline | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTimeline = () => {
    setLoading(true);
    setError(null);
    getActiveTimeline()
      .then(setTimeline)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load next actions.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadTimeline();
  }, []);

  const actions = useMemo(() => {
    if (!timeline?.available) return [];

    const scopedEntries = timeline.levels
      .flatMap((group) => group.entries)
      .filter((entry) => visibleRoles.some((role) => entry.targetRoles.includes(role)))
      .sort((a, b) => parseDate(a.deadlineStart).getTime() - parseDate(b.deadlineStart).getTime());

    const today = todayAtMidnight();
    const activeOrUpcoming = scopedEntries.filter((entry) => parseDate(entry.deadlineEnd) >= today);
    return (activeOrUpcoming.length > 0 ? activeOrUpcoming : scopedEntries).slice(0, 5);
  }, [timeline, visibleRoles]);

  return (
    <PortalCard className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h2 className="section-heading">{title}</h2>
          <p className="text-xs md:text-sm text-slate-500 font-medium mt-1.5">
            {subtitle}
          </p>
        </div>
        <StatusBadge tone="neutral" className="self-start">
          {actions.length} items
        </StatusBadge>
      </div>

      {loading ? (
        <LoadingState message="Loading timeline actions..." className="py-10" />
      ) : error ? (
        <ErrorState message={error} onRetry={loadTimeline} className="py-10" />
      ) : !timeline?.available ? (
        <EmptyState
          icon={ClipboardList}
          title="No active semester timeline"
          description={timeline?.message || 'No timeline actions can be shown until office staff upload the semester timeline.'}
          className="py-10"
        />
      ) : actions.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No timeline actions assigned"
          description="There are no semester timeline events assigned to this role yet."
          className="py-10"
        />
      ) : (
        <div className="divide-y divide-slate-100">
          {actions.map((entry) => {
            const Icon = iconForEntry(entry);
            return (
              <button
                key={`${entry.level}-${entry.id}`}
                type="button"
                onClick={() => onNavigateToTab(routeForEntry(entry))}
                className="w-full py-4 flex items-center justify-between gap-4 text-left hover:bg-slate-50/70 transition cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-150 flex items-center justify-center text-slate-500 shrink-0">
                    <Icon className="w-4.5 h-4.5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-black text-brand-navy block leading-snug">
                      {entry.title}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 block mt-1 leading-relaxed">
                      {entry.level} - {entry.action || entry.targetRoles.map((role) => roleLabels[role]).join(' / ')}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge tone={statusTone[entry.status]} dot className="hidden md:inline-flex">
                    {entry.status}
                  </StatusBadge>
                  <span className="hidden sm:inline text-[10px] font-black uppercase tracking-wider text-slate-400">
                    {formatDateRange(entry)}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </PortalCard>
  );
};
