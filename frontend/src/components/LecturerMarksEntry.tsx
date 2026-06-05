/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  CheckSquare, 
  Clock, 
  Mail, 
  CheckCircle, 
  Search, 
  FileDown, 
  AlertTriangle, 
  HelpCircle,
  ArrowLeft,
  Save,
  CheckCircle2,
  Info,
  ChevronRight,
  Calculator,
  Sliders,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MarkEntryDetail } from './MarkEntryDetail';
import { MarksEntryHistory } from './MarksEntryHistory';
import { SubmittedMarkDetail } from './SubmittedMarkDetail';
import { PageHeader, PortalToast, StatusBadge } from './PortalPrimitives';
import { LoadingState, ErrorState } from './StateViews';
import { EvaluationTask, EvaluationStatus } from '../types';
import { getEvaluationTasks } from '../services';

// ==================== TYPE DEFINITIONS ====================

// EvaluationStatus and EvaluationTask now live in src/types/marks.ts; the tasks
// are served by marksApi (getEvaluationTasks).

interface LecturerMarksEntryProps {
  onBackToDashboard?: () => void;
}

// Helper: Calculate grade based on score
const calculateGrade = (score: number): { grade: string; color: string } => {
  if (score >= 80) return { grade: 'A', color: 'text-emerald-600' };
  if (score >= 75) return { grade: 'A-', color: 'text-emerald-500' };
  if (score >= 70) return { grade: 'B+', color: 'text-blue-600' };
  if (score >= 65) return { grade: 'B', color: 'text-blue-500' };
  if (score >= 60) return { grade: 'B-', color: 'text-indigo-500' };
  if (score >= 55) return { grade: 'C+', color: 'text-amber-600' };
  if (score >= 50) return { grade: 'C', color: 'text-amber-500' };
  return { grade: 'F', color: 'text-rose-600 font-extrabold' };
};

// ==================== SUB-COMPONENTS ====================

// 1. Customized Summary Card matching screenshot
interface CustomSummaryCardProps {
  title: string;
  value: number;
  subtext: string;
  icon: React.ComponentType<any>;
  themeColor: string;
  iconBg: string;
  iconColor: string;
}

