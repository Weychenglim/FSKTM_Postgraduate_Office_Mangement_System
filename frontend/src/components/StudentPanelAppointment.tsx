/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Lock, 
  HelpCircle, 
  User, 
  Calendar, 
  MessageSquare, 
  ChevronRight, 
  ShieldAlert,
  Clock,
  CheckCircle,
  FileText,
  Mail,
  ExternalLink,
  ShieldCheck,
  Check
} from 'lucide-react';
import { motion } from 'motion/react';
import { PageHeader, SegmentedControl, StatusBadge, StatusDot } from './PortalPrimitives';

interface StudentPanelAppointmentProps {
  onShowFAQChatbot?: () => void;
}

export const StudentPanelAppointment: React.FC<StudentPanelAppointmentProps> = ({
  onShowFAQChatbot
}) => {
  // Let the user toggle between Confirmed State and Pending State for full interactive testing
  const [isConfirmedState, setIsConfirmedState] = useState<boolean>(true);

  return (
    <div id="student-panel-app-workspace" className="space-y-6 text-left font-sans pb-12">
      
      <PageHeader
        title="Panel Appointment"
        subtitle="View your approved panel appointment details once they are released."
        className="border-b border-slate-100 pb-5 select-none"
        actions={(
          <SegmentedControl
            options={['Pending View', 'Confirmed View'] as const}
            value={isConfirmedState ? 'Confirmed View' : 'Pending View'}
            onChange={(value) => setIsConfirmedState(value === 'Confirmed View')}
          />
        )}
      />

      {/* ========================================================================= */}
      {/* 2. DYNAMIC WORKSPACE SWITCH BASED ON RELEASE STATUS STATE                 */}
      {/* ========================================================================= */}
      
      {!isConfirmedState ? (
        /* =============================================== */
        /* PENDING STATE PAGE DESIGN                       */
        /* =============================================== */
        <>
          {/* Top Banner Card: Pending Panel Notification Status */}
          <div id="panel-status-card" className="bg-white border border-[#e2e8f0]/80 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-3xs relative overflow-hidden">
            
            <div className="space-y-4 flex-1">
              {/* Status Badge */}
              <div>
                <StatusBadge tone="warning" dot pulse>Pending</StatusBadge>
              </div>

              <div className="space-y-2 text-left">
                <h2 className="text-xl md:text-2xl font-black text-brand-navy tracking-tight">
                  Your panel appointment is not available yet.
                </h2>
                <p className="text-slate-500 text-xs md:text-sm font-semibold leading-relaxed max-w-2xl">
                  Your supervisor will recommend panel members for your evaluation. Once the recommendation is approved by the postgraduate committee, the confirmed panel details will appear here.
                </p>
              </div>

              <div className="h-[1px] bg-slate-100" />

              {/* Dynamic contextual attributes block */}
              <div className="flex flex-wrap gap-x-8 gap-y-4 text-left select-none">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500">
                    <User className="w-4 h-4 text-brand-navy" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block leading-none">
                      Supervisor
                    </span>
                    <span className="text-xs font-extrabold text-slate-800 block mt-1.5">
                      Dr. Siti Noor
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500">
                    <Calendar className="w-4 h-4 text-brand-navy" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block leading-none">
                      Semester
                    </span>
                    <span className="text-xs font-extrabold text-slate-800 block mt-1.5 font-mono">
                      Sem 1 2024/2025
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right side Lock Illustration element */}
            <div className="shrink-0 w-full md:w-52 bg-slate-50/70 border border-slate-100 rounded-2xl p-6 flex flex-col items-center justify-center min-h-[140px] select-none text-center">
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-indigo-50 border border-slate-200 flex items-center justify-center text-indigo-505 text-indigo-500 shadow-3xs mx-auto">
                  <Lock className="w-5 h-5 stroke-[2.3]" />
                </div>
                <span className="absolute bottom-0 right-1/2 translate-x-5 translate-y-1 w-5 h-5 bg-amber-500 text-white rounded-full flex items-center justify-center border-2 border-white text-[9px] font-black">
                  !
                </span>
              </div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-3.5 block">Awaiting Release</span>
            </div>

          </div>

          {/* Grid: 2-Column bottom section containing Placeholders and Steppers */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            
            {/* Column 1: Panel Details placeholder (7 cols) */}
            <div className="lg:col-span-7 bg-white border border-[#e2e8f0]/80 rounded-2xl p-6 flex flex-col justify-between shadow-3xs relative min-h-[380px]">
              
              <div className="w-full flex-grow flex flex-col items-center justify-center text-center max-w-sm mx-auto p-4 space-y-4">
                
                <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 shadow-2xs">
                  <Lock className="w-6 h-6 stroke-[1.8]" />
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-base font-black text-brand-navy tracking-tight">
                    Panel Details Not Released
                  </h3>
                  <p className="text-slate-400 text-xs font-medium leading-relaxed">
                    Approved panel members will be shown here after the appointment is confirmed. You will receive a notification when the panel appointment is released.
                  </p>
                </div>

                {/* Skeleton empty templates representation as shown in visual reference */}
                <div className="w-full pt-4 space-y-2 select-none pointer-events-none">
                  <div className="h-9 w-full bg-slate-50 border border-slate-100 rounded-xl" />
                  <div className="h-9 w-full bg-slate-50 border border-dashed border-slate-200/60 rounded-xl" />
                </div>

              </div>

            </div>

            {/* Column 2: What Happens Next? Dark Card Stepper (5 cols) */}
            <div className="lg:col-span-5 bg-brand-navy text-white rounded-2xl p-6 flex flex-col justify-between shadow-sm relative overflow-hidden select-none">
              {/* Subtle Watermark pattern overlay */}
              <div className="absolute right-0 bottom-0 translate-x-10 translate-y-10 opacity-5 pointer-events-none">
                <Lock className="w-48 h-48" />
              </div>

              <div className="space-y-6">
                <div className="space-y-1">
                  <h3 className="text-base font-black tracking-tight text-white font-sans">
                    What Happens Next?
                  </h3>
                  <p className="text-[#a5b4fc]/60 text-[10px] uppercase font-bold tracking-widest font-mono">
                    Evaluation Panel Flow Progress
                  </p>
                </div>

                {/* Static layout steps mapping */}
                <div className="space-y-5 flex-1 pt-2">
                  
                  {/* Step 1: Recommendation */}
                  <div className="flex gap-4 items-start">
                    <div className="w-6 h-6 rounded-full bg-slate-800 text-indigo-305 text-indigo-300 flex items-center justify-center text-[10px] font-black shrink-0 border border-slate-700">
                      1
                    </div>
                    <div className="space-y-0.5 text-left">
                      <h4 className="text-xs font-extrabold text-white">
                        Recommendation
                      </h4>
                      <p className="text-[11px] text-[#a5b4fc]/85 leading-relaxed">
                        Supervisor recommends qualified panel members for your committee.
                      </p>
                    </div>
                  </div>

                  {/* Step 2: Review & Approval */}
                  <div className="flex gap-4 items-start">
                    <div className="w-6 h-6 rounded-full bg-slate-800 text-indigo-305 text-indigo-300 flex items-center justify-center text-[10px] font-black shrink-0 border border-slate-700">
                      2
                    </div>
                    <div className="space-y-0.5 text-left">
                      <h4 className="text-xs font-extrabold text-white">
                        Review &amp; Approval
                      </h4>
                      <p className="text-[11px] text-[#a5b4fc]/85 leading-relaxed">
                        Appointment is reviewed and approved by the Postgraduate Committee.
                      </p>
                    </div>
                  </div>

                  {/* Step 3: Release */}
                  <div className="flex gap-4 items-start">
                    <div className="w-6 h-6 rounded-full bg-slate-800 text-indigo-305 text-indigo-300 flex items-center justify-center text-[10px] font-black shrink-0 border border-slate-700">
                      3
                    </div>
                    <div className="space-y-0.5 text-left">
                      <h4 className="text-xs font-extrabold text-white">
                        Release
                      </h4>
                      <p className="text-[11px] text-[#a5b4fc]/85 leading-relaxed">
                        Confirmed panel details are released to your portal.
                      </p>
                    </div>
                  </div>

                </div>
              </div>
            </div>

          </div>
        </>
      ) : (
        /* =============================================== */
        /* CONFIRMED RELEASE STATE PAGE DESIGN            */
        /* =============================================== */
        <>
          {/* Top Banner Confirmation Summary Card */}
          <div id="panel-confirmed-banner-card" className="bg-white border border-[#e2e8f0]/80 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-3xs relative overflow-hidden text-left">
            
            <div className="space-y-4 flex-1">
              {/* Status Badge: Approved */}
              <div>
                <StatusBadge tone="success" dot>Approved</StatusBadge>
              </div>

              {/* Verified Title Heading */}
              <div className="space-y-2">
                <h2 className="text-xl md:text-2.5xl font-black text-brand-navy tracking-tight">
                  Your panel appointment has been confirmed.
                </h2>
                <p className="text-slate-500 text-xs md:text-sm font-semibold">
                  Your assigned panel member is shown below.
                </p>
              </div>

              <div className="h-[1px] bg-slate-100" />

              {/* Meta information row details */}
              <div className="flex flex-wrap gap-x-8 gap-y-4 text-left select-none">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500">
                    <User className="w-4 h-4 text-brand-navy" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block leading-none">
                      Supervisor
                    </span>
                    <span className="text-xs font-extrabold text-slate-800 block mt-1.5">
                      Dr. Siti Noor
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500">
                    <Calendar className="w-4 h-4 text-brand-navy" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block leading-none">
                      Date
                    </span>
                    <span className="text-xs font-extrabold text-slate-800 block mt-1.5 font-mono">
                      22 Nov 2025
                    </span>
                  </div>
                </div>
              </div>

              {/* Action link */}
              <div className="pt-2">
                <a
                  href="mailto:postgraduate.fsktm@um.edu.my" 
                  className="inline-flex items-center gap-1.5 text-xs font-black text-indigo-600 hover:text-indigo-800 transition uppercase tracking-wider cursor-pointer"
                >
                  <span>Contact Office</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Right side Illustrated visual container mirroring the approved paper scroll in the mockup */}
            <div className="shrink-0 w-full md:w-52 bg-slate-50 border border-slate-200/60 rounded-2xl p-4 flex flex-col items-center justify-center min-h-[148px] select-none relative overflow-hidden text-center">
              <div className="absolute inset-0 bg-linear-to-tr from-indigo-50/20 to-transparent pointer-events-none" />
              
              {/* Complex Vector representation for Confirmed Stamp */}
              <div className="relative py-4">
                <div className="w-14 h-18 bg-white border border-slate-200 rounded-md shadow-xs flex flex-col justify-between p-2.5 relative rotate-3 mx-auto">
                  <div className="space-y-1">
                    <div className="h-1 w-full bg-slate-200 rounded-xs" />
                    <div className="h-1 w-3/4 bg-slate-200 rounded-xs" />
                  </div>
                  <div className="flex justify-end">
                    <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-2xs rotate-[-12deg]">
                      <Check className="w-4.5 h-4.5 stroke-[3]" />
                    </div>
                  </div>
                </div>
              </div>
              <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mt-2 block bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                Verified Appointment
              </span>
            </div>

          </div>

          {/* SECTION: ASSIGNED PANEL MEMBER DETAILS CARD */}
          <div className="space-y-3.5 text-left pt-2">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest block leading-none select-none">
              Assigned Panel Member
            </h3>

            <div className="bg-white border border-[#e2e8f0]/80 rounded-2xl p-6 md:p-8 shadow-3xs grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              
              {/* Profile avatar / initials (4 cols) */}
              <div className="md:col-span-4 flex flex-col items-center md:items-start text-center md:text-left gap-4 md:border-r md:border-slate-100 md:pr-6">
                <div className="w-20 h-20 rounded-full bg-brand-navy text-white flex items-center justify-center font-black text-2xl tracking-normal shadow-sm select-none">
                  AM
                </div>
                <div>
                  <h4 className="text-base font-black text-slate-900 leading-tight">
                    Assoc. Prof. Dr. Amina Malik
                  </h4>
                  <p className="text-xs font-bold text-slate-405 text-slate-400 mt-1 uppercase tracking-wider font-mono">
                    Data Science
                  </p>
                  
                  <span className="inline-flex mt-3.5 bg-indigo-50 border border-indigo-150 text-indigo-700 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full select-none">
                    Panel Member
                  </span>
                </div>
              </div>

              {/* Informational specs Grid block (8 cols) */}
              <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-y-5 gap-x-8 text-left pl-0 md:pl-4 self-start">
                
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                    Expertise
                  </span>
                  <div className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-lg text-xs font-bold text-slate-700 mt-1 select-none">
                    <StatusDot tone="brand" />
                    <span>Big Data Analytics</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                    Appointed Date
                  </span>
                  <span className="text-xs font-extrabold text-slate-800 block mt-1.5 font-mono">
                    22 Nov 2025
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                    Contact Email
                  </span>
                  <a 
                    href="mailto:amina.malik@fsktm.edu.my" 
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-navy hover:text-brand-navy/80 transition mt-1.5 font-mono"
                  >
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="border-b border-dashed border-slate-300">amina.malik@fsktm.edu.my</span>
                  </a>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                    Semester
                  </span>
                  <span className="text-xs font-extrabold text-slate-800 block mt-1.5 font-mono">
                    Sem 1 2025/2026
                  </span>
                </div>

              </div>

            </div>
          </div>

          {/* LOWER TWO-COLUMN GRID: APPOINTMENT INFO CARD + DARK ASSISTANCE CARD */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            
            {/* Left side detail list card (7 cols) */}
            <div className="lg:col-span-7 bg-white border border-[#e2e8f0]/80 rounded-2xl p-6 shadow-3xs flex flex-col justify-between">
              
              <div className="space-y-5 text-left">
                <h3 className="text-sm font-black text-brand-navy uppercase tracking-wider border-b border-slate-100 pb-3 select-none">
                  Appointment Information
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6">
                  
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                      Appointment ID
                    </span>
                    <span className="text-xs font-black text-slate-800 block font-mono bg-slate-50 px-2 py-1 rounded w-fit border border-slate-100 mt-1 select-all">
                      PN-2025-018
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                      Related Research Title
                    </span>
                    <span className="text-xs font-bold text-slate-800 block leading-normal pt-1">
                      Secure Cloud Architecture for Academic Data Management Systems
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                      Academic Session
                    </span>
                    <span className="text-xs font-extrabold text-slate-800 block mt-1.5 font-mono">
                      2025/2026
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                      Approved Date
                    </span>
                    <span className="text-xs font-extrabold text-slate-800 block mt-1.5 font-mono">
                      22 Nov 2025
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                      Semester
                    </span>
                    <span className="text-xs font-extrabold text-slate-800 block mt-1.5 font-mono">
                      Sem 1
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                      Released to Student
                    </span>
                    <span className="text-xs font-extrabold text-slate-800 block mt-1.5 font-mono">
                      23 Nov 2025
                    </span>
                  </div>

                </div>
              </div>

            </div>

            {/* Right side Need Assistance? dark layout card (5 cols) */}
            <div className="lg:col-span-5 bg-brand-navy text-white rounded-2xl p-6 flex flex-col justify-between shadow-sm relative overflow-hidden text-left select-none min-h-[290px]">
              
              <div className="space-y-4">
                
                <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700/85 flex items-center justify-center text-indigo-300">
                  <HelpCircle className="w-5 h-5 stroke-[2.3]" />
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm md:text-base font-black tracking-tight text-white font-sans uppercase">
                    Need Assistance?
                  </h3>
                  <p className="text-[#a5b4fc]/80 text-[11px] font-medium leading-relaxed font-sans">
                    If any panel appointment detail appears incorrect, contact the postgraduate office or use the FAQ chatbot for immediate guidance.
                  </p>
                </div>

              </div>

              {/* Sticky action CTA trigger */}
              <div className="pt-6 sm:pt-4">
                <button
                  type="button"
                  onClick={onShowFAQChatbot}
                  className="w-full inline-flex items-center justify-center gap-1.5 bg-white hover:bg-slate-100 text-brand-navy font-black text-xs uppercase tracking-wider px-5 py-3 rounded-xl transition cursor-pointer shadow-3xs"
                >
                  <MessageSquare className="w-4 h-4 text-brand-navy stroke-[2.3]" />
                  <span>Open FAQ Chatbot</span>
                </button>
              </div>

            </div>

          </div>
        </>
      )}

    </div>
  );
};
