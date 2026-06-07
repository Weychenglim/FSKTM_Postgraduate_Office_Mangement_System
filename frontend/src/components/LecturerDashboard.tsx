/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Award, ChevronRight, UsersRound } from 'lucide-react';
import { DashboardTimeline } from './DashboardTimeline';
import { TimelineNextActions } from './TimelineNextActions';
import { PageHeader, PortalToast, StatusBadge } from './PortalPrimitives';

interface LecturerDashboardProps {
  onNavigateToTab: (tabName: string) => void;
}

interface LecturerSummaryCardProps {
  title: string;
  value: string;
  subtext: string;
  badge: string;
  badgeTone: 'success' | 'warning' | 'info' | 'neutral';
  icon: React.ComponentType<{ className?: string }>;
  actionLabel: string;
  onClick: () => void;
}

const LecturerSummaryCard: React.FC<LecturerSummaryCardProps> = ({
  title,
  value,
  subtext,
  badge,
  badgeTone,
  icon: Icon,
  actionLabel,
  onClick,
}) => (
  <button
    type="button"
    onClick={onClick}
    className="bg-white border border-[#e2e8f0] rounded-2xl p-5 text-left shadow-3xs hover:border-slate-300 transition-all cursor-pointer group min-h-[150px] flex flex-col justify-between"
  >
    <div className="flex items-start justify-between gap-4">
      <div>
        <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider block">
          {title}
        </span>
        <span className="text-2xl font-black text-brand-navy tracking-tight block mt-3">
          {value}
        </span>
      </div>
      <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-150 flex items-center justify-center text-slate-500 shrink-0">
        <Icon className="w-4.5 h-4.5" />
      </div>
    </div>

    <div className="space-y-3 pt-4">
      <StatusBadge tone={badgeTone} className="text-[9px]">{badge}</StatusBadge>
      <p className="text-[10.5px] text-slate-400 font-bold leading-relaxed">
        {subtext}
      </p>
      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-blue-600 group-hover:text-blue-800">
        {actionLabel}
        <ChevronRight className="w-3.5 h-3.5" />
      </span>
    </div>
  </button>
);

export const LecturerDashboard: React.FC<LecturerDashboardProps> = ({ onNavigateToTab }) => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (message: string) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(null), 3500);
  };

  return (
    <div id="lecturer-dashboard-container" className="space-y-8 animate-fade-in text-left font-sans text-xs pb-16">
      <PortalToast message={toastMessage} />

      <PageHeader
        title="Lecturer Dashboard"
        subtitle="Track your semester timeline, supervisee records, panel appointments, and upcoming academic actions."
      />

      <DashboardTimeline
        showManageTimeline={false}
        onTimelineUpdate={triggerToast}
        visibleRoles={['LECTURER']}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <LecturerSummaryCard
          title="Students Under Supervision"
          value="Active"
          subtext="Open your supervisee workspace to review assigned postgraduate students."
          badge="Supervisor workspace"
          badgeTone="success"
          icon={UsersRound}
          actionLabel="View supervisees"
          onClick={() => onNavigateToTab('Supervisor Appointments')}
        />
        <LecturerSummaryCard
          title="Panel Appointment for Students"
          value="Review"
          subtext="Check panel appointment records and assigned evaluation responsibilities."
          badge="Panel workspace"
          badgeTone="info"
          icon={Award}
          actionLabel="View panels"
          onClick={() => onNavigateToTab('Panel Appointments')}
        />
      </div>

      <TimelineNextActions
        title="Next Lecturer Actions"
        visibleRoles={['LECTURER']}
        onNavigateToTab={onNavigateToTab}
      />
    </div>
  );
};
