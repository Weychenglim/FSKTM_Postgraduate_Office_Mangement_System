/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  ArrowLeft, 
  Bookmark, 
  User, 
  FileText, 
  Calendar, 
  AlertTriangle, 
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  CheckCircle,
  FileDown
} from 'lucide-react';
import { motion } from 'motion/react';

// ==================== COMPONENT PROPS & INTERFACES ====================

interface PanelAssignment {
  studentId: string;
  studentName: string;
  researchTitle: string;
  supervisor: string;
  appointmentDate: string;
  status: 'ACTIVE' | 'PENDING' | 'COMPLETED';
  programme?: string;
  intake?: string;
  abstract?: string;
  initials?: string;
}

interface PanelAssignmentDetailProps {
  assignment: PanelAssignment;
  onBack: () => void;
  onOpenMarksEntry?: () => void;
}

// ==================== SUB-COMPONENTS ====================

// 1. Student Profile Summary Card
export const StudentProfileCard: React.FC<{ assignment: PanelAssignment }> = ({ assignment }) => {
  const isSarah = assignment.studentName.includes('Sarah Natasha') || assignment.studentId === 'MEA2301184';
  
  const displayId = isSarah ? 'MEA2301184' : assignment.studentId;
  const displayName = isSarah ? 'Sarah Natasha' : assignment.studentName;
  const displayProgramme = isSarah ? 'MSc. Computer Science' : (assignment.programme || 'MSc. Computer Science');
  const displaySemester = isSarah ? 'Sem 1 2024/2025' : (assignment.intake || 'Sem 1 2024/2025');
  const email = isSarah 
    ? 'sarah.natasha@student.fsktm.edu.my' 
    : `${assignment.studentName.toLowerCase().replace(/\s+/g, '')}@student.fsktm.edu.my`;

  return (
    <div id="student-profile-card" className="bg-white border border-[#e2e8f0]/80 rounded-2xl p-6 shadow-3xs text-left flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
      <div className="flex gap-5 items-center">
        {/* Profile Initials Block */}
        <div className="w-[52px] h-[52px] rounded-xl bg-[#eff6ff] border border-blue-105 border-blue-100 text-blue-650 text-blue-600 font-black text-sm flex items-center justify-center shrink-0 tracking-wider">
          {assignment.initials || 'SN'}
        </div>
        <div>
          <div className="flex items-center gap-2.5">
            <h3 className="text-[17px] font-black text-brand-navy leading-tight">
              {displayName}
            </h3>
            <span className="bg-[#e6fbf2] text-[#00a15c] border border-[#bef5db] text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full select-none">
              Active
            </span>
          </div>
          <div className="mt-1 text-xs text-slate-500 font-bold space-y-0.5">
            <p className="font-mono text-brand-navy/80">ID: {displayId}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 md:gap-12 text-xs border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-8 flex-1">
        <div>
          <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">
            Programme
          </span>
          <span className="text-[12.5px] font-extrabold text-slate-705 text-slate-700 block mt-1 leading-snug">
            {displayProgramme}
          </span>
        </div>
        <div>
          <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">
            Semester
          </span>
          <span className="text-[12.5px] font-extrabold text-slate-705 text-slate-700 block mt-1">
            {displaySemester}
          </span>
        </div>
        <div className="col-span-2 border-t border-slate-50 pt-3">
          <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">
            Email Address
          </span>
          <span className="text-[12.5px] font-bold text-slate-505 text-slate-500 block mt-0.5 select-all">
            {email}
          </span>
        </div>
      </div>
    </div>
  );
};

