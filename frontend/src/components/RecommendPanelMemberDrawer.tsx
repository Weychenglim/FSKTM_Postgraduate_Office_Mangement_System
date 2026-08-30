/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  X, 
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
  isOpen: boolean;
  onClose: () => void;
  student: StudentData;
  candidates: PanelCandidate[];
  replacementMember?: string | null;
  onSubmit: (notes: string, candidateId: string, replacementReason: string) => void;
}

export const RecommendPanelMemberDrawer: React.FC<RecommendPanelMemberDrawerProps> = ({
  isOpen,
  onClose,
  student,
  candidates,
  replacementMember,
  onSubmit,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedLecturer, setSelectedLecturer] =
    useState<PanelCandidate | null>(
      candidates.find((candidate) => candidate.selectable ?? candidate.canSubmit) ?? null,
    );
  const [recommendationNotes, setRecommendationNotes] = useState('');
  const [replacementReason, setReplacementReason] = useState('');
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (
      selectedLecturer
      && candidates.some((lecturer) => lecturer.staffId === selectedLecturer.staffId)
    ) {
      return;
    }
    const nextLecturer = candidates.find((candidate) => candidate.selectable ?? candidate.canSubmit)
      ?? null;
    setSelectedLecturer(nextLecturer);
    setSearchTerm(nextLecturer?.name ?? '');
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
    setSelectedLecturer(lecturer);
    setSearchTerm(lecturer.name);
    setShowDropdown(false);
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
    ? 'No eligible panel candidates are available.'
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
    if (!canSubmitRecommendation || !selectedLecturer) return;
    onSubmit(
      recommendationNotes.trim(),
      selectedLecturer.staffId,
      replacementReason.trim(),
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div id="recommend-panel-drawer-container" className="fixed inset-0 z-50 flex justify-end overflow-hidden">
          {/* Backdrop screen dimmer */}
          <motion.div
            id="recommend-panel-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-brand-navy"
            onClick={onClose}
          />

          {/* Drawer content sliding container */}
          <motion.div
            id="recommend-panel-slideover"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 240 }}
            className="relative w-full max-w-xl bg-white shadow-sm h-screen flex flex-col justify-between overflow-hidden"
          >
            {/* 1. Header with Close control */}
            <div 
              id="recommend-panel-header" 
              className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white shrink-0"
            >
              <h2 id="drawer-main-title" className="text-lg font-bold text-brand-navy font-sans tracking-tight">
                {replacementMember ? 'Replace Panel Member' : 'Recommend Panel Member'}
              </h2>
              <button
                id="drawer-close-btn"
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 transition cursor-pointer"
                aria-label="Close drawer"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>

            {/* 2. Scrollable Body containing sections */}
            <div 
              id="recommend-panel-body" 
              className="flex-grow overflow-y-auto px-6 py-6 space-y-7 text-left font-sans text-xs scrollbar-thin"
            >
              {/* SECTION A: Student Summary Card at Top */}
              <div 
                id="recommend-student-card" 
                className="bg-slate-50 border border-slate-100 rounded-xl p-5 relative flex flex-col space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3.5">
                    {/* Student Initials Box */}
                    <div className="w-11 h-11 rounded-full bg-blue-50 border border-blue-100/60 text-blue-600 font-extrabold text-xs flex items-center justify-center shrink-0">
                      {student.initials}
                    </div>
                    <div>
                      <h4 id="summary-student-name" className="text-sm font-bold text-brand-navy leading-tight">
                        {student.studentName}
                      </h4>
                      <p id="summary-student-id" className="font-mono text-[10px] text-slate-400 mt-1 font-bold">
                        {student.studentId}
                      </p>
                    </div>
                  </div>

                  {/* Recommendation badge on top right */}
                  <span 
                    id="summary-status-badge" 
                    className="inline-flex items-center px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-100"
                  >
                    Recommendation Needed
                  </span>
                </div>

                {/* Sub-Metadata Programme / Intake details */}
                <div className="grid grid-cols-2 gap-4 pt-3.5 border-t border-slate-200/50">
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">
                      PROGRAMME
                    </span>
                    <span id="summary-student-prog" className="text-xs font-bold text-slate-700 block mt-0.5 leading-snug">
                      {student.programme}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">
                      INTAKE
                    </span>
                    <span id="summary-student-intake" className="text-xs font-bold text-slate-700 block mt-0.5">
                      {student.intake}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">
                      SUPERVISOR
                    </span>
                    <span className="text-xs font-bold text-slate-700 block mt-0.5">
                      {student.supervisor}
                    </span>
                  </div>
                </div>
              </div>

              {/* SECTION B: Research Details section */}
              <div id="recommend-research-details" className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-sans">
                    RESEARCH DETAILS
                  </span>
                </div>

                <div className="space-y-3.5">
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                      TITLE
                    </span>
                    <h3 id="research-title-text" className="text-[12.5px] font-bold text-brand-navy mt-1 leading-snug">
                      "{student.proposedTopic}"
                    </h3>
                  </div>

                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                      AREA
                    </span>
                    <span 
                      id="research-area-tag" 
                      className="inline-flex items-center px-2.5 py-1 rounded bg-blue-50 text-blue-600 font-extrabold text-[10px] border border-blue-100/50"
                    >
                      {student.area}
                    </span>
                  </div>

                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                      ABSTRACT
                    </span>
                    <p id="research-abstract-text" className="text-slate-500 font-medium text-[11px] leading-relaxed mt-1">
                      {student.abstract}
                    </p>
                  </div>
                </div>
              </div>

              {replacementMember && (
                <div className="space-y-2">
                  <label htmlFor="panel-replacement-reason" className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    Replacement reason
                  </label>
                  <p className="text-[11px] text-slate-500 font-semibold">
                    The current appointment with {replacementMember} remains active until final coordinator approval.
                  </p>
                  <textarea
                    id="panel-replacement-reason"
                    value={replacementReason}
                    onChange={(event) => setReplacementReason(event.target.value)}
                    rows={3}
                    required
                    placeholder="Explain why a different panel member is required"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700"
                  />
                  {submitAttempted && !hasReplacementReason && (
                    <p className="text-[11px] font-bold text-rose-600">A panel replacement reason is required.</p>
                  )}
                </div>
              )}

              {/* SECTION C: Select Panel Member Section */}
              <div id="recommend-select-member" className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-sans">
                    SELECT PANEL MEMBER
                  </span>
                </div>

                <div className="space-y-3" ref={dropdownRef}>
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                    RECOMMENDED PANEL MEMBER
                  </label>
                  
                  {/* Select input with magnifying glass and dropdown toggle arrow */}
                  <div className="relative">
                    <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-slate-400">
                      <Search className="w-4 h-4 cursor-pointer" />
                    </div>
                    <input
                      type="text"
                      className="w-full pl-10 pr-10 py-3 text-xs font-bold text-slate-800 bg-white border border-slate-200 hover:border-slate-350 focus:border-slate-800 focus:outline-none transition-all rounded-xl shadow-3xs cursor-pointer"
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setShowDropdown(true);
                      }}
                      onFocus={() => setShowDropdown(true)}
                    />
                    <div className="absolute inset-y-0 right-3.5 flex items-center pointer-events-none text-slate-400">
                      <ChevronDown className="w-4 h-4 cursor-pointer text-slate-500" />
                    </div>

                    {/* Interactive Dropdown for Selector */}
                    <AnimatePresence>
                      {showDropdown && (
                        <motion.div
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 5 }}
                          className="absolute left-0 right-0 mt-2 bg-white border border-slate-200/90 rounded-xl shadow-sm z-20 overflow-hidden max-h-56 overflow-y-auto"
                        >
                          {filteredLecturers.length === 0 ? (
                            <div className="p-4.5 text-center text-slate-400 italic">
                              No matching lecturers found
                            </div>
                          ) : (
                            filteredLecturers.map((lec) => {
                              const isSelectable = lec.selectable ?? lec.canSubmit;
                              return (
                              <button
                                key={lec.staffId}
                                type="button"
                                disabled={!isSelectable}
                                onClick={() => handleLecturerSelect(lec)}
                                className={`w-full text-left p-3 text-xs font-bold border-b border-slate-50 last:border-0 enabled:hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-between text-brand-navy transition ${
                                  selectedLecturer?.staffId === lec.staffId ? 'bg-indigo-50/45 text-blue-600' : ''
                                }`}
                              >
                                <div className="space-y-0.5">
                                  <span className="block">{lec.name}</span>
                                  <span className="text-[10px] text-slate-400 font-semibold block">{lec.department}</span>
                                </div>
                                <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
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
                    className="p-4 bg-gradient-to-r from-blue-50/30 to-blue-50/5 border border-blue-200/70 rounded-xl flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3 w-full">
                      {/* Avatar with beautiful sketch style or generic portrait */}
                      <div className="w-11 h-11 rounded-lg bg-[#e0f2fe]/80 border border-blue-200 flex items-center justify-center shrink-0 overflow-hidden">
                        <User className="w-5 h-5 text-blue-500" />
                      </div>

                      <div className="space-y-0.5 text-left flex-1 min-w-0">
                        <h4 id="candidate-name" className="text-xs font-bold text-brand-navy truncate">
                          {selectedLecturer.name}
                        </h4>
                        <p id="candidate-dept" className="text-[10px] text-slate-450 text-slate-500 font-medium truncate">
                          {selectedLecturer.department}
                        </p>
                        
                        {/* Selected Metadata Badges */}
                        <div id="candidate-tags" className="flex items-center gap-2 pt-1.5 flex-wrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-white text-[9px] font-medium text-slate-600 border border-slate-200">
                            Staff ID: {selectedLecturer.staffId}
                          </span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-white text-[9px] font-medium text-slate-600 border border-slate-200">
                            Reserved workload: {selectedLecturer.workloadCount}/{selectedLecturer.workloadLimit}
                          </span>
                          {selectedLecturer.capacityPlanVersion !== null && selectedLecturer.capacityPlanVersion !== undefined && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-white text-[9px] font-medium text-slate-600 border border-slate-200">
                              Capacity plan v{selectedLecturer.capacityPlanVersion}
                            </span>
                          )}
                        </div>
                        <p className="text-[9.5px] text-slate-400 font-semibold leading-relaxed pt-1">
                          {selectedLecturer.workloadHelpText}
                        </p>
                      </div>
                    </div>

                    {/* Available indicator */}
                    <span 
                      id="candidate-avail-badge"
                      className={`text-[9px] font-black uppercase tracking-wider shrink-0 px-2.5 py-1 rounded-md ${
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
                )}
              </div>

              {/* SECTION D: Eligibility validation panel message box */}
              {selectedLecturer && (
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
                    <span className="text-[10px] font-black uppercase tracking-wider block">
                      {canSubmitRecommendation ? 'Ready for Panel Review' : 'Validation Required'}
                    </span>
                    <p id="eligibility-text" className="text-[11px] font-medium text-slate-600 leading-relaxed">
                      {validationMessage}
                    </p>
                    {submitAttempted && !canSubmitRecommendation && (
                      <p className="text-[10px] font-bold text-amber-700">
                        Fix this validation issue before submitting the recommendation.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* SECTION E: Recommendation notes section */}
              <div id="recommend-notes-section" className="space-y-3">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                  RECOMMENDATION NOTES
                </label>
                <textarea
                  id="recommendation-notes-textarea"
                  value={recommendationNotes}
                  onChange={(e) => setRecommendationNotes(e.target.value)}
                  placeholder="Briefly explain why this lecturer is suitable as the panel member."
                  className="w-full border border-slate-200 focus:border-slate-800 p-3.5 rounded-xl focus:outline-none transition-all resize-none shadow-3xs leading-relaxed text-[11px] font-semibold"
                  rows={4.5}
                />
              </div>
            </div>

            {/* 3. Action Buttons Sticky Bottom Bar */}
            <div 
              id="recommend-panel-footer" 
              className="p-6 border-t border-slate-100 bg-white shrink-0 shadow-3xs"
            >
              <button
                id="submit-recommendation-btn"
                type="submit"
                onClick={handleFormSubmit}
                disabled={!canSubmitRecommendation}
                className="w-full py-3.5 bg-brand-navy hover:bg-slate-850 disabled:bg-slate-400 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all select-none cursor-pointer text-center"
              >
                Submit to Panel
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
