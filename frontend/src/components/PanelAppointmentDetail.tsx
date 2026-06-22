/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  GraduationCap,
  Users,
} from 'lucide-react';
import { PageHeader, StatusBadge } from './PortalPrimitives';
import { PanelRecord } from '../types';
import { PanelWorkflowItem, PanelWorkflowTimeline } from './PanelWorkflowTimeline';

interface PanelAppointmentDetailProps {
  onBack: () => void;
  record?: PanelRecord | null;
}

const statusTone = (status?: PanelRecord['status']) => {
  if (status === 'Approved') return 'success';
  if (status === 'Rejected' || status === 'Workload Alert') return 'danger';
  if (status === 'Pending' || status === 'Recommendation') return 'warning';
  return 'neutral';
};

const initialsFor = (name?: string) =>
  (name || 'NA')
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

const sessionFrom = (semester?: string) => {
  const match = semester?.match(/\d{4}\/\d{4}/);
  return match ? match[0] : '2025/2026';
};

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

const EmptyRecordState: React.FC<{ title: string }> = ({ title }) => (
  <div className="py-8 flex flex-col items-center justify-center text-center space-y-3 px-4">
    <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-200 text-slate-400 flex items-center justify-center shadow-3xs">
      <AlertCircle className="w-5 h-5 stroke-[1.8]" />
    </div>
    <span className="font-extrabold text-brand-navy text-xs block">{title}</span>
  </div>
);

const buildWorkflowItems = (record?: PanelRecord | null): PanelWorkflowItem[] => {
  const status = record?.status;
  const date = record?.appointmentDate || record?.updatedDate;
  const approved = status === 'Approved';
  const rejected = status === 'Rejected';
  const rejectedByPanel = rejected && record?.rejectionStage !== 'Programme Coordinator';
  const rejectedByCoordinator = rejected && record?.rejectionStage === 'Programme Coordinator';
  const pendingCoordinator = status === 'Pending';
  const selectedPanelReview = status === 'Recommendation';
  const noPanel = status === 'No Panel' || !status;

  return [
    {
      id: 'submitted',
      label: 'Recommendation Submitted',
      subtext: noPanel ? 'Not started' : displayValue(record?.updatedDate),
      timestamp: formatDateTime(record?.recommendationSubmittedAt),
      status: noPanel ? 'pending' : 'completed',
    },
    {
      id: 'panel',
      label: 'Selected Panel Review',
      subtext: rejectedByPanel
        ? 'Recommendation rejected'
        : approved || pendingCoordinator || rejectedByCoordinator
        ? 'Selected panel accepted'
        : selectedPanelReview
        ? 'Awaiting selected panel decision'
        : 'Pending recommendation submission',
      timestamp: formatDateTime(record?.panelDecisionAt),
      status: rejectedByPanel
        ? 'rejected'
        : approved || pendingCoordinator || rejectedByCoordinator
        ? 'completed'
        : selectedPanelReview
        ? 'active'
        : 'pending',
    },
    {
      id: 'coordinator',
      label: 'Programme Coordinator Confirmation',
      subtext: approved
        ? 'Programme Coordinator confirmed'
        : pendingCoordinator
        ? 'Awaiting Programme Coordinator confirmation'
        : rejectedByCoordinator
        ? 'Recommendation rejected'
        : rejectedByPanel
        ? 'Not reached'
        : 'Pending selected panel acceptance',
      timestamp: formatDateTime(record?.coordinatorDecisionAt),
      status: approved
        ? 'completed'
        : pendingCoordinator
        ? 'active'
        : rejectedByCoordinator
        ? 'rejected'
        : 'pending',
    },
    {
      id: 'appointed',
      label: 'Panel Appointment Confirmed',
      subtext: approved ? displayValue(date) : rejected ? 'Not appointed' : 'Pending confirmation',
      timestamp: formatDateTime(record?.appointmentConfirmedAt),
      status: approved ? 'completed' : rejected ? 'rejected' : 'pending',
    },
  ];
};

