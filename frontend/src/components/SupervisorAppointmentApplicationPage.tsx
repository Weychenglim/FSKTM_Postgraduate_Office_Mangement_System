/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useState } from 'react';
import { 
  Users, 
  Search, 
  ArrowLeft, 
  Send, 
  HelpCircle, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  FileText,
  ShieldCheck,
  Zap,
  Info
} from 'lucide-react';
import { motion } from 'motion/react';
import { StudentSupervisorApplication, SupervisorCandidate, SupervisorDocumentRequirement } from '../types';
import {
  createSupervisorApplication,
  getActiveSupervisorDocumentRequirements,
  getSupervisorCandidates,
  toStudentSupervisorApplication,
} from '../services';
import {
  buildSupervisorApplicationFormData,
  formatSupervisorDocumentSize,
  SUPERVISOR_DOCUMENT_MAX_TOTAL_BYTES,
  validateSupervisorDocumentFile,
  validateSupervisorDocumentSelection,
} from '../utils/supervisorDocuments';
import { PageHeader, PortalButton, StatusBadge } from './PortalPrimitives';
import { ErrorState, LoadingState } from './StateViews';

interface SupervisorAppointmentApplicationPageProps {
  onBack: () => void;
  onSuccess: (newApplication: StudentSupervisorApplication) => void;
}

