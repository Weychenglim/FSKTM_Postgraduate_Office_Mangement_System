/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { SummaryCard } from './SummaryCard';
import { FilterCard } from './FilterCard';
import { ValidationCard } from './ValidationCard';
import { RecentUpdatesCard } from './RecentUpdatesCard';
import { ActionButton } from './ActionButton';
import { FormInput } from './FormInput';
import { FormTextarea } from './FormTextarea';
import { FormSelect } from './FormSelect';
import { ToggleSwitch } from './ToggleSwitch';
import { RightDrawer } from './RightDrawer';
import { RequirementChecklist } from './RequirementChecklist';
import { 
  ChevronLeft,
  Sliders, 
  Plus, 
  Eye, 
  ChevronRight, 
  ListRestart, 
  Download, 
  Copy, 
  CheckCircle2, 
  Trash2,
  X,
  FileCheck2,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface RubricComponent {
  id: string;
  name: string;
  description: string;
  maxMarks: number;
  required: boolean;
  status: 'ACTIVE' | 'INACTIVE';
  displayOrder?: number;
}

interface RubricsManagementViewProps {
  onBack: () => void;
}

export const RubricsManagementView: React.FC<RubricsManagementViewProps> = ({ onBack }) => {
  // Form list state
  const [rubrics, setRubrics] = useState<RubricComponent[]>([
    {
      id: '1',
      name: 'Problem Definition',
      description: 'Clarity of problem statement and research objectives',
      maxMarks: 20,
      required: true,
      status: 'ACTIVE',
      displayOrder: 1
    },
    {
      id: '2',
      name: 'Literature Review',
      description: 'Relevance and depth of reviewed work',
      maxMarks: 20,
      required: true,
      status: 'ACTIVE',
      displayOrder: 2
    },
    {
      id: '3',
      name: 'Methodology',
      description: 'Suitability and completeness of proposed approach',
      maxMarks: 25,
      required: true,
      status: 'ACTIVE',
      displayOrder: 3
    },
    {
      id: '4',
      name: 'Technical Understanding',
      description: 'Understanding of system, tools, algorithms, or framework',
      maxMarks: 20,
      required: true,
      status: 'ACTIVE',
      displayOrder: 4
    },
    {
      id: '5',
      name: 'Presentation and Q&A',
      description: 'Communication, structure, and response to questions',
      maxMarks: 15,
      required: true,
      status: 'ACTIVE',
      displayOrder: 5
    }
  ]);

  // Selected filters
  const [semester, setSemester] = useState('Sem 1 2025/2026');
  const [stage, setStage] = useState('EE Evaluation');

  // Modals state
  const [activeModal, setActiveModal] = useState<'preview' | 'add' | 'edit' | null>(null);
  const [selectedRubricId, setSelectedRubricId] = useState<string | null>(null);

  // Add/Edit Form state
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formMaxMarks, setFormMaxMarks] = useState(20);
  const [formRequired, setFormRequired] = useState(true);
  const [formStatus, setFormStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [formDisplayOrder, setFormDisplayOrder] = useState<number>(3);

  // Simulated score slider states for form previewing
  const [previewScores, setPreviewScores] = useState<Record<string, number>>({
    '1': 16,
    '2': 18,
    '3': 22,
    '4': 15,
    '5': 14
  });

  // Calculate sum of max marks
  const totalMaxMarks = rubrics.reduce((acc, r) => acc + r.maxMarks, 0);

  // Toast / System Alerts
  const [toast, setToast] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  // Open Edit Dialog
  const handleOpenEdit = (rubric: RubricComponent) => {
    setSelectedRubricId(rubric.id);
    setFormName(rubric.name);
    setFormDesc(rubric.description);
    setFormMaxMarks(rubric.maxMarks);
    setFormRequired(rubric.required);
    setFormStatus(rubric.status);
    setFormDisplayOrder(rubric.displayOrder || (rubric.id === '1' ? 1 : rubric.id === '2' ? 2 : rubric.id === '3' ? 3 : rubric.id === '4' ? 4 : 5));
    setActiveModal('edit');
  };

  // Open Add Dialog
  const handleOpenAdd = () => {
    setFormName('');
    setFormDesc('');
    setFormMaxMarks(10);
    setFormRequired(true);
    setFormStatus('ACTIVE');
    setFormDisplayOrder(rubrics.length + 1);
    setActiveModal('add');
  };

  // Handle Edit Submission
  const handleSaveEdit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formName.trim()) return;

    setRubrics(prev => prev.map(r => r.id === selectedRubricId ? {
      ...r,
      name: formName,
      description: formDesc,
      maxMarks: formMaxMarks,
      required: formRequired,
      status: formStatus,
      displayOrder: formDisplayOrder
    } : r));

    setActiveModal(null);
    triggerToast(`Rubric component "${formName}" updated successfully.`);
  };

  // Handle Add Submission
  const handleSaveAdd = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formName.trim()) return;

    const newId = String(Date.now());
    const newRubric: RubricComponent = {
      id: newId,
      name: formName,
      description: formDesc,
      maxMarks: formMaxMarks,
      required: formRequired,
      status: formStatus,
      displayOrder: formDisplayOrder
    };

    setRubrics(prev => [...prev, newRubric]);
    setActiveModal(null);
    triggerToast(`New rubric component "${formName}" added successfully.`);
  };

  const handleDeleteComponent = (id: string) => {
    const item = rubrics.find(r => r.id === id);
    if (item && confirm(`Are you sure you want to remove "${item.name}" from the evaluation criteria?`)) {
      setRubrics(prev => prev.filter(r => r.id !== id));
      triggerToast(`Removed "${item.name}" from rubrics.`);
    }
  };

  // Handle duplicate / clone
  const handleCloneToNext = () => {
    triggerToast(`Successfully cloned all 5 assessment components into next semester ("Sem 2 2025/2026").`);
  };

  // Export PDF definition template
  const handleExportPDF = () => {
    triggerToast("Generating FSKTM Rubrics Portfolio Document PDF. Download started.");
  };

  // Helper score calculator for preview
  const previewScoreSum = (Object.values(previewScores) as number[]).reduce((a: number, b: number) => a + b, 0);

  return (
    <div id="rubrics-root-frame" className="space-y-8 animate-fade-in relative text-left">
      
      {/* Absolute floating toast notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 right-6 z-50 bg-[#0c1424] text-white border border-white/10 p-4 rounded-xl shadow-2xl flex items-center gap-3.5 text-xs font-bold font-sans"
          >
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Heading Title Segment */}
      <div id="rubrics-banner-section" className="flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex flex-col text-left">
          <button
            onClick={onBack}
            className="back-link group mb-3"
          >
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Marks & Evaluation Management</span>
          </button>

          <h1 className="page-title">
            Rubric Components Management
          </h1>
          <p className="page-subtitle leading-relaxed">
            Define rubric components, maximum marks, and validation rules for mark entry.
          </p>
        </div>

        {/* Action Header block buttons (Preview Mark Entry & Add Component) */}
        <div id="header-action-panel" className="flex items-center gap-3.5">
          <button
            onClick={() => setActiveModal('preview')}
            className="px-4 py-3 bg-white hover:bg-slate-50 text-[#0c1424] border border-slate-205 rounded-xl text-xs font-bold tracking-tight flex items-center gap-2.5 transition-all cursor-pointer shadow-xs select-none"
          >
            <Eye className="w-4.5 h-4.5 text-slate-500" />
            <span>Preview Mark Entry Form</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="px-4.5 py-3 bg-[#0c1424] text-white hover:bg-slate-800 rounded-xl text-xs font-extrabold tracking-wider uppercase flex items-center gap-2 transition-all cursor-pointer shadow-md select-none"
          >
            <Plus className="w-4.5 h-4.5 text-blue-400" />
            <span>Add Component</span>
          </button>
        </div>
      </div>

      {/* 4 Top Summary Card Statistics info */}
      <div id="metric-cards-row" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <SummaryCard
          title="Active Semester"
          badgeText={semester}
          badgeType="active"
          subtext="Grading Session Workspace"
          onClick={() => {}}
        />
        <SummaryCard
          title="Evaluation Stage"
          badgeText={stage}
          badgeType="active"
          subtext="Target Phase Scale"
          onClick={() => {}}
        />
        <SummaryCard
          title="Components"
          badgeText={`${rubrics.length} Total`}
          badgeType="generated"
          subtext="Assessment Categories"
          onClick={() => {}}
        />
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 pl-6 text-left shadow-[0_4px_20px_rgba(241,245,249,0.5)] relative overflow-hidden flex flex-col justify-between min-h-[110px]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider block">
              Total Marks
            </span>
            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[8px] font-extrabold tracking-wider rounded-md uppercase">
              Balanced
            </span>
          </div>
          <div className="flex items-center gap-2.5 mt-2.5">
            <span className="text-[#0c1424] font-extrabold text-[22px] tracking-tight">
              {totalMaxMarks} <span className="text-slate-400 text-sm font-medium">/ 100</span>
            </span>
          </div>
          {/* Decorative side accent border indicating balancing weight status */}
          <div className="absolute top-0 right-0 h-full w-1.5 bg-emerald-500" />
        </div>
      </div>

      {/* Standardized filters with Status READY chip */}
      <FilterCard
        semester={semester}
        setSemester={setSemester}
        stage={stage}
        setStage={setStage}
        onExportAction={() => triggerToast("Sharing Rubrics definition configuration to panel supervisors...")}
      />

      {/* Main Core Layout grid: Left Columns (Rubric Components list) & Right Column (Validation / updates) */}
      <div id="columns-matrix" className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Span (8 out of 12 columns): Components Table list */}
        <div id="components-panel-container" className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 md:p-8 text-left shadow-[0_8px_30px_rgb(241,245,249,0.5)]">
            
            {/* Components table header info */}
            <div className="flex items-center justify-between pb-5 border-b border-slate-100 mb-5">
              <h3 className="text-lg font-extrabold text-[#0c1424] tracking-tight">
                Rubric Components
              </h3>

              <button
                onClick={() => triggerToast('Adjust layout hierarchies. Drag-and-drop hierarchy active.')}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1.5 cursor-pointer select-none"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                <span>Reorder Components</span>
              </button>
            </div>

            {/* Rubrics table representation */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-left border-collapse">
                <thead>
                  <tr className="data-thead">
                    <th className="data-th">Component</th>
                    <th className="data-th">Description</th>
                    <th className="data-th text-center">Max Marks</th>
                    <th className="data-th text-center">Required</th>
                    <th className="data-th text-center">Status</th>
                    <th className="data-th text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rubrics.map((rub) => (
                    <tr 
                      key={rub.id} 
                      className="hover:bg-slate-50/40 transition-colors group"
                    >
                      <td className="data-td-strong">
                        {rub.name}
                      </td>
                      <td className="data-td max-w-[200px] leading-relaxed">
                        {rub.description}
                      </td>
                      <td className="data-td text-center font-mono">
                        {rub.maxMarks}
                      </td>
                      <td className="data-td text-center">
                        {rub.required ? 'Yes' : 'No'}
                      </td>
                      <td className="data-td text-center">
                        <span className="inline-flex px-2 py-0.5 rounded bg-blue-50 text-blue-600 text-[9px] font-extrabold tracking-wide uppercase">
                          {rub.status}
                        </span>
                      </td>
                      <td className="data-td text-right">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={() => handleOpenEdit(rub)}
                            className="text-xs font-bold text-blue-650 hover:text-blue-800 transition-colors cursor-pointer select-none"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteComponent(rub.id)}
                            className="text-xs font-bold text-slate-400 hover:text-rose-600 transition-colors cursor-pointer select-none"
                            title="Delete Component"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {/* Dynamic Weights Sum block */}
                  <tr className="bg-slate-50/70 border-t border-slate-200">
                    <td className="py-4 px-5 font-extrabold text-xs text-[#0c1424]">
                      Total:
                    </td>
                    <td className="py-4 px-5" />
                    <td className="py-4 px-5 text-center font-extrabold text-sm text-blue-700 font-mono">
                      {totalMaxMarks} marks
                    </td>
                    <td className="py-4 px-5" />
                    <td className="py-4 px-5" />
                    <td className="py-4 px-5" />
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Validation Indicator Warning if weighting values doesn't add up to 100 */}
            {totalMaxMarks !== 100 && (
              <div id="weight-alert-block" className="mt-6 flex items-start gap-3 p-4 bg-rose-50 border border-rose-100 text-rose-900 rounded-2xl text-xs text-left">
                <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                <div className="flex flex-col font-semibold leading-relaxed">
                  <span className="font-bold">Invalid Rubrics Balance:</span>
                  <span className="text-slate-600 font-medium mt-1">Rubric weights sum currently totals {totalMaxMarks} marks instead of exactly 100. Modify assessments to meet requirements.</span>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Right Span (4 out of 12 columns): Validation guidance and logs actions */}
        <div id="validation-logs-column" className="lg:col-span-4 space-y-6">
          
          {/* Validation card conditions */}
          <ValidationCard />

          {/* Updates feed list */}
          <RecentUpdatesCard onViewHistory={() => triggerToast("Accessing administrative audit trail log index...")} />

          {/* Bottom administrative command buttons */}
          <div id="extra-actions-block" className="space-y-3 pt-2">
            <button
              onClick={handleExportPDF}
              className="w-full py-3 px-4 bg-[#eff6ff] hover:bg-[#dbeafe] text-[#1e40af] border border-[#bfdbfe] rounded-xl text-xs font-extrabold uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all duration-200 cursor-pointer shadow-xs select-none"
            >
              <Download className="w-4 h-4 text-blue-600" />
              <span>Export PDF Definition</span>
            </button>

            <button
              onClick={handleCloneToNext}
              className="w-full py-3 px-4 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 rounded-xl text-xs font-extrabold uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all duration-200 cursor-pointer shadow-xs select-none"
            >
              <Copy className="w-4 h-4 text-slate-400" />
              <span>Clone to Next Semester</span>
            </button>
          </div>

        </div>

      </div>

      {/* Global Interactive Overlays (Preview / Add / Edit Dialogs) */}
      {createPortal(
        <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 bg-[#0c1424]/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            
            {/* Blur close context backdrop */}
            <div className="absolute inset-0" onClick={() => setActiveModal(null)} />

            {/* Modal layout box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl border border-slate-100 text-left relative z-10"
            >
              
              {/* Top dismissal X */}
              <button
                onClick={() => setActiveModal(null)}
                className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors"
                title="Dismiss overlay"
              >
                <X className="w-5 h-5" />
              </button>

              {/* MODAL CASE A: PREVIEW MARK ENTRY FORM */}
              {activeModal === 'preview' && (
                <div className="flex flex-col space-y-5">
                  <div className="flex items-center gap-2.5 text-slate-900 border-b border-slate-100 pb-4">
                    <FileCheck2 className="w-5.5 h-5.5 text-blue-600" />
                    <h3 className="text-lg font-extrabold tracking-tight">Preview Mark Entry Form</h3>
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                    This simulates the mark sheet panel members use for assessing candidate coursework. Drag the sliders to test input scores against the rubric maximum limits.
                  </p>

                  <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                    {rubrics.map((rub) => {
                      const score = previewScores[rub.id] || 0;
                      return (
                        <div key={rub.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-2">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-extrabold text-[#0c1424]">
                              {rub.name} <span className="text-slate-400">({rub.maxMarks} max)</span>
                            </span>
                            <span className="font-mono font-extrabold text-blue-650">
                              {score} / {rub.maxMarks}
                            </span>
                          </div>

                          <input
                            type="range"
                            min="0"
                            max={rub.maxMarks}
                            value={score}
                            onChange={(e) => setPreviewScores({
                              ...previewScores,
                              [rub.id]: parseInt(e.target.value, 10)
                            })}
                            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0c1424]"
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* Calculated metrics */}
                  <div className="p-3.5 bg-slate-100 rounded-xl border border-slate-200 flex justify-between items-center text-xs font-bold font-sans">
                    <span className="text-slate-500">Combined Preview Score:</span>
                    <span className="text-sm font-mono text-[#0c1424]">
                      {previewScoreSum} / {totalMaxMarks} marks
                    </span>
                  </div>

                  <button
                    onClick={() => setActiveModal(null)}
                    className="w-full py-3 bg-[#0c1424] hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer text-center"
                  >
                    Close Preview Desk
                  </button>
                </div>
              )}

              {/* MODAL CASE B: ADD ASSESSMENT */}
              {activeModal === 'add' && (
                <form onSubmit={handleSaveAdd} className="flex flex-col space-y-5">
                  <div className="flex items-center gap-2.5 text-slate-900 border-b border-slate-100 pb-4">
                    <Sliders className="w-5.5 h-5.5 text-indigo-500" />
                    <h3 className="text-lg font-extrabold tracking-tight">
                      Add Rubric Component
                    </h3>
                  </div>

                  <div className="space-y-4">
                    <FormInput
                      id="name"
                      label="Component Title"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g. Thesis Dissertation Progress"
                      required
                    />

                    <FormTextarea
                      id="desc"
                      label="Description"
                      value={formDesc}
                      onChange={(e) => setFormDesc(e.target.value)}
                      placeholder="Explain evaluation parameters and marking criteria details..."
                      rows={3}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormInput
                        id="max-marks"
                        label="Max Marks Range"
                        type="number"
                        min="1"
                        max="100"
                        value={formMaxMarks}
                        onChange={(e) => setFormMaxMarks(parseInt(e.target.value, 10))}
                        required
                      />

                      <FormInput
                        id="display-order"
                        label="Display Order"
                        type="number"
                        min="1"
                        value={formDisplayOrder}
                        onChange={(e) => setFormDisplayOrder(parseInt(e.target.value, 10))}
                        required
                      />
                    </div>

                    <div className="flex items-center justify-between border border-slate-205 p-3.5 rounded-xl bg-slate-50">
                      <ToggleSwitch
                        id="add-required"
                        checked={formRequired}
                        onChange={setFormRequired}
                        label="Required Component"
                      />
                      
                      <select
                        value={formStatus}
                        onChange={(e) => setFormStatus(e.target.value as 'ACTIVE' | 'INACTIVE')}
                        className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-1.5 rounded-lg focus:outline-none cursor-pointer"
                      >
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="INACTIVE">INACTIVE</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-[#0c1424] hover:bg-slate-800 text-white font-extrabold text-xs tracking-wider uppercase rounded-xl transition cursor-pointer"
                  >
                    Confirm Component Addition
                  </button>
                </form>
              )}

            </motion.div>
          </div>
        )}
        </AnimatePresence>,
        document.body
      )}

      {/* RIGHT SIDE DRAWER FOR EDIT OPERATION (Sparsely customized for edit rubric component drawer) */}
      <RightDrawer
        isOpen={activeModal === 'edit'}
        onClose={() => setActiveModal(null)}
        title="Edit Rubric Component"
      >
        <div id="drawer-form-container" className="flex flex-col h-full justify-between space-y-6">
          <div className="space-y-5 text-left">
            <FormInput
              id="edit-name"
              label="Component Name"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. Methodology"
              required
            />

            <FormTextarea
              id="edit-description"
              label="Description"
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              placeholder="Explain evaluation parameters and marking criteria details..."
              rows={4}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormInput
                id="edit-max-marks"
                label="Max Marks"
                type="number"
                min="1"
                max="100"
                value={formMaxMarks}
                onChange={(e) => setFormMaxMarks(parseInt(e.target.value, 10))}
                required
              />

              <FormInput
                id="edit-display-order"
                label="Display Order"
                type="number"
                min="1"
                value={formDisplayOrder}
                onChange={(e) => setFormDisplayOrder(parseInt(e.target.value, 10))}
                required
              />
            </div>

            {/* Custom Interactive card exactly as in the visual presentation design */}
            <div className="flex items-center justify-between border border-[#d3dfef]/70 p-4 rounded-2xl bg-white shadow-xs">
              <ToggleSwitch
                id="edit-required"
                checked={formRequired}
                onChange={setFormRequired}
                label="Required Component"
              />
              
              <div className="relative">
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as 'ACTIVE' | 'INACTIVE')}
                  className="text-xs font-extrabold text-blue-700 bg-blue-50 border border-blue-100 pl-3 pr-7 py-1.5 rounded-lg focus:outline-none cursor-pointer hover:bg-blue-100/75 transition-colors appearance-none"
                  style={{
                    backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%231e40af' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 8px center',
                    backgroundSize: '12px'
                  }}
                >
                  <option value="ACTIVE">Status: Active</option>
                  <option value="INACTIVE">Status: Inactive</option>
                </select>
              </div>
            </div>

            {/* System requirements dynamic checks checklist with nested display cards */}
            <RequirementChecklist
              checks={[
                { id: 'req1', label: 'Component name is required', status: formName.trim().length > 0 },
                { id: 'req2', label: 'Max marks must be greater than 0', status: formMaxMarks > 0 },
                { id: 'req3', label: 'Total rubric marks must remain 100', status: totalMaxMarks === 100 },
                { id: 'req4', label: 'Display order must be unique', status: !rubrics.some(r => r.id !== selectedRubricId && r.displayOrder === formDisplayOrder) }
              ]}
            />
          </div>

          {/* Action buttons drawer sticky line-footer */}
          <div className="pt-6 border-t border-slate-100 flex items-center gap-3.5">
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="flex-1 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-xs tracking-wider uppercase transition-all duration-200 text-center select-none cursor-pointer shadow-xs"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleSaveEdit()}
              className="flex-1 py-3 bg-[#0c1424] hover:bg-slate-800 text-white rounded-xl font-bold text-xs tracking-wider uppercase transition-all duration-200 text-center select-none cursor-pointer shadow-md"
            >
              Save Changes
            </button>
          </div>
        </div>
      </RightDrawer>

    </div>
  );
};
