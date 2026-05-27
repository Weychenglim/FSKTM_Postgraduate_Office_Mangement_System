/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  ArrowLeft,
  Calendar,
  GraduationCap,
  Clock,
  User,
  CheckCircle2,
  FileText,
  Eye,
  Lock,
  ChevronRight,
  Shield,
  HelpCircle,
  Users,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface PanelDetailRecord {
  id: string;
  studentName: string;
  programme: string;
  semester: string;
  supervisor: string;
  panelMember: string;
  status: 'Approved' | 'No Panel' | 'Pending' | 'Recommendation' | 'Workload Alert' | 'Rejected';
  updatedDate: string;
}

interface PanelAppointmentDetailProps {
  onBack: () => void;
  record?: PanelDetailRecord | null;
}

export const PanelAppointmentDetail: React.FC<PanelAppointmentDetailProps> = ({ 
  onBack,
  record 
}) => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  // Safe defaults based on the high-fidelity screenshot
  const studentInitials = record?.studentName
    ? record.studentName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : 'SN';

  const defaultRecord = {
    id: record?.id || 'MEA2301184',
    studentName: record?.studentName || 'Sarah Natasha',
    programme: record?.programme || 'MSc. Computer Science',
    semester: record?.semester || 'Sem 1 2024/2025',
    email: 'sarah.natasha@student.fsktm.edu.my',
    status: record?.status || 'Approved',
    researchTitle: 'Blockchain-Based Verification Framework for Academic Credentials',
    area: 'Blockchain / Academic Credential Verification',
    abstract: 'This research explores how blockchain can be used to verify academic credentials securely, reduce document fraud, and improve trust in postgraduate academic records. By leveraging decentralized ledgers and smart contracts, the study aims to create a tamper-proof system for real-time validation of degrees and transcripts across international institutional boundaries.',
    appointmentId: 'SV-APT-2025-014',
    supervisor: record?.supervisor || 'Dr. Siti Noor',
    workload: '4/5 Supervisees',
    approvedDate: '13 Oct 2025',
    releasedDate: '14 Oct 2025',
    panelMember: record?.panelMember && record.panelMember !== 'Not Assigned' && record.panelMember !== 'Pending'
      ? record.panelMember 
      : 'Assoc. Prof. Dr. Amina Malik',
    panelInitials: record?.panelMember && record.panelMember !== 'Not Assigned' && record.panelMember !== 'Pending'
      ? record.panelMember.split(' ').filter(p => !p.includes('.')).map(n => n[0]).join('').substring(0, 2).toUpperCase()
      : 'AM',
    assignedDate: '22 Nov 2025'
  };

  return (
    <div id="panel-appointment-detail-root" className="space-y-8 animate-fade-in text-left font-sans">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 right-6 z-50 bg-[#0c1424] text-white py-3 px-5 rounded-xl shadow-xl flex items-center gap-3 text-xs font-bold font-sans border border-slate-700"
          >
            <div className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Back Link Nav & Title Row */}
      <div id="detail-nav-header" className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-2.5">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-[#0c1424] transition-colors focus:outline-none cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Panel Appointment Management</span>
          </button>
          
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#0c1424] tracking-tight">
            Panel Appointment Detail
          </h1>
          <p className="text-slate-500 text-xs md:text-sm mt-1 font-medium max-w-2xl">
            View student panel appointment details, appointment status, related records, and supporting documents.
          </p>
        </div>

        {/* Top-Right Badge Pattern */}
        <div className="self-start md:self-center">
          <span className="inline-flex items-center px-4 py-2 bg-[#0c1424] text-white text-[11px] font-black tracking-widest rounded-lg uppercase">
            SESSION 2024/2025
          </span>
        </div>
      </div>

      {/* Main Core Responsive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 items-start">
        
        {/* Left Section (Column Span 4): Student Profile, Appointment, Evaluation */}
        <div className="lg:col-span-4 space-y-6 md:space-y-8">
          
          {/* Card 1: Student Profile Summary Card */}
          <div id="student-profile-card" className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-3xs flex flex-col items-start space-y-5">
            <div className="flex items-center gap-4 w-full">
              {/* Profile Avatar Initials */}
              <div className="w-12 h-12 rounded-xl bg-blue-100 border border-blue-200 text-blue-700 flex items-center justify-center shrink-0 font-extrabold text-base font-sans">
                {studentInitials}
              </div>
              <div className="text-left space-y-1 overflow-hidden">
                <h3 className="font-extrabold text-[#0c1424] text-base truncate leading-tight">
                  {defaultRecord.studentName}
                </h3>
                {/* Status Indicator */}
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[9px] font-black tracking-wide uppercase rounded-full border border-emerald-100">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Approved</span>
                </div>
              </div>
            </div>

            {/* Properties fields */}
            <div className="w-full space-y-4 border-t border-slate-100 pt-5 text-left text-xs">
              <div>
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-0.5">
                  STUDENT ID
                </span>
                <span className="font-extrabold text-[#0c1424] font-mono">
                  {defaultRecord.id}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-0.5">
                  PROGRAMME
                </span>
                <span className="font-bold text-slate-700">
                  {defaultRecord.programme}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-0.5">
                  SEMESTER
                </span>
                <span className="font-semibold text-slate-600">
                  {defaultRecord.semester}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-0.5">
                  EMAIL
                </span>
                <span className="font-semibold text-slate-600 break-all select-all">
                  {defaultRecord.email}
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Appointment Info Card */}
          <div id="appointment-info-card" className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-3xs text-left space-y-4.5">
            <h4 className="font-extrabold text-[#0c1424] text-xs uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
              <Users className="w-4 h-4 text-blue-500" />
              Appointment Info
            </h4>

            <div className="space-y-3.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-450 font-medium">Appointment ID</span>
                <span className="font-extrabold text-[#0c1424] font-mono">{defaultRecord.appointmentId}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-450 font-medium">Supervisor</span>
                <span className="font-extrabold text-slate-850">{defaultRecord.supervisor}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-450 font-medium">Workload</span>
                <span className="font-extrabold text-slate-800">{defaultRecord.workload}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-450 font-medium">Approved Date</span>
                <span className="font-bold text-slate-700">{defaultRecord.approvedDate}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-450 font-medium">Released Date</span>
                <span className="font-bold text-slate-700">{defaultRecord.releasedDate}</span>
              </div>
            </div>
          </div>

          {/* Card 3: Evaluation Summary Card */}
          <div id="evaluation-summary-card" className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-3xs text-left flex flex-col space-y-4.5">
            <h4 className="font-extrabold text-[#0c1424] text-xs uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Evaluation Summary
            </h4>

            <div className="py-6 flex flex-col items-center justify-center text-center space-y-3 px-3">
              <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-200 text-slate-400 flex items-center justify-center shadow-3xs">
                <AlertCircle className="w-6 h-6 stroke-[1.5]" />
              </div>
              <div className="space-y-1">
                <span className="font-extrabold text-[#0c1424] text-xs block">
                  No evaluation records available
                </span>
                <p className="text-slate-450 text-[10.5px] leading-relaxed max-w-[240px] mx-auto">
                  Student has not yet reached the evaluation stage of the appointment process.
                </p>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-3.5 flex items-center justify-between text-xs">
              <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Status:</span>
              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 font-black uppercase text-[9px] rounded-md border border-slate-200">
                NOT STARTED
              </span>
            </div>
          </div>

        </div>

        {/* Right Section (Column Span 8): Research Info, Status History, Related Panel, Files */}
        <div className="lg:col-span-8 space-y-6 md:space-y-8">
          
          {/* Card 4: Research Information Card */}
          <div id="research-info-card" className="bg-white rounded-2xl border border-slate-200/90 p-6 md:p-8 space-y-5 text-left">
            <h4 className="font-extrabold text-[#0c1424] text-xs uppercase tracking-wider flex items-center gap-2 pb-1">
              <GraduationCap className="w-4.5 h-4.5 text-blue-500" />
              Research Information
            </h4>

            {/* Title high-fidelity container */}
            <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-4.5 md:p-5.5 space-y-1.5 shadow-2xs">
              <span className="text-indigo-650 font-bold block text-sm leading-relaxed tracking-tight">
                "{defaultRecord.researchTitle}"
              </span>
              <div className="text-[11px] text-slate-500 flex items-center gap-1.5 font-medium">
                <span className="font-extrabold text-slate-600 uppercase tracking-widest text-[9px]">Area:</span>
                <span>{defaultRecord.area}</span>
              </div>
            </div>

            {/* Abstract */}
            <div className="space-y-2 pt-1 text-xs">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
                ABSTRACT
              </span>
              <p className="text-slate-650 font-medium leading-relaxed">
                {defaultRecord.abstract}
              </p>
            </div>
          </div>

          {/* Connected Grid (Status History & Related Panel Status side-by-side) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            
            {/* Card 5: Status History Timeline */}
            <div id="status-history" className="bg-white rounded-2xl border border-slate-200/90 p-6 space-y-4.5 text-left">
              <h4 className="font-extrabold text-[#0c1424] text-xs uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
                <Clock className="w-4 h-4 text-slate-400 animate-pulse" />
                Status History
              </h4>

              {/* Timeline loop */}
              <div className="relative border-l border-slate-200 pl-5 ml-2.5 space-y-4.5 text-xs font-sans pb-1 pt-1">
                
                {/* Milestone 1 */}
                <div className="relative">
                  <div className="absolute -left-7 top-1 w-3 h-3 rounded-full bg-blue-600 border border-blue-100 flex items-center justify-center shadow-3xs" />
                  <div>
                    <span className="font-extrabold text-[#0c1424] block">Confirmation Released</span>
                    <span className="text-[10px] font-bold text-slate-400 block mt-0.5">
                      14 Oct 2025 • 09:30 AM
                    </span>
                  </div>
                </div>

                {/* Milestone 2 */}
                <div className="relative">
                  <div className="absolute -left-7 top-1 w-3 h-3 rounded-full bg-blue-600 border border-blue-100 flex items-center justify-center shadow-3xs" />
                  <div>
                    <span className="font-extrabold text-[#0c1424] block">Coordinator Approval</span>
                    <span className="text-[10px] font-bold text-slate-400 block mt-0.5">
                      13 Oct 2025 • 02:45 PM
                    </span>
                  </div>
                </div>

                {/* Milestone 3 */}
                <div className="relative">
                  <div className="absolute -left-7 top-1 w-3 h-3 rounded-full bg-blue-600 border border-blue-100 flex items-center justify-center shadow-3xs" />
                  <div>
                    <span className="font-extrabold text-[#0c1424] block">Supervisor Review</span>
                    <span className="text-[10px] font-bold text-slate-400 block mt-0.5">
                      12 Oct 2025 • 11:15 AM
                    </span>
                  </div>
                </div>

                {/* Milestone 4 */}
                <div className="relative">
                  <div className="absolute -left-7 top-1 w-3 h-3 rounded-full bg-blue-600 border border-blue-100 flex items-center justify-center shadow-3xs" />
                  <div>
                    <span className="font-extrabold text-[#0c1424] block">Request Submitted</span>
                    <span className="text-[10px] font-bold text-slate-400 block mt-0.5">
                      10 Oct 2025 • 04:00 PM
                    </span>
                  </div>
                </div>

              </div>
            </div>

            {/* Card 6: Related Panel Status */}
            <div id="related-panel-status" className="bg-white rounded-2xl border border-slate-200/90 p-6 space-y-4.5 text-left flex flex-col justify-between">
              <div>
                <h4 className="font-extrabold text-[#0c1424] text-xs uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Users className="w-4 h-4 text-blue-500" />
                  Related Panel Status
                </h4>

                {/* Inner member box matching screenshot perfectly */}
                <div className="bg-slate-50 border border-slate-150 rounded-xl p-4 mt-4 text-xs font-sans text-left space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded bg-[#0c1424] text-white flex items-center justify-center font-extrabold tracking-wider text-xs">
                      {defaultRecord.panelInitials}
                    </div>
                    <div className="text-left space-y-0.5">
                      <span className="font-extrabold text-[#0c1424] block text-[11.5px] leading-tight">
                        {defaultRecord.panelMember}
                      </span>
                      <span className="text-[10px] font-extrabold text-slate-400 block uppercase tracking-wide">
                        Internal Panel Member
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-slate-200/70 pt-2.5 flex items-center justify-between">
                    <span className="text-slate-450 font-medium">Assigned:</span>
                    <span className="font-bold text-[#0c1424]">{defaultRecord.assignedDate}</span>
                  </div>
                </div>
              </div>

              {/* View Panel button */}
              <button
                onClick={() => showToast(`Routed to Panel Detail Ledger for ${defaultRecord.panelMember}`)}
                className="w-full py-2.5 mt-4 border border-slate-250 text-[#0c1424] hover:bg-slate-50 font-bold text-xs uppercase tracking-wider rounded-xl transition shadow-3xs cursor-pointer focus:outline-none"
              >
                View Panel Record
              </button>
            </div>

          </div>

          {/* Card 7: Related Files Table Card */}
          <div id="related-files-card" className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-3xs text-left">
            <div className="px-6 py-4.5 border-b border-light-slate flex items-center justify-between">
              <h4 className="font-extrabold text-[#0c1424] text-xs uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-500" />
                Related Files
              </h4>

              <span className="px-2.5 py-1 bg-slate-100 text-slate-600 font-extrabold uppercase text-[9px] rounded-full tracking-wide">
                3 Files Uploaded
              </span>
            </div>

            {/* Scrollable table view */}
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[500px] border-collapse font-sans text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-150 text-[10px] font-black text-slate-400 uppercase tracking-widest select-none">
                    <th className="py-3 px-6">File Name</th>
                    <th className="py-3 px-6">Category</th>
                    <th className="py-3 px-6">Uploaded Date</th>
                    <th className="py-3 px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans text-slate-700">
                  
                  {/* File 1 */}
                  <tr className="hover:bg-slate-55 transition-colors">
                    <td className="py-4 px-6 flex items-center gap-2.5 font-bold text-[#0c1424] leading-normal">
                      <FileText className="w-4 h-4 text-red-500" />
                      <span>Proposal.pdf</span>
                    </td>
                    <td className="py-4 px-6 font-medium text-slate-600">Research Proposal</td>
                    <td className="py-4 px-6 font-semibold text-slate-500 font-mono text-[11px]">10 Oct 2025</td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => showToast("Opening document: Proposal.pdf in secure administrative preview")}
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-bold uppercase text-[10px] tracking-wider transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>

                  {/* File 2 */}
                  <tr className="hover:bg-slate-55 transition-colors">
                    <td className="py-4 px-6 flex items-center gap-2.5 font-bold text-[#0c1424] leading-normal">
                      <FileText className="w-4 h-4 text-red-500" />
                      <span>Supervisor Appointment Letter.pdf</span>
                    </td>
                    <td className="py-4 px-6 font-medium text-slate-600">Official Letter</td>
                    <td className="py-4 px-6 font-semibold text-slate-500 font-mono text-[11px]">14 Oct 2025</td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => showToast("Opening document: Supervisor Appointment Letter.pdf in secure administrative preview")}
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-bold uppercase text-[10px] tracking-wider transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>

                  {/* File 3 */}
                  <tr className="hover:bg-slate-55 transition-colors">
                    <td className="py-4 px-6 flex items-center gap-2.5 font-bold text-[#0c1424] leading-normal">
                      <FileText className="w-4 h-4 text-red-500" />
                      <span>Student Profile.pdf</span>
                    </td>
                    <td className="py-4 px-6 font-medium text-slate-600">Student Record</td>
                    <td className="py-4 px-6 font-semibold text-slate-500 font-mono text-[11px]">10 Oct 2025</td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => showToast("Opening document: Student Profile.pdf in secure administrative preview")}
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-bold uppercase text-[10px] tracking-wider transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>

                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>

      {/* Notice Card: Confidential Administrative Notice */}
      <div id="notice-card" className="bg-[#eff6ff] rounded-2xl border-l-4 border-l-blue-500 border-y border-r border-[#eff6ff] p-5 shadow-3xs text-left">
        <div className="flex items-start gap-3.5">
          <Shield className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h5 className="font-extrabold text-blue-900 text-xs uppercase tracking-wide">
              Confidential Administrative View
            </h5>
            <p className="text-blue-750 text-xs font-semibold leading-relaxed">
              This page provides a read-only administrative view of the student's panel appointment record. Use the related management modules to update files, letters, panel records, or evaluation setup.
            </p>
          </div>
        </div>
      </div>

      {/* Aesthetic Footer block */}
      <div className="pt-2 border-t border-slate-200/40 flex flex-col md:flex-row items-center justify-between text-[10px] text-slate-400 font-bold font-sans tracking-wide uppercase">
        <span>© 2026 FACULTY OF COMPUTER SCIENCE AND INFORMATION TECHNOLOGY (FSKTM)</span>
        <div className="flex items-center gap-4 mt-2 md:mt-0">
          <a href="#privacy" onClick={(e) => { e.preventDefault(); showToast("Policy details loading..."); }} className="hover:text-slate-650 transition">Privacy Policy</a>
          <a href="#system" onClick={(e) => { e.preventDefault(); showToast("System diagnostics manual accessed..."); }} className="hover:text-slate-650 transition">System Manual</a>
          <a href="#support" onClick={(e) => { e.preventDefault(); showToast("Support terminal routed..."); }} className="hover:text-slate-650 transition">Support Desk</a>
        </div>
      </div>

    </div>
  );
};