export const SupervisorAppointmentApplicationPage: React.FC<SupervisorAppointmentApplicationPageProps> = ({
  onBack,
  onSuccess
}) => {
  // Stepper tracking - decorative/informational as matched in screenshots
  const steps = [
    { number: 1, title: 'Project Details', subtitle: 'Research Foundations' },
    { number: 2, title: 'Supervisor Selection', subtitle: 'Academic Matching' },
    { number: 3, title: 'Document Upload', subtitle: 'Supporting Evidence' }
  ];

  // Form Fields
  const [researchTitle, setResearchTitle] = useState('');
  const [researchArea, setResearchArea] = useState('');
  const [researchAbstract, setResearchAbstract] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSupervisorId, setSelectedSupervisorId] = useState<string | null>(null);
  const [requirements, setRequirements] = useState<SupervisorDocumentRequirement[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Map<string, File>>(new Map());
  const [requirementsLoading, setRequirementsLoading] = useState(true);
  const [requirementsError, setRequirementsError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [supervisors, setSupervisors] = useState<SupervisorCandidate[]>([]);
  const [loadingSupervisors, setLoadingSupervisors] = useState(true);
  const [supervisorsError, setSupervisorsError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadSupervisors = useCallback(() => {
    setLoadingSupervisors(true);
    setSupervisorsError(null);
    getSupervisorCandidates()
      .then(setSupervisors)
      .catch((reason) => {
        setSupervisorsError(
          reason instanceof Error
            ? reason.message
            : 'Failed to load supervisor candidates.',
        );
      })
      .finally(() => setLoadingSupervisors(false));
  }, []);

  useEffect(() => {
    loadSupervisors();
  }, [loadSupervisors]);

  const loadRequirements = useCallback(() => {
    setRequirementsLoading(true);
    setRequirementsError(null);
    getActiveSupervisorDocumentRequirements()
      .then(setRequirements)
      .catch((reason) => setRequirementsError(
        reason instanceof Error ? reason.message : 'Document requirements could not be loaded.',
      ))
      .finally(() => setRequirementsLoading(false));
  }, []);

  useEffect(() => loadRequirements(), [loadRequirements]);

  // Filtering based on search query
  const filteredSupervisors = supervisors.filter(sv => 
    sv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sv.domain.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const setRequirementFile = (code: string, file: File | null) => {
    if (file) {
      const fileError = validateSupervisorDocumentFile(file);
      if (fileError) {
        setFormError(fileError);
        return;
      }
      const prospectiveFiles = new Map(selectedFiles);
      prospectiveFiles.set(code, file);
      const totalBytes = [...prospectiveFiles.values()].reduce((total, item) => total + item.size, 0);
      if (totalBytes > SUPERVISOR_DOCUMENT_MAX_TOTAL_BYTES) {
        setFormError('Supervisor application documents must not exceed 10 MB combined.');
        return;
      }
    }
    setSelectedFiles((current) => {
      const next = new Map(current);
      if (file) next.set(code, file);
      else next.delete(code);
      return next;
    });
    setFormError(null);
  };


  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!researchTitle.trim()) {
      setFormError("Provide your proposed research title.");
      return;
    }
    if (!researchArea.trim()) {
      setFormError("Provide your research area.");
      return;
    }
    if (!researchAbstract.trim()) {
      setFormError("Provide your research abstract.");
      return;
    }
    if (!selectedSupervisorId) {
      setFormError("Choose a proposed research supervisor.");
      return;
    }
    const documentError = validateSupervisorDocumentSelection(requirements, selectedFiles);
    if (documentError) {
      setFormError(documentError);
      return;
    }

    setSubmitting(true);
    try {
      const body = buildSupervisorApplicationFormData({
        proposedSupervisorId: selectedSupervisorId,
        researchTitle: researchTitle.trim(),
        researchArea: researchArea.trim(),
        researchAbstract: researchAbstract.trim(),
      }, selectedFiles);
      const record = await createSupervisorApplication(body);
      onSuccess(toStudentSupervisorApplication(record));
    } catch (reason) {
      setFormError(reason instanceof Error ? reason.message : 'Supervisor application could not be submitted.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form id="submission-supervisor-form" onSubmit={handleSubmitRequest} className="space-y-8 text-left font-sans pb-12">
      
      <PageHeader
        title="Supervisor Appointment Application"
        subtitle="Complete the following steps to formally request a research supervisor. Ensure your proposal abstract is clear and aligned with the faculty's research pillars."
        backLabel="Back to Supervisor Appointments"
        onBack={onBack}
        subtitleClassName="max-w-4xl leading-relaxed"
      />

      {/* ========================================================================= */}
      {/* 2. THREE-STEPPER HEADER CAROUSEL                                          */}
      {/* ========================================================================= */}
      <div id="application-stepper-row" className="bg-slate-50 border border-slate-200/60 rounded-2xl p-5 grid grid-cols-1 md:grid-cols-3 gap-y-4 gap-x-6 select-none">
        {steps.map((st, idx) => (
          <div key={st.number} className="flex items-center gap-3.5">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${
              idx === 0 
                ? 'bg-brand-navy text-white shadow-xs' 
                : 'bg-slate-200 text-slate-550 text-slate-500'
            }`}>
              {st.number}
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-800 tracking-tight leading-none">
                {st.title}
              </h3>
              <p className="text-[10px] text-slate-450 text-slate-400 font-medium font-mono mt-1">
                {st.subtitle}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ========================================================================= */}
      {/* 3. STEP 1: RESEARCH PROJECT DETAILS                                      */}
      {/* ========================================================================= */}
      <div className="bg-white border border-[#e2e8f0]/80 rounded-2xl p-6 space-y-5 shadow-3xs text-left">
        <h3 className="text-sm font-bold text-brand-navy uppercase tracking-wider flex items-center gap-2 select-none border-b border-slate-100 pb-3">
          <span className="w-5 h-5 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center text-[11px] font-black">1</span>
          Research Project Details
        </h3>

        {/* Input Field: Research Title */}
        <div className="space-y-1.5">
          <label htmlFor="research-title-input" className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
            Research Title
          </label>
          <input
            id="research-title-input"
            type="text"
            value={researchTitle}
            onChange={(e) => setResearchTitle(e.target.value)}
            placeholder="Enter the full working title of your research"
            className="w-full bg-slate-50 hover:bg-slate-50/75 focus:bg-white border-0 focus:ring-2 focus:ring-indigo-500/85 focus:ring-offset-0 rounded-xl px-4 py-3 text-xs font-semibold text-slate-805 text-slate-800 placeholder-slate-400 transition"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="research-area-input" className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
            Research Area
          </label>
          <input
            id="research-area-input"
            type="text"
            value={researchArea}
            onChange={(e) => setResearchArea(e.target.value)}
            placeholder="For example, Human-Centred Artificial Intelligence"
            maxLength={255}
            className="w-full bg-slate-50 hover:bg-slate-50/75 focus:bg-white border-0 focus:ring-2 focus:ring-indigo-500/85 focus:ring-offset-0 rounded-xl px-4 py-3 text-xs font-semibold text-slate-800 placeholder-slate-400 transition"
          />
        </div>

        {/* Text Area Field: Research Abstract */}
        <div className="space-y-1.5">
          <label htmlFor="research-abstract-input" className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
            Research Abstract
          </label>
          <textarea
            id="research-abstract-input"
            rows={5}
            value={researchAbstract}
            onChange={(e) => setResearchAbstract(e.target.value)}
            placeholder="Provide a concise summary of your research objectives, methodology, and expected outcomes (max 500 words)..."
            className="w-full bg-slate-50 hover:bg-slate-50/75 focus:bg-white border-0 focus:ring-2 focus:ring-indigo-500/85 focus:ring-offset-0 rounded-xl px-4 py-3.5 text-xs font-semibold text-slate-805 text-slate-800 placeholder-slate-400 transition leading-relaxed"
          />
          <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold font-mono pt-1">
            <span>Minimum word count parameter recommended for review: 150 words</span>
            <span>Character Count: {researchAbstract.length}</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. STEP 2: SUPERVISOR SELECTION                                          */}
      {/* ========================================================================= */}
      <div className="bg-white border border-[#e2e8f0]/80 rounded-2xl p-6 space-y-5 shadow-3xs text-left">
        <h3 className="text-sm font-bold text-brand-navy uppercase tracking-wider flex items-center gap-2 select-none border-b border-slate-100 pb-3">
          <span className="w-5 h-5 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center text-[11px] font-black">2</span>
          Supervisor Selection
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left panel: Search filter + selection list (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block leading-none">
              Select Proposed Supervisor
            </span>

            {/* Search filter input bar wrapper */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-brand-navy transition-all" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or expertise..."
                className="w-full bg-slate-50 hover:bg-slate-50/75 focus:bg-white border-0 focus:ring-2 focus:ring-indigo-500/85 pl-10 pr-4 py-3 text-xs font-semibold text-slate-800 placeholder-slate-400 transition rounded-xl"
              />
            </div>

            {/* Render matched supervisors lists */}
            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
              {loadingSupervisors ? (
                <LoadingState message="Loading eligible supervisors..." />
              ) : supervisorsError ? (
                <ErrorState
                  message={supervisorsError}
                  onRetry={loadSupervisors}
                />
              ) : filteredSupervisors.length > 0 ? (
                filteredSupervisors.map((sv) => {
                  const isSelected = selectedSupervisorId === sv.id;
                  const isFull = sv.filled >= sv.total;
                  
                  return (
                    <div
                      key={sv.id}
                      onClick={() => {
                        if (!isFull) {
                          setSelectedSupervisorId(sv.id);
                        } else {
                          alert(`Sorry, ${sv.name} has reached maximum advisory capacity of ${sv.total} slots.`);
                        }
                      }}
                      className={`flex items-center justify-between p-3.5 border rounded-xl transition cursor-pointer text-left select-none ${
                        isSelected 
                          ? 'bg-indigo-50/40 border-indigo-400 shadow-3xs' 
                          : isFull 
                            ? 'bg-slate-50/50 border-slate-200/50 opacity-60 cursor-not-allowed' 
                            : 'bg-white border-slate-200/80 hover:bg-slate-50'
                      }`}
                    >
                      {/* Avatar Initials block */}
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full font-black text-xs flex items-center justify-center shrink-0 uppercase ${
                          isSelected ? 'bg-indigo-600 text-white' : 'bg-brand-navy text-white'
                        }`}>
                          {sv.initials}
                        </div>
                        <div>
                          <h4 className="text-xs font-extrabold text-slate-900">
                            {sv.name}
                          </h4>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5">
                            Expertise: {sv.domain}
                          </span>
                        </div>
                      </div>

                      {/* Right capacity indicator slots chip */}
                      <StatusBadge
                        tone={isFull ? 'danger' : isSelected ? 'brand' : 'neutral'}
                        dot
                        className="py-1.5 text-[9px]"
                      >
                        <span>{sv.filled}/{sv.total} Slots Filled</span>
                      </StatusBadge>

                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-slate-400 font-semibold text-xs border border-dashed border-slate-200 rounded-xl">
                  No matching supervisors found
                </div>
              )}
            </div>
          </div>

          {/* Right panel matching rule descriptor (5 cols) */}
          <div className="lg:col-span-5 h-full">
            <div className="bg-[#f0fdf4]/50 border border-[#bbf7d0]/60 rounded-2xl p-5 flex gap-4 items-start relative h-full">
              <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl shrink-0">
                <Info className="w-5 h-5" />
              </div>
              <div className="space-y-1.5 pt-0.5 select-none">
                <h4 className="text-xs font-black text-brand-navy uppercase tracking-wider">
                  Supervisor selection
                </h4>
                <p className="text-slate-500 text-[11px] font-semibold leading-relaxed">
                  Search the persisted supervisor directory by name or specialization, then select a supervisor with available capacity.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. STEP 3: SUPPORTING DOCUMENTS UPLOAD ZONE                               */}
      {/* ========================================================================= */}
      <div className="bg-white border border-[#e2e8f0]/80 rounded-2xl p-6 space-y-5 shadow-3xs text-left">
        <h3 className="text-sm font-bold text-brand-navy uppercase tracking-wider flex items-center gap-2 select-none border-b border-slate-100 pb-3">
          <span className="w-5 h-5 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center text-[11px] font-black">3</span>
          Supporting Documents
        </h3>

        {requirementsLoading ? (
          <LoadingState message="Loading document requirements..." />
        ) : requirementsError ? (
          <ErrorState message={requirementsError} onRetry={loadRequirements} />
        ) : requirements.length === 0 ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">
            Document requirements are not configured. Contact the Postgraduate Office before submitting.
          </div>
        ) : (
          <div className="space-y-3">
            {requirements.map((requirement) => {
              const file = selectedFiles.get(requirement.code);
              return (
                <div
                  key={requirement.code}
                  data-requirement-dropzone={requirement.code}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    setRequirementFile(requirement.code, event.dataTransfer.files?.[0] ?? null);
                  }}
                  className="grid gap-4 rounded-lg border border-dashed border-slate-300 bg-slate-50/50 p-4 transition-colors hover:border-blue-400 md:grid-cols-[1fr_220px] md:items-center"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs font-extrabold text-slate-800">{requirement.label}</p>
                      <StatusBadge tone={requirement.isRequired ? 'warning' : 'neutral'}>
                        {requirement.isRequired ? 'Required' : 'Optional'}
                      </StatusBadge>
                    </div>
                    <p className="mt-1 text-[10px] font-semibold leading-relaxed text-slate-500">
                      {requirement.description || 'Attach the relevant supporting document.'}
                    </p>
                    {file && (
                      <div className="mt-3 flex items-center gap-2 text-[10px] font-bold text-emerald-700">
                        <FileText className="h-3.5 w-3.5" />
                        <span className="max-w-xs truncate">{file.name}</span>
                        <span className="font-mono text-slate-400">{formatSupervisorDocumentSize(file.size)}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <label className="inline-flex cursor-pointer items-center rounded-md border border-slate-300 bg-white px-3 py-2 text-[10px] font-black uppercase text-brand-navy hover:bg-slate-50">
                      {file ? 'Replace file' : 'Choose or drop file'}
                      <input
                        type="file"
                        accept=".pdf,.docx"
                        className="hidden"
                        onChange={(event) => {
                          setRequirementFile(requirement.code, event.target.files?.[0] ?? null);
                          event.currentTarget.value = '';
                        }}
                      />
                    </label>
                    {file && (
                      <PortalButton type="button" variant="ghost" size="sm" onClick={() => setRequirementFile(requirement.code, null)}>
                        Remove
                      </PortalButton>
                    )}
                  </div>
                </div>
              );
            })}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-[10px] font-bold text-slate-400">
              <span>PDF or DOCX; one file per requirement; 10 MB combined</span>
              <span>
                {requirements.filter((item) => item.isRequired && selectedFiles.has(item.code)).length}
                {' / '}
                {requirements.filter((item) => item.isRequired).length} required complete;{' '}
                {formatSupervisorDocumentSize([...selectedFiles.values()].reduce((total, item) => total + item.size, 0))} selected
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 6. SUBMISSION ACTION CONTROL BAR                                            */}
      {/* ========================================================================= */}
      <div id="sticky-draft-submit-control" className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-center gap-4 select-none">
        <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
          Applications submit directly to the selected supervisor
        </div>

        <div className="flex gap-2.5 w-full sm:w-auto">
          <PortalButton
            type="submit"
            disabled={submitting || requirementsLoading || Boolean(requirementsError) || requirements.length === 0}
            variant="primary"
            size="lg"
            icon={Send}
            className="flex-1 sm:flex-initial"
          >
            {submitting ? 'Submitting…' : 'Submit SV Request'}
          </PortalButton>
        </div>
      </div>

      {formError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700" role="alert">
          {formError}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. SUPPORTING CARDS FOOTER CONTAINER                                     */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Eligibility Checked */}
        <div className="bg-[#e0f2fe]/30 border border-sky-100 rounded-2xl p-5 shadow-3xs select-none">
          <div className="w-10 h-10 rounded-xl bg-sky-100/70 flex items-center justify-center text-sky-600 mb-4">
            <ShieldCheck className="w-5 h-5 stroke-[2.3]" />
          </div>
          <h4 className="text-xs font-black text-brand-navy uppercase tracking-wider mb-2">
            Submission prerequisites
          </h4>
          <p className="text-slate-500 text-xs font-semibold leading-relaxed">
            Submission is available when an active semester, supervisor capacity, and configured document requirements are available.
          </p>
        </div>

        {/* Review Process */}
        <div className="bg-[#f3e8ff]/30 border border-[#e9d5ff]/70 rounded-2xl p-5 shadow-3xs select-none">
          <div className="w-10 h-10 rounded-xl bg-purple-100/70 flex items-center justify-center text-purple-600 mb-4">
            <Clock className="w-5 h-5 stroke-[2.3]" />
          </div>
          <h4 className="text-xs font-black text-brand-navy uppercase tracking-wider mb-2">
            Review Process
          </h4>
          <p className="text-slate-500 text-xs font-semibold leading-relaxed font-sans">
            Review progress follows the recorded faculty workflow. No formal turnaround target is currently configured.
          </p>
        </div>

        {/* Need Assistance? */}
        <div className="bg-white border border-[#e2e8f0]/80 rounded-2xl p-5 shadow-3xs select-none">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 mb-4">
            <HelpCircle className="w-5 h-5 stroke-[2.3]" />
          </div>
          <h4 className="text-xs font-black text-brand-navy uppercase tracking-wider mb-2">
            Need Assistance?
          </h4>
          <p className="text-slate-500 text-xs font-semibold leading-relaxed">
            Contact the FSKTM Office Directory or use our FAQ Chatbot for technical issues.
          </p>
        </div>

      </div>

    </form>
  );
};
