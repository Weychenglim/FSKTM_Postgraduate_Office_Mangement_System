/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { FormCard } from './FormCard';
import { FormInput } from './FormInput';
import { FormSelect } from './FormSelect';
import { ToggleSwitch } from './ToggleSwitch';
import { ValidationRulesCard } from './ValidationRulesCard';
import { AuditLogCard } from './AuditLogCard';
import { DataTable, TableRow } from './DataTable';
import { SummaryCard } from './SummaryCard';
import { ActionButton } from './ActionButton';
import { ChevronLeft, Sliders, Calendar, AlertTriangle, Filter, Download } from 'lucide-react';
import { motion } from 'motion/react';

interface MarkEntryPeriodConfigProps {
  onBack: () => void;
}

export const MarkEntryPeriodConfig: React.FC<MarkEntryPeriodConfigProps> = ({ onBack }) => {
  // Existing periods mock state so we can let the user click 'Edit' or 'View' and modify them!
  const [existingPeriods, setExistingPeriods] = useState<TableRow[]>([
    {
      id: '1',
      semester: 'Sem 1 2025/2026',
      evaluationStage: 'EE Evaluation',
      startDate: '01 Dec 2025',
      endDate: '10 Dec 2025',
      deadline: '10 Dec 2025',
      status: 'Active'
    },
    {
      id: '2',
      semester: 'Sem 1 2025/2026',
      evaluationStage: 'Proposal Evaluation',
      startDate: '15 Nov 2025',
      endDate: '22 Nov 2025',
      deadline: '22 Nov 2025',
      status: 'Closed'
    },
    {
      id: '3',
      semester: 'Sem 2 2024/2025',
      evaluationStage: 'EE Evaluation',
      startDate: '01 May 2025',
      endDate: '10 May 2025',
      deadline: '10 May 2025',
      status: 'Closed'
    }
  ]);

  // Form Fields states initialized with Row 1 data (Active configuration)
  const [semester, setSemester] = useState('Sem 1 2025/2026');
  const [evaluationStage, setEvaluationStage] = useState('EE Evaluation');
  const [startDateStr, setStartDateStr] = useState('12/01/2025');
  const [endDateStr, setEndDateStr] = useState('12/10/2025');
  const [deadlineStr, setDeadlineStr] = useState('12/10/2025, 11:59 PM');
  const [gracePeriodDays, setGracePeriodDays] = useState('2');
  const [isActiveSubmission, setIsActiveSubmission] = useState(true);

  // For visual notification state on successful updating
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Active Semester Card, Period Status Card, Start Date Card, End Date Card states
  // We can derive or link them directly to the active form inputs!
  const deriveSemester = semester;
  const deriveStatusText = isActiveSubmission ? 'Active' : 'Closed';
  
  // Format summary dates nicely to read "01 Dec 2025" style
  const formatDateDisplay = (dateSlash: string) => {
    try {
      const parts = dateSlash.split('/');
      if (parts.length === 3) {
        const monthNum = parseInt(parts[0], 10);
        const day = parts[1].padStart(2, '0');
        const year = parts[2];
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        if (monthNum >= 1 && monthNum <= 12) {
          return `${day} ${months[monthNum - 1]} ${year}`;
        }
      }
    } catch (e) {
      // fallback
    }
    return dateSlash;
  };

  const handleEditRow = (row: TableRow) => {
    // Populate form with row values
    setSemester(row.semester);
    setEvaluationStage(row.evaluationStage);
    
    // convert human dates '01 Dec 2025' back into values if needed, or keep simple string copies
    if (row.startDate === '01 Dec 2025') setStartDateStr('12/01/2025');
    else if (row.startDate === '15 Nov 2025') setStartDateStr('11/15/2025');
    else if (row.startDate === '01 May 2025') setStartDateStr('05/01/2025');
    else setStartDateStr(row.startDate);

    if (row.endDate === '10 Dec 2025') setEndDateStr('12/10/2025');
    else if (row.endDate === '22 Nov 2025') setEndDateStr('11/22/2025');
    else if (row.endDate === '10 May 2025') setEndDateStr('05/10/2025');
    else setEndDateStr(row.endDate);

    if (row.deadline === '10 Dec 2025') setDeadlineStr('12/10/2025, 11:59 PM');
    else if (row.deadline === '22 Nov 2025') setDeadlineStr('11/22/2025, 11:59 PM');
    else if (row.deadline === '10 May 2025') setDeadlineStr('05/10/2025, 11:59 PM');
    else setDeadlineStr(row.deadline);

    setGracePeriodDays('2');
    setIsActiveSubmission(row.status.toLowerCase() === 'active');

    // Show a small UI scroll notification
    setToastMessage(`Loaded "${row.semester} - ${row.evaluationStage}" into the editor below.`);
    setTimeout(() => setToastMessage(null), 3500);

    // smooth scroll to editor
    const editorEl = document.getElementById('config-editor-focus');
    if (editorEl) {
      editorEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleViewRow = (row: TableRow) => {
    handleEditRow(row);
  };

  const [saving, setSaving] = useState(false);

  const handleSubmitConfig = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    setTimeout(() => {
      setSaving(false);
      
      // Update table state dynamically
      const updatedList = existingPeriods.map((p) => {
        // match by semester and evaluationStage for simple mockup updates
        if (p.semester === semester && p.evaluationStage === evaluationStage) {
          return {
            ...p,
            startDate: formatDateDisplay(startDateStr),
            endDate: formatDateDisplay(endDateStr),
            deadline: formatDateDisplay(deadlineStr.split(',')[0]),
            status: isActiveSubmission ? 'Active' : 'Closed'
          };
        }
        return p;
      });
      setExistingPeriods(updatedList);

      setToastMessage('Success: Administrative mark entry configuration applied successfully!');
      setTimeout(() => setToastMessage(null), 4000);
    }, 1000);
  };

  const semesterOptions = [
    { value: 'Sem 1 2025/2026', label: 'Sem 1 2025/2026' },
    { value: 'Sem 2 2025/2026', label: 'Sem 2 2025/2026' },
    { value: 'Sem 1 2024/2025', label: 'Sem 1 2024/2025' },
    { value: 'Sem 2 2024/2025', label: 'Sem 2 2024/2025' }
  ];

  const stageOptions = [
    { value: 'EE Evaluation', label: 'EE Evaluation' },
    { value: 'Proposal Evaluation', label: 'Proposal Evaluation' },
    { value: 'Viva Oral Defense', label: 'Viva Oral Defense' }
  ];

  return (
    <div id="mark-entry-configuration-master" className="space-y-8 animate-fade-in relative">
      
      {/* Toast Alert Banner */}
      {toastMessage && (
        <div id="toast-notif-banner" className="fixed top-6 right-6 z-50 max-w-md bg-[#0c1424] text-white py-3.5 px-5 rounded-2xl shadow-xl flex items-center gap-3 border border-white/10 text-xs font-bold font-sans">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Breadcrumb Header panel */}
      <div id="config-breadcrumb-header" className="flex flex-col text-left">
        <button
          onClick={onBack}
          className="back-link group mb-3"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Marks & Evaluation Management</span>
        </button>

        <h1 id="config-page-title" className="page-title">
          Mark Entry Period Configuration
        </h1>
        <p id="config-page-subtext" className="page-subtitle leading-relaxed">
          Set mark entry start dates, end dates, and submission deadlines for evaluation tasks.
        </p>
      </div>

      {/* Summary Cards Row */}
      <div id="metric-cards-row" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <SummaryCard
          title="Active Semester"
          badgeText={deriveSemester}
          badgeType="active"
          subtext="Postgraduate Division"
          onClick={() => {}}
        />
        <SummaryCard
          title="Entry Period Status"
          badgeText={deriveStatusText}
          badgeType={isActiveSubmission ? 'active' : 'ratio'}
          subtext="System Access Level"
          onClick={() => {}}
        />
        <SummaryCard
          title="Start Date"
          badgeText={formatDateDisplay(startDateStr)}
          badgeType="ready"
          subtext="Submission Release Window"
          icon={Calendar}
          onClick={() => {}}
        />
        <SummaryCard
          title="End Date"
          badgeText={formatDateDisplay(endDateStr)}
          badgeType="ready"
          subtext="Submission Closing Window"
          icon={Calendar}
          onClick={() => {}}
        />
      </div>

      {/* Split grid for configuration and rules/logs */}
      <div id="config-columns-grid" className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column (Span 8): Configure Mark Entry Period Form */}
        <div id="config-form-column" className="lg:col-span-8">
          <FormCard
            id="config-editor-focus"
            title="Configure Mark Entry Period"
            icon={<Sliders className="w-5.5 h-5.5 text-indigo-500" />}
          >
            <form onSubmit={handleSubmitConfig} className="space-y-6">
              
              {/* Semester & Evaluation Stage */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-0">
                <FormSelect
                  id="form-semester-select"
                  label="Semester"
                  options={semesterOptions}
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                />

                <FormSelect
                  id="form-stage-select"
                  label="Evaluation Stage"
                  options={stageOptions}
                  value={evaluationStage}
                  onChange={(e) => setEvaluationStage(e.target.value)}
                />
              </div>

              {/* Start Date & End Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-0">
                <FormInput
                  id="form-start-date"
                  label="Start Date"
                  placeholder="MM/DD/YYYY"
                  value={startDateStr}
                  onChange={(e) => setStartDateStr(e.target.value)}
                />

                <FormInput
                  id="form-end-date"
                  label="End Date"
                  placeholder="MM/DD/YYYY"
                  value={endDateStr}
                  onChange={(e) => setEndDateStr(e.target.value)}
                />
              </div>

              {/* Submission Deadline & Grace Period */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-0">
                <FormInput
                  id="form-deadline"
                  label="Submission Deadline"
                  placeholder="MM/DD/YYYY, 11:59 PM"
                  value={deadlineStr}
                  onChange={(e) => setDeadlineStr(e.target.value)}
                />

                <FormInput
                  id="form-grace-days"
                  label="Grace Period (Days)"
                  type="number"
                  placeholder="2"
                  value={gracePeriodDays}
                  onChange={(e) => setGracePeriodDays(e.target.value)}
                />
              </div>

              {/* Active Toggle */}
              <div className="pt-2 pb-1 border-t border-slate-100 flex flex-col text-left">
                <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider mb-2">
                  Status
                </span>
                <ToggleSwitch
                  id="toggle-submission-active"
                  checked={isActiveSubmission}
                  onChange={setIsActiveSubmission}
                  label="Active for Submission"
                />
              </div>

              {/* Notice Banner box */}
              <div id="portal-members-access-notice" className="flex items-start gap-3.5 p-4 bg-blue-50/80 border border-blue-100 rounded-2xl text-blue-900 text-left">
                <AlertTriangle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="flex flex-col text-xs font-semibold leading-relaxed">
                  <span>Panel members can enter and submit marks only during the active mark entry period.</span>
                </div>
              </div>

              {/* Apply / Save configuration Button */}
              <div className="pt-3">
                <ActionButton
                  type="submit"
                  isLoading={saving}
                  className="w-full text-center"
                >
                  Apply Configuration Parameters
                </ActionButton>
              </div>

            </form>
          </FormCard>
        </div>

        {/* Right Column (Span 4): Validation Rules and Audit Log */}
        <div id="rules-logs-column" className="lg:col-span-4 space-y-8">
          <ValidationRulesCard />
          <AuditLogCard />
        </div>

      </div>

      {/* Existing Mark Entry Periods Table view (Bottom panel) */}
      <div id="table-existing-periods-card" className="bg-white rounded-3xl border border-slate-200/80 p-6 md:p-8 text-left shadow-[0_8px_30px_rgb(241,245,249,0.5)]">
        
        {/* Table header bar */}
        <div id="table-header-toolbar" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h3 id="table-heading" className="text-lg font-extrabold text-[#0c1424] tracking-tight">
            Existing Mark Entry Periods
          </h3>

          {/* Action buttons (Filter / Export) */}
          <div id="table-action-filters" className="flex items-center gap-2.5">
            <button
              onClick={() => alert("Filter Options: Selected postgraduate categories will be summarized.")}
              className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/95 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all cursor-pointer shadow-xs select-none"
            >
              <Filter className="w-4 h-4 text-slate-500" />
              <span>Filter</span>
            </button>

            <button
              onClick={() => {
                alert("Generating Report: Academic Mark Entry Schedule printed successfully.");
              }}
              className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/95 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all cursor-pointer shadow-xs select-none"
            >
              <Download className="w-4 h-4 text-slate-400" />
              <span>Export PDF</span>
            </button>
          </div>
        </div>

        {/* Custom DataTable Render component */}
        <DataTable
          data={existingPeriods}
          onEdit={handleEditRow}
          onView={handleViewRow}
        />

      </div>

    </div>
  );
};
