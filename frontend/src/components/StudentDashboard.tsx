/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Award,
  CalendarCheck,
  CheckCircle,
  ChevronRight,
  FileText,
  HelpCircle,
  MailOpen,
  UploadCloud,
  UserCheck
} from 'lucide-react';
import { DashboardTimeline } from './DashboardTimeline';
import { PageHeader, PortalCard, PortalToast, StatusBadge } from './PortalPrimitives';
import { MOCK_STUDENT_NEXT_ACTIONS } from '../mocks/dashboard';

interface StudentDashboardProps {
  studentName: string;
  studentId?: string;
  programme?: string;
  onNavigateToTab: (tabName: string) => void;
}

interface StatusCardProps {
  title: string;
  value: string;
  subtext: string;
  badge: string;
  badgeTone: 'success' | 'warning' | 'info' | 'neutral';
  icon: React.ComponentType<{ className?: string }>;
  actionLabel: string;
  onClick: () => void;
}

const StatusCard: React.FC<StatusCardProps> = ({
  title,
  value,
  subtext,
  badge,
  badgeTone,
  icon: Icon,
  actionLabel,
  onClick
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

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  studentName,
  studentId,
  programme = 'Master of Computer Science',
  onNavigateToTab
}) => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (message: string) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(null), 3500);
  };

  const actionIcons = {
    upload: UploadCloud,
    award: Award,
    mail: MailOpen,
  };
  const nextActions = MOCK_STUDENT_NEXT_ACTIONS;

  return (
    <div id="student-dashboard-container" className="space-y-8 animate-fade-in text-left font-sans text-xs pb-16">
      <PortalToast message={toastMessage} />

      <PageHeader
        title="Student Dashboard"
        subtitle="Track your semester timeline, appointment status, submissions, and official document requests."
        actions={(
          <PortalCard padding="sm" className="px-4 py-3">
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
              Active Student
            </span>
            <span className="text-xs font-black text-brand-navy block mt-1">
              {studentName}
            </span>
            <span className="text-[10px] font-bold text-slate-400 font-mono">
              {studentId || 'WEA200192'} - {programme}
            </span>
          </PortalCard>
        )}
      />

      <DashboardTimeline
        showManageTimeline={false}
        onTimelineUpdate={triggerToast}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatusCard
          title="Supervisor Status"
          value="Approved"
          subtext="Dr. Siti Noor is assigned as your current supervisor."
          badge="Active"
          badgeTone="success"
          icon={UserCheck}
          actionLabel="View supervisor"
          onClick={() => onNavigateToTab('Supervisor Appointments')}
        />
        <StatusCard
          title="Panel Appointment"
          value="Pending"
          subtext="Panel recommendation is in progress and will be released after approval."
          badge="Awaiting release"
          badgeTone="warning"
          icon={Award}
          actionLabel="Check panel"
          onClick={() => onNavigateToTab('Panel Appointments')}
        />
        <StatusCard
          title="File Submission"
          value="1 Due"
          subtext="Proposal document is due before the current submission window closes."
          badge="Proposal due"
          badgeTone="warning"
          icon={FileText}
          actionLabel="Submit file"
          onClick={() => onNavigateToTab('File Management')}
        />
        <StatusCard
          title="Letters"
          value="Ready"
          subtext="Official confirmation and enrollment letters are available for generation."
          badge="Available"
          badgeTone="info"
          icon={MailOpen}
          actionLabel="Generate letter"
          onClick={() => onNavigateToTab('Letter Generation')}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <PortalCard className="lg:col-span-8 space-y-4">
          <div>
            <h2 className="section-heading">
              Next Student Actions
            </h2>
            <p className="text-xs md:text-sm text-slate-500 font-medium mt-1.5">
              Tasks based on your appointment and submission timeline.
            </p>
          </div>

          <div className="divide-y divide-slate-100">
            {nextActions.map((action) => {
              const Icon = actionIcons[action.iconKey];
              return (
                <button
                  key={action.title}
                  type="button"
                  onClick={() => onNavigateToTab(action.target)}
                  className="w-full py-4 flex items-center justify-between gap-4 text-left hover:bg-slate-50/70 transition cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-150 flex items-center justify-center text-slate-500 shrink-0">
                      <Icon className="w-4.5 h-4.5" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-black text-brand-navy block">
                        {action.title}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 block mt-1">
                        {action.meta}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="hidden sm:inline text-[10px] font-black uppercase tracking-wider text-slate-400">
                      {action.due}
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </button>
              );
            })}
          </div>
        </PortalCard>

        <div className="lg:col-span-4 space-y-5">
          <PortalCard>
            <div className="flex items-center gap-2 mb-4">
              <CalendarCheck className="w-4.5 h-4.5 text-emerald-600" />
              <h2 className="section-label">
                Semester Progress
              </h2>
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                  <span>Current Milestones</span>
                  <span>62%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-brand-navy rounded-full" style={{ width: '62%' }} />
                </div>
              </div>
              <p className="text-[10.5px] text-slate-500 font-semibold leading-relaxed">
                You are in the active panel recommendation window. Proposal submission remains the nearest deadline.
              </p>
            </div>
          </PortalCard>

          <button
            type="button"
            onClick={() => onNavigateToTab('FAQ Chatbot')}
            className="w-full bg-[#eff6ff] border border-blue-150 rounded-2xl p-5 shadow-3xs text-left flex items-start gap-3 hover:bg-blue-50 transition cursor-pointer"
          >
            <HelpCircle className="w-5 h-5 text-blue-600 shrink-0" />
            <div>
              <span className="text-xs font-black text-brand-navy block">
                Need academic guidance?
              </span>
              <span className="text-[10.5px] text-slate-500 font-semibold leading-relaxed block mt-1">
                Ask the student FAQ chatbot about submission rules, appointments, and official documents.
              </span>
            </div>
          </button>

          <PortalCard padding="sm" className="p-5 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <span className="text-xs font-black text-brand-navy block">
                Profile Status Complete
              </span>
              <span className="text-[10.5px] text-slate-500 font-semibold leading-relaxed block mt-1">
                Your programme, supervisor, and contact details are ready for postgraduate office processing.
              </span>
            </div>
          </PortalCard>
        </div>
      </div>
    </div>
  );
};
