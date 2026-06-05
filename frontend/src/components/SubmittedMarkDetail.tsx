/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  ArrowLeft, 
  FileText, 
  Play, 
  Info, 
  Mail, 
  Lock, 
  ExternalLink,
  ShieldAlert,
  Sparkles
} from 'lucide-react';
import { motion } from 'motion/react';
import { EvaluationTask } from '../types';
import { PageHeader, StatusBadge } from './PortalPrimitives';

interface SubmittedMarkDetailProps {
  task: EvaluationTask;
  onBack: () => void;
}

export const SubmittedMarkDetail: React.FC<SubmittedMarkDetailProps> = ({
  task,
  onBack
}) => {
  // Extract or fallback values based on selected task
  const studentName = task.studentName || 'Nur Aina Rahman';
  const studentId = task.studentId || 'MEA2400712';
  const researchTitle = task.researchTitle || 'Blockchain-Based Academic Record Verification';
  const semester = task.semester || 'Sem 1 2025/2026';
  
  // Calculate total marks dynamically if preset, or fallback to 84
  const problemScore = task.problemDefinitionScore ?? 18;
  const litScore = task.literatureReviewScore ?? 16;
  const methScore = task.methodologyScore ?? 21;
  const techScore = task.technicalUnderstandingScore ?? 17;
  const presScore = task.presentationScore ?? 12;

  const totalScore = problemScore + litScore + methScore + techScore + presScore;
  const submissionDate = task.submittedDate || '12 Dec 2025';

  // Helper to determine Grade string
  const getGrade = (score: number) => {
    if (score >= 80) return 'A';
    if (score >= 75) return 'A-';
    if (score >= 70) return 'B+';
    if (score >= 65) return 'B';
    if (score >= 60) return 'B-';
    return 'C';
  };

  const finalGrade = getGrade(totalScore);

  const handleDocumentView = (docName: string) => {
    alert(`Opening document preview for: ${docName}`);
  };

  return (
    <div id="submitted-mark-detail-page" className="space-y-6 text-left relative font-sans">
      
      <PageHeader
        title="Submitted Mark Detail"
        subtitle="View submitted rubric marks and evaluation feedback for this student."
        backLabel="Back to Marks Entry"
        onBack={onBack}
        actions={<StatusBadge tone="success" dot pulse>Submitted</StatusBadge>}
      />

      {/* 3. Main Split Structure layout: Grid containing left content and right info widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left main assessment detail panel (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Student & Submission Summary Card */}
          <div className="bg-white border border-[#e2e8f0]/80 rounded-2xl overflow-hidden shadow-3xs hover:shadow-3xs transition">
            <div className="bg-slate-50/50 border-b border-slate-100 px-6 py-4.5">
              <h3 className="text-sm font-bold text-brand-navy select-none uppercase tracking-wider">
                Student & Submission Summary
              </h3>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-y-5 gap-x-6">
              
              {/* Student Name */}
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                  Student Name & ID
                </span>
                <span className="text-xs font-black text-slate-900 block leading-tight">
                  {studentName} ({studentId})
                </span>
              </div>

              {/* Programme */}
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                  Programme
                </span>
                <span className="text-xs font-bold text-slate-700 block leading-tight">
                  MSc. Computer Science
                </span>
              </div>

              {/* Research Title (Full row) */}
              <div className="md:col-span-2 space-y-1 pt-1.5">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                  Research Title
                </span>
                <span className="text-xs font-extrabold text-brand-navy block leading-relaxed italic">
                  &ldquo;{researchTitle}&rdquo;
                </span>
              </div>

              {/* Semester */}
              <div className="space-y-1 pt-1.5">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                  Semester
                </span>
                <span className="text-xs font-bold text-slate-700 block leading-tight">
                  {semester}
                </span>
              </div>

              {/* Evaluation Role */}
              <div className="space-y-1 pt-1.5">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                  Evaluation Role
                </span>
                <span className="text-xs font-bold text-slate-700 block leading-tight">
                  Panel Member
                </span>
              </div>

              {/* Submission Date */}
              <div className="space-y-1 pt-1.5">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                  Submission Date
                </span>
                <span className="text-xs font-semibold text-slate-600 block leading-tight font-mono">
                  {submissionDate}
                </span>
              </div>

              {/* Submitted By */}
              <div className="space-y-1 pt-1.5">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                  Submitted By
                </span>
                <span className="text-xs font-bold text-slate-700 block leading-tight">
                  Dr. Wey Cheng
                </span>
              </div>

            </div>
          </div>

          {/* Metric stats row: Total, final grade, last updated */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Total score box (deep navy) */}
            <div className="bg-brand-navy text-white p-5 rounded-2xl flex flex-col justify-between space-y-4 select-none">
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">
                Total Marks
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3.5xl font-extrabold tracking-tight font-mono leading-none">
                  {totalScore}
                </span>
                <span className="text-sm font-bold text-slate-400">
                  / 100
                </span>
              </div>
            </div>

            {/* Final Grade box */}
            <div className="bg-white border border-[#e2e8f0]/80 p-5 rounded-2xl flex flex-col justify-between space-y-4 select-none">
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">
                FINAL GRADE
              </span>
              <span className="text-4xl font-black text-sky-600 tracking-tight leading-none uppercase">
                {finalGrade}
              </span>
            </div>

            {/* Last updated box */}
            <div className="bg-white border border-[#e2e8f0]/80 p-5 rounded-2xl flex flex-col justify-between space-y-4 select-none">
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">
                LAST UPDATED
              </span>
              <span className="text-sm md:text-base font-extrabold text-brand-navy tracking-tight leading-none font-mono">
                {submissionDate}
              </span>
            </div>

          </div>

          {/* Detailed Rubric Assessment Card */}
          <div className="bg-white border border-[#e2e8f0]/80 rounded-2xl overflow-hidden shadow-3xs hover:shadow-3xs transition">
            
            <div className="bg-slate-50/50 border-b border-slate-100 px-6 py-4 flex justify-between items-center select-none">
              <h3 className="text-sm font-bold text-brand-navy uppercase tracking-wider">
                Detailed Rubric Assessment
              </h3>
              <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-semibold uppercase tracking-wider">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>Read Only</span>
              </div>
            </div>

            <div className="p-6 space-y-6">
              
              <div className="overflow-x-auto">
              <table className="data-table min-w-[500px] text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 font-bold text-slate-400 text-[10px] uppercase tracking-wider select-none">
                      <th className="pb-3.5 w-1/3">Component</th>
                      <th className="pb-3.5 text-center w-16">Max</th>
                      <th className="pb-3.5 text-center w-16">Awarded</th>
                      <th className="pb-3.5">Feedback</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-sans text-slate-700">
                    
                    {/* Row 1 */}
                    <tr className="hover:bg-slate-50/30 transition">
                      <td className="py-4.5 pr-2 font-bold text-brand-navy">
                        Problem Definition
                      </td>
                      <td className="py-4.5 text-center font-semibold text-slate-400">
                        20
                      </td>
                      <td className="py-4.5 text-center font-extrabold text-brand-navy text-sm">
                        {problemScore}
                      </td>
                      <td className="py-4.5 text-slate-500 italic font-semibold leading-relaxed">
                        &ldquo;{task.problemDefinitionFeedback || 'Clear problem statement and objectives.'}&rdquo;
                      </td>
                    </tr>

                    {/* Row 2 */}
                    <tr className="hover:bg-slate-50/30 transition">
                      <td className="py-4.5 pr-2 font-bold text-brand-navy">
                        Literature Review
                      </td>
                      <td className="py-4.5 text-center font-semibold text-slate-400">
                        20
                      </td>
                      <td className="py-4.5 text-center font-extrabold text-brand-navy text-sm">
                        {litScore}
                      </td>
                      <td className="py-4.5 text-slate-500 italic font-semibold leading-relaxed">
                        &ldquo;{task.literatureReviewFeedback || 'Relevant sources with good coverage.'}&rdquo;
                      </td>
                    </tr>

                    {/* Row 3 */}
                    <tr className="hover:bg-slate-50/30 transition">
                      <td className="py-4.5 pr-2 font-bold text-brand-navy">
                        Methodology
                      </td>
                      <td className="py-4.5 text-center font-semibold text-slate-400">
                        25
                      </td>
                      <td className="py-4.5 text-center font-extrabold text-brand-navy text-sm">
                        {methScore}
                      </td>
                      <td className="py-4.5 text-slate-500 italic font-semibold leading-relaxed">
                        &ldquo;{task.methodologyFeedback || 'Methodology is suitable and well explained.'}&rdquo;
                      </td>
                    </tr>

                    {/* Row 4 */}
                    <tr className="hover:bg-slate-50/30 transition">
                      <td className="py-4.5 pr-2 font-bold text-brand-navy">
                        Technical Understanding
                      </td>
                      <td className="py-4.5 text-center font-semibold text-slate-400">
                        20
                      </td>
                      <td className="py-4.5 text-center font-extrabold text-brand-navy text-sm">
                        {techScore}
                      </td>
                      <td className="py-4.5 text-slate-500 italic font-semibold leading-relaxed">
                        &ldquo;{task.technicalUnderstandingFeedback || 'Strong technical understanding.'}&rdquo;
                      </td>
                    </tr>

                    {/* Row 5 */}
                    <tr className="hover:bg-slate-50/30 transition">
                      <td className="py-4.5 pr-2 font-bold text-brand-navy">
                        Presentation and Q&A
                      </td>
                      <td className="py-4.5 text-center font-semibold text-slate-400">
                        15
                      </td>
                      <td className="py-4.5 text-center font-extrabold text-brand-navy text-sm">
                        {presScore}
                      </td>
                      <td className="py-4.5 text-slate-500 italic font-semibold leading-relaxed">
                        &ldquo;{task.presentationFeedback || 'Good presentation with minor clarity issues.'}&rdquo;
                      </td>
                    </tr>

                  </tbody>
                </table>
              </div>

              {/* Total score box aligned nicely beneath assessment rows */}
              <div className="pt-4 border-t border-slate-100 flex justify-between items-center select-none">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                  Total Assessment Marks:
                </span>
                <div className="flex items-baseline gap-1.5 text-right font-mono">
                  <span className="text-lg font-black text-sky-600 block">
                    {totalScore}
                  </span>
                  <span className="text-xs font-bold text-slate-400">
                    / 100
                  </span>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* Right Info and actions widgets column (4 Cols) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Related Documents Widget */}
          <div className="bg-white border border-[#e2e8f0]/80 rounded-2xl p-5 shadow-3xs text-left hover:shadow-3xs transition">
            <h4 className="text-xs font-bold text-brand-navy mb-3 select-none uppercase tracking-wider">
              Related Documents
            </h4>
            
            <div className="space-y-2.5">
              
              {/* Proposal PDF file row */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50/50 border border-slate-100 rounded-xl group/doc transition hover:bg-slate-50">
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <div className="w-[30px] h-[30px] rounded-lg bg-orange-50/80 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-orange-500 stroke-[2.3]" />
                  </div>
                  <span className="text-xs font-bold text-slate-700 truncate select-all">
                    Proposal.pdf
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleDocumentView('Proposal.pdf')}
                  className="text-sky-600 hover:text-sky-800 font-extrabold text-[10px] tracking-wider uppercase shrink-0 transition"
                >
                  View
                </button>
              </div>

              {/* Evaluation Rubrics PDF workbook row */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50/50 border border-slate-100 rounded-xl group/doc transition hover:bg-slate-50">
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <div className="w-[30px] h-[30px] rounded-lg bg-indigo-50/80 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-indigo-505 text-indigo-500 stroke-[2.3]" />
                  </div>
                  <span className="text-xs font-bold text-slate-700 truncate select-all">
                    Evaluation Rubric.pdf
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleDocumentView('Evaluation Rubric.pdf')}
                  className="text-sky-600 hover:text-sky-800 font-extrabold text-[10px] tracking-wider uppercase shrink-0 transition"
                >
                  View
                </button>
              </div>

              {/* Presentation Slides.pdf file row */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50/50 border border-slate-100 rounded-xl group/doc transition hover:bg-slate-50">
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <div className="w-[30px] h-[30px] rounded-lg bg-rose-50/80 flex items-center justify-center shrink-0">
                    <Play className="w-4 h-4 text-rose-500 fill-rose-500 stroke-[2.3]" />
                  </div>
                  <span className="text-xs font-bold text-slate-700 truncate select-all">
                    Presentation Slides.pdf
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleDocumentView('Presentation Slides.pdf')}
                  className="text-sky-600 hover:text-sky-800 font-extrabold text-[10px] tracking-wider uppercase shrink-0 transition"
                >
                  View
                </button>
              </div>

            </div>
          </div>

          {/* Notice Alert styling */}
          <div className="bg-indigo-50/30 border border-indigo-100/70 rounded-2xl p-5 shadow-3xs text-left flex gap-4 items-start relative overflow-hidden">
            <div className="w-[38px] h-[38px] bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center shrink-0">
              <Info className="w-4.5 h-4.5 text-indigo-600 stroke-[2.3]" />
            </div>
            
            <div className="space-y-1.5 z-10 pt-0.5">
              <h4 className="text-xs font-bold text-brand-navy uppercase tracking-wider">
                Notice
              </h4>
              <p className="text-slate-500 text-xs font-semibold leading-relaxed">
                Submitted marks are <strong className="text-slate-800 font-extrabold">read-only</strong>. Contact the postgraduate office if a correction is required.
              </p>
            </div>

            {/* Subtle aesthetic background watermark decoration */}
            <div className="absolute right-1 -bottom-4 opacity-10 select-none pointer-events-none">
              <ShieldAlert className="w-16 h-16 text-indigo-600" />
            </div>
          </div>

          {/* Contact and Support card */}
          <div className="bg-white border border-[#e2e8f0]/80 rounded-2xl p-5 shadow-3xs text-left flex flex-col gap-3 select-none">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
              SUPPORT & ASSISTANCE
            </span>
            
            <div className="flex gap-3.5 items-center">
              <div className="w-10 h-10 border border-slate-100/90 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500 shrink-0">
                <Mail className="w-4.5 h-4.5 stroke-[2.3]" />
              </div>
              <div>
                <dt className="text-xs font-extrabold text-slate-700">Admin Office</dt>
                <dd className="text-xs font-semibold text-sky-600 select-all hover:underline cursor-pointer">
                  pg.fsktm@um.edu.my
                </dd>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* 4. Bottom Back Link Solid slate-dark Button */}
      <div className="pt-6 border-t border-slate-100 text-left">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 bg-brand-navy hover:bg-slate-850 text-white font-extrabold text-xs uppercase tracking-wider px-5 py-3 rounded-xl transition shadow-3xs cursor-pointer stroke-[2.3]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Marks Entry</span>
        </button>
      </div>

    </div>
  );
};
