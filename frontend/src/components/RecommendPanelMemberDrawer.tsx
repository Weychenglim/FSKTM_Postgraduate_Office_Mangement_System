import { RecordPage } from './RecordPage';
import { AlertMessage } from './AlertMessage';
import { ResearchAbstract } from './ResearchAbstract';
import { OperationalIntakeFeedback, useOperationalIntake } from './OperationalIntakeFeedback';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useId } from 'react';
import { Search, CheckCircle, ChevronDown, BookOpen, UsersRound, Send, X } from 'lucide-react';
import { PortalButton, PortalCard, StatusBadge } from './PortalPrimitives';
import { SupervisionDetailSection, supervisionDetailLabel as label, supervisionDetailBody as body } from './SupervisionDetailLayout';
import { PanelDetailFact } from './PanelDetailLayout';
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
  submitError?: string | null;
  onClose: () => void;
  student: StudentData;
  candidates: PanelCandidate[];
  replacementMember?: string | null;
  onSubmit: (notes: string, candidateId: string, replacementReason: string) => void;
}

export const RecommendPanelMemberDrawer: React.FC<RecommendPanelMemberDrawerProps> = ({
  isOpen,
  busy = false,
  submitError,
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
  const searchRef = useRef<HTMLInputElement>(null);
  const optionsId = useId();
  const [activeStaffId, setActiveStaffId] = useState<string | null>(null);

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
    searchRef.current?.focus();
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

  const selectableOptions = filteredLecturers.filter(candidate => candidate.selectable ?? candidate.canSubmit);
  const activeOption = selectableOptions.find(candidate => candidate.staffId === activeStaffId);
  const optionId = (staffId: string) => `${optionsId}-${encodeURIComponent(staffId)}`;
  const handleSearchKey = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape' || event.key === 'Tab') {
      if (event.key === 'Escape' && showDropdown) event.preventDefault();
      setShowDropdown(false);
      return;
    }
    if (event.key === 'Enter' && showDropdown) {
      event.preventDefault();
      if (activeOption) handleLecturerSelect(activeOption);
      return;
    }
    if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return;
    event.preventDefault();
    setShowDropdown(true);
    const current = showDropdown ? selectableOptions.findIndex(candidate => candidate.staffId === activeStaffId) : -1;
    const index = event.key === 'ArrowDown' ? (current + 1) % selectableOptions.length : current < 0 ? selectableOptions.length - 1 : (current - 1 + selectableOptions.length) % selectableOptions.length;
    setActiveStaffId(selectableOptions[index]?.staffId ?? null);
  };
  useEffect(() => {
    if (showDropdown && activeOption) document.getElementById(optionId(activeOption.staffId))?.scrollIntoView({block: 'nearest'});
  }, [showDropdown, activeOption?.staffId]);

  if (!isOpen) return null;
  return <RecordPage title={replacementMember ? 'Replace Panel Member' : 'Recommend Panel Member'} backLabel={backLabel} onBack={onClose} pageKey={`panel-nomination:${student.studentId}`} dirty={selectedLecturer !== null || !!recommendationNotes.trim() || !!replacementReason.trim()} busy={busy}>
    <form aria-label="Panel nomination" onSubmit={handleFormSubmit} className="min-w-0 space-y-7">
      <OperationalIntakeFeedback {...intake} activity="PANEL_RECOMMENDATION" onRetry={() => void intake.refresh()}/>
      <PortalCard padding="lg" role="region" aria-label="Student overview">
        <div id="recommend-student-card" className="flex flex-wrap items-start justify-between gap-5">
          <div className="min-w-0 space-y-2"><p className={label}>Student</p><h2 id="summary-student-name" className="text-lg font-semibold leading-relaxed text-brand-navy [overflow-wrap:anywhere]">{student.studentName}</h2><p id="summary-student-id" className="text-sm leading-6 text-slate-600 [overflow-wrap:anywhere]">{student.studentId}</p></div>
          <StatusBadge tone="info">{replacementMember ? 'Panel replacement' : 'New nomination'}</StatusBadge>
        </div>
        <dl className="mt-6 grid gap-x-8 gap-y-5 border-t border-slate-100 pt-5 sm:grid-cols-2 lg:grid-cols-3">
          <PanelDetailFact title="Programme" value={student.programme}/><PanelDetailFact title="Intake semester" value={student.intake}/><PanelDetailFact title="Primary supervisor" value={student.supervisor}/>
          {replacementMember ? <PanelDetailFact title="Current active Panel" value={replacementMember}/> : null}
        </dl>
      </PortalCard>
      <div data-panel-nomination-columns className="grid min-w-0 items-start gap-7 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0"><SupervisionDetailSection title="Nomination details" icon={UsersRound}>
          <div id="recommend-select-member" className="space-y-5">
            <div className="space-y-2" ref={dropdownRef}>
              <label htmlFor="panel-candidate-search" className={`${label} block`}>Recommended Panel member <span className="text-rose-600" aria-hidden="true">*</span></label>
              <div className="relative">
                <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-slate-400"/>
                <input ref={searchRef} id="panel-candidate-search" type="text" role="combobox" aria-label="Find a panel member" aria-expanded={showDropdown} aria-controls={optionsId} aria-activedescendant={showDropdown && activeOption ? optionId(activeOption.staffId) : undefined} aria-autocomplete="list" autoComplete="off" disabled={busy}
                  placeholder={selectedLecturer ? 'Search to change Panel member' : 'Name, staff number or department'}
                  className="min-h-11 w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-10 text-sm font-normal text-slate-900 outline-none focus:border-brand-navy focus:ring-1 focus:ring-brand-navy disabled:opacity-60"
                  value={searchTerm} onChange={event => {setSearchTerm(event.target.value);setActiveStaffId(null);setShowDropdown(true);}} onFocus={() => setShowDropdown(true)} onClick={() => setShowDropdown(true)} onKeyDown={handleSearchKey}/>
                <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3.5 top-3.5 h-4 w-4 text-slate-400"/>
                {showDropdown ? <div id={optionsId} role="listbox" aria-label="Panel candidates" className="absolute left-0 right-0 z-20 mt-2 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                  {filteredLecturers.length ? filteredLecturers.map(candidate => {
                    const selectable = candidate.selectable ?? candidate.canSubmit;
                    return <button id={optionId(candidate.staffId)} key={candidate.staffId} type="button" role="option" tabIndex={-1} aria-selected={selectedLecturer?.staffId === candidate.staffId} aria-disabled={!selectable || busy} disabled={!selectable || busy}
                      onMouseDown={event => event.preventDefault()} onMouseEnter={() => {if(selectable)setActiveStaffId(candidate.staffId);}} onClick={() => handleLecturerSelect(candidate)}
                      className={`flex min-h-11 w-full flex-wrap items-start justify-between gap-2 border-b border-slate-100 p-3 text-left last:border-0 disabled:cursor-not-allowed disabled:opacity-60 ${activeOption?.staffId === candidate.staffId ? 'bg-blue-50' : 'enabled:hover:bg-slate-50'}`}>
                      <span className="min-w-0 flex-1 basis-40 space-y-1"><span className="block text-sm font-medium leading-6 text-slate-900 [overflow-wrap:anywhere]">{candidate.name}</span><span className="block text-xs font-normal leading-5 text-slate-500 [overflow-wrap:anywhere]">{candidate.staffId} · {candidate.department}</span></span>
                      <StatusBadge tone={selectable ? 'success' : 'neutral'}>{candidate.capacityState ? capacityStateLabel(candidate.capacityState) : candidate.availability}</StatusBadge>
                    </button>;
                  }) : <p role="status" className="p-4 text-sm leading-6 text-slate-500">No matching lecturers found.</p>}
                </div> : null}
              </div>
            </div>
            {selectedLecturer ? <div id="candidate-highlight-card" className="min-w-0 space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3"><p className="inline-flex items-center gap-2 text-xs font-medium leading-6 text-blue-700"><CheckCircle aria-hidden="true" className="h-4 w-4"/>Proposed Panel member</p><PortalButton size="sm" className="min-h-11" icon={X} disabled={busy} onClick={removeSelection}>Remove selection</PortalButton></div>
              <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2"><div className="min-w-0 space-y-2"><dt className={label}>Panel member</dt><dd id="candidate-name" className={body}>{selectedLecturer.name}</dd></div><PanelDetailFact title="Staff number" value={selectedLecturer.staffId}/><PanelDetailFact title="Department" value={selectedLecturer.department}/><PanelDetailFact title="Active + reserved" value={`${selectedLecturer.workloadCount} / ${selectedLecturer.workloadLimit}`}/></dl>
              <div className="flex flex-wrap items-center gap-3"><StatusBadge tone={(selectedLecturer.selectable ?? selectedLecturer.canSubmit) ? 'success' : 'warning'}>{selectedLecturer.capacityState ? capacityStateLabel(selectedLecturer.capacityState) : selectedLecturer.availability}</StatusBadge>{selectedLecturer.capacityPlanVersion != null ? <span className="text-xs leading-6 text-slate-500">Capacity plan v{selectedLecturer.capacityPlanVersion}</span> : null}</div>
              {selectedLecturer.workloadHelpText ? <p className="text-xs leading-6 text-slate-500 [overflow-wrap:anywhere]">{selectedLecturer.workloadHelpText}</p> : null}
            </div> : null}
          </div>
          <div id="recommend-notes-section" className="space-y-2">
            <label htmlFor="recommendation-notes-textarea" className={`${label} block`}>Recommendation notes <span className="text-rose-600" aria-hidden="true">*</span></label>
            <textarea id="recommendation-notes-textarea" disabled={busy} required value={recommendationNotes} onChange={event => setRecommendationNotes(event.target.value)} placeholder="Explain why this lecturer is suitable for the research." rows={5} className="w-full rounded-xl border border-slate-200 p-3.5 text-sm font-normal leading-6 text-slate-900 outline-none focus:border-brand-navy focus:ring-1 focus:ring-brand-navy disabled:opacity-60"/>
          </div>
          {replacementMember ? <div className="space-y-2">
            <label htmlFor="panel-replacement-reason" className={`${label} block`}>Replacement reason <span className="text-rose-600" aria-hidden="true">*</span></label>
            <p id="replacement-continuity" className="text-xs leading-6 text-slate-500 [overflow-wrap:anywhere]">The current appointment with {replacementMember} remains active until final coordinator approval.</p>
            <textarea id="panel-replacement-reason" aria-describedby="replacement-continuity" disabled={busy} required value={replacementReason} onChange={event => setReplacementReason(event.target.value)} rows={3} placeholder="Explain why a different Panel member is required." className="w-full rounded-xl border border-slate-200 p-3.5 text-sm font-normal leading-6 text-slate-900 outline-none focus:border-brand-navy focus:ring-1 focus:ring-brand-navy disabled:opacity-60"/>
          </div> : null}
          <div className="space-y-4 border-t border-slate-100 pt-5">
            <p id="eligibility-text" role="status" className={`text-xs leading-6 ${selectedLecturer && !canSubmitRecommendation ? 'text-amber-800' : 'text-slate-500'}`}>
              {selectedLecturer && !hasReplacementReason && hasRecommendationNotes ? 'Add a replacement reason before submitting.' : validationMessage}
            </p>
            {submitAttempted && !canSubmitRecommendation ? <p className="text-xs leading-6 text-rose-700">Complete the required fields and choose an eligible Panel member.</p> : null}
            {submitError ? <AlertMessage type="error" title="Recommendation could not be submitted" message={submitError}/> : null}
            <PortalButton id="submit-recommendation-btn" type="submit" variant="primary" size="sm" className="min-h-11 w-full sm:w-auto" icon={Send} disabled={busy || intake.blocked || !canSubmitRecommendation} isLoading={busy} aria-describedby="eligibility-text">Submit to Panel</PortalButton>
          </div>
        </SupervisionDetailSection></div>
        <aside className="min-w-0" aria-label="Current research"><SupervisionDetailSection title="Current research" icon={BookOpen}>
          <dl id="recommend-research-details" className="space-y-5"><div className="space-y-2"><dt className={label}>Research title</dt><dd id="research-title-text" className="text-lg font-normal leading-8 text-slate-900 [overflow-wrap:anywhere]">{student.proposedTopic || 'Not recorded'}</dd></div><PanelDetailFact title="Research area" value={student.area}/></dl>
          <details data-panel-research-preview className="border-t border-slate-100 pt-4"><summary className="cursor-pointer rounded py-1 text-sm font-medium leading-6 text-slate-700 focus-visible:outline-2 focus-visible:outline-blue-600">Read abstract</summary><div id="research-abstract-text" className="mt-4"><ResearchAbstract value={student.abstract} inset={false}/></div></details>
        </SupervisionDetailSection></aside>
      </div>
    </form>
  </RecordPage>;
};