// 2. Research Information Card
export const ResearchInfoCard: React.FC<{ assignment: PanelAssignment }> = ({ assignment }) => {
  const isSarah = assignment.studentName.includes('Sarah Natasha') || assignment.studentId === 'MEA2301184';
  
  const title = isSarah 
    ? 'Blockchain-Based Verification Framework for Academic Credentials' 
    : assignment.researchTitle;
  const researchArea = isSarah 
    ? 'Blockchain / Academic Credential Verification' 
    : 'Distributed Systems & Cloud Computing';
  const abstract = isSarah 
    ? '“This research explores how blockchain can be used to verify academic credentials securely, reduce document fraud, and improve trust in postgraduate academic records.”'
    : `“${assignment.abstract || 'This dissertation analyzes specialized computing execution benchmarks and structural network validations to track core development patterns.'}”`;

  return (
    <div id="research-info-section" className="bg-white border border-[#e2e8f0]/80 rounded-2xl p-6 shadow-3xs text-left space-y-4">
      <div className="flex items-center gap-2 select-none border-b border-slate-105 border-slate-100 pb-3">
        <Bookmark className="w-4.5 h-4.5 text-blue-600 stroke-[2.2]" />
        <h4 className="text-xs font-black text-brand-navy uppercase tracking-wider font-sans">
          Research Information
        </h4>
      </div>

      <div className="space-y-4 pt-1 font-sans">
        <div className="space-y-1">
          <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">
            Title
          </span>
          <h3 className="text-sm font-extrabold text-brand-navy leading-relaxed">
            {title}
          </h3>
        </div>

        <div className="space-y-1">
          <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">
            Research Area
          </span>
          <span className="text-xs font-black text-blue-600 select-all">
            {researchArea}
          </span>
        </div>

        <div className="space-y-1">
          <span className="text-[9px] font-bold text-slate-405 text-slate-400 block uppercase tracking-wider">
            Abstract
          </span>
          <p className="text-xs text-slate-500 font-semibold leading-relaxed text-justify">
            {abstract}
          </p>
        </div>
      </div>
    </div>
  );
};

