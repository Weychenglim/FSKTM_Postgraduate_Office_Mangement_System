/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Users, 
  Download, 
  Eye, 
  Plus, 
  HelpCircle, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Mail,
  Award,
  BookOpen,
  Calendar,
  Layers,
  FileText,
  Building,
  Key
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SupervisorAppointmentApplicationPage } from './SupervisorAppointmentApplicationPage';

interface StudentSupervisorAppointmentProps {
  onShowFAQChatbot?: () => void;
}

export const StudentSupervisorAppointment: React.FC<StudentSupervisorAppointmentProps> = ({
  onShowFAQChatbot
}) => {
  const [subview, setSubview] = useState<'overview' | 'new-application'>('overview');

  // Mock data for the submitted applications
  const [applications, setApplications] = useState([
    {
      id: 'SV-APP-2026-001',
      title: 'AI-Based Academic Workflow Monitoring',
      supervisor: 'Dr. Siti Noor',
      date: '15 Nov 2025',
      status: 'PENDING REVIEW'
    },
    {
      id: 'SV-APP-2026-002',
      title: 'Postgraduate Evaluation Management Sys',
      supervisor: 'Assoc. Prof. Henry Lim',
      date: '10 Oct 2025',
      status: 'RETURNED'
    },
    {
      id: 'SV-APP-2025-014',
      title: 'Student Portal Usability Study',
      supervisor: 'Prof. Dr. Ahmad Kamil',
      date: '01 Aug 2024',
      status: 'APPROVED'
    }
  ]);

  const [activeDetailAp, setActiveDetailAp] = useState<any | null>(null);

  const handleDownloadLetter = (docName: string) => {
    alert(`Downloading Official Confirmation Letter: ${docName}`);
  };

  const handleCreateNewApplication = () => {
    setSubview('new-application');
  };

  if (subview === 'new-application') {
    return (
      <SupervisorAppointmentApplicationPage
        onBack={() => setSubview('overview')}
        onSuccess={(newApp) => {
          setApplications(prev => [newApp, ...prev]);
          setSubview('overview');
        }}
      />
    );
  }

  return (
    <div id="student-supervisor-app-workspace" className="space-y-6 text-left font-sans pb-12">
      
      {/* Page Title & Header row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="page-title">
            Supervisor Appointment
          </h1>
          <p className="page-subtitle">
            View your current supervisor details and track submitted supervisor appointment applications.
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. HERO SECTION: CURRENT APPROVED SUPERVISOR CARD                        */}
      {/* ========================================================================= */}
      <div 
        id="hero-supervisor-container" 
        className="bg-white border-2 border-indigo-100 rounded-2xl shadow-3xs p-5 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden transition hover:shadow-xs"
      >
        {/* Subtle top banner strip matching university royal slate */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-brand-navy" />

        {/* Dynamic Watermark Indicator */}
        <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 opacity-5 select-none pointer-events-none">
          <Users className="w-64 h-64 text-brand-navy" />
        </div>

        {/* Left pane: Avatar & Identity block */}
        <div className="flex items-start md:items-center gap-5 min-w-0">
          {/* Circular initials badge */}
          <div className="relative shrink-0 select-none">
            <div className="w-18 h-18 md:w-22 md:h-22 rounded-full bg-brand-navy text-white flex items-center justify-center text-xl md:text-2xl font-black shadow-sm border-3 border-indigo-50/50">
              SN
            </div>
            {/* Active Status indicator badge */}
            <span className="absolute bottom-1 right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full shadow-sm animate-pulse" />
          </div>

          <div className="space-y-1.5 min-w-0">
            {/* Head info role & Badge row */}
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight block">
                Dr. Siti Noor
              </h2>
              <span className="bg-[#e6fbf2] text-[#00a15c] border border-[#bef5db] text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full flex items-center gap-1 select-none">
                <CheckCircle className="w-3 h-3" />
                <span>Approved</span>
              </span>
            </div>

            <p className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-slate-400" />
              <span>Faculty of Computing & Information Technology</span>
            </p>

            <div className="pt-1.5 flex flex-wrap gap-x-4 gap-y-2 text-[10px] font-black uppercase tracking-widest text-brand-navy/60">
              <span className="bg-slate-100 px-2.5 py-1 rounded-lg">ID: FSKTM-SV-8491</span>
              <span className="bg-slate-100 px-2.5 py-1 rounded-lg">Email: sitinoor@um.edu.my</span>
            </div>
          </div>
        </div>

        {/* Middle pane: Technical Research Area Details */}
        <div className="flex-1 max-w-xl grid grid-cols-1 sm:grid-cols-2 gap-4 border-t md:border-t-0 md:border-l border-slate-100 pt-5 md:pt-0 md:pl-6 text-left">
          <div className="space-y-1">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1 leading-none">
              <Layers className="w-3 h-3 text-slate-400" />
              <span>Research Area</span>
            </span>
            <span className="text-xs font-extrabold text-slate-800 block">
              Cybersecurity & Cryptography
            </span>
          </div>

          <div className="space-y-1">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1 leading-none">
              <Calendar className="w-3 h-3 text-slate-400" />
              <span>Appointment Date</span>
            </span>
            <span className="text-xs font-semibold text-slate-700 block font-mono">
              12 Oct 2024
            </span>
          </div>

          <div className="space-y-1">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1 leading-none">
              <BookOpen className="w-3 h-3 text-slate-400" />
              <span>Semester Allocated</span>
            </span>
            <span className="text-xs font-extrabold text-slate-800 block">
              Sem 1 2024/2025
            </span>
          </div>

          <div className="space-y-1 sm:col-span-2">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1 leading-none">
              <FileText className="w-3 h-3 text-slate-400" />
              <span>Current Approved Research Title</span>
            </span>
            <span className="text-xs font-extrabold text-brand-navy block italic leading-tight">
              &ldquo;Secure Cloud Architecture for Academic Data&rdquo;
            </span>
          </div>
        </div>

        {/* Right pane: Action buttons stack */}
        <div className="flex flex-col gap-2 shrink-0 md:w-56">
          <button
            type="button"
            onClick={() => handleDownloadLetter('Supervisor_Appointment_Letter_SitiNoor.pdf')}
            className="w-full inline-flex items-center justify-center gap-2 bg-brand-navy hover:bg-slate-850 text-white py-2.5 px-4 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all shadow-3xs cursor-pointer hover:-translate-y-0.5 active:translate-y-0"
          >
            <Download className="w-4 h-4 stroke-[2.2]" />
            <span>Download Letter</span>
          </button>
          
          <button
            type="button"
            onClick={() => {
              setActiveDetailAp({
                id: 'SV-APP-2025-014',
                supervisor: 'Dr. Siti Noor',
                email: 'sitinoor@um.edu.my',
                dept: 'Faculty of Computing & Information Technology',
                title: 'Secure Cloud Architecture for Academic Data',
                reg: 'WEA200192',
                refId: 'FSKTM-SV-REF-2024-819',
                status: 'APPROVED',
                submittedDate: '01 Aug 2024',
                step1Date: '01 Aug 2024, 08:00 AM',
                history: [
                  { step: 'Student Submission', date: '01 Oct 2024', status: 'Completed' },
                  { step: 'Department Verification', date: '04 Oct 2024', status: 'Approved' },
                  { step: 'Postgraduate Committee Approval', date: '12 Oct 2024', status: 'Official letters dispatched' }
                ]
              });
            }}
            className="w-full inline-flex items-center justify-center gap-2 bg-[#f8fafc] hover:bg-slate-100 text-slate-700 border border-slate-205 border-slate-200 py-2.5 px-4 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all shadow-3xs cursor-pointer hover:-translate-y-0.5 active:translate-y-0"
          >
            <Eye className="w-4 h-4 stroke-[2.2]" />
            <span>View Details</span>
          </button>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 2. MAIN SECTION: SUBMITTED APPLICATIONS HISTORY TABLE                    */}
      {/* ========================================================================= */}
      <div className="bg-white border border-[#e2e8f0]/80 rounded-2xl overflow-hidden shadow-3xs">
        
        {/* Table header row */}
        <div className="bg-slate-50/50 border-b border-slate-100 px-6 py-4.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-0.5 text-left select-none">
            <h3 className="text-sm font-bold text-brand-navy uppercase tracking-wider">
              Submitted Supervisor Appointment Applications
            </h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Track historical applications and statuses
            </p>
          </div>

          <button
            type="button"
            onClick={handleCreateNewApplication}
            className="inline-flex items-center gap-1.5 bg-brand-navy hover:bg-slate-850 text-white py-2 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition shadow-3xs cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>New Application</span>
          </button>
        </div>

        {/* Data Table implementation */}
        <div className="overflow-x-auto">
              <table className="data-table min-w-[700px] text-xs">
            <thead>
              <tr className="border-b border-slate-100 font-bold text-slate-400 text-[10px] uppercase tracking-wider select-none bg-slate-50/20">
                <th className="py-4 px-6 w-32">Application ID</th>
                <th className="py-4 px-4 w-2/5">Research Title</th>
                <th className="py-4 px-4">Proposed Supervisor</th>
                <th className="py-4 px-4 w-28">Submitted Date</th>
                <th className="py-4 px-4 w-32 text-center">Status</th>
                <th className="py-4 px-6 w-20 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 font-sans text-slate-700">
              {applications.map((app) => (
                <tr key={app.id} className="hover:bg-slate-50/30 transition">
                  {/* ID */}
                  <td className="py-4.5 px-6 font-mono font-bold text-brand-navy">
                    {app.id}
                  </td>
                  {/* Title */}
                  <td className="py-4.5 px-4 font-semibold text-slate-800 leading-relaxed">
                    {app.title}
                  </td>
                  {/* Supervisor name */}
                  <td className="py-4.5 px-4 font-extrabold text-slate-700">
                    {app.supervisor}
                  </td>
                  {/* Date */}
                  <td className="py-4.5 px-4 font-semibold text-slate-500 font-mono">
                    {app.date}
                  </td>
                  {/* Status chip badge */}
                  <td className="py-4.5 px-4 text-center">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border select-none ${
                      app.status === 'APPROVED' ? 'bg-[#e6fbf2] text-[#00a15c] border-[#bef5db]' :
                      app.status === 'RETURNED' ? 'bg-orange-50 text-orange-600 border-orange-200' :
                      'bg-indigo-50 text-indigo-600 border-[#cbd5e1]'
                    }`}>
                      <span className={`w-1 h-1 rounded-full ${
                        app.status === 'APPROVED' ? 'bg-[#00a15c]' :
                        app.status === 'RETURNED' ? 'bg-orange-500' :
                        'bg-indigo-500 animate-pulse'
                      }`} />
                      {app.status}
                    </span>
                  </td>
                  {/* Action Link Icon */}
                  <td className="py-4.5 px-6 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveDetailAp({
                          id: app.id,
                          supervisor: app.supervisor,
                          email: app.supervisor.toLowerCase().includes('siti') ? 'sitinoor@um.edu.my' : 'henrylim@um.edu.my',
                          dept: 'Faculty of Computing & Information Technology',
                          title: app.title,
                          reg: 'WEA200192',
                          refId: `FSKTM-SV-REF-${app.id.split('-').pop()}`,
                          status: app.status,
                          submittedDate: app.date,
                          step1Date: `${app.date}, 09:30 AM`,
                          history: app.status === 'APPROVED' ? [
                            { step: 'Student Submission', date: app.date, status: 'Completed' },
                            { step: 'Secretariat Verification', date: '18 Nov 2025', status: 'Approved' }
                          ] : app.status === 'RETURNED' ? [
                            { step: 'Student Submission', date: app.date, status: 'Completed' },
                            { step: 'Panel Review Committee', date: '15 Oct 2025', status: 'Returned for draft structure edits' }
                          ] : [
                            { step: 'Student Submission', date: app.date, status: 'Awaiting agenda scheduling' }
                          ]
                        });
                      }}
                      className="p-1.5 bg-slate-50 hover:bg-slate-200/50 rounded-lg text-slate-500 hover:text-brand-navy transition cursor-pointer inline-flex items-center justify-center"
                      title="View application metadata"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 3. SUPPORTING MATERIAL CARDS AT THE BOTTOM                                 */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1: Eligibility Status */}
        <div className="bg-[#e0f2fe]/40 border border-sky-100 rounded-2xl p-5 shadow-3xs">
          <div className="w-10 h-10 rounded-xl bg-sky-100/70 border border-sky-200/40 flex items-center justify-center text-sky-600 mb-4">
            <Key className="w-5 h-5 stroke-[2.3]" />
          </div>
          <h4 className="text-xs font-black text-brand-navy uppercase tracking-wider mb-2">
            Eligibility Status
          </h4>
          <p className="text-slate-500 text-xs font-semibold leading-relaxed">
            Your current Credit hours and CGPA meet the minimum faculty requirements for supervisor appointment.
          </p>
        </div>

        {/* Card 2: Review Timeline */}
        <div className="bg-[#f3e8ff]/40 border border-[#e9d5ff]/70 rounded-2xl p-5 shadow-3xs">
          <div className="w-10 h-10 rounded-xl bg-purple-100/70 border border-purple-200/40 flex items-center justify-center text-purple-600 mb-4">
            <Clock className="w-5 h-5 stroke-[2.3]" />
          </div>
          <h4 className="text-xs font-black text-brand-navy uppercase tracking-wider mb-2">
            Review Timeline
          </h4>
          <p className="text-slate-500 text-xs font-semibold leading-relaxed">
            Applications are typically reviewed within <strong className="text-slate-800 font-extrabold">7-10 working days</strong> by the Postgraduate Academic Committee.
          </p>
        </div>

        {/* Card 3: Need Assistance */}
        <div className="bg-white border border-[#e2e8f0]/80 rounded-2xl p-5 shadow-3xs">
          <div className="w-10 h-10 rounded-xl bg-indigo-55 bg-indigo-50 border border-slate-100 flex items-center justify-center text-indigo-600 mb-4">
            <HelpCircle className="w-5 h-5 stroke-[2.3]" />
          </div>
          <h4 className="text-xs font-black text-brand-navy uppercase tracking-wider mb-2">
            Need Assistance?
          </h4>
          <p className="text-slate-500 text-xs font-semibold leading-relaxed mb-3">
            Contact the FSKTM Office Directory or use our FAQ Chatbot for technical system issues.
          </p>
          
          <button
            type="button"
            onClick={onShowFAQChatbot}
            className="text-sky-600 hover:text-sky-800 text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-1.5 group cursor-pointer"
          >
            <span>Launch FAQ Chatbot</span>
            <span className="group-hover:translate-x-0.5 transition-transform font-sans">&rarr;</span>
          </button>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* APPROVAL WORKFLOW DRAWER (RIGHT-SIDE SLIDING PANEL OVERLAY)              */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {activeDetailAp && (
          <div className="fixed inset-0 z-50 flex justify-end">
            {/* Dimmed background overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveDetailAp(null)}
              className="absolute inset-0 bg-brand-navy/40 backdrop-blur-3xs cursor-pointer"
            />
            
            {/* Sliding Drawer Container */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative w-full max-w-md md:max-w-md bg-white h-full shadow-sm border-l border-slate-100 flex flex-col text-left z-10"
            >
              
              {/* Drawer Header Area */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0 select-none">
                <h3 className="text-lg font-black text-brand-navy tracking-tight">
                  Approval Workflow
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveDetailAp(null)}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition cursor-pointer"
                  title="Close Drawer"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Drawer Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* Application metadata summary card */}
                <div className="bg-[#f0f5ff]/60 border border-indigo-50/70 rounded-2xl p-4.5 space-y-3 shadow-3xs select-none">
                  <div className="grid grid-cols-2 gap-3 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    <div>
                      <span className="block leading-none">App ID</span>
                      <span className="block text-slate-800 font-extrabold text-xs font-mono mt-1">{activeDetailAp.id}</span>
                    </div>
                    <div>
                      <span className="block leading-none">Supervisor</span>
                      <span className="block text-slate-800 font-extrabold text-xs mt-1">{activeDetailAp.supervisor}</span>
                    </div>
                  </div>

                  <div className="h-[1px] bg-slate-200/50" />

                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block leading-none">Research Title</span>
                    <span className="text-xs font-bold text-slate-800 italic leading-snug block">
                      &ldquo;{activeDetailAp.title}&rdquo;
                    </span>
                  </div>

                  <div className="h-[1px] bg-slate-200/50" />

                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block leading-none">Submitted Date</span>
                    <span className="text-xs font-bold text-slate-700 block font-mono">
                      {activeDetailAp.submittedDate || '15 Nov 2025'}
                    </span>
                  </div>
                </div>

                {/* Workflow Timeline Section */}
                <div className="space-y-4">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mt-1 select-none">
                    Progress Timeline
                  </span>

                  <div className="relative pl-7 space-y-8 py-2">
                    {/* Continuous vertical timeline connector line */}
                    <div className="absolute left-3 top-4 bottom-4 w-[2px] bg-slate-200" />

                    {/* Timeline Step 1: Application Submitted */}
                    <div className="relative text-left">
                      {/* Step Indicator status icon inside timeline */}
                      <div className="absolute -left-7 top-0.5 w-[18px] h-[18px] rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-xs z-10">
                        <svg className="w-3 h-3 stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-800 leading-tight">
                          Application Submitted
                        </h4>
                        <p className="text-[11px] text-slate-500 font-medium font-mono mt-0.5 select-all">
                          {activeDetailAp.step1Date || '15 Nov 2025, 09:30 AM'}
                        </p>
                      </div>
                    </div>

                    {/* Timeline Step 2: Supervisor Review */}
                    <div className="relative text-left">
                      {/* State-dependent styling for Step 2 */}
                      {activeDetailAp.status === 'APPROVED' ? (
                        <div className="absolute -left-7 top-0.5 w-[18px] h-[18px] rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-xs z-10">
                          <svg className="w-3 h-3 stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      ) : activeDetailAp.status === 'RETURNED' ? (
                        <div className="absolute -left-7 top-0.5 w-[18px] h-[18px] rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-xs z-10">
                          <svg className="w-3 h-3 stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      ) : (
                        /* Pending review (Active Highlighted Step) */
                        <div className="absolute -left-[29px] top bg-white -mt-0.5 w-6 h-6 rounded-full border-4 border-brand-navy flex items-center justify-center shadow-xs z-10">
                          <span className="w-2 h-2 rounded-full bg-brand-navy" />
                        </div>
                      )}

                      <div className="pl-0.5">
                        <h4 className={`text-xs font-black leading-tight ${
                          activeDetailAp.status === 'PENDING REVIEW' ? 'text-slate-800' : 'text-slate-800'
                        }`}>
                          Supervisor Review
                        </h4>
                        <p className={`text-[11px] font-medium mt-0.5 leading-normal ${
                          activeDetailAp.status === 'PENDING REVIEW' 
                            ? 'text-slate-500' 
                            : 'text-slate-500'
                        }`}>
                          {activeDetailAp.status === 'APPROVED' ? (
                            <span>Approved by {activeDetailAp.supervisor}</span>
                          ) : activeDetailAp.status === 'RETURNED' ? (
                            <span>Reviewed by {activeDetailAp.supervisor}</span>
                          ) : (
                            <span>Awaiting response from {activeDetailAp.supervisor}</span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Timeline Step 3: Programme Coordinator Approval */}
                    <div className="relative text-left">
                      {/* State-dependent styling for Step 3 */}
                      {activeDetailAp.status === 'APPROVED' ? (
                        <div className="absolute -left-7 top-0.5 w-[18px] h-[18px] rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-xs z-10">
                          <svg className="w-3 h-3 stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      ) : activeDetailAp.status === 'RETURNED' ? (
                        /* Current point of friction: Returned with feedback comments */
                        <div className="absolute -left-[29px] top bg-white -mt-0.5 w-6 h-6 rounded-full border-4 border-orange-500 flex items-center justify-center shadow-xs z-10">
                          <span className="w-2 h-2 rounded-full bg-orange-500" />
                        </div>
                      ) : (
                        /* Muted future Pending indicator */
                        <div className="absolute -left-7 top-0.5 w-[18px] h-[18px] rounded-full bg-[#f0f5ff] text-[#a5b4fc] border border-slate-200/60 flex items-center justify-center text-[10px] font-black z-10 select-none">
                          3
                        </div>
                      )}

                      <div>
                        <h4 className={`text-xs font-black leading-tight ${
                          activeDetailAp.status === 'APPROVED' ? 'text-slate-800' :
                          activeDetailAp.status === 'RETURNED' ? 'text-orange-600' : 'text-slate-400'
                        }`}>
                          Programme Coordinator Approval
                        </h4>
                        <p className={`text-[11px] font-medium mt-0.5 leading-normal ${
                          activeDetailAp.status === 'APPROVED' ? 'text-slate-500' :
                          activeDetailAp.status === 'RETURNED' ? 'text-slate-500' : 'text-slate-400'
                        }`}>
                          {activeDetailAp.status === 'APPROVED' ? (
                            <span>Approved by Postgraduate Coordinator</span>
                          ) : activeDetailAp.status === 'RETURNED' ? (
                            <span>Returned: &ldquo;Please restructure the research scope section and select standard methodologies.&rdquo;</span>
                          ) : (
                            <span>Pending</span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Timeline Step 4: Letter Generated */}
                    <div className="relative text-left">
                      {/* State-dependent styling for Step 4 */}
                      {activeDetailAp.status === 'APPROVED' ? (
                        <div className="absolute -left-7 top-0.5 w-[18px] h-[18px] rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-xs z-10">
                          <svg className="w-3 h-3 stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      ) : (
                        /* Muted future Pending indicator */
                        <div className="absolute -left-7 top-0.5 w-[18px] h-[18px] rounded-full bg-[#f0f5ff] text-[#a5b4fc] border border-slate-200/60 flex items-center justify-center text-[10px] font-black z-10 select-none">
                          4
                        </div>
                      )}

                      <div>
                        <h4 className={`text-xs font-black leading-tight ${
                          activeDetailAp.status === 'APPROVED' ? 'text-slate-800' : 'text-slate-400'
                        }`}>
                          Letter Generated
                        </h4>
                        <p className={`text-[11px] font-medium mt-0.5 leading-normal ${
                          activeDetailAp.status === 'APPROVED' ? 'text-slate-500' : 'text-slate-400'
                        }`}>
                          {activeDetailAp.status === 'APPROVED' ? (
                            <span>Official appointment letter generated &amp; signed off</span>
                          ) : (
                            <span>Pending</span>
                          )}
                        </p>
                      </div>
                    </div>

                  </div>
                </div>

              </div>

              {/* Drawer Sticky Footer Actions Block */}
              <div className="p-6 border-t border-slate-100 bg-slate-50/50 space-y-2 shrink-0 select-none">
                <button
                  type="button"
                  onClick={() => alert(`Downloading documents package for: ${activeDetailAp.id}`)}
                  className="w-full inline-flex items-center justify-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 py-2.5 px-4 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer shadow-3xs"
                >
                  <Download className="w-4 h-4 stroke-[2]" />
                  <span>Download Submitted Documents</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (activeDetailAp.status === 'RETURNED') {
                      alert('Feedback comments:\n"Returned on 15 Oct 2025. Reason: The research proposal title requires a simplified scope. Consider focus on modern evaluation schemas rather than standard database pipelines alone."');
                    } else {
                      alert('Feedback comments:\n"No active system discrepancies found. Approved automatically upon coordinator review."');
                    }
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-brand-navy py-2.5 px-4 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer shadow-3xs z-50Close"
                >
                  <svg className="w-4 h-4 text-brand-navy stroke-[2]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <span>View Comments</span>
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
