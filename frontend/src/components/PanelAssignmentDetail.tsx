/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  AlertCircle,
  Bookmark,
  Clock,
  FileText,
  User,
} from 'lucide-react';
import { PageHeader, StatusBadge } from './PortalPrimitives';
import { PanelAssignment } from '../types';
import { PanelWorkflowItem, PanelWorkflowTimeline } from './PanelWorkflowTimeline';

interface PanelAssignmentDetailProps {
  assignment: PanelAssignment;
  onBack: () => void;
  onOpenMarksEntry?: () => void;
}

const displayValue = (value?: string | null) => value && value.trim() ? value : 'Not available';

const formatDateTime = (value?: string | null) => {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).replace(',', '');
};

const sessionFrom = (semester?: string) => {
  const match = semester?.match(/\d{4}\/\d{4}/);
  return match ? match[0] : '2025/2026';
};

const assignmentTone = (status?: PanelAssignment['status']) => {
  if (status === 'ACTIVE') return 'success';
  if (status === 'COMPLETED') return 'neutral';
  return 'warning';
};

const initialsFor = (name?: string) =>
  (name || 'NA')
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

const EmptyRecordState: React.FC<{ title: string }> = ({ title }) => (
  <div className="py-10 flex flex-col items-center justify-center text-center space-y-3 px-4">
    <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-200 text-slate-400 flex items-center justify-center shadow-3xs">
      <AlertCircle className="w-5 h-5 stroke-[1.8]" />
    </div>
    <span className="font-extrabold text-brand-navy text-xs block">{title}</span>
  </div>
);

const buildAssignmentWorkflowItems = (assignment: PanelAssignment): PanelWorkflowItem[] => {
  const appointed = assignment.status === 'ACTIVE' || assignment.status === 'COMPLETED';
  return [
    {
      id: 'submitted',
      label: 'Recommendation Submitted',
      subtext: appointed ? 'Recommendation completed' : 'Awaiting recommendation',
      timestamp: formatDateTime(assignment.recommendationSubmittedAt),
      status: appointed ? 'completed' : 'active',
    },
    {
      id: 'panel',
      label: 'Selected Panel Review',
      subtext: appointed ? 'Selected panel accepted' : 'Awaiting selected panel decision',
      timestamp: formatDateTime(assignment.panelDecisionAt),
      status: appointed ? 'completed' : 'pending',
    },
    {
      id: 'coordinator',
      label: 'Programme Coordinator Confirmation',
      subtext: appointed ? 'Programme Coordinator confirmed' : 'Awaiting Programme Coordinator confirmation',
      timestamp: formatDateTime(assignment.coordinatorDecisionAt),
      status: appointed ? 'completed' : 'pending',
    },
    {
      id: 'appointed',
      label: 'Panel Appointment Confirmed',
      subtext: appointed ? displayValue(assignment.appointmentDate) : 'Pending confirmation',
      timestamp: formatDateTime(assignment.appointmentConfirmedAt),
      status: appointed ? 'completed' : 'pending',
    },
  ];
};

const StudentProfileCard: React.FC<{ assignment: PanelAssignment }> = ({ assignment }) => (
  <div className="bg-white border border-[#e2e8f0]/80 rounded-2xl p-6 shadow-3xs text-left flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
    <div className="flex gap-5 items-center">
      <div className="w-[52px] h-[52px] rounded-xl bg-[#eff6ff] border border-blue-100 text-blue-600 font-black text-sm flex items-center justify-center shrink-0 tracking-wider">
        {assignment.initials || initialsFor(assignment.studentName)}
      </div>
      <div>
        <div className="flex items-center gap-2.5">
          <h3 className="text-[17px] font-black text-brand-navy leading-tight">
            {displayValue(assignment.studentName)}
          </h3>
          <StatusBadge tone={assignmentTone(assignment.status)} dot className="text-[9px] px-2.5 py-0.5">
            {assignment.status}
          </StatusBadge>
        </div>
        <p className="font-mono text-brand-navy/80 text-xs font-bold mt-1">
          ID: {displayValue(assignment.studentId)}
        </p>
      </div>
    </div>

    <div className="grid grid-cols-2 gap-6 md:gap-12 text-xs border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-8 flex-1">
      <div>
        <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Programme</span>
        <span className="text-[12.5px] font-extrabold text-slate-700 block mt-1 leading-snug">
          {displayValue(assignment.programme)}
        </span>
      </div>
      <div>
        <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Semester</span>
        <span className="text-[12.5px] font-extrabold text-slate-700 block mt-1">
          {displayValue(assignment.intake)}
        </span>
      </div>
    </div>
  </div>
);

