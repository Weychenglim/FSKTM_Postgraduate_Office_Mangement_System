import { RecordPage } from './RecordPage';
import { appointmentDetailTypography as typography } from './AppointmentPrimitives';
import { RequestSection } from './RequestDetailPrimitives';
import { ResearchAbstract } from './ResearchAbstract';
import { OperationalIntakeFeedback, useOperationalIntake } from './OperationalIntakeFeedback';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Search, 
  CheckCircle, 
  AlertTriangle, 
  ChevronDown, 
  User,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PanelCandidate } from '../types';
import {
  canSubmitPanelCandidate,
  getPanelCandidateValidationMessage,
} from '../utils/panelRecommendationWorkflow';
import { capacityStateLabel } from '../utils/lecturerCapacity';

export interface StudentData {
  studentUserId?: number;
  studentName: string;
  studentId: string;
  programme: string;
  intake: string;
  supervisor: string;
  initials: string;
  proposedTopic: string;
  area: string;
  abstract: string;
}

interface RecommendPanelMemberDrawerProps {
  backLabel?: string;
  isOpen: boolean;
  busy?: boolean;
  onClose: () => void;
  student: StudentData;
  candidates: PanelCandidate[];
  replacementMember?: string | null;
  onSubmit: (notes: string, candidateId: string, replacementReason: string) => void;
}

