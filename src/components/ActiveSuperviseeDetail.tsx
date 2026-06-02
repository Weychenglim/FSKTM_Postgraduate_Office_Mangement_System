/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  ArrowLeft, 
  FileText, 
  Eye, 
  User, 
  BookOpen, 
  Calendar, 
  Users, 
  CheckCircle, 
  Info, 
  ExternalLink,
  ClipboardList
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PageHeader } from './PortalPrimitives';
import { StatusChip } from './LecturerSupervisorAppointments';

// ==================== REUSABLE PATTERNS ====================

interface StudentProfileCardProps {
  initials: string;
  name: string;
  status: string;
  studentId: string;
  programme: string;
  semester: string;
  email: string;
}

export const StudentProfileCard: React.FC<StudentProfileCardProps> = ({
  initials,
  name,
  status,
  studentId,
  programme,
  semester,
  email
}) => {
  return (
    <div className="bg-white border border-[#e2e8f0]/80 rounded-2xl p-6 shadow-3xs h-full text-left flex flex-col justify-between">
      <div>
        <div className="flex gap-4 items-center">
          <div className="w-14 h-14 bg-indigo-50 text-brand-navy font-black text-sm rounded-full flex items-center justify-center border border-indigo-100 select-none">
            {initials}
          </div>
          <div>
            <h3 className="text-sm font-black text-brand-navy">
              {name}
            </h3>
            <span className="inline-flex mt-1.5">
              <StatusChip status={status} />
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-slate-100 text-xs font-sans">
          <div>
            <span className="text-[10px] font-black text-slate-400 block uppercase tracking-wider">
              STUDENT ID
            </span>
            <span className="font-mono text-xs font-extrabold text-brand-navy block mt-1">
              {studentId}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 block uppercase tracking-wider">
              PROGRAMME
            </span>
            <span className="text-xs font-extrabold text-slate-700 block mt-1 leading-snug">
              {programme}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-5 text-xs font-sans">
          <div>
            <span className="text-[10px] font-black text-slate-400 block uppercase tracking-wider">
              SEMESTER
            </span>
            <span className="text-xs font-extrabold text-slate-700 block mt-1">
              {semester}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 block uppercase tracking-wider">
              EMAIL
            </span>
            <span className="text-xs font-semibold text-brand-navy break-all block mt-1 leading-normal underline select-all">
              {email}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

interface ResearchInfoCardProps {
  title: string;
  area: string;
  supervisor: string;
  abstract: string;
}

export const ResearchInfoCard: React.FC<ResearchInfoCardProps> = ({
  title,
  area,
  supervisor,
  abstract
}) => {
  return (
    <div className="bg-white border border-[#e2e8f0]/80 rounded-2xl p-6 shadow-3xs h-full text-left space-y-5">
      <div className="flex items-center gap-2 select-none border-b border-slate-100 pb-3">
        <BookOpen className="w-4 h-4 text-slate-500 stroke-[2.2]" />
        <h4 className="text-xs font-black text-brand-navy uppercase tracking-wider">
          Research Information
        </h4>
      </div>

      <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-4 space-y-2">
        <h3 className="text-sm md:text-md font-black text-brand-navy leading-snug">
          "{title}"
        </h3>
        <p className="text-[11px] text-slate-550 font-bold flex flex-wrap gap-x-4 items-center">
          <span>Area: {area}</span>
          <span className="text-slate-205">•</span>
          <span>Supervisor: {supervisor}</span>
        </p>
      </div>

      <div className="space-y-1.5">
        <span className="text-[10px] font-black text-slate-450 uppercase tracking-wider block text-slate-400 select-none">
          ABSTRACT
        </span>
        <p className="text-xs text-slate-600 font-semibold leading-relaxed">
          {abstract}
        </p>
      </div>
    </div>
  );
};

interface AppointmentInfoCardProps {
  appointmentId: string;
  status: string;
  approvedDate: string;
  releasedDate: string;
}

export const AppointmentInfoCard: React.FC<AppointmentInfoCardProps> = ({
  appointmentId,
  status,
  approvedDate,
  releasedDate
}) => {
  return (
    <div className="bg-white border border-[#e2e8f0]/80 rounded-2xl p-6 shadow-3xs h-full text-left flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-2 select-none border-b border-slate-100 pb-4 mb-4">
          <Calendar className="w-4 h-4 text-slate-500 stroke-[2.2]" />
          <h4 className="text-xs font-black text-brand-navy uppercase tracking-wider">
            Appointment Info
          </h4>
        </div>

        <div className="space-y-4 text-xs font-sans">
          <div className="flex justify-between items-center bg-[#f8fafc] px-3 py-2 border border-slate-150 rounded-xl">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Appointment ID
            </span>
            <span className="font-mono text-xs font-black text-brand-navy">{appointmentId}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Status
            </span>
            <StatusChip status={status} />
          </div>

          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Approved Date
            </span>
            <span className="font-extrabold text-brand-navy">{approvedDate}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Released to Student
            </span>
            <span className="font-extrabold text-brand-navy">{releasedDate}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

interface PanelStatusCardProps {
  panelMember: string;
  department: string;
  role: string;
  assignedDate: string;
  status: string;
}

export const PanelStatusCard: React.FC<PanelStatusCardProps> = ({
  panelMember,
  department,
  role,
  assignedDate,
  status
}) => {
  const initials = panelMember
    .split(' ')
    .filter(p => !p.includes('.'))
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase() || 'PM';

  return (
    <div className="bg-white border border-[#e2e8f0]/80 rounded-2xl p-6 shadow-3xs h-full text-left flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-2 select-none border-b border-slate-100 pb-4 mb-4">
          <Users className="w-4 h-4 text-slate-500 stroke-[2.2]" />
          <h4 className="text-xs font-black text-brand-navy uppercase tracking-wider">
            Panel Status
          </h4>
        </div>

        <div className="flex gap-3 items-center bg-[#f8fafc]/80 border border-slate-100 rounded-xl p-3 mb-4 select-none">
          <div className="w-9 h-9 bg-slate-200/60 text-slate-700 font-extrabold text-xs rounded-full flex items-center justify-center">
            {initials}
          </div>
          <div>
            <h4 className="text-[11.5px] font-black text-brand-navy leading-snug">
              {panelMember}
            </h4>
            <p className="text-[10px] text-slate-400 font-bold mt-0.5 uppercase tracking-wide">
              {department}
            </p>
          </div>
        </div>

        <div className="space-y-3.5 text-xs font-sans">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Role
            </span>
            <span className="font-extrabold text-slate-700">{role}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Assigned Date
            </span>
            <span className="font-extrabold text-slate-700">{assignedDate}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Status
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border bg-indigo-50 text-indigo-700 border-indigo-100 select-none">
              {status}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export const EvaluationSummaryCard: React.FC = () => {
  return (
    <div className="bg-white border border-[#e2e8f0]/80 rounded-2xl p-6 shadow-3xs h-full text-left flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-2 select-none border-b border-slate-100 pb-4 mb-4">
          <ClipboardList className="w-4 h-4 text-slate-500 stroke-[2.2]" />
          <h4 className="text-xs font-black text-brand-navy uppercase tracking-wider">
            Evaluation Summary
          </h4>
        </div>

        <div className="flex flex-col items-center justify-center py-6 text-center select-none space-y-3">
          <div className="w-12 h-12 bg-slate-50 border border-slate-100 text-slate-350 rounded-full flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-slate-400 stroke-[1.8] opacity-60" />
          </div>
          <div className="space-y-1">
            <h5 className="text-xs font-bold text-slate-450 text-slate-400 uppercase tracking-wider leading-none">
              No Evaluation Records
            </h5>
            <p className="text-[10px] text-slate-400 font-semibold leading-relaxed max-w-[210px] mx-auto">
              No evaluation records are available yet. Updates will appear once assessments are submitted.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

interface RelatedFileRow {
  fileName: string;
  category: string;
  uploadedDate: string;
}

interface RelatedFilesTableProps {
  files: RelatedFileRow[];
  onOpenFile?: (fileName: string) => void;
}

export const RelatedFilesTable: React.FC<RelatedFilesTableProps> = ({
  files,
  onOpenFile
}) => {
  return (
    <div className="bg-white border border-[#e2e8f0]/80 rounded-2xl overflow-hidden shadow-3xs text-left">
      <div className="p-5 border-b border-slate-100 flex justify-between items-center select-none">
        <div className="flex items-center gap-2">
          <FileText className="w-4.5 h-4.5 text-slate-500 stroke-[2.2]" />
          <h3 className="text-xs font-black text-brand-navy uppercase tracking-wider">
            Related Files
          </h3>
        </div>
        <span className="text-[10px] text-slate-450 font-black uppercase bg-brand-navy/5 px-2.5 py-0.5 rounded-lg border border-brand-navy/10">
          {files.length} Files Uploaded
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="data-table min-w-[750px] text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-150 text-[10px] font-bold text-slate-400 uppercase tracking-widest select-none">
              <th className="py-4.5 px-6">FILE NAME</th>
              <th className="py-4.5 px-6">CATEGORY</th>
              <th className="py-4.5 px-6">UPLOADED DATE</th>
              <th className="py-4.5 px-6 text-center">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-brand-navy">
            {files.map((file) => (
              <tr key={file.fileName} className="hover:bg-slate-50/50 transition-colors">
                <td className="py-4.5 px-6">
                  <div className="flex items-center gap-2.5 select-all">
                    <FileText className="w-4 h-4 text-rose-500 stroke-[2.2] shrink-0" />
                    <span className="font-extrabold text-brand-navy hover:underline cursor-pointer">
                      {file.fileName}
                    </span>
                  </div>
                </td>
                <td className="py-4.5 px-6 font-semibold text-slate-500">
                  {file.category}
                </td>
                <td className="py-4.5 px-6 font-bold text-slate-450 text-slate-400">
                  {file.uploadedDate}
                </td>
                <td className="py-4.5 px-6 text-center">
                  <button
                    onClick={() => onOpenFile?.(file.fileName)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-brand-navy hover:text-slate-800 border border-slate-200 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-3xs"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-400" />
                    <span>View</span>
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

export const NoticeCard: React.FC = () => {
  return (
    <div className="border border-indigo-100 bg-indigo-50/40 p-6 rounded-2xl flex gap-4 text-left select-none font-sans">
      <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
        <Info className="w-4.5 h-4.5 text-indigo-700" />
      </div>
      <div className="space-y-1.5">
        <h4 className="text-xs font-black text-indigo-805 uppercase tracking-wider text-indigo-800">
          Supervisor Read-Only View
        </h4>
        <p className="text-slate-500 text-xs font-semibold leading-relaxed">
          This page provides a read-only consolidated view of the student’s supervision status. To update files, appointment records, or letters, please use the related management modules.
        </p>
      </div>
    </div>
  );
};

// ==================== MAIN COMPONENT WORKFLOW ====================

interface ActiveSuperviseeDetailProps {
  onBack: () => void;
  studentId?: string;
  studentName?: string;
}

export const ActiveSuperviseeDetail: React.FC<ActiveSuperviseeDetailProps> = ({
  onBack,
  studentId = 'MEA2209841',
  studentName = 'Ahmad Luqman'
}) => {
  // Related files data source
  const fileRecords: RelatedFileRow[] = [
    {
      fileName: 'Proposal.pdf',
      category: 'Research Proposal',
      uploadedDate: '12 Oct 2023'
    },
    {
      fileName: 'Supervisor Appointment Letter.pdf',
      category: 'Official Letters',
      uploadedDate: '13 Oct 2023'
    },
    {
      fileName: 'Progress Report 1.pdf',
      category: 'Academic Progress',
      uploadedDate: '15 Jan 2024'
    }
  ];

  return (
    <div id="active-supervisee-detail-page" className="space-y-8 animate-fade-in text-left">
      
      <PageHeader
        title="Active Supervisee Detail"
        subtitle="View supervisee information, appointment details, related documents, and academic progress."
        backLabel="Back to Supervisor Appointments"
        onBack={onBack}
        subtitleClassName="leading-relaxed max-w-4xl"
        className="select-none"
        actions={(
          <span className="bg-brand-navy text-white py-1.5 px-4 rounded-xl text-xs font-black uppercase tracking-widest select-none shadow-sm">
            Session 2024/2025
          </span>
        )}
      />

      {/* TOP SECTION: Left student cards summary, Right Research details info */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-5">
          <StudentProfileCard 
            initials="AL"
            name={studentName}
            status="Active"
            studentId={studentId}
            programme="MSc. Computer Science (Research)"
            semester="Sem 1 2024/2025"
            email="ahmad.luqman@student.fsktm.um.edu.my"
          />
        </div>

        <div className="lg:col-span-7">
          <ResearchInfoCard 
            title="Optimizing Generative Adversarial Networks for Low-Resource Languages"
            area="Artificial Intelligence"
            supervisor="Dr. Wey Cheng"
            abstract="This research explores the application of Generative Adversarial Networks (GANs) to synthesize training data for natural language processing tasks in low-resource linguistic environments. By leveraging unsupervised cross-lingual mappings and attention mechanisms, the study aims to improve the downstream performance of translations where data scarcity impedes standard ML model training blocks."
          />
        </div>
      </div>

      {/* MIDDLE SECTION: Three-column dashboard cards: Appointment Info, Panel Status, Evaluation Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
        <AppointmentInfoCard 
          appointmentId="SV-APT-2023-014"
          status="Active"
          approvedDate="12 Oct 2023"
          releasedDate="13 Oct 2023"
        />

        <PanelStatusCard 
          panelMember="Assoc. Prof. Dr. Amina Malik"
          department="Dept. Computer Science"
          role="Internal Panel Member"
          assignedDate="22 Nov 2025"
          status="ASSIGNED"
        />

        <EvaluationSummaryCard />
      </div>

      {/* BOTTOM SECTION: Related Files Data Listing */}
      <RelatedFilesTable 
        files={fileRecords} 
        onOpenFile={(file) => alert(`Opening or viewing file: ${file}`)}
      />

      {/* Notice Read Only Box Warning */}
      <NoticeCard />

    </div>
  );
};
