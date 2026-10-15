import { RecordPage } from './RecordPage';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Search, Send, CheckCircle, FileText } from 'lucide-react';
import { StudentSupervisorApplication, SupervisorApplicationRecord, SupervisorCandidate, SupervisorDocumentRequirement } from '../types';
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
import { capacityStateLabel } from '../utils/lecturerCapacity';
import { PageHeader, PortalButton, PortalToast, StatusBadge } from './PortalPrimitives';
import { ErrorState, LoadingState } from './StateViews';
import { AppointmentGuidance } from './AppointmentPrimitives';

export function SupervisorCandidateOption({ candidate, selected, onToggle, busy = false }: {
  candidate: SupervisorCandidate; selected: boolean; onToggle: () => void; busy?: boolean;
}) {
  const selectable = candidate.selectable ?? candidate.filled < candidate.total;
  const capacity = candidate.capacityState ? capacityStateLabel(candidate.capacityState) : selectable ? 'Available' : 'Full';
  return <button type="button" aria-pressed={selected} onClick={onToggle} disabled={busy || !selectable}
    className={`flex w-full flex-wrap items-center justify-between gap-3 rounded-xl border p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed ${selected ? 'border-indigo-500 bg-indigo-50' : selectable ? 'border-slate-200 bg-white hover:bg-slate-50' : 'border-slate-200 bg-slate-50 opacity-60'}`}>
    <span className="flex min-w-0 items-center gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-navy text-xs font-bold text-white">{candidate.initials}</span>
      <span className="min-w-0"><span className="card-value block break-words">{candidate.name}</span><span className="card-description mt-1 block break-words">{candidate.domain}</span></span>
    </span>
    <span className="flex flex-wrap items-center gap-2">
      {selected ? <span className="card-value flex items-center gap-1.5 text-indigo-700"><CheckCircle aria-hidden="true" className="h-4 w-4" />Selected</span> : null}
      <StatusBadge tone={selectable ? 'neutral' : 'danger'}>{capacity} · {candidate.filled}/{candidate.total} filled</StatusBadge>
    </span>
  </button>;
}

export function SupervisorSelectionSummary({ candidate, onClear, busy = false }: {
  candidate: SupervisorCandidate | null; onClear: () => void; busy?: boolean;
}) {
  return <aside aria-label="Selected supervisor" aria-live="polite" className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
    <h4 className="card-label">Selected supervisor</h4>
    {candidate ? <><p className="section-label break-words">{candidate.name}</p><p className="card-description">{candidate.domain}</p>
      <PortalButton size="sm" variant="ghost" disabled={busy} onClick={onClear}>Clear selection</PortalButton></> : <p className="card-description">No supervisor selected.</p>}
  </aside>;
}

interface SupervisorAppointmentApplicationPageProps {
  onBack: () => void;
  onSuccess: (newApplication: StudentSupervisorApplication) => void;
  replacementApplication?: SupervisorApplicationRecord | null;
}