export const CustomSummaryCard: React.FC<CustomSummaryCardProps> = ({
  title,
  value,
  subtext,
  icon: Icon,
  themeColor,
  iconBg,
  iconColor
}) => {
  return (
    <div className="bg-white border border-[#e2e8f0]/80 rounded-2xl p-6 shadow-3xs text-left flex justify-between items-start select-none group hover:shadow-xs transition-all relative overflow-hidden">
      <div className="space-y-4">
        {/* Visual Brand Icon Block */}
        <div className={`w-11 h-11 ${iconBg} rounded-xl flex items-center justify-center border border-slate-100`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        
        <div className="space-y-1">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider font-sans block">
            {title}
          </span>
          <span className="text-xs text-slate-500 font-medium leading-normal block">
            {subtext}
          </span>
        </div>
      </div>

      <span className="text-4xl font-extrabold text-brand-navy pr-2 tracking-tight">
        {value}
      </span>
    </div>
  );
};

// ==================== MAIN COMPONENT ====================

export const LecturerMarksEntry: React.FC<LecturerMarksEntryProps> = ({ onBackToDashboard }) => {
  // 1. Core State — evaluation tasks loaded from marksApi (mock-backed today).
  const [tasks, setTasks] = useState<EvaluationTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTasks = useCallback(() => {
    setLoading(true);
    setError(null);
    getEvaluationTasks()
      .then(setTasks)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load evaluation tasks.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // 2. Filters & Searches State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('All Semesters');
  const [selectedStatus, setSelectedStatus] = useState('All Statuses');
  
  // Confirmed filter states
  const [filteredSearch, setFilteredSearch] = useState('');
  const [filteredSemester, setFilteredSemester] = useState('All Semesters');
  const [filteredStatus, setFilteredStatus] = useState('All Statuses');

  // View state: 'dashboard' | 'history'
  const [currentView, setCurrentView] = useState<'dashboard' | 'history'>('dashboard');

  // Active form view state
  const [activeFormTask, setActiveFormTask] = useState<EvaluationTask | null>(null);

  // Submit Feedback notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Helper trigger action message
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // 3. Filter actions
  const handleApplyFilters = () => {
    setFilteredSearch(searchTerm);
    setFilteredSemester(selectedSemester);
    setFilteredStatus(selectedStatus);
    triggerToast("Search filters applied successfully!");
  };

  // Filter computation
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = 
      task.studentName.toLowerCase().includes(filteredSearch.toLowerCase()) ||
      task.studentId.toLowerCase().includes(filteredSearch.toLowerCase()) ||
      task.researchTitle.toLowerCase().includes(filteredSearch.toLowerCase());
    
    const matchesSem = filteredSemester === 'All Semesters' ? true : task.semester === filteredSemester;
    const matchesStatus = filteredStatus === 'All Statuses' ? true : task.status === filteredStatus;

    return matchesSearch && matchesSem && matchesStatus;
  });

  // Calculate dynamic summary stats
  const statAssigned = tasks.length;
  const statNotStarted = tasks.filter(t => t.status === 'NOT STARTED').length;
  const statDraft = tasks.filter(t => t.status === 'DRAFT SAVED').length;
  const statSubmitted = tasks.filter(t => t.status === 'SUBMITTED').length;

  // 4. Form controller actions
  const handleOpenForm = (task: EvaluationTask) => {
    setActiveFormTask(task);
  };

  const handleExportPDF = () => {
    alert("Generating consolidated PDF export for your assigned entry tasks...");
    triggerToast("PDF Marks export initialized. Download will start shortly.");
  };

  // Status Chip Component matching screenshot styling
  const StatusChip: React.FC<{ type: EvaluationStatus }> = ({ type }) => {
    switch (type) {
      case 'NOT STARTED':
        return <StatusBadge tone="neutral" className="text-[9px] px-2.5 py-0.5">Not Started</StatusBadge>;
      case 'DRAFT SAVED':
        return <StatusBadge tone="info" className="text-[9px] px-2.5 py-0.5">Draft Saved</StatusBadge>;
      case 'SUBMITTED':
        return <StatusBadge tone="success" className="text-[9px] px-2.5 py-0.5">Submitted</StatusBadge>;
      default:
        return null;
    }
  };

  return (
    <div id="lecturer-marks-entry-container" className="space-y-6">
      
      <PortalToast message={toastMessage} />

      <AnimatePresence mode="wait">
        {!activeFormTask ? (
          currentView === 'history' ? (
            <MarksEntryHistory
              onBack={() => setCurrentView('dashboard')}
              onSelectRecord={(task) => setActiveFormTask(task)}
              tasksState={tasks}
            />
          ) : (
            /* ==================== 1. MAIN ENTRY TASKS DASHBOARD VIEW ==================== */
            <motion.div
              key="dashboard-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            <PageHeader
              title="Marks Entry"
              subtitle="Enter and submit marks for your assigned evaluation tasks."
              className="select-none"
            />

            {/* 4 Summary Cards Grid matching reference */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <CustomSummaryCard 
                title="ASSIGNED TASKS" 
                value={statAssigned} 
                subtext="Evaluation tasks assigned to you." 
                icon={CheckSquare}
                themeColor="slate-400"
                iconBg="bg-slate-50/50"
                iconColor="text-slate-600"
              />
              <CustomSummaryCard 
                title="NOT STARTED" 
                value={statNotStarted} 
                subtext="Tasks yet to be opened." 
                icon={Clock}
                themeColor="amber-500"
                iconBg="bg-[#fffbeb] border-[#fef3c7]"
                iconColor="text-amber-600"
              />
              <CustomSummaryCard 
                title="DRAFT SAVED" 
                value={statDraft} 
                subtext="Tasks with saved progress." 
                icon={Mail}
                themeColor="blue-500"
                iconBg="bg-[#eff6ff] border-[#dbeafe]"
                iconColor="text-blue-600"
              />
              <CustomSummaryCard 
                title="SUBMITTED" 
                value={statSubmitted} 
                subtext="Tasks completed and sent." 
                icon={CheckCircle}
                themeColor="emerald-500"
                iconBg="bg-[#e6fbf2] border-[#bef5db]"
                iconColor="text-emerald-600"
              />
            </div>

            {/* Filters panel section layout matches exactly */}
            <div className="bg-white border border-[#e2e8f0]/80 rounded-2xl p-5 shadow-3xs text-left grid grid-cols-1 md:grid-cols-12 gap-5 items-end">
              <div className="col-span-1 md:col-span-5 space-y-1.5">
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">
                  Search Students
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-slate-400">
                    <Search className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by student name, ID, or research title"
                    className="w-full bg-slate-50 border border-slate-200/80 rounded-xl pl-9.5 pr-4 py-2.5 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 transition"
                  />
                </div>
              </div>

              <div className="col-span-1 md:col-span-3 space-y-1.5">
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">
                  Semester
                </label>
                <select
                  value={selectedSemester}
                  onChange={(e) => setSelectedSemester(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-slate-400 transition"
                >
                  <option>All Semesters</option>
                  <option>Sem 1 2025/2026</option>
                  <option>Sem 2 2024/2025</option>
                </select>
              </div>

              <div className="col-span-1 md:col-span-3 space-y-1.5">
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">
                  Status
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-slate-400 transition"
                >
                  <option>All Statuses</option>
                  <option>NOT STARTED</option>
                  <option>DRAFT SAVED</option>
                  <option>SUBMITTED</option>
                </select>
              </div>

              <div className="col-span-1 md:col-span-1">
                <button
                  type="button"
                  onClick={handleApplyFilters}
                  className="w-full py-2.5 bg-brand-navy hover:bg-slate-800 text-white border border-brand-navy rounded-xl text-xs font-extrabold tracking-wider uppercase transition cursor-pointer"
                >
                  Apply
                </button>
              </div>
            </div>

            {/* My Mark Entry Tasks Table Card matches layout & alignment perfectly */}
            <div id="mark-entry-tasks-list-block" className="bg-white border border-[#e2e8f0]/80 rounded-2xl p-6 shadow-3xs text-left space-y-5">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
                <div className="space-y-0.5">
                  <h3 className="text-base font-black text-brand-navy">
                    My Mark Entry Tasks
                  </h3>
                  <p className="text-xs text-slate-400 font-semibold leading-relaxed">
                    Open an assigned evaluation task to enter rubric marks and submit your evaluation.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    onClick={() => setCurrentView('history')}
                    className="inline-flex items-center gap-1.5 border border-[#e2e8f0]/80 bg-white hover:bg-slate-50 py-2 px-4 rounded-xl text-xs font-bold text-slate-700 transition cursor-pointer shadow-3xs"
                  >
                    <span>View Marks Entry History</span>
                  </button>

                  <button
                    onClick={handleExportPDF}
                    className="inline-flex items-center gap-1.5 border border-slate-200 hover:bg-slate-50 py-2 px-3.5 rounded-xl text-xs font-bold text-slate-700 transition cursor-pointer shadow-3xs"
                  >
                    <FileDown className="w-3.5 h-3.5 text-rose-500" />
                    <span>Export PDF</span>
                  </button>
                </div>
              </div>

              {/* Data Table */}
              <div className="overflow-x-auto">
                    <table className="data-table min-w-[800px] text-xs">
                  <thead>
                    <tr className="border-b border-slate-150 border-slate-100 font-bold text-slate-400 text-[10px] uppercase tracking-wider select-none">
                      <th className="py-2.5 pb-4">Student ID</th>
                      <th className="py-2.5 pb-4">Student Name</th>
                      <th className="py-2.5 pb-4">Research Title</th>
                      <th className="py-2.5 pb-4">Semester</th>
                      <th className="py-2.5 pb-4">Deadline</th>
                      <th className="py-2.5 pb-4">Status</th>
                      <th className="py-2.5 pb-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/60 font-sans text-brand-navy/90">
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="p-0">
                          <LoadingState message="Loading evaluation tasks…" />
                        </td>
                      </tr>
                    ) : error ? (
                      <tr>
                        <td colSpan={7} className="p-0">
                          <ErrorState message={error} onRetry={loadTasks} />
                        </td>
                      </tr>
                    ) : filteredTasks.length > 0 ? (
                      filteredTasks.map((task) => {
                        const isOverdue = task.status !== 'SUBMITTED' && task.deadline === '10 Dec 2025';
                        
                        return (
                          <tr key={task.studentId} className="hover:bg-slate-50/20 transition-colors">
                            {/* ID */}
                            <td className="py-4.5 pr-2 font-mono font-bold text-slate-900">
                              {task.studentId}
                            </td>
                            {/* Name */}
                            <td className="py-4.5 pr-4">
                              <div className="flex items-center gap-3">
                                <div className="w-[30px] h-[30px] rounded-lg bg-indigo-50 border border-blue-100/50 text-blue-650 text-blue-600 font-black text-[10px] flex items-center justify-center shrink-0">
                                  {task.initials}
                                </div>
                                <span className="font-extrabold text-slate-900 leading-snug">
                                  {task.studentName}
                                </span>
                              </div>
                            </td>
                            {/* Research Title */}
                            <td className="py-4.5 pr-4 max-w-[280px]">
                              <p className="font-semibold text-slate-650 text-slate-500 leading-relaxed line-clamp-2">
                                {task.researchTitle}
                              </p>
                            </td>
                            {/* Semester */}
                            <td className="py-4.5 pr-2 font-semibold text-slate-605 text-slate-500">
                              {task.semester}
                            </td>
                            {/* Deadline */}
                            <td className={`py-4.5 pr-2 font-extrabold ${isOverdue ? 'text-rose-500' : 'text-slate-500'}`}>
                              {task.deadline}
                            </td>
                            {/* Status */}
                            <td className="py-4.5 pr-2">
                              <StatusChip type={task.status} />
                            </td>
                            {/* Action Button */}
                            <td className="py-4.5 text-center">
                              {task.status === 'SUBMITTED' ? (
                                <button
                                  type="button"
                                  onClick={() => handleOpenForm(task)}
                                  className="border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700 px-4 py-1.5 rounded-lg text-xs font-extrabold transition uppercase tracking-wider block mx-auto cursor-pointer"
                                >
                                  View
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleOpenForm(task)}
                                  className="bg-brand-navy hover:bg-slate-800 text-white px-4 py-1.5 rounded-lg text-xs font-extrabold transition uppercase tracking-wider block mx-auto cursor-pointer shadow-3xs"
                                >
                                  Open
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={7} className="py-12 text-center">
                          <div className="text-slate-400 font-bold text-xs">
                            No matching valuation tasks found. Adjust search terms.
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Component */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-50 select-none text-xs text-slate-400 font-bold">
                <span>
                  Showing 1 to {filteredTasks.length} of {filteredTasks.length} tasks
                </span>
                
                <div className="flex items-center gap-1.5">
                  <button 
                    disabled 
                    className="w-8 h-8 rounded-lg border border-slate-100 flex items-center justify-center text-slate-300 bg-slate-50 cursor-not-allowed"
                  >
                    &lt;
                  </button>
                  <button className="w-8 h-8 rounded-lg border border-brand-navy bg-brand-navy text-white flex items-center justify-center font-black">
                    1
                  </button>
                  <button 
                    disabled 
                    className="w-8 h-8 rounded-lg border border-slate-100 flex items-center justify-center text-slate-300 bg-slate-50 cursor-not-allowed"
                  >
                    &gt;
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom Row Notice & Support box layout match exactly */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              
              {/* Important Notice */}
              <div className="lg:col-span-8 bg-white border border-[#e2e8f0]/80 rounded-2xl p-5 shadow-3xs hover:shadow-3xs transition text-left flex gap-4 items-start font-sans">
                <div className="w-[38px] h-[38px] rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                  <Info className="w-4.5 h-4.5 text-blue-600 stroke-[2.3]" />
                </div>
                <div className="space-y-1 pt-0.5">
                  <h4 className="text-xs font-black text-brand-navy uppercase tracking-wider flex items-center gap-1.5">
                    Important Notice
                  </h4>
                  <p className="text-slate-500 text-xs font-semibold leading-relaxed">
                    Please ensure all marks are entered according to the provided rubrics. Submitted evaluations are final and will be forwarded to the Postgraduate Committee for verification.
                  </p>
                </div>
              </div>

              {/* Need Support? */}
              <div className="lg:col-span-4 bg-brand-navy rounded-2xl p-5 shadow-sm text-left text-white flex flex-col justify-between space-y-4 relative overflow-hidden group">
                <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-indigo-500/5 select-none pointer-events-none" />
                
                <div className="space-y-1 z-10">
                  <h4 className="text-xs font-black uppercase text-indigo-300 tracking-wider">
                    Need Support?
                  </h4>
                  <p className="text-[11px] text-slate-300 font-medium leading-relaxed">
                    Contact the technical helpdesk for issues regarding rubric calculations or submission errors.
                  </p>
                </div>

                <div className="pt-1.5 z-10">
                  <a
                    href="#helpdesk"
                    onClick={(e) => {
                      e.preventDefault();
                      alert("Connecting to Helpdesk Support Ticket queue...");
                    }}
                    className="inline-block text-xs font-extrabold text-[#eff6ff] hover:text-indigo-200 underline underline-offset-4 decoration-indigo-400 select-all"
                  >
                    Contact Helpdesk
                  </a>
                </div>
              </div>

            </div>
          </motion.div>
          )
        ) : activeFormTask.status === 'SUBMITTED' ? (
          <SubmittedMarkDetail
            task={activeFormTask}
            onBack={() => setActiveFormTask(null)}
          />
        ) : (
          <MarkEntryDetail
            task={activeFormTask}
            onBack={() => setActiveFormTask(null)}
            onSave={(updatedTask) => {
              const updatedTasks = tasks.map(t => t.studentId === updatedTask.studentId ? updatedTask : t);
              setTasks(updatedTasks);
              setActiveFormTask(null);
              triggerToast(`Draft saved successfully for ${updatedTask.studentName}!`);
            }}
            onSubmit={(updatedTask) => {
              const updatedTasks = tasks.map(t => t.studentId === updatedTask.studentId ? updatedTask : t);
              setTasks(updatedTasks);
              setActiveFormTask(null);
              triggerToast(`Marks finalized and submitted for ${updatedTask.studentName}!`);
            }}
          />
        )}
      </AnimatePresence>

    </div>
  );
};