const ResearchInfoCard: React.FC<{ assignment: PanelAssignment }> = ({ assignment }) => (
  <div className="bg-white border border-[#e2e8f0]/80 rounded-2xl p-6 shadow-3xs text-left space-y-4">
    <div className="flex items-center gap-2 select-none border-b border-slate-100 pb-3">
      <Bookmark className="w-4.5 h-4.5 text-blue-600 stroke-[2.2]" />
      <h4 className="text-xs font-black text-brand-navy uppercase tracking-wider">
        Research Information
      </h4>
    </div>
    <div className="space-y-4 pt-1">
      <div className="space-y-1">
        <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Title</span>
        <h3 className="text-sm font-extrabold text-brand-navy leading-relaxed">
          {displayValue(assignment.researchTitle)}
        </h3>
      </div>
      <div className="space-y-1">
        <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Research Area</span>
        <span className="text-xs font-black text-blue-600 select-all">
          {displayValue(assignment.researchArea)}
        </span>
      </div>
      <div className="space-y-1">
        <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Abstract</span>
        <p className="text-xs text-slate-500 font-semibold leading-relaxed text-justify">
          {displayValue(assignment.abstract)}
        </p>
      </div>
    </div>
  </div>
);

const AppointmentDataCard: React.FC<{ assignment: PanelAssignment }> = ({ assignment }) => (
  <div className="bg-brand-navy border border-slate-800 rounded-2xl p-6 shadow-sm text-left text-white relative overflow-hidden">
    <div className="absolute top-5 right-5 select-none">
      <StatusBadge tone={assignmentTone(assignment.status)} className="text-[8px] px-2.5 py-1">
        {assignment.status}
      </StatusBadge>
    </div>
    <div className="relative z-10 space-y-4">
      <div className="border-b border-white/[0.08] pb-3 select-none">
        <span className="text-[9px] font-black text-indigo-300 uppercase tracking-widest block">
          Appointment Data
        </span>
      </div>
      <div className="space-y-1.5 pt-1">
        <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Student ID</span>
        <span className="text-[17px] font-black text-white font-mono block tracking-tight">
          {displayValue(assignment.studentId)}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-y-4 gap-x-6 pt-2 text-xs">
        <div>
          <span className="text-[9px] font-bold text-[#94a3b8] block uppercase tracking-wider">Role</span>
          <span className="font-extrabold text-slate-100 block mt-0.5">Panel Member</span>
        </div>
        <div>
          <span className="text-[9px] font-bold text-[#94a3b8] block uppercase tracking-wider">Date</span>
          <span className="font-extrabold text-slate-100 block mt-0.5">{displayValue(assignment.appointmentDate)}</span>
        </div>
        <div className="col-span-2">
          <span className="text-[9px] font-bold text-[#94a3b8] block uppercase tracking-wider">Academic Session</span>
          <span className="font-extrabold text-indigo-200 block mt-0.5">{displayValue(assignment.intake)}</span>
        </div>
      </div>
    </div>
  </div>
);

const SupervisorInfoCard: React.FC<{ assignment: PanelAssignment }> = ({ assignment }) => (
  <div className="bg-white border border-[#e2e8f0]/80 rounded-2xl p-6 shadow-3xs text-left space-y-4">
    <div className="flex items-center gap-2 select-none border-b border-slate-100 pb-3">
      <User className="w-4.5 h-4.5 text-blue-600 stroke-[2.2]" />
      <h4 className="text-xs font-black text-brand-navy uppercase tracking-wider">Supervisor</h4>
    </div>
    <div className="flex gap-4 items-center">
      <div className="w-[36px] h-[36px] rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs select-none shadow-3xs border border-slate-200/40">
        {initialsFor(assignment.supervisor)}
      </div>
      <div>
        <h5 className="font-black text-sm text-brand-navy leading-tight">{displayValue(assignment.supervisor)}</h5>
        <p className="text-[10px] text-slate-400 font-bold mt-0.5">{displayValue(assignment.supervisorDepartment)}</p>
      </div>
    </div>
    <div className="space-y-3 pt-2 text-xs">
      <div>
        <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Email</span>
        <span className="text-xs font-bold text-blue-600 block mt-0.5 select-all">
          {displayValue(assignment.supervisorEmail)}
        </span>
      </div>
    </div>
  </div>
);