export const RecommendPanelMemberDrawer: React.FC<RecommendPanelMemberDrawerProps> = ({
  isOpen,
  busy = false,
  onClose,
  backLabel = 'Back to Panel Appointments',
  student,
  candidates,
  replacementMember,
  onSubmit,
}) => {
  const intake = useOperationalIntake('PANEL_RECOMMENDATION', student.studentUserId, isOpen && student.studentUserId !== undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedLecturer, setSelectedLecturer] = useState<PanelCandidate | null>(null);
  const [recommendationNotes, setRecommendationNotes] = useState('');
  const [replacementReason, setReplacementReason] = useState('');
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selectedLecturer) return;
    const current = candidates.find(candidate => candidate.staffId === selectedLecturer.staffId);
    if (current !== selectedLecturer) setSelectedLecturer(current ?? null);
  }, [candidates, selectedLecturer]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLecturerSelect = (lecturer: PanelCandidate) => {
    if (busy || !(lecturer.selectable ?? lecturer.canSubmit)) return;
    setSelectedLecturer(lecturer);
    setSearchTerm('');
    setShowDropdown(false);
  };

  const removeSelection = () => {
    if (busy) return;
    setSelectedLecturer(null);
    setSearchTerm('');
    setShowDropdown(false);
    setSubmitAttempted(false);
  };

  const filteredLecturers = candidates.filter(lec =>
    lec.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    lec.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lec.staffId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isSupervisorSelected = selectedLecturer?.name === student.supervisor;
  const hasRecommendationNotes = recommendationNotes.trim().length > 0;
  const hasReplacementReason = !replacementMember || replacementReason.trim().length > 0;
  const canSubmitRecommendation = selectedLecturer !== null
    && hasReplacementReason
    && canSubmitPanelCandidate({
      workloadCount: selectedLecturer.workloadCount,
      workloadLimit: selectedLecturer.workloadLimit,
      capacityState: selectedLecturer.capacityState,
      selectable: selectedLecturer.selectable ?? selectedLecturer.canSubmit,
      unavailableUntil: selectedLecturer.unavailableUntil,
      isSupervisor: isSupervisorSelected,
      hasNotes: hasRecommendationNotes,
    });
  const validationMessage = selectedLecturer === null
    ? (candidates.some(candidate => candidate.selectable ?? candidate.canSubmit) ? 'Choose a panel member before submitting your recommendation.' : 'No eligible panel candidates are available.')
    : getPanelCandidateValidationMessage({
        workloadCount: selectedLecturer.workloadCount,
        workloadLimit: selectedLecturer.workloadLimit,
        capacityState: selectedLecturer.capacityState,
        selectable: selectedLecturer.selectable ?? selectedLecturer.canSubmit,
        unavailableUntil: selectedLecturer.unavailableUntil,
        isSupervisor: isSupervisorSelected,
        hasNotes: hasRecommendationNotes,
      });

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);
    if (busy || intake.blocked || !canSubmitRecommendation || !selectedLecturer) return;
    onSubmit(
      recommendationNotes.trim(),
      selectedLecturer.staffId,
      replacementReason.trim(),
    );
  };

  if (!isOpen) return null;
  return <RecordPage title={replacementMember ? 'Replace Panel Member' : 'Recommend Panel Member'} backLabel={backLabel} onBack={onClose} pageKey={`panel-nomination:${student.studentId}`} dirty={selectedLecturer !== null || !!recommendationNotes.trim() || !!replacementReason.trim()} busy={busy}><form onSubmit={handleFormSubmit} className="min-w-0 space-y-6 rounded-2xl border border-slate-200 bg-white p-6">
              <OperationalIntakeFeedback {...intake} activity="PANEL_RECOMMENDATION" onRetry={() => void intake.refresh()} />
              <RequestSection title="Student and supervision" headingClassName={typography.heading}>
                <div id="recommend-student-card" className="space-y-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0"><h3 id="summary-student-name" className={`${typography.name} [overflow-wrap:anywhere]`}>{student.studentName}</h3><p id="summary-student-id" className={`${typography.body} mt-1 [overflow-wrap:anywhere]`}>{student.studentId}</p></div>
                    <span id="summary-status-badge" className="rounded-md border border-amber-100 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">{replacementMember ? 'Panel replacement' : 'Recommendation needed'}</span>
                  </div>
                  <dl className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div className="min-w-0"><dt className={typography.label}>Programme</dt><dd id="summary-student-prog" className={`${typography.body} mt-1 [overflow-wrap:anywhere]`}>{student.programme || 'Not recorded'}</dd></div>
                    <div className="min-w-0"><dt className={typography.label}>Intake semester</dt><dd id="summary-student-intake" className={`${typography.body} mt-1 [overflow-wrap:anywhere]`}>{student.intake || 'Not recorded'}</dd></div>
                    <div className="min-w-0"><dt className={typography.label}>Supervisor</dt><dd className={`${typography.name} mt-1 [overflow-wrap:anywhere]`}>{student.supervisor || 'Not recorded'}</dd></div>
                    {replacementMember ? <div className="min-w-0"><dt className={typography.label}>Current active Panel</dt><dd className={`${typography.name} mt-1 [overflow-wrap:anywhere]`}>{replacementMember}</dd></div> : null}
                  </dl>
                </div>
              </RequestSection>
              <RequestSection title="Research information" headingClassName={typography.heading}>
                <dl id="recommend-research-details" className="space-y-6">
                  <div><dt className={typography.label}>Research title</dt><dd id="research-title-text" className={`${typography.name} mt-1 [overflow-wrap:anywhere]`}>{student.proposedTopic || 'Not recorded'}</dd></div>
                  <div><dt className={typography.label}>Research area</dt><dd id="research-area-tag" className={`${typography.body} mt-1 [overflow-wrap:anywhere]`}>{student.area || 'Not recorded'}</dd></div>
                  <div><dt className={typography.label}>Abstract</dt><dd id="research-abstract-text" className="mt-3"><ResearchAbstract value={student.abstract} /></dd></div>
                </dl>
              </RequestSection>

              {replacementMember && (
                <div className="space-y-2">
                  <label htmlFor="panel-replacement-reason" className={typography.label}>
                    Replacement reason
                  </label>
                  <p className={typography.body}>
                    The current appointment with {replacementMember} remains active until final coordinator approval.
                  </p>
                  <textarea
                    id="panel-replacement-reason"
                    disabled={busy}
                    value={replacementReason}
                    onChange={(event) => setReplacementReason(event.target.value)}
                    rows={3}
                    required
                    placeholder="Explain why a different panel member is required"
                    className={`w-full rounded-lg border border-slate-200 px-3 py-2 disabled:opacity-60 ${typography.body}`}
                  />
                  {submitAttempted && !hasReplacementReason && (
                    <p className="card-description text-rose-600">A panel replacement reason is required.</p>
                  )}
                </div>
              )}

              {/* SECTION C: Select Panel Member Section */}
              <div id="recommend-select-member" className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h2 className={typography.heading}>
                    Select Panel member
                  </h2>
                </div>

                <div className="space-y-3" ref={dropdownRef}>
                  <label htmlFor="panel-candidate-search" className={`${typography.label} block`}>
                    Recommended Panel member
                  </label>
                  
                  {/* Select input with magnifying glass and dropdown toggle arrow */}
                  <div className="relative">
                    <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-slate-400">
                      <Search className="w-4 h-4 cursor-pointer" />
                    </div>
                    <input
                      id="panel-candidate-search"
                      type="text"
                      role="combobox"
                      aria-label="Find a panel member"
                      aria-expanded={showDropdown}
                      aria-controls="panel-candidate-options"
                      aria-autocomplete="list"
                      disabled={busy}
                      placeholder={selectedLecturer ? 'Search to change panel member' : 'Search by name, staff ID or department'}
                      className="w-full pl-10 pr-10 py-3 text-xs font-normal text-slate-800 bg-white border border-slate-200 hover:border-slate-350 focus:border-slate-800 focus:outline-none transition-all rounded-xl shadow-3xs cursor-pointer"
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setShowDropdown(true);
                      }}
                      onFocus={() => setShowDropdown(true)}
                      onClick={() => setShowDropdown(true)}
                      onKeyDown={event => { if (event.key === 'Escape') setShowDropdown(false); }}
                    />
                    <div className="absolute inset-y-0 right-3.5 flex items-center pointer-events-none text-slate-400">
                      <ChevronDown className="w-4 h-4 cursor-pointer text-slate-500" />
                    </div>

                    {/* Interactive Dropdown for Selector */}
                    <AnimatePresence>
                      {showDropdown && (
                        <motion.div
                          id="panel-candidate-options"
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 5 }}
                          className="absolute left-0 right-0 mt-2 bg-white border border-slate-200/90 rounded-xl shadow-sm z-20 overflow-hidden max-h-56 overflow-y-auto"
                        >
                          {filteredLecturers.length === 0 ? (
                            <div className="card-description p-4.5 text-center text-slate-400 italic">
                              No matching lecturers found
                            </div>
                          ) : (
                            filteredLecturers.map((lec) => {
                              const isSelectable = lec.selectable ?? lec.canSubmit;
                              return (
                              <button
                                key={lec.staffId}
                                type="button"
                                disabled={busy || !isSelectable}
                                aria-pressed={selectedLecturer?.staffId === lec.staffId}
                                onClick={() => handleLecturerSelect(lec)}
                                className={`w-full text-left p-3 text-xs font-bold border-b border-slate-50 last:border-0 enabled:hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-between text-brand-navy transition ${
                                  selectedLecturer?.staffId === lec.staffId ? 'bg-indigo-50/45 text-blue-600' : ''
                                }`}
                              >
                                <div className="min-w-0 space-y-0.5 [overflow-wrap:anywhere]">
                                  <span className="block">{lec.name}{selectedLecturer?.staffId === lec.staffId ? <span className="ml-2 inline-flex items-center gap-1 text-blue-600"><CheckCircle className="h-3 w-3" />Selected</span> : null}</span>
                                  <span className="card-caption text-slate-400 block">{lec.department}</span>
                                </div>
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                                  isSelectable ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'
                                }`}>
                                  {lec.capacityState ? capacityStateLabel(lec.capacityState) : lec.availability}
                                </span>
                              </button>
                              );
                            })
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Selected Lecturer Card with Highlight */}
                {selectedLecturer && (
                  <div 
                    id="candidate-highlight-card"
                    className="p-6 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-start justify-between gap-4"
                  >
                    <div className="min-w-0 flex-1 basis-48 space-y-2">
                    <p className="card-label inline-flex items-center gap-1 text-blue-700"><CheckCircle className="h-4 w-4" />Proposed Panel member</p>
                    <div className="flex items-center gap-3 w-full">
                      {/* Avatar with beautiful sketch style or generic portrait */}
                      <div className="w-11 h-11 rounded-lg bg-[#e0f2fe]/80 border border-blue-200 flex items-center justify-center shrink-0 overflow-hidden">
                        <User className="w-5 h-5 text-blue-500" />
                      </div>

                      <div className="space-y-0.5 text-left flex-1 min-w-0">
                        <h4 id="candidate-name" className={`${typography.name} [overflow-wrap:anywhere]`}>
                          {selectedLecturer.name}
                        </h4>
                        <p id="candidate-dept" className={`${typography.body} [overflow-wrap:anywhere]`}>
                          {selectedLecturer.department}
                        </p>
                        
                        {/* Selected Metadata Badges */}
                        <div id="candidate-tags" className="flex items-center gap-2 pt-1.5 flex-wrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-white text-xs font-normal text-slate-600 border border-slate-200">
                            Reserved workload: {selectedLecturer.workloadCount}/{selectedLecturer.workloadLimit}
                          </span>
                          {selectedLecturer.capacityPlanVersion !== null && selectedLecturer.capacityPlanVersion !== undefined && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-white text-xs font-normal text-slate-600 border border-slate-200">
                              Capacity plan v{selectedLecturer.capacityPlanVersion}
                            </span>
                          )}
                        </div>
                        <p className={`${typography.body} pt-1 [overflow-wrap:anywhere]`}>
                          {selectedLecturer.workloadHelpText}
                        </p>
                      </div>
                    </div>

                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                    <button type="button" onClick={removeSelection} disabled={busy} className="text-xs font-bold text-blue-700 underline underline-offset-2 disabled:opacity-50">Remove selection</button>
                    {/* Available indicator */}
                    <span 
                      id="candidate-avail-badge"
                      className={`text-xs font-semibold px-2.5 py-1 rounded-md ${
                        (selectedLecturer.selectable ?? selectedLecturer.canSubmit)
                          ? 'text-[#00a15c] bg-[#e6fbf2] border border-[#bef5db]' 
                          : 'text-rose-600 bg-rose-50 border border-rose-150'
                      }`}
                    >
                      {selectedLecturer.capacityState
                        ? capacityStateLabel(selectedLecturer.capacityState)
                        : selectedLecturer.availability}
                    </span>
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION D: Eligibility validation panel message box */}
              {(
                <div 
                  id="eligibility-notice-panel"
                  className={`p-4 rounded-xl border flex gap-3 items-start transition-colors ${
                    canSubmitRecommendation
                      ? 'bg-emerald-50/40 border-emerald-150 text-emerald-800'
                      : 'bg-amber-50/40 border-amber-150 text-amber-800'
                  }`}
                >
                  <div className="shrink-0 mt-0.5">
                    {canSubmitRecommendation ? (
                      <CheckCircle className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-amber-600" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <span className={`${typography.label} block`}>
                      {canSubmitRecommendation ? 'Ready to submit' : !selectedLecturer ? 'Choose a panel member' : !hasRecommendationNotes ? 'Add recommendation notes to continue' : !hasReplacementReason ? 'Add a replacement reason to continue' : 'Panel member unavailable'}
                    </span>
                    <p id="eligibility-text" className={typography.body}>
                      {validationMessage}
                    </p>
                    {submitAttempted && !canSubmitRecommendation && (
                      <p className="card-description text-amber-700">
                        Fix this validation issue before submitting the recommendation.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* SECTION E: Recommendation notes section */}
              <div id="recommend-notes-section" className="space-y-3">
                <label htmlFor="recommendation-notes-textarea" className={`${typography.label} block`}>
                  Recommendation notes
                </label>
                <textarea
                  id="recommendation-notes-textarea"
                  disabled={busy}
                  required
                  value={recommendationNotes}
                  onChange={(e) => setRecommendationNotes(e.target.value)}
                  placeholder="Briefly explain why this lecturer is suitable as the panel member."
                  className={`w-full border border-slate-200 focus:border-slate-800 p-3.5 rounded-xl focus:outline-none transition-all resize-none shadow-3xs disabled:opacity-60 ${typography.body}`}
                  rows={5}
                />
              </div>

              <button
                id="submit-recommendation-btn"
                type="submit"
                disabled={busy || intake.blocked || !canSubmitRecommendation}
                className="w-full py-3.5 bg-brand-navy hover:bg-slate-850 disabled:bg-slate-400 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all select-none cursor-pointer text-center"
              >
                Submit to Panel
              </button>
            </form></RecordPage>;
};
