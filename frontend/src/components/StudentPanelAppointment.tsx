/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  Check,
  Lock,
  Mail,
  MessageSquare,
} from 'lucide-react';
import { PageHeader, StatusBadge } from './PortalPrimitives';
import { ErrorState, LoadingState } from './StateViews';
import { getStudentPanelAppointment } from '../services';
import { StudentPanelAppointmentView } from '../types';
import { formatWaitingText } from '../utils/workflowAgeing';
import { getPanelReadinessCopy } from '../utils/panelReadiness';

interface StudentPanelAppointmentProps {
  onShowFAQChatbot?: () => void;
}

const getInitials = (name?: string | null) =>
  (name || 'Panel Member')
    .split(' ')
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase();

const InfoItem: React.FC<{ label: string; value?: string | null; mono?: boolean }> = ({
  label,
  value,
  mono = false,
}) => (
  <div className="space-y-1">
    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
      {label}
    </span>
    <span className={`text-xs font-extrabold text-slate-800 block mt-1.5 ${mono ? 'font-mono' : ''}`}>
      {value || 'Not available yet'}
    </span>
  </div>
);

export const StudentPanelAppointment: React.FC<StudentPanelAppointmentProps> = ({
  onShowFAQChatbot,
}) => {
  const [appointment, setAppointment] = useState<StudentPanelAppointmentView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAppointment = useCallback(() => {
    setLoading(true);
    setError(null);
    getStudentPanelAppointment()
      .then(setAppointment)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load panel appointment.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadAppointment();
  }, [loadAppointment]);

  const isConfirmed = appointment?.status === 'CONFIRMED';
  const readinessCopy = appointment
    ? getPanelReadinessCopy(appointment.readinessState)
    : null;
  const panelInitials = useMemo(
    () => getInitials(appointment?.panelMemberName),
    [appointment?.panelMemberName],
  );

  if (loading) {
    return (
      <div id="student-panel-app-workspace" className="space-y-6 text-left font-sans pb-12">
        <PageHeader
          title="Panel Appointment"
          subtitle="Track faculty processing and view your appointed panel once confirmed."
          className="border-b border-slate-100 pb-5 select-none"
        />
        <LoadingState message="Loading your panel appointment..." />
      </div>
    );
  }

  if (error || !appointment) {
    return (
      <div id="student-panel-app-workspace" className="space-y-6 text-left font-sans pb-12">
        <PageHeader
          title="Panel Appointment"
          subtitle="Track faculty processing and view your appointed panel once confirmed."
          className="border-b border-slate-100 pb-5 select-none"
        />
        <ErrorState message={error || 'Panel appointment record was not available.'} onRetry={loadAppointment} />
      </div>
    );
  }

  return (
    <div id="student-panel-app-workspace" className="space-y-6 text-left font-sans pb-12">
      <PageHeader
        title="Panel Appointment"
        subtitle="Track faculty processing and view your appointed panel once confirmed."
        className="border-b border-slate-100 pb-5 select-none"
      />

      {!isConfirmed ? (
        <>
          <div id="panel-status-card" className="bg-white border border-[#e2e8f0]/80 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-3xs relative overflow-hidden">
            <div className="space-y-4 flex-1">
              <div>
                <StatusBadge tone="warning" dot pulse>Pending</StatusBadge>
              </div>

              <div className="space-y-2 text-left">
                <h2 className="text-xl md:text-2xl font-black text-brand-navy tracking-tight">
                  {readinessCopy?.title}
                </h2>
                <p className="text-slate-500 text-xs md:text-sm font-semibold leading-relaxed max-w-2xl">
                  {readinessCopy?.detail}
                </p>
              </div>

              <div className="h-[1px] bg-slate-100" />

              <div className="flex flex-wrap gap-x-8 gap-y-4 text-left select-none">
                <InfoItem label="Programme" value={appointment.programme} />
                <InfoItem label="Current Progress" value={formatWaitingText(appointment)} />
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500">
                    <Calendar className="w-4 h-4 text-brand-navy" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block leading-none">
                      Semester
                    </span>
                    <span className="text-xs font-extrabold text-slate-800 block mt-1.5 font-mono">
                      {appointment.semester}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="shrink-0 w-full md:w-52 bg-slate-50/70 border border-slate-100 rounded-2xl p-6 flex flex-col items-center justify-center min-h-[140px] select-none text-center">
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-indigo-50 border border-slate-200 flex items-center justify-center text-indigo-500 shadow-3xs mx-auto">
                  <Lock className="w-5 h-5 stroke-[2.3]" />
                </div>
                <span className="absolute bottom-0 right-1/2 translate-x-5 translate-y-1 w-5 h-5 bg-amber-500 text-white rounded-full flex items-center justify-center border-2 border-white text-[9px] font-black">
                  !
                </span>
              </div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-3.5 block">
                Awaiting Confirmation
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            <div className="lg:col-span-7 bg-white border border-[#e2e8f0]/80 rounded-2xl p-6 flex flex-col justify-between shadow-3xs relative min-h-[340px]">
              <div className="w-full flex-grow flex flex-col items-center justify-center text-center max-w-sm mx-auto p-4 space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 shadow-2xs">
                  <Lock className="w-6 h-6 stroke-[1.8]" />
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-base font-black text-brand-navy tracking-tight">
                    Appointed Panel Not Confirmed
                  </h3>
                  <p className="text-slate-400 text-xs font-medium leading-relaxed">
                    Panel member details remain private while faculty processing is in progress.
                  </p>
                </div>

                <div className="w-full pt-4 space-y-2 select-none pointer-events-none">
                  <div className="h-9 w-full bg-slate-50 border border-slate-100 rounded-xl" />
                  <div className="h-9 w-full bg-slate-50 border border-dashed border-slate-200/60 rounded-xl" />
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 bg-brand-navy text-white rounded-2xl p-6 flex flex-col justify-between shadow-sm relative overflow-hidden select-none">
              <div className="absolute right-0 bottom-0 translate-x-10 translate-y-10 opacity-5 pointer-events-none">
                <Lock className="w-48 h-48" />
              </div>

              <div className="space-y-6">
                <div className="space-y-1">
                  <h3 className="text-base font-black tracking-tight text-white">
                    What Happens Next?
                  </h3>
                  <p className="text-[#a5b4fc]/60 text-[10px] uppercase font-bold tracking-widest font-mono">
                    Panel Appointment Progress
                  </p>
                </div>

                {[
                  ['1', 'Faculty Processing', 'The faculty reviews and processes the appointment through its internal workflow.'],
                  ['2', 'Appointment Confirmation', 'Your appointment becomes visible here once processing is complete.'],
                  ['3', 'Panel Details Available', 'You can then view the confirmed panel member and appointment information.'],
                ].map(([step, title, copy]) => (
                  <div key={step} className="flex gap-4 items-start">
                    <div className="w-6 h-6 rounded-full bg-slate-800 text-indigo-300 flex items-center justify-center text-[10px] font-black shrink-0 border border-slate-700">
                      {step}
                    </div>
                    <div className="space-y-0.5 text-left">
                      <h4 className="text-xs font-extrabold text-white">{title}</h4>
                      <p className="text-[11px] text-[#a5b4fc]/85 leading-relaxed">{copy}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          <div id="panel-confirmed-summary-card" className="bg-white border border-[#e2e8f0]/80 rounded-2xl p-6 md:p-8 shadow-3xs text-left">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-5 flex-1">
                <StatusBadge tone="success" dot>Confirmed</StatusBadge>

                <div className="space-y-2">
                  <h2 className="text-xl md:text-2xl font-black text-brand-navy tracking-tight">
                    Panel appointment confirmed
                  </h2>
                  <p className="text-slate-500 text-xs md:text-sm font-semibold max-w-2xl">
                    Your appointed panel member and appointment details are shown below.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                  <div className="w-16 h-16 rounded-full bg-brand-navy text-white flex items-center justify-center font-black text-xl tracking-normal shadow-sm select-none shrink-0">
                    {panelInitials}
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                      Appointed Panel
                    </span>
                    <h3 className="text-base md:text-lg font-black text-slate-900 leading-tight mt-1">
                      {appointment.panelMemberName}
                    </h3>
                    <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-wider">
                      {appointment.panelMemberDepartment || 'Department not recorded'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="w-full lg:w-[360px] rounded-2xl border border-slate-100 bg-white p-5 shadow-2xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
                  <InfoItem label="Appointed Date" value={appointment.appointmentDate} mono />
                  <InfoItem label="Programme" value={appointment.programme} />
                  <InfoItem label="Semester" value={appointment.semester} mono />
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-5 border-t border-slate-100 pt-6">
              <div className="lg:col-span-5 space-y-1">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                  Panel Email
                </span>
                {appointment.panelMemberEmail ? (
                  <a
                    href={`mailto:${appointment.panelMemberEmail}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-navy hover:text-brand-navy/80 transition mt-1.5 font-mono"
                  >
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="border-b border-dashed border-slate-300">{appointment.panelMemberEmail}</span>
                  </a>
                ) : (
                  <span className="text-xs font-extrabold text-slate-800 block mt-1.5">Not available yet</span>
                )}
              </div>

              <div className="lg:col-span-7 space-y-1">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                  Research Title
                </span>
                <p className="text-xs md:text-sm font-bold text-slate-800 leading-relaxed mt-1.5">
                  {appointment.researchTitle}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#e2e8f0]/80 rounded-2xl p-5 shadow-3xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-brand-navy shrink-0">
                <Check className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-sm font-black text-brand-navy">Something looks incorrect?</h3>
                <p className="text-xs font-semibold text-slate-500 mt-1">
                  Use the FAQ chatbot for quick panel appointment guidance.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onShowFAQChatbot}
              className="inline-flex items-center justify-center gap-1.5 bg-brand-navy hover:bg-slate-900 text-white font-black text-xs uppercase tracking-wider px-5 py-3 rounded-xl transition cursor-pointer shadow-3xs"
            >
              <MessageSquare className="w-4 h-4 text-white stroke-[2.3]" />
              <span>Open FAQ Chatbot</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};