const EvaluationStageCard: React.FC<{ onOpenMarksEntry?: () => void }> = ({ onOpenMarksEntry }) => (
  <div className="bg-white border border-[#e2e8f0]/80 rounded-2xl p-6 shadow-3xs text-left space-y-4">
    <div className="flex justify-between items-center select-none border-b border-slate-100 pb-3">
      <span className="text-xs font-black text-brand-navy uppercase tracking-wider">Evaluation Stage</span>
      <span className="bg-slate-100 text-slate-600 border border-slate-200 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md">
        No records
      </span>
    </div>
    <EmptyRecordState
      title="No EE records available"
    />
    <button
      type="button"
      onClick={onOpenMarksEntry}
      className="w-full py-3 bg-brand-navy hover:bg-slate-800 text-white rounded-xl text-xs font-black tracking-widest uppercase transition shadow-sm flex items-center justify-center gap-2 cursor-pointer"
    >
      <FileText className="w-3.5 h-3.5 text-indigo-300" />
      <span>Open Marks Entry</span>
    </button>
  </div>
);

const RelatedDocumentsCard: React.FC = () => (
  <div className="bg-white border border-[#e2e8f0]/80 rounded-2xl p-6 shadow-3xs text-left space-y-4">
    <div className="flex items-center gap-2 select-none border-b border-slate-100 pb-3">
      <FileText className="w-4.5 h-4.5 text-blue-600 stroke-[2.2]" />
      <h4 className="text-xs font-black text-brand-navy uppercase tracking-wider">
        Related Documents
      </h4>
    </div>
    <EmptyRecordState
      title="No related documents available"
    />
  </div>
);

const WorkflowStatusCard: React.FC<{ assignment: PanelAssignment }> = ({ assignment }) => (
  <div className="bg-white border border-[#e2e8f0]/80 rounded-2xl p-6 shadow-3xs text-left space-y-4">
    <div className="flex items-center gap-2 select-none border-b border-slate-100 pb-3">
      <Clock className="w-4.5 h-4.5 text-slate-400 stroke-[2.2]" />
      <h4 className="text-xs font-black text-brand-navy uppercase tracking-wider">
        Complete Workflow Status
      </h4>
    </div>
    <PanelWorkflowTimeline items={buildAssignmentWorkflowItems(assignment)} />
  </div>
);

export const PanelAssignmentDetail: React.FC<PanelAssignmentDetailProps> = ({
  assignment,
  onBack,
  onOpenMarksEntry,
}) => {
  const session = sessionFrom(assignment.intake);

  return (
    <div id="panel-assignment-detail-main" className="space-y-6">
      <PageHeader
        title="Panel Assignment Detail"
        subtitle="View student details, research information, supervisor details, and related evaluation records."
        backLabel="Back to Panel Appointments"
        onBack={onBack}
        className="select-none"
        actions={(
          <span className="bg-[#eff6ff] text-blue-600 border border-blue-100 rounded-xl px-4 py-1.5 text-xs font-black uppercase tracking-wider leading-none">
            Session {session}
          </span>
        )}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-7">
        <div className="lg:col-span-8 space-y-6">
          <StudentProfileCard assignment={assignment} />
          <ResearchInfoCard assignment={assignment} />
          <WorkflowStatusCard assignment={assignment} />
          <RelatedDocumentsCard />
        </div>
        <div className="lg:col-span-4 space-y-6">
          <AppointmentDataCard assignment={assignment} />
          <SupervisorInfoCard assignment={assignment} />
          <EvaluationStageCard onOpenMarksEntry={onOpenMarksEntry} />
        </div>
      </div>

    </div>
  );
};
