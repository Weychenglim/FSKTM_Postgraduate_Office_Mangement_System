/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  ChevronLeft,
  Calendar,
  Sliders,
  Users,
  CheckCircle2,
  Download,
  Mail,
  Eye,
  Check,
  AlertCircle,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SummaryCard } from './SummaryCard';

interface EvaluationTaskAssignmentProps {
  onBack: () => void;
}

interface PreviewTask {
  id: string;
  studentId: string;
  studentName: string;
  researchTitle: string;
  panelMember: string;
  semester: string;
  status: 'GENERATED' | 'PENDING' | 'NOTIFIED';
}

interface ActivityItem {
  id: string;
  date: string;
  action: string;
  details: string;
  performedBy: string;
}

export const EvaluationTaskAssignment: React.FC<EvaluationTaskAssignmentProps> = ({ onBack }) => {
  // Demonstration State
  const [tasks, setTasks] = useState<PreviewTask[]>([
    {
      id: 't1',
      studentId: 'MEA2301184',
      studentName: 'Sarah Natasha',
      researchTitle: 'Blockchain-Based Verification Framework for Academic Credentials',
      panelMember: 'Dr. Sarah Lim',
      semester: 'Sem 1 2025/2026',
      status: 'GENERATED'
    },
    {
      id: 't2',
      studentId: 'MEA2302199',
      studentName: 'Jason Lee',
      researchTitle: 'Quantum Computing Algorithms in Cryptography',
      panelMember: 'Assoc. Prof. Dr. Amina Malik',
      semester: 'Sem 1 2025/2026',
      status: 'GENERATED'
    },
    {
      id: 't3',
      studentId: 'MEA2400712',
      studentName: 'Nur Aina Rahman',
      researchTitle: 'Blockchain-Based Academic Record Verification System',
      panelMember: 'Dr. Sarah Lim',
      semester: 'Sem 1 2025/2026',
      status: 'GENERATED'
    },
    {
      id: 't4',
      studentId: 'MEA2400881',
      studentName: 'Kumar Raj',
      researchTitle: 'Cloud-Based Research Document Management',
      panelMember: 'Dr. Robert Chen',
      semester: 'Sem 1 2025/2026',
      status: 'GENERATED'
    },
    {
      id: 't5',
      studentId: 'MEA2401023',
      studentName: 'Farah Nabila',
      researchTitle: 'Mobile Learning Adoption in Higher Education',
      panelMember: 'Dr. Robert Chen',
      semester: 'Sem 1 2025/2026',
      status: 'GENERATED'
    }
  ]);

  const [activities, setActivities] = useState<ActivityItem[]>([
    {
      id: 'act1',
      date: '20 Nov 2025',
      action: 'Generated tasks',
      details: '48 tasks assigned',
      performedBy: 'Admin Office Staff'
    },
    {
      id: 'act2',
      date: '20 Nov 2025',
      action: 'Notifications sent',
      details: '48 panel members notified',
      performedBy: 'Admin Office Staff'
    }
  ]);

  // System toast notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<PreviewTask | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Notification action handler
  const handleNotifyPanel = () => {
    // Append a new activity
    const newAct: ActivityItem = {
      id: String(Date.now()),
      date: 'Today',
      action: 'Notifications sent',
      details: '48 panel members re-notified with rubric updates',
      performedBy: 'Admin Office Staff'
    };
    setActivities(prev => [newAct, ...prev]);
    showToast("Dispatched 48 automated email invitations directly to assigned panel members.");
  };

  const handleExportPDF = () => {
    showToast("Exporting FSKTM Evaluation Assignments index sheet to PDF. Check downloads.");
  };

  const handleViewGeneratedTasks = () => {
    showToast("Displaying global record logs for all 48 active postgraduate evaluations.");
  };

  return (
    <div id="eval-assignment-workspace" className="space-y-8 animate-fade-in relative text-left">
      
      {/* Absolute floating toast notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 right-6 z-50 bg-[#0c1424] text-white border border-white/10 p-4 rounded-xl shadow-2xl flex items-center gap-3.5 text-xs font-bold font-sans"
          >
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top breadcrumb heading title section */}
      <div id="eval-header-block" className="flex flex-col text-left">
        <button
          onClick={onBack}
          className="back-link group mb-3"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Marks & Evaluation Management</span>
        </button>

        <h1 className="page-title">
          Evaluation Task Assignment
        </h1>
        <p className="page-subtitle leading-relaxed">
          Generate mark entry tasks for approved panel appointments using the configured period and rubric.
        </p>
      </div>

      {/* Summary grid row representing 4 diagnostic components directly in line with screenshot */}
      <div id="summary-cards-row" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <SummaryCard
          title="Mark Entry Period"
          badgeText="Active"
          badgeType="active"
          subtext="Workspace is open"
          icon={Calendar}
          onClick={() => {}}
        />
        <SummaryCard
          title="Rubric Components"
          badgeText="Ready"
          badgeType="ready"
          subtext="Total weight balanced"
          icon={Sliders}
          onClick={() => {}}
        />
        <SummaryCard
          title="Approved Panel Records"
          badgeText="48"
          badgeType="active"
          subtext="Postgrad panel appointments"
          icon={Users}
          onClick={() => {}}
        />
        <SummaryCard
          title="Tasks Generated"
          badgeText="48"
          badgeType="ready"
          subtext="Evaluation sheets generated"
          icon={CheckCircle2}
          onClick={() => {}}
        />
      </div>

      {/* Two columns grid layout: Left: Assignment Context, Right: Readiness checks */}
      <div id="assignment-diagnostic-grid" className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        
        {/* Left Column: Assignment Context card */}
        <div id="assignment-context-wrapper" className="lg:col-span-7 flex">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 md:p-8 text-left shadow-[0_4px_25px_rgba(241,245,249,0.3)] w-full flex flex-col justify-between relative overflow-hidden">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <span className="font-extrabold text-[#0c1424] text-sm tracking-tight font-sans">
                Assignment Context
              </span>
              <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-[9px] font-extrabold tracking-wider rounded-lg uppercase">
                System Verification
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8 pt-5 text-xs text-left grow">
              <div>
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1">
                  Semester
                </span>
                <span className="font-extrabold text-[#0c1424] text-sm font-sans block">
                  Sem 1 2025/2026
                </span>
              </div>

              <div>
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1">
                  Evaluation Stage
                </span>
                <span className="font-extrabold text-[#0c1424] text-sm font-sans block">
                  EE Evaluation
                </span>
              </div>

              <div>
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1">
                  Mark Entry Period
                </span>
                <span className="font-extrabold text-slate-700 text-xs font-sans block">
                  01 Dec - 10 Dec 2025
                </span>
              </div>

              <div>
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1">
                  Rubric
                </span>
                <span className="font-extrabold text-slate-700 text-xs font-sans block">
                  EE Evaluation Rubric, 100 marks
                </span>
              </div>
            </div>

            {/* Subtle background placeholder graphic strictly for administrative portal theme */}
            <div className="absolute right-[-10px] bottom-[-10px] text-slate-100 opacity-20 pointer-events-none">
              <Sliders className="w-32 h-32" />
            </div>
          </div>
        </div>

        {/* Right Column: Readiness checks card */}
        <div id="readiness-checks-wrapper" className="lg:col-span-5 flex">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 md:p-8 text-left shadow-[0_4px_25px_rgba(241,245,249,0.3)] w-full flex flex-col justify-between">
            <span className="font-extrabold text-[#0c1424] text-sm tracking-tight font-sans block pb-4 border-b border-slate-100">
              Readiness Checks
            </span>

            <ul className="space-y-4 pt-5 grow flex flex-col justify-between">
              <li className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-semibold font-sans">
                  Mark entry period configured
                </span>
                <span className="inline-flex items-center gap-1.5 text-blue-600 font-extrabold text-[10px] tracking-wide uppercase">
                  <span>PASSED</span>
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                </span>
              </li>

              <li className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-semibold font-sans">
                  Rubric components defined
                </span>
                <span className="inline-flex items-center gap-1.5 text-blue-600 font-extrabold text-[10px] tracking-wide uppercase">
                  <span>PASSED</span>
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                </span>
              </li>

              <li className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-semibold font-sans">
                  Approved panel available
                </span>
                <span className="inline-flex items-center gap-1.5 text-blue-600 font-extrabold text-[10px] tracking-wide uppercase">
                  <span>PASSED</span>
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                </span>
              </li>

              <li className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-semibold font-sans">
                  No duplicate evaluation tasks
                </span>
                <span className="inline-flex items-center gap-1.5 text-blue-600 font-extrabold text-[10px] tracking-wide uppercase">
                  <span>PASSED</span>
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                </span>
              </li>
            </ul>
          </div>
        </div>

      </div>

      {/* Main Preview Table for Tasks Assignment */}
      <div id="evaluation-preview-card" className="bg-white rounded-3xl border border-slate-200/80 p-6 md:p-8 text-left shadow-[0_8px_30px_rgb(241,245,249,0.5)]">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 mb-5">
          <div className="text-left">
            <h3 className="text-lg font-extrabold text-[#0c1424] tracking-tight">
              Evaluation Task Preview
            </h3>
            <p className="text-slate-400 text-xs font-semibold mt-1 font-sans">
              Tasks will be assigned to the approved panel member for each student.
            </p>
          </div>

          <button
            onClick={handleExportPDF}
            className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold font-sans flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-xs whitespace-nowrap self-start sm:self-auto select-none"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export Task List (PDF)</span>
          </button>
        </div>

        {/* Data Table block representing students evaluation tasks */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[750px] text-left border-collapse">
            <thead>
              <tr className="data-thead">
                <th className="data-th">Student ID</th>
                <th className="data-th">Student Name</th>
                <th className="data-th">Research Title</th>
                <th className="data-th">Panel Member</th>
                <th className="data-th">Semester</th>
                <th className="data-th text-center">Task Status</th>
                <th className="data-th text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 divide-dashed font-sans">
              {tasks.map((task) => (
                <tr key={task.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="data-td-strong font-mono">
                    {task.studentId}
                  </td>
                  <td className="data-td">
                    {task.studentName}
                  </td>
                  <td className="data-td max-w-[220px] truncate" title={task.researchTitle}>
                    {task.researchTitle}
                  </td>
                  <td className="data-td">
                    {task.panelMember}
                  </td>
                  <td className="data-td">
                    {task.semester}
                  </td>
                  <td className="data-td text-center">
                    <span className="inline-flex px-3 py-1 rounded-full bg-blue-50 text-[9px] font-extrabold tracking-wider text-blue-600 uppercase border border-blue-105">
                      {task.status}
                    </span>
                  </td>
                  <td className="data-td text-right">
                    <button
                      onClick={() => setSelectedTask(task)}
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors pointer-events-auto cursor-pointer"
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

      {/* Task Assignment Commands Panel Row */}
      <div id="task-actions-wrapper" className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 bg-slate-50 border border-slate-100 p-5 rounded-2xl">
        <div className="flex flex-wrap items-center gap-4">
          
          {/* Disabled Generate evaluation tasks since they are already generated per screenshot */}
          <button
            disabled
            className="px-5 py-3.5 bg-slate-400 text-white rounded-xl text-xs font-extrabold tracking-wider uppercase flex items-center gap-2.5 cursor-not-allowed opacity-80"
          >
            <Check className="w-4 h-4 text-slate-200" />
            <span>Generate Evaluation Tasks</span>
          </button>

          {/* Active Notify Panel button */}
          <button
            onClick={handleNotifyPanel}
            className="px-5 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold tracking-wider uppercase flex items-center gap-2.5 transition-all cursor-pointer shadow-md select-none"
          >
            <Mail className="w-4.5 h-4.5 text-blue-200" />
            <span>Notify Panel Members</span>
          </button>

          {/* Outline View Generated Tasks button */}
          <button
            onClick={handleViewGeneratedTasks}
            className="px-5 py-3.5 bg-white hover:bg-slate-50 text-blue-600 border border-blue-200 hover:border-blue-300 rounded-xl text-xs font-extrabold tracking-wider uppercase flex items-center gap-2.5 transition-all cursor-pointer shadow-xs select-none"
          >
            <Eye className="w-4.5 h-4.5 text-blue-500" />
            <span>View Generated Tasks</span>
          </button>
        </div>

        {/* Informative notification message aligned horizontally */}
        <p className="text-[11px] text-slate-550 font-bold leading-relaxed max-w-[320px] text-left lg:text-right">
          Tasks already generated for the current period.
        </p>
      </div>

      {/* Recent Assignment Activity table log listing */}
      <div id="recent-assignment-activity-panel" className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden text-left shadow-[0_4px_25px_rgba(241,245,249,0.3)]">
        
        <div className="p-6 pb-4 border-b border-slate-100">
          <h3 className="text-sm font-extrabold text-[#0c1424] tracking-tight">
            Recent Assignment Activity
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[650px] text-left border-collapse">
            <thead>
              <tr className="data-thead bg-slate-50/50">
                <th className="data-th">Date</th>
                <th className="data-th">Action</th>
                <th className="data-th">Details</th>
                <th className="data-th">Performed By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {activities.map((act) => (
                <tr key={act.id} className="hover:bg-slate-50/20 transition-colors">
                  <td className="data-td">
                    {act.date}
                  </td>
                  <td className="data-td">
                    <button
                      onClick={() => showToast(`Opening activity detail logs for event: ${act.action}`)}
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 underline hover:no-underline text-left cursor-pointer"
                    >
                      {act.action}
                    </button>
                  </td>
                  <td className="data-td">
                    {act.details}
                  </td>
                  <td className="data-td">
                    {act.performedBy}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Beautiful Modal overlay explaining particular task details dynamically */}
      {createPortal(
        <AnimatePresence>
        {selectedTask && (
          <div className="fixed inset-0 bg-[#0c1424]/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="absolute inset-0" onClick={() => setSelectedTask(null)} />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 md:p-8 shadow-2xl border border-slate-100 text-left relative z-10"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                <h4 className="font-extrabold text-[#0c1424] text-sm">
                  Evaluation Task Sheet Info
                </h4>
                <button
                  onClick={() => setSelectedTask(null)}
                  className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition"
                >
                  &times;
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <span className="text-slate-400 font-extrabold uppercase tracking-wide block mb-1">Student</span>
                  <span className="font-extrabold text-blue-900 block text-sm">{selectedTask.studentName} ({selectedTask.studentId})</span>
                </div>

                <div>
                  <span className="text-slate-400 font-extrabold uppercase tracking-wide block mb-1">Thesis Research Title</span>
                  <p className="font-medium text-slate-700 italic leading-relaxed">{selectedTask.researchTitle}</p>
                </div>

                <div>
                  <span className="text-slate-400 font-extrabold uppercase tracking-wide block mb-1">Assigned Panel Examiner</span>
                  <span className="font-extrabold text-[#0c1424] block">{selectedTask.panelMember}</span>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-50">
                  <div>
                    <span className="text-slate-400 font-extrabold uppercase tracking-wide block mb-1">Semester</span>
                    <span className="font-bold text-slate-800">{selectedTask.semester}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-extrabold uppercase tracking-wide block mb-1">Marksheet Status</span>
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-extrabold tracking-wide uppercase rounded">
                      {selectedTask.status}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-3.5 bg-blue-50/50 border border-blue-100/50 rounded-2xl text-slate-650 leading-relaxed font-sans font-medium mt-4">
                  <Clock className="w-4.5 h-4.5 text-blue-600 shrink-0 mt-0.5" />
                  <span>The panel examiner receives notification email and access to standard scoring forms according to active grading periods.</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedTask(null)}
                className="w-full py-3 bg-[#0c1424] hover:bg-slate-850 text-white rounded-xl text-xs font-extrabold uppercase tracking-widest mt-6 cursor-pointer"
              >
                Close Task Sheet
              </button>
            </motion.div>
          </div>
        )}
        </AnimatePresence>,
        document.body
      )}

    </div>
  );
};