export const PanelAppointmentDetail: React.FC<PanelAppointmentDetailProps> = ({
  onBack,
  record,
}) => {
  const session = sessionFrom(record?.semester);
  const panelAssigned = record?.panelMember && !['Not Assigned', 'Pending'].includes(record.panelMember);

  return (
    <div id="panel-appointment-detail-root" className="space-y-8 animate-fade-in text-left font-sans">
      <PageHeader
        title="Panel Appointment Detail"
        subtitle="View student panel appointment details, appointment status, related records, and supporting documents."
        backLabel="Back to Panel Appointment Management"
        onBack={onBack}
        subtitleClassName="max-w-2xl"
        actions={(
          <span className="inline-flex items-center px-4 py-2 bg-brand-navy text-white text-[11px] font-black tracking-widest rounded-lg uppercase">
            Session {session}
          </span>
        )}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 items-start">
        <div className="lg:col-span-4 space-y-6 md:space-y-8">
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-3xs flex flex-col items-start space-y-5">
            <div className="flex items-center gap-4 w-full">
              <div className="w-12 h-12 rounded-xl bg-blue-100 border border-blue-200 text-blue-700 flex items-center justify-center shrink-0 font-extrabold text-base">
                {initialsFor(record?.studentName)}
              </div>
              <div className="text-left space-y-1 overflow-hidden">
                <h3 className="font-extrabold text-brand-navy text-base truncate leading-tight">
                  {displayValue(record?.studentName)}
                </h3>
                <StatusBadge tone={statusTone(record?.status)} dot className="px-2 py-0.5 text-[9px]">
                  {record?.status || 'No Record'}
                </StatusBadge>
              </div>
            </div>

            <div className="w-full space-y-4 border-t border-slate-100 pt-5 text-left text-xs">
              <div>
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-0.5">Student ID</span>
                <span className="font-extrabold text-brand-navy font-mono">{displayValue(record?.id)}</span>
              </div>
              <div>
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-0.5">Programme</span>
                <span className="font-bold text-slate-700">{displayValue(record?.programme)}</span>
              </div>
              <div>
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-0.5">Semester</span>
                <span className="font-semibold text-slate-600">{displayValue(record?.semester)}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-3xs text-left space-y-4.5">
            <h4 className="font-extrabold text-brand-navy text-xs uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
              <Users className="w-4 h-4 text-blue-500" />
              Appointment Info
            </h4>
            <div className="space-y-3.5 text-xs">
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-450 font-medium">Supervisor</span>
                <span className="font-extrabold text-slate-850 text-right">{displayValue(record?.supervisor)}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-450 font-medium">Panel Member</span>
                <span className="font-extrabold text-slate-850 text-right">{displayValue(record?.panelMember)}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-450 font-medium">Appointment Date</span>
                <span className="font-bold text-slate-700 text-right">{displayValue(record?.appointmentDate || record?.updatedDate)}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-450 font-medium">Last Updated</span>
                <span className="font-bold text-slate-700 text-right">{displayValue(record?.updatedDate)}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-3xs text-left flex flex-col space-y-4.5">
            <h4 className="font-extrabold text-brand-navy text-xs uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Evaluation Summary
            </h4>
            <EmptyRecordState
              title="No evaluation records available"
            />
            <div className="border-t border-slate-100 pt-3.5 flex items-center justify-between text-xs">
              <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Status:</span>
              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 font-black uppercase text-[9px] rounded-md border border-slate-200">
                No records
              </span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 space-y-6 md:space-y-8">
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 md:p-8 space-y-5 text-left">
            <h4 className="font-extrabold text-brand-navy text-xs uppercase tracking-wider flex items-center gap-2 pb-1">
              <GraduationCap className="w-4.5 h-4.5 text-blue-500" />
              Research Information
            </h4>
            <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-4.5 md:p-5.5 space-y-1.5 shadow-2xs">
              <span className="text-indigo-650 font-bold block text-sm leading-relaxed tracking-tight">
                {displayValue(record?.researchTitle)}
              </span>
              <div className="text-[11px] text-slate-500 flex items-center gap-1.5 font-medium">
                <span className="font-extrabold text-slate-600 uppercase tracking-widest text-[9px]">Area:</span>
                <span>{displayValue(record?.researchArea)}</span>
              </div>
            </div>
            <div className="space-y-2 pt-1 text-xs">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Abstract</span>
              <p className="text-slate-650 font-medium leading-relaxed">
                {displayValue(record?.abstract)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 space-y-4.5 text-left">
              <h4 className="font-extrabold text-brand-navy text-xs uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
                <Clock className="w-4 h-4 text-slate-400" />
                Complete Workflow Status
              </h4>
              <PanelWorkflowTimeline items={buildWorkflowItems(record)} />
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 space-y-4.5 text-left flex flex-col justify-between">
              <div>
                <h4 className="font-extrabold text-brand-navy text-xs uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Users className="w-4 h-4 text-blue-500" />
                  Related Panel Status
                </h4>
                {panelAssigned ? (
                  <div className="bg-slate-50 border border-slate-150 rounded-xl p-4 mt-4 text-xs space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded bg-brand-navy text-white flex items-center justify-center font-extrabold tracking-wider text-xs">
                        {initialsFor(record?.panelMember)}
                      </div>
                      <div>
                        <span className="font-extrabold text-brand-navy block text-[11.5px] leading-tight">
                          {record?.panelMember}
                        </span>
                        <span className="text-[10px] font-extrabold text-slate-400 block uppercase tracking-wide">
                          {displayValue(record?.panelMemberDepartment)}
                        </span>
                      </div>
                    </div>
                    <div className="border-t border-slate-200/70 pt-3 grid grid-cols-1 gap-2.5">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-slate-450 font-medium">Staff ID</span>
                        <span className="font-bold text-brand-navy">{displayValue(record?.panelMemberId)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-slate-450 font-medium">Email</span>
                        <span className="font-bold text-brand-navy text-right break-all">{displayValue(record?.panelMemberEmail)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-slate-450 font-medium">Assigned Date</span>
                        <span className="font-bold text-brand-navy">{displayValue(record?.appointmentDate)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-slate-450 font-medium">Status</span>
                        <StatusBadge tone={statusTone(record?.status)} dot className="text-[9px] px-2 py-0.5">
                          {record?.status}
                        </StatusBadge>
                      </div>
                    </div>
                    {record?.status === 'Rejected' && record.rejectionReason && (
                      <div className="border-t border-rose-100 pt-3">
                        <span className="text-[9px] font-extrabold uppercase tracking-wider text-rose-500 block mb-1">
                          {record.rejectionStage || 'Workflow'} rejection reason
                        </span>
                        <p className="text-[11px] font-semibold leading-relaxed text-rose-700">
                          {record.rejectionReason}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <EmptyRecordState
                    title="No panel member assigned"
                  />
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-3xs text-left">
            <div className="px-6 py-4.5 border-b border-light-slate flex items-center justify-between">
              <h4 className="font-extrabold text-brand-navy text-xs uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-500" />
                Related Files
              </h4>
              <span className="px-2.5 py-1 bg-slate-100 text-slate-600 font-extrabold uppercase text-[9px] rounded-full tracking-wide">
                No records
              </span>
            </div>
            <EmptyRecordState
              title="No related files available"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