// 3. Appointment Data Card
export const AppointmentDataCard: React.FC<{ assignment: PanelAssignment }> = ({ assignment }) => {
  const isSarah = assignment.studentName.includes('Sarah Natasha') || assignment.studentId === 'MEA2301184';
  
  const apptId = isSarah ? 'PN-2025-018' : 'PN-2025-021';
  const role = 'Panel Member';
  const apptDate = isSarah ? '05 Jan 2024' : assignment.appointmentDate;
  const session = '2024/2025 (Sem 1)';
  const released = isSarah ? '06 Jan 2024' : '07 Jan 2024';

  return (
    <div id="appointment-data-card" className="bg-brand-navy border border-slate-800 rounded-2xl p-6 shadow-sm text-left text-white relative overflow-hidden">
      {/* Decorative subtle backdrop grid accent */}
      <div className="absolute inset-0 opacity-5 pointer-events-none bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:16px_16px]" />
      
      {/* Active Badge Top Right */}
      <div className="absolute top-5 right-5 select-none">
        <span className="bg-blue-500/10 text-blue-400 border border-blue-500/30 text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg">
          Active
        </span>
      </div>

      <div className="relative z-10 space-y-4">
        <div className="border-b border-white/[0.08] pb-3 select-none">
          <span className="text-[9px] font-black text-indigo-300 uppercase tracking-widest block font-sans">
            Appointment Data
          </span>
        </div>

        <div className="space-y-1.5 pt-1">
          <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">
            Appointment ID
          </span>
          <span className="text-[17px] font-black text-white font-mono block tracking-tight">
            {apptId}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-y-4 gap-x-6 pt-2 text-xs">
          <div>
            <span className="text-[9px] font-bold text-[#94a3b8] block uppercase tracking-wider">
              Role
            </span>
            <span className="font-extrabold text-slate-100 block mt-0.5">
              {role}
            </span>
          </div>

          <div>
            <span className="text-[9px] font-bold text-[#94a3b8] block uppercase tracking-wider">
              Date
            </span>
            <span className="font-extrabold text-slate-100 block mt-0.5">
              {apptDate}
            </span>
          </div>

          <div>
            <span className="text-[9px] font-bold text-[#94a3b8] block uppercase tracking-wider">
              Academic Session
            </span>
            <span className="font-extrabold text-indigo-200 block mt-0.5">
              {session}
            </span>
          </div>

          <div>
            <span className="text-[9px] font-bold text-[#94a3b8] block uppercase tracking-wider">
              Released
            </span>
            <span className="font-extrabold text-slate-100 block mt-0.5">
              {released}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// 4. Supervisor Card
export const SupervisorInfoCard: React.FC<{ assignment: PanelAssignment }> = ({ assignment }) => {
  const isSarah = assignment.studentName.includes('Sarah Natasha') || assignment.studentId === 'MEA2301184';
  
  const supervisorName = isSarah ? 'Dr. Siti Noor' : assignment.supervisor;
  const dept = 'Faculty of Computing';
  const resArea = isSarah ? 'Cybersecurity' : 'Software Engineering & Databases';
  const email = isSarah ? 'siti.noor@fsktm.edu.my' : `${assignment.supervisor.toLowerCase().replace(/\s+/g, '').replace('dr.', '')}@fsktm.edu.my`;

  return (
    <div id="supervisor-info-card" className="bg-white border border-[#e2e8f0]/80 rounded-2xl p-6 shadow-3xs text-left space-y-4">
      <div className="flex items-center gap-2 select-none border-b border-slate-100 pb-3">
        <User className="w-4.5 h-4.5 text-blue-600 stroke-[2.2]" />
        <h4 className="text-xs font-black text-brand-navy uppercase tracking-wider font-sans">
          Supervisor
        </h4>
      </div>

      <div className="flex gap-4 items-center">
        <div className="w-[36px] h-[36px] rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs select-none shadow-3xs border border-slate-200/40">
          {supervisorName.slice(4, 6)}
        </div>
        <div>
          <h5 className="font-black text-sm text-brand-navy leading-tight">
            {supervisorName}
          </h5>
          <p className="text-[10px] text-slate-400 font-bold mt-0.5">
            {dept}
          </p>
        </div>
      </div>

      <div className="space-y-3 pt-2 text-xs">
        <div>
          <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">
            Research Area
          </span>
          <span className="text-xs font-extrabold text-slate-700 block mt-0.5">
            {resArea}
          </span>
        </div>

        <div>
          <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">
            Email
          </span>
          <span className="text-xs font-bold text-blue-650 text-blue-600 block mt-0.5 select-all">
            {email}
          </span>
        </div>
      </div>
    </div>
  );
};

// 5. Evaluation Stage Card
export const EvaluationStageCard: React.FC<{ 
  assignment: PanelAssignment;
  onOpenMarksEntry?: () => void;
}> = ({ assignment, onOpenMarksEntry }) => {
  return (
    <div id="evaluation-stage-card" className="bg-white border border-[#e2e8f0]/80 rounded-2xl p-6 shadow-3xs text-left space-y-4">
      <div className="flex justify-between items-center select-none border-b border-slate-100 pb-3">
        <span className="text-xs font-black text-brand-navy uppercase tracking-wider font-sans">
          Evaluation Stage
        </span>
        <span className="bg-[#eff6ff] text-blue-650 border border-blue-100 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md">
          Pending
        </span>
      </div>

      <div className="space-y-1.5 text-left">
        <h4 className="text-[17px] font-black text-brand-navy tracking-tight">
          EE Evaluation
        </h4>
        <div className="flex items-center gap-1.5 text-rose-500 font-bold text-xs select-none">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Marks Entry Status: Not Started</span>
        </div>
      </div>

      {/* Entry Period Details Card Block */}
      <div className="bg-[#eff6ff]/40 border border-indigo-100/40 rounded-xl p-4 text-xs space-y-2.5">
        <div>
          <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">
            Entry Period
          </span>
          <span className="text-[11.5px] font-extrabold text-brand-navy block mt-0.5">
            01 Dec 2025 - 10 Dec 2025
          </span>
        </div>
        <div>
          <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">
            Last Updated
          </span>
          <span className="text-[11.5px] font-bold text-slate-500 block mt-0.5 italic">
            Not available
          </span>
        </div>
      </div>

      {/* Open Marks Entry Action Button */}
      <button
        id="open-marks-entry-btn"
        type="button"
        onClick={onOpenMarksEntry}
        className="w-full py-3 bg-brand-navy hover:bg-slate-800 text-white rounded-xl text-xs font-black tracking-widest uppercase transition shadow-sm flex items-center justify-center gap-2 cursor-pointer"
      >
        <FileText className="w-3.5 h-3.5 text-indigo-300" />
        <span>Open Marks Entry</span>
      </button>
    </div>
  );
};

// 6. Related Documents Table Card
export const RelatedDocumentsTable: React.FC = () => {
  const documents = [
    { name: 'Proposal.pdf', category: 'Proposal', date: '05 Jan 2024' },
    { name: 'Panel Appointment Notice.pdf', category: 'Notice', date: '06 Jan 2024' },
    { name: 'Evaluation Rubric.pdf', category: 'Rubric', date: '06 Jan 2024' }
  ];

  return (
    <div id="related-documents-section" className="bg-white border border-[#e2e8f0]/80 rounded-2xl p-6 shadow-3xs text-left space-y-4">
      <div className="flex items-center gap-2 select-none border-b border-slate-100 pb-3">
        <FileText className="w-4.5 h-4.5 text-blue-600 stroke-[2.2]" />
        <h4 className="text-xs font-black text-brand-navy uppercase tracking-wider font-sans">
          Related Documents
        </h4>
      </div>

      {/* Desktop Responsive Table Layout */}
      <div className="overflow-x-auto">
        <table className="w-full text-left min-w-[500px] border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-100 font-bold text-slate-400 text-[10px] uppercase tracking-wider select-none">
              <th className="py-2 pb-3 text-left">File Name</th>
              <th className="py-2 pb-3 text-left">Category</th>
              <th className="py-2 pb-3 text-left">Uploaded</th>
              <th className="py-2 pb-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 text-slate-700">
            {documents.map((doc, i) => (
              <tr key={i} className="hover:bg-slate-50/20 transition-colors">
                <td className="py-4 font-bold text-brand-navy">
                  <div className="flex items-center gap-2.5">
                    <FileText className="w-4 h-4 text-rose-500 shrink-0" />
                    <span>{doc.name}</span>
                  </div>
                </td>
                <td className="py-4 font-semibold text-slate-500">
                  {doc.category}
                </td>
                <td className="py-4 font-medium text-slate-400">
                  {doc.date}
                </td>
                <td className="py-4 text-right">
                  <button 
                    type="button"
                    onClick={() => alert(`Opening document template preview for: ${doc.name}`)}
                    className="text-blue-600 hover:text-blue-800 font-extrabold text-[11px] uppercase tracking-wider transition-colors bg-blue-50/60 hover:bg-blue-100 border border-blue-100/30 px-3 py-1 rounded-lg"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ==================== MAIN PAGE CONTAINER ====================

export const PanelAssignmentDetail: React.FC<PanelAssignmentDetailProps> = ({
  assignment,
  onBack,
  onOpenMarksEntry
}) => {
  return (
    <div id="panel-assignment-detail-main" className="space-y-6">
      
      {/* Back to Panel Appointments link flow top row */}
      <div className="text-left select-none">
        <button
          onClick={onBack}
          className="group inline-flex items-center gap-2 text-slate-500 hover:text-brand-navy font-extrabold text-xs uppercase tracking-widest transition cursor-pointer select-none"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Panel Appointments</span>
        </button>
      </div>

      {/* Main Title Metadata panel bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-left select-none">
        <div>
          <h1 className="page-title">
            Panel Assignment Detail
          </h1>
          <p className="page-subtitle">
            View student details, research information, supervisor details, and related evaluation records.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="bg-[#eff6ff] text-blue-605 text-blue-600 border border-blue-100 rounded-xl px-4 py-1.5 text-xs font-black uppercase tracking-wider leading-none">
            Session 2024/2025
          </span>
        </div>
      </div>

      {/* Main Grid Content Area Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-7">
        
        {/* Left Column blocks layout matches the mock design */}
        <div className="lg:col-span-8 space-y-6">
          <StudentProfileCard assignment={assignment} />
          <ResearchInfoCard assignment={assignment} />
          <RelatedDocumentsTable />
        </div>

        {/* Right Column sidebar modules side panels */}
        <div className="lg:col-span-4 space-y-6">
          <AppointmentDataCard assignment={assignment} />
          <SupervisorInfoCard assignment={assignment} />
          <EvaluationStageCard 
            assignment={assignment} 
            onOpenMarksEntry={onOpenMarksEntry} 
          />
        </div>

      </div>

    </div>
  );
};