export const SupervisorAppointmentApplicationPage: React.FC<SupervisorAppointmentApplicationPageProps> = ({
  onBack,
  onSuccess,
  replacementApplication,
}) => {
  // All sections are available together; these links are navigation, not a wizard.
  const steps = [
    { number: 1, title: 'Project details', target: 'project-details' },
    { number: 2, title: 'Supervisor selection', target: 'supervisor-selection' },
    { number: 3, title: 'Supporting documents', target: 'supporting-documents' }
  ];

  // Form Fields
  const [researchTitle, setResearchTitle] = useState(replacementApplication?.researchTitle || '');
  const [projectCourseCodes, setProjectCourseCodes] = useState(replacementApplication?.projectCourseCodes || '');
  const [researchArea, setResearchArea] = useState(replacementApplication?.researchArea || '');
  const [researchAbstract, setResearchAbstract] = useState(replacementApplication?.researchAbstract || '');
  const [replacementReason, setReplacementReason] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSupervisorId, setSelectedSupervisorId] = useState<string | null>(null);
  const [requirements, setRequirements] = useState<SupervisorDocumentRequirement[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Map<string, File>>(new Map());
  const [requirementsLoading, setRequirementsLoading] = useState(true);
  const [requirementsError, setRequirementsError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastTone, setToastTone] = useState<'info' | 'success' | 'warning' | 'danger'>('danger');
  const toastTimer = useRef<number | null>(null);

  const clearToast = useCallback(() => {
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    toastTimer.current = null;
    setToastMessage(null);
  }, []);

  useEffect(() => () => {
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
  }, []);

  const showToast = (message: string, tone: 'info' | 'success' | 'warning' | 'danger' = 'danger') => {
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    setToastMessage(message);
    setToastTone(tone);
    toastTimer.current = window.setTimeout(clearToast, 4000);
  };

  const [supervisors, setSupervisors] = useState<SupervisorCandidate[]>([]);
  const [loadingSupervisors, setLoadingSupervisors] = useState(true);
  const [supervisorsError, setSupervisorsError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submitInFlight = useRef(false);
  const navigationComplete = useRef(false);

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
        showToast(fileError, 'danger');
        return;
      }
      const prospectiveFiles = new Map(selectedFiles);
      prospectiveFiles.set(code, file);
      const totalBytes = [...prospectiveFiles.values()].reduce((total, item) => total + item.size, 0);
      if (totalBytes > SUPERVISOR_DOCUMENT_MAX_TOTAL_BYTES) {
        showToast('Supervisor application documents must not exceed 10 MB combined.', 'danger');
        return;
      }
    }
    setSelectedFiles((current) => {
      const next = new Map(current);
      if (file) next.set(code, file);
      else next.delete(code);
      return next;
    });
  };


  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitInFlight.current) return;

    if (!researchTitle.trim()) {
      showToast("Provide your proposed research title.", 'danger');
      return;
    }
    if (!researchArea.trim()) {
      showToast("Provide your research area.", 'danger');
      return;
    }
    if (!researchAbstract.trim()) {
      showToast("Provide your research abstract.", 'danger');
      return;
    }
    if (!selectedSupervisorId) {
      showToast("Choose a proposed research supervisor.", 'danger');
      return;
    }
    if (replacementApplication && !replacementReason.trim()) {
      showToast('Provide a reason for changing Supervisor.', 'danger');
      return;
    }
    const documentError = validateSupervisorDocumentSelection(requirements, selectedFiles);
    if (documentError) {
      showToast(documentError, 'danger');
      return;
    }

    submitInFlight.current = true;
    setSubmitting(true);
    try {
      const body = buildSupervisorApplicationFormData({
        proposedSupervisorId: selectedSupervisorId,
        researchTitle: researchTitle.trim(),
        projectCourseCodes: projectCourseCodes.trim(),
        researchArea: researchArea.trim(),
        researchAbstract: researchAbstract.trim(),
        replacesAppointmentId: replacementApplication?.appointmentLifecycle?.appointmentId,
        replacementReason: replacementReason.trim(),
      }, selectedFiles);
      const record = await createSupervisorApplication(body);
      showToast('Supervisor application submitted successfully!', 'success');
      navigationComplete.current = true;
      onSuccess(toStudentSupervisorApplication(record));
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Supervisor application could not be submitted.';
      showToast(message, 'danger');
    } finally {
      submitInFlight.current = false;
      setSubmitting(false);
    }
  };

  return (
    <RecordPage navigationComplete={navigationComplete} title={replacementApplication ? 'Change Supervisor' : 'Supervisor Appointment Application'} subtitle={replacementApplication
          ? 'Request a replacement through the normal Supervisor and Programme Coordinator approval workflow. Your current appointment remains active until final approval.'
          : 'Complete the following steps to formally request a research supervisor. Ensure your proposal abstract is clear and aligned with the faculty research areas.'} backLabel="Back to Applications" onBack={onBack} dirty={projectCourseCodes !== (replacementApplication?.projectCourseCodes ?? '') || researchTitle !== (replacementApplication?.researchTitle ?? '') || researchArea !== (replacementApplication?.researchArea ?? '') || researchAbstract !== (replacementApplication?.researchAbstract ?? '') || !!replacementReason.trim() || selectedSupervisorId !== null || selectedFiles.size > 0} busy={submitting}><form id="submission-supervisor-form" onSubmit={handleSubmitRequest} className="space-y-8 text-left font-sans pb-12">
      <PortalToast message={toastMessage} tone={toastTone} onClose={clearToast} />
      


      {/* ========================================================================= */}
      {/* 2. THREE-STEPPER HEADER CAROUSEL                                          */}
      {/* ========================================================================= */}
      <nav id="application-stepper-row" aria-label="Application sections" className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
        <ol className="grid gap-2 md:grid-cols-3">{steps.map(st => <li key={st.number}><a href={`#${st.target}`} className="flex items-center gap-3 rounded-xl p-2 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700">{st.number}</span>
          <span className="card-value text-slate-800">{st.title}</span>
        </a></li>)}</ol>
      </nav>

      {/* ========================================================================= */}
      {/* 3. STEP 1: RESEARCH PROJECT DETAILS                                      */}
      {/* ========================================================================= */}
      <div id="project-details" className="scroll-mt-24 bg-white border border-[#e2e8f0]/80 rounded-2xl p-6 space-y-5 shadow-3xs text-left">
        <h3 className="section-label flex items-center gap-2 select-none border-b border-slate-100 pb-3">
          <span className="w-5 h-5 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center text-[11px] font-black">1</span>
          Research Project Details
        </h3>

        {replacementApplication && (
          <div className="space-y-1.5 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <label htmlFor="replacement-reason-input" className="form-label uppercase text-amber-800 tracking-wider block">
              Replacement reason
            </label>
            <textarea
              id="replacement-reason-input"
              rows={3}
              value={replacementReason}
              onChange={(event) => setReplacementReason(event.target.value)}
              placeholder="Explain why a different Supervisor is requested"
              className="w-full rounded-xl border border-amber-200 bg-white px-4 py-3 text-xs font-bold text-slate-800"
            />
          </div>
        )}

        <div className="space-y-1.5">
          <label htmlFor="project-course-codes-input" className="form-label uppercase text-slate-400 tracking-wider block">Course code(s) (optional)</label>
          <input
            id="project-course-codes-input"
            type="text"
            maxLength={255}
            value={projectCourseCodes}
            onChange={(event) => setProjectCourseCodes(event.target.value)}
            aria-describedby="project-course-codes-hint"
            placeholder="e.g. WQD7002"
            className="form-control"
          />
          <p id="project-course-codes-hint" className="card-description">Enter your project course code(s). Separate multiple codes with commas.</p>
        </div>

        {/* Input Field: Research Title */}
        <div className="space-y-1.5">
          <label htmlFor="research-title-input" className="form-label uppercase text-slate-400 tracking-wider block">
            Research Title
          </label>
          <input
            id="research-title-input"
            type="text"
            value={researchTitle}
            onChange={(e) => setResearchTitle(e.target.value)}
            placeholder="Enter the full working title of your research"
            className="w-full bg-slate-50 hover:bg-slate-50/75 focus:bg-white border-0 focus:ring-2 focus:ring-indigo-500/85 focus:ring-offset-0 rounded-xl px-4 py-3 text-xs font-bold text-slate-805 text-slate-800 placeholder-slate-400 transition"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="research-area-input" className="form-label uppercase text-slate-400 tracking-wider block">
            Research Area
          </label>
          <input
            id="research-area-input"
            type="text"
            value={researchArea}
            onChange={(e) => setResearchArea(e.target.value)}
            placeholder="For example, Human-Centred Artificial Intelligence"
            maxLength={255}
            className="w-full bg-slate-50 hover:bg-slate-50/75 focus:bg-white border-0 focus:ring-2 focus:ring-indigo-500/85 focus:ring-offset-0 rounded-xl px-4 py-3 text-xs font-bold text-slate-800 placeholder-slate-400 transition"
          />
        </div>

        {/* Text Area Field: Research Abstract */}
        <div className="space-y-1.5">
          <label htmlFor="research-abstract-input" className="form-label uppercase text-slate-400 tracking-wider block">
            Research Abstract
          </label>
          <textarea
            id="research-abstract-input"
            rows={5}
            value={researchAbstract}
            onChange={(e) => setResearchAbstract(e.target.value)}
            placeholder="Provide a concise summary of your research objectives, methodology, and expected outcomes (max 500 words)..."
            className="w-full bg-slate-50 hover:bg-slate-50/75 focus:bg-white border-0 focus:ring-2 focus:ring-indigo-500/85 focus:ring-offset-0 rounded-xl px-4 py-3.5 text-xs font-bold text-slate-805 text-slate-800 placeholder-slate-400 transition leading-relaxed"
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
      <div id="supervisor-selection" className="scroll-mt-24 bg-white border border-[#e2e8f0]/80 rounded-2xl p-6 space-y-5 shadow-3xs text-left">
        <h3 className="section-label flex items-center gap-2 select-none border-b border-slate-100 pb-3">
          <span className="w-5 h-5 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center text-[11px] font-black">2</span>
          Supervisor Selection
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left panel: Search filter + selection list (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <span className="card-label uppercase text-slate-400 tracking-wider block leading-none">
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
                className="w-full bg-slate-50 hover:bg-slate-50/75 focus:bg-white border-0 focus:ring-2 focus:ring-indigo-500/85 pl-10 pr-4 py-3 text-xs font-bold text-slate-800 placeholder-slate-400 transition rounded-xl"
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
                filteredSupervisors.map(sv => <SupervisorCandidateOption key={sv.id} candidate={sv} selected={selectedSupervisorId === sv.id} busy={submitting}
                  onToggle={() => setSelectedSupervisorId(current => current === sv.id ? null : sv.id)} />)
              ) : (
                <div className="card-description p-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl">
                  No matching supervisors found
                </div>
              )}
            </div>
          </div>

          {/* Right panel matching rule descriptor (5 cols) */}
          <div className="lg:col-span-5 h-full">
            <SupervisorSelectionSummary candidate={supervisors.find(sv => sv.id === selectedSupervisorId) ?? null} onClear={() => setSelectedSupervisorId(null)} busy={submitting} />
          </div>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. STEP 3: SUPPORTING DOCUMENTS UPLOAD ZONE                               */}
      {/* ========================================================================= */}
      <div id="supporting-documents" className="scroll-mt-24 bg-white border border-[#e2e8f0]/80 rounded-2xl p-6 space-y-5 shadow-3xs text-left">
        <h3 className="section-label flex items-center gap-2 select-none border-b border-slate-100 pb-3">
          <span className="w-5 h-5 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center text-[11px] font-black">3</span>
          Supporting Documents
        </h3>

        {requirementsLoading ? (
          <LoadingState message="Loading document requirements..." />
        ) : requirementsError ? (
          <ErrorState message={requirementsError} onRetry={loadRequirements} />
        ) : requirements.length === 0 ? (
          <div className="card-description rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800">
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
                      <p className="card-value text-slate-800">{requirement.label}</p>
                      <StatusBadge tone={requirement.isRequired ? 'warning' : 'neutral'}>
                        {requirement.isRequired ? 'Required' : 'Optional'}
                      </StatusBadge>
                    </div>
                    <p className="card-description mt-1">
                      {requirement.description || 'Attach the relevant supporting document.'}
                    </p>
                    {file && (
                      <div className="card-value mt-3 flex items-center gap-2 text-emerald-700">
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
            <div className="card-caption flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-slate-400">
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
        <div className="card-caption uppercase text-slate-400 tracking-wider">
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

      {/* ========================================================================= */}
      {/* 7. SUPPORTING CARDS FOOTER CONTAINER                                     */}
      {/* ========================================================================= */}
      <AppointmentGuidance cards={[
        {title:'One pending request at a time', content:<p>Only one request can await a decision. You may cancel while it awaits Supervisor review; after cancellation or rejection, you can apply again.</p>},
        replacementApplication
          ? {title:'Changing your supervisor',content:<p>Provide a replacement reason and fresh supporting documents. Your current supervisor remains assigned until the replacement is approved.</p>}
          : {title:'When your appointment starts',content:<p>The selected Supervisor reviews your request, followed by the Programme Coordinator. Your appointment starts only after final approval.</p>},
      ]} />

    </form></RecordPage>
  );
};
