/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  ChevronLeft,
  Printer,
  FileDown,
  Lock,
  FileText,
  Clock,
  ExternalLink,
  Mail,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MarkEntryRecordDetailProps {
  onBack: () => void;
  recordId?: string;
  studentId?: string;
  studentName?: string;
  researchTitle?: string;
  panelMember?: string;
  semester?: string;
  programme?: string;
  totalMark?: number | null | 'Draft';
  submittedDate?: string;
}

export const MarkEntryRecordDetail: React.FC<MarkEntryRecordDetailProps> = ({
  onBack,
  recordId = 'MRK-2025-021',
  studentId = 'MEA2400712',
  studentName = 'Nur Aina Rahman',
  researchTitle = 'Blockchain-Based Academic Record Verification System',
  panelMember = 'Dr. Sarah Lim',
  semester = 'Sem 1 2025/2026',
  programme = 'MSc. Computer Science',
  totalMark = 84 as number | null | 'Draft',
  submittedDate = '12 Dec 2025'
}) => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handlePrint = () => {
    showToast("Opening browser print layout interface for Mark Sheet Record...");
    window.print();
  };

  const handleExportPDF = () => {
    showToast(`Downloading certified administrative mark transcript for student ${studentName}`);
  };

  // Rubric scores mapping matching high-fidelity details from screenshot
  const [rubricRows] = useState([
    {
      component: 'Problem Definition',
      maxMarks: 20,
      marksAwarded: 18,
      feedback: 'Clear problem statement and objectives.'
    },
    {
      component: 'Literature Review',
      maxMarks: 20,
      marksAwarded: 16,
      feedback: 'Relevant sources with good coverage.'
    },
    {
      component: 'Methodology',
      maxMarks: 25,
      marksAwarded: 21,
      feedback: 'Methodology is suitable and well explained.'
    },
    {
      component: 'Technical Understanding',
      maxMarks: 20,
      marksAwarded: 17,
      feedback: 'Strong technical understanding.'
    },
    {
      component: 'Presentation and Q&A',
      maxMarks: 15,
      marksAwarded: 12,
      feedback: 'Good presentation with minor clarity issues.'
    }
  ]);

  return (
    <div id="mark-entry-record-detail" className="space-y-8 animate-fade-in text-left relative font-sans">
      
      {/* Toast Alert Banner */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 right-6 z-50 bg-brand-navy text-white py-3 px-5 rounded-xl shadow-sm flex items-center gap-3 text-xs font-bold font-sans border border-slate-700"
          >
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Breadcrumb line & Action controls */}
      <div id="record-detail-header-block" className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="text-left">
          <button
            onClick={onBack}
            className="back-link group mb-3"
          >
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Mark Entry Records</span>
          </button>

          <h1 className="page-title">
            Mark Entry Record Detail
          </h1>
          <p className="page-subtitle leading-relaxed">
            View submitted marks, rubric breakdown, panel member information, and related documents.
          </p>
        </div>

        {/* Print / Export buttons matching upper right of screenshot */}
        <div className="flex items-center gap-3.5 self-start lg:self-auto font-sans select-none">
          <button
            onClick={handlePrint}
            className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-250 rounded-xl text-xs font-bold font-sans flex items-center gap-2 transition shadow-3xs cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-550" />
            <span>Print Record</span>
          </button>

          <button
            onClick={handleExportPDF}
            className="px-4 py-2.5 bg-brand-navy hover:bg-slate-800 text-white rounded-xl text-xs font-bold font-sans flex items-center gap-2 transition shadow-xs cursor-pointer"
          >
            <FileDown className="w-4 h-4 text-blue-300" />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* Main Core Columns Desk Grid */}
      <div id="record-detail-layout-grid" className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column Area: Student Summary, Metrics overview, Rubric Breakdown table */}
        <div id="record-detail-primary-desk" className="lg:col-span-8 space-y-6">
          
          {/* Card 1: Student & Submission Summary */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-3xs overflow-hidden">
            <div className="bg-slate-50 px-6 py-4.5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <h3 className="font-extrabold text-brand-navy text-xs uppercase tracking-wider">
                  Student & Submission Summary
                </h3>
              </div>
              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-extrabold tracking-wide rounded-full uppercase flex items-center gap-1.5 border border-emerald-100">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Submitted</span>
              </span>
            </div>

            <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8 text-left font-sans text-xs">
              
              <div className="md:col-span-1">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1">
                  Student Name & ID
                </span>
                <span className="font-extrabold text-brand-navy text-base font-sans block leading-snug">
                  {studentName} 
                </span>
                <span className="font-mono text-xs text-blue-600 font-bold block mt-0.5">
                  ({studentId})
                </span>
              </div>

              <div className="md:col-span-1">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1">
                  Programme
                </span>
                <span className="font-extrabold text-slate-700 text-sm block">
                  {programme}
                </span>
              </div>

              <div className="md:col-span-2 border-t border-slate-100 pt-5">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1">
                  Research Title
                </span>
                <span className="font-bold text-slate-800 text-xs italic leading-relaxed block">
                  "{researchTitle}"
                </span>
              </div>

              <div className="border-t border-slate-100 pt-5">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1">
                  Semester
                </span>
                <span className="font-bold text-slate-700">
                  {semester}
                </span>
              </div>

              <div className="border-t border-slate-100 pt-5">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1">
                  Panel Member
                </span>
                <span className="font-extrabold text-brand-navy">
                  {panelMember}
                </span>
              </div>

              <div className="border-t border-slate-100 pt-5">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1">
                  Submission Date
                </span>
                <span className="font-bold text-slate-600 block">
                  {submittedDate}
                </span>
              </div>

              <div className="border-t border-slate-100 pt-5">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1">
                  Submitted By
                </span>
                <span className="font-extrabold text-brand-navy">
                  {panelMember}
                </span>
              </div>

            </div>
          </div>

          {/* Three Score Cards side-by-side row */}
          <div id="scores-metrics-cards-row" className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            
            {/* Total Marks */}
            <div className="bg-brand-navy text-white rounded-2xl p-5 shadow-xs relative overflow-hidden flex flex-col justify-between h-[105px]">
              <span className="text-[9px] font-extrabold uppercase text-slate-400 tracking-widest block">
                Total Marks
              </span>
              <div className="flex items-baseline gap-1 pt-1.5">
                <span className="text-3xl font-black font-sans leading-none">
                  {totalMark !== 'Draft' ? totalMark : '0'}
                </span>
                <span className="text-slate-400 text-xs font-bold">/ 100</span>
              </div>
            </div>

            {/* Final Grade */}
            <div className="bg-white border border-slate-205 rounded-2xl p-5 shadow-2xs flex flex-col justify-between h-[105px]">
              <span className="text-[9px] font-extrabold uppercase text-slate-400 tracking-widest block text-left">
                Final Grade
              </span>
              <span className="text-blue-600 font-black text-3xl font-sans self-center py-1">
                {totalMark !== 'Draft' && totalMark !== null ? (totalMark >= 80 ? 'A' : totalMark >= 75 ? 'A-' : totalMark >= 70 ? 'B+' : 'B') : '-'}
              </span>
            </div>

            {/* Last Updated */}
            <div className="bg-white border border-slate-205 rounded-2xl p-5 shadow-2xs flex flex-col justify-between h-[105px] text-left">
              <span className="text-[9px] font-extrabold uppercase text-slate-400 tracking-widest block">
                Last Updated
              </span>
              <div className="flex flex-col text-left leading-tight py-1">
                <span className="text-xs font-black text-brand-navy">
                  {submittedDate}
                </span>
                <span className="text-[9px] text-slate-400 font-mono mt-1 font-bold">
                  03:45 PM (GMT+8)
                </span>
              </div>
            </div>

          </div>

          {/* Card 3: Rubric Breakdown Table */}
          <div className="bg-white rounded-2xl border border-slate-200/95 shadow-3xs overflow-hidden">
            
            <div className="bg-slate-50 px-6 py-4.5 border-b border-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-500" />
                <h3 className="font-extrabold text-brand-navy text-xs uppercase tracking-wider">
                  Rubric Breakdown
                </h3>
              </div>

              {/* Read Only lock badge */}
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-slate-100 text-slate-500 text-[8px] font-black tracking-widest uppercase rounded">
                <Lock className="w-2.5 h-2.5 text-slate-400" />
                <span>Read-Only</span>
              </span>
            </div>

            {/* Rubric metrics list */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] text-left border-collapse">
                <thead>
                  <tr className="data-thead bg-[#f8fafc]">
                    <th className="data-th">Component</th>
                    <th className="data-th text-center">Max Marks</th>
                    <th className="data-th text-center">Marks Awarded</th>
                    <th className="data-th">Feedback</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-sans">
                  {rubricRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/40 transition">
                      
                      {/* Component label */}
                      <td className="data-td-strong">
                        {row.component}
                      </td>

                      {/* Weight marks */}
                      <td className="data-td text-center">
                        {row.maxMarks}
                      </td>

                      {/* Marks awarded */}
                      <td className="data-td-strong text-center">
                        {row.marksAwarded}
                      </td>

                      {/* Qualitative Comments / Feedback */}
                      <td className="data-td italic">
                        "{row.feedback}"
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Large banner text summary total score display aligned perfectly with screenshot bottom */}
            <div className="bg-slate-50/50 p-6 border-t border-slate-100 flex items-center justify-between px-8">
              <div className="text-slate-700 font-bold text-sm tracking-tight font-sans">
                Total Score:
              </div>
              <div className="flex items-baseline gap-1.5 text-blue-600">
                <span className="font-black text-2xl md:text-3xl font-sans tracking-tight">
                  84
                </span>
                <span className="text-sm font-bold text-blue-400">/ 100</span>
              </div>
            </div>

          </div>

        </div>

        {/* Right Column Area: Related documents, Record Status, Notice informative card, Assistance */}
        <div id="record-detail-aside" className="lg:col-span-4 space-y-6">

          {/* 1. Related Documents Card */}
          <div className="bg-white rounded-2xl border border-slate-205 p-5 text-left shadow-2xs">
            <h4 className="font-extrabold text-brand-navy text-xs uppercase tracking-wider mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-400" />
              <span>Related Documents</span>
            </h4>

            <ul className="space-y-4">
              <li className="flex items-center justify-between text-xs font-sans">
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4.5 h-4.5 text-red-500/80 shrink-0" />
                  <span className="font-bold text-slate-700 truncate max-w-[170px] cursor-help" title="Proposal description sheet candidate">
                    Proposal.pdf
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => showToast("Opening document: Proposal.pdf...")}
                  className="text-blue-600 text-[10px] font-extrabold tracking-wide uppercase hover:underline cursor-pointer"
                >
                  View
                </button>
              </li>

              <li className="flex items-center justify-between text-xs font-sans">
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4.5 h-4.5 text-[#0d226a]/80 shrink-0" />
                  <span className="font-bold text-slate-700 truncate max-w-[170px]" title="Evaluation Rubric template configured">
                    Evaluation Rubric.pdf
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => showToast("Opening document: Evaluation Rubric.pdf...")}
                  className="text-blue-600 text-[10px] font-extrabold tracking-wide uppercase hover:underline cursor-pointer"
                >
                  View
                </button>
              </li>

              <li className="flex items-center justify-between text-xs font-sans">
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4.5 h-4.5 text-amber-500/80 shrink-0" />
                  <span className="font-bold text-slate-700 truncate max-w-[170px]" title="Presentation slides draft uploaded">
                    Presentation Slides.pdf
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => showToast("Opening document: Presentation Slides.pdf...")}
                  className="text-blue-600 text-[10px] font-extrabold tracking-wide uppercase hover:underline cursor-pointer"
                >
                  View
                </button>
              </li>
            </ul>
          </div>

          {/* 2. Record Status Diagnosis Tracking */}
          <div className="bg-white rounded-2xl border border-slate-205 p-5 text-left shadow-2xs text-xs font-sans">
            <h4 className="font-extrabold text-brand-navy text-xs uppercase tracking-wider mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-slate-400" />
              <span>Record Status</span>
            </h4>

            <div className="space-y-4 font-sans">
              
              <div>
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1">
                  Mark Entry Period
                </span>
                <span className="font-bold text-slate-700 block text-xs">
                  01 Dec - 10 Dec 2025
                </span>
              </div>

              <div>
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1">
                  Submission Status
                </span>
                <span className="font-extrabold text-emerald-600 text-xs block">
                  Submitted
                </span>
              </div>

              <div>
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1">
                  Verification Status
                </span>
                <div className="flex items-center gap-2 text-xs font-bold text-amber-600 font-sans">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
                  <span>Pending Office Verification</span>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3.5 mt-2">
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block mb-2">
                  Last Updated By
                </span>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-black text-[9px]">
                    SL
                  </div>
                  <span className="text-xs font-bold text-slate-700">Dr. Sarah Lim</span>
                </div>
              </div>

            </div>
          </div>

          {/* 3. Notice Blue Card with stylized icon */}
          <div className="bg-[#eff6ff] rounded-2xl border border-blue-100 p-5 text-left relative overflow-hidden shadow-2xs">
            <div className="flex items-start gap-4 z-10 relative">
              <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center shrink-0 shadow-xs font-sans font-black text-sm">
                i
              </div>
              <div className="space-y-1.5">
                <h4 className="font-extrabold text-blue-900 text-xs uppercase tracking-wider">
                  Notice
                </h4>
                <p className="text-blue-700 hover:text-blue-900 text-[11px] font-sans font-medium leading-relaxed">
                  This page provides a read-only administrative view of the mark entry record. Office Staff/Admin can monitor submission status but cannot edit submitted marks.
                </p>
              </div>
            </div>

            {/* Giant elegant floating semi-transparent 'i' letter watermark */}
            <div className="absolute right-[-15px] bottom-[-25px] text-blue-200/40 pointer-events-none select-none font-sans font-black text-9xl">
              i
            </div>
          </div>

          {/* 4. Support & Assistance Contact card */}
          <div className="bg-white rounded-2xl border border-slate-205 p-4.5 text-left shadow-3xs flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0 border border-blue-100/50">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[9px] font-extrabold text-slate-450 uppercase tracking-widest block leading-none">
                Support & Assistance
              </span>
              <span className="text-slate-800 font-extrabold text-xs block mt-1 pointer-events-auto select-all selection:bg-blue-200">
                pg.fsktm@um.edu.my
              </span>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
