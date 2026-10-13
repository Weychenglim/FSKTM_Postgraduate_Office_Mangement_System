/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FileText,
  Eye,
  ZoomIn,
  ZoomOut,
  Info,
  FileCheck,
} from 'lucide-react';
import { PageHeader, PortalButton, PortalToast, SegmentedControl } from './PortalPrimitives';
import { LoadingState, ErrorState } from './StateViews';
import { StudentLetterHistory } from './IssuedLetters';
import { LetterPages } from './LetterPages';
import { GeneratedLetter, LetterTemplate } from '../types';
import {
  ApiError,
  generateLetter,
  getMyLetters,
  getStudentLetterTemplates,
  getMyLetterDetails,
  inactiveStudentReason,
  missingFieldsFrom,
  StudentLetterDetails,
} from '../services';
import {
  PENDING_REFERENCE,
  PlaceholderValues,
  formatLetterDate,
  letterDataFromIssued,
  missingPlaceholderLabels,
  openLetterWindow,
  printLetterInWindow,
  substitutePlaceholders,
  renderLetterBodyHtml,
} from '../utils/letterDocument';

export type StudentLetterView = 'new' | 'history';

const LETTER_VIEWS: readonly StudentLetterView[] = ['new', 'history'];

interface StudentLetterGenerationProps {
  /** Logged-in student identity, used to prefill the generated letter. */
  studentName?: string;
  studentId?: string;
  programme?: string;
  /** Which tab is open; driven by the route when the app provides it. */
  view?: StudentLetterView;
  onViewChange?: (view: StudentLetterView) => void;
}

export const StudentLetterGeneration: React.FC<StudentLetterGenerationProps> = ({
  studentName: studentNameProp,
  studentId: studentIdProp,
  programme: programmeProp,
  view,
  onViewChange,
}) => {
  const [localView, setLocalView] = useState<StudentLetterView>('new');
  const activeView = view ?? localView;
  const changeView = (next: StudentLetterView) => (onViewChange ? onViewChange(next) : setLocalView(next));

  // Templates loaded from the letters API (Active ones only).
  const [templates, setTemplates] = useState<LetterTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<LetterTemplate | null>(null);

  // Preview / UI state.
  const [zoomScale, setZoomScale] = useState<number>(100);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Live student details (incl. registry fields) fetched from the backend.
  const [details, setDetails] = useState<StudentLetterDetails | null>(null);

  // True once the backend has answered. Until then, and if it fails, the letter
  // must not be generated: falling back to placeholder constants previously
  // printed a demo matric number and an unconditional "Active" status onto an
  // official document, so a withdrawn student could produce a letter stating
  // they were enrolled.
  const [detailsError, setDetailsError] = useState<string | null>(null);

  // Set when the server refuses letters because the student's status is not Active.
  const [blockedReason, setBlockedReason] = useState<string | null>(null);

  // Letters already issued to this student ("My Letters").
  const [letters, setLetters] = useState<GeneratedLetter[]>([]);
  const [lettersLoading, setLettersLoading] = useState(true);
  const [lettersError, setLettersError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  // What the server said is missing, for the template it was asked about.
  const [serverMissing, setServerMissing] = useState<{ templateId: string; labels: string[] } | null>(null);

  const studentName = details?.studentName ?? studentNameProp ?? '';
  const matricNumber = details?.matricNumber ?? studentIdProp ?? '';
  const programName = details?.programName ?? programmeProp ?? '';
  const currentStatus = details?.currentStatus ?? '';
  const supervisorName = details?.supervisorName ?? '';
  const canGenerate = details !== null && !detailsError;

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadTemplates = useCallback(() => {
    setLoading(true);
    setError(null);
    getStudentLetterTemplates()
      .then((data) => {
        setTemplates(data);
        setSelectedTemplate((current) => current ?? data[0] ?? null);
      })
      .catch((e) => {
        const reason = inactiveStudentReason(e);
        if (reason) setBlockedReason(reason);
        else setError(e instanceof Error ? e.message : 'Failed to load letter templates.');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const loadLetters = useCallback(() => {
    setLettersLoading(true);
    setLettersError(null);
    getMyLetters()
      .then(setLetters)
      .catch((e) => {
        const reason = inactiveStudentReason(e);
        if (reason) setBlockedReason(reason);
        else setLettersError(e instanceof Error ? e.message : 'Failed to load your letters.');
      })
      .finally(() => setLettersLoading(false));
  }, []);

  useEffect(() => {
    loadLetters();
  }, [loadLetters]);

  // Load the logged-in student's letter details (name, matric, programme +
  // registry fields). A failure here is fatal for generation: an official letter
  // must carry the student's real record or none at all.
  useEffect(() => {
    let cancelled = false;
    getMyLetterDetails()
      .then((data) => {
        if (!cancelled) {
          setDetails(data);
          setDetailsError(null);
        }
      })
      .catch((e) => {
        if (cancelled) return;
        const reason = inactiveStudentReason(e);
        if (reason) {
          setBlockedReason(reason);
        } else {
          setDetailsError(
            e instanceof Error
              ? e.message
              : 'Could not load your student record. Letter generation is unavailable.',
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // The preview shows today's date; the server stamps the real date and the
  // reference number when the letter is issued.
  const letterDate = useMemo(() => formatLetterDate(), []);

  const placeholderValues: PlaceholderValues = {
    studentName,
    matricNumber,
    programName,
    currentStatus,
    supervisorName,
    referenceNumber: PENDING_REFERENCE,
    date: letterDate,
    // Registry-backed fields: fill from the student's record when available.
    passportNumber: details?.passportNumber,
    country: details?.country,
    programmeMode: details?.programmeMode,
    fieldOfResearch: details?.fieldOfResearch,
    modeOfStudy: details?.modeOfStudy,
    initialSemester: details?.initialSemester,
    currentSemester: details?.currentSemester,
    maxSemester: details?.maxSemester,
    expectedCompletion: details?.expectedCompletion,
  };

  // The template body with the student's details filled in.
  const previewBody = selectedTemplate
    ? substitutePlaceholders(selectedTemplate.content, placeholderValues)
    : '';

  // Fields this template needs that the student's record lacks. The server's
  // answer wins once it has been asked about this template.
  const missingLabels = !selectedTemplate || !details
    ? []
    : serverMissing?.templateId === selectedTemplate.id
      ? serverMissing.labels
      : missingPlaceholderLabels(selectedTemplate.content, placeholderValues);

  // The server fills, numbers and saves the letter; the print window then
  // shows that saved copy. The browser print dialog handles both "Save as PDF"
  // (download) and printing to a physical printer.
  const handleGenerate = async () => {
    if (!selectedTemplate || generating) return;
    if (!canGenerate) {
      triggerToast(
        detailsError ?? 'Your student record is still loading. Please try again.',
      );
      return;
    }
    if (missingLabels.length > 0) return;
    // Opened during the click so pop-up blockers allow it; filled once issued.
    const win = openLetterWindow();
    if (!win) {
      triggerToast('Please allow pop-ups for this site to generate the letter.');
      return;
    }
    setGenerating(true);
    try {
      const letter = await generateLetter(selectedTemplate.id);
      printLetterInWindow(win, letterDataFromIssued(letter));
      setLetters((current) => [letter, ...current.filter((row) => row.id !== letter.id)]);
      triggerToast(
        `Letter ${letter.referenceNumber} issued. Choose "Save as PDF" or a printer in the print dialog. A copy is kept in My Letters.`,
      );
    } catch (e) {
      win.close();
      const missing = missingFieldsFrom(e);
      const reason = inactiveStudentReason(e);
      if (missing) {
        setServerMissing({ templateId: selectedTemplate.id, labels: missing });
      } else if (reason) {
        setBlockedReason(reason);
      } else {
        if (e instanceof ApiError && e.status === 404) {
          setSelectedTemplate(null);
          loadTemplates();
        }
        triggerToast(e instanceof Error ? e.message : 'Could not generate the letter. Please try again.');
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleZoomIn = () => setZoomScale((p) => Math.min(120, p + 10));
  const handleZoomOut = () => setZoomScale((p) => Math.max(80, p - 10));

  if (blockedReason) {
    return (
      <div id="student-letter-generation-workspace" className="space-y-8 text-left font-sans text-xs pb-16 animate-fade-in">
        <PageHeader
          title="Letter Generation"
          subtitle="Official letters for students whose status is Active."
        />
        <div role="alert" className="bg-white border border-amber-200 rounded-2xl p-8 text-center shadow-3xs max-w-xl mx-auto">
          <Info className="w-6 h-6 text-amber-500 mx-auto" />
          <p className="mt-3 text-sm font-black text-slate-800">Letter generation is not available</p>
          <p className="mt-1.5 text-[12px] font-semibold text-slate-500 leading-relaxed">{blockedReason}</p>
        </div>
      </div>
    );
  }

  return (
    <div id="student-letter-generation-workspace" className="space-y-8 text-left font-sans text-xs pb-16 animate-fade-in">
      <PortalToast message={toastMessage} />

      <PageHeader
        title="Letter Generation"
        subtitle="Pick a letter, check the preview, then generate it. Every letter gets an official reference number and is kept in My Letters."
      />

      <SegmentedControl
        options={LETTER_VIEWS}
        value={activeView}
        onChange={changeView}
        labels={{ new: 'New Letter', history: `My Letters (${letters.length})` }}
        className="w-fit"
      />

      {activeView === 'history' && (
        <StudentLetterHistory
          letters={letters}
          loading={lettersLoading}
          error={lettersError}
          onRetry={loadLetters}
          onMessage={triggerToast}
        />
      )}

      <div className={`grid grid-cols-1 lg:grid-cols-12 gap-6 items-start ${activeView === 'history' ? 'hidden' : ''}`}>
        {/* LEFT: TEMPLATE LIBRARY */}
        <div id="templates-sidebar-panel" className="lg:col-span-4 space-y-4">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-3xs flex flex-col justify-between min-h-[520px]">
            <div className="space-y-4">
              <div className="flex items-center justify-between select-none">
                <h2 className="section-label">Letter Templates</h2>
                <span className="text-[11px] font-semibold text-slate-400">
                  {templates.length} template{templates.length === 1 ? '' : 's'}
                </span>
              </div>

              <div className="space-y-3">
                {loading ? (
                  <LoadingState message="Loading templates…" />
                ) : error ? (
                  <ErrorState message={error} onRetry={loadTemplates} />
                ) : templates.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 font-bold text-xs">
                    No letter templates are available yet.
                  </div>
                ) : (
                  templates.map((tpl) => {
                    const isSelected = selectedTemplate?.id === tpl.id;
                    return (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => setSelectedTemplate(tpl)}
                        className={`w-full text-left p-4 rounded-xl border transition-all duration-200 cursor-pointer block relative overflow-hidden group ${
                          isSelected
                            ? 'bg-slate-50/50 border-brand-navy ring-1 ring-[#0c1424]/40 shadow-xs'
                            : 'bg-white border-slate-200 hover:bg-slate-50/40'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2.5">
                          <div className="flex items-center gap-2">
                            <FileText className={`w-4 h-4 shrink-0 ${isSelected ? 'text-brand-navy stroke-[2.3]' : 'text-slate-400'}`} />
                            <span className={`text-xs font-black leading-tight ${isSelected ? 'text-brand-navy' : 'text-slate-800'}`}>
                              {tpl.name}
                            </span>
                          </div>
                          <span className="px-2 py-0.5 rounded-md text-[8px] font-extrabold uppercase tracking-wider shrink-0 bg-slate-100 text-slate-600 border border-slate-200">
                            {tpl.type}
                          </span>
                        </div>
                        <p className="card-description mt-2">
                          {tpl.description}
                        </p>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 space-y-4 select-none">
              <div className="flex items-start gap-2.5 bg-slate-50 border border-slate-100 rounded-xl p-3">
                <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                <p className="text-[10px] font-semibold text-slate-500 leading-normal">
                  Selecting a template updates the preview live. Your details are filled in automatically from your student record. If a letter needs a detail your record does not have yet, the postgraduate office has to add it first.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: PREVIEW PANE */}
        <div id="preview-panel" className="lg:col-span-8 space-y-4">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-3xs text-left flex flex-col justify-between">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none">
              <h2 className="section-label">Letter Preview</h2>
              <div className="flex items-center gap-3">
                <div className="flex items-center bg-slate-100/80 border border-slate-200 rounded-lg p-1">
                  <button type="button" onClick={handleZoomOut} className="p-1 hover:bg-white text-slate-600 hover:text-slate-900 rounded transition cursor-pointer" title="Zoom Out">
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[10px] font-extrabold px-2 text-slate-600 shrink-0 min-w-[36px] text-center">{zoomScale}%</span>
                  <button type="button" onClick={handleZoomIn} className="p-1 hover:bg-white text-slate-600 hover:text-slate-900 rounded transition cursor-pointer" title="Zoom In">
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                </div>
                <span className="bg-indigo-50 border border-indigo-150 text-indigo-700 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg inline-flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5 text-indigo-600 stroke-[2.3]" />
                  <span>Preview Mode</span>
                </span>
              </div>
            </div>

            {/* A4 pages, as the letter will print */}
            <div className="bg-slate-100/60 border border-slate-200 rounded-2xl my-5 p-4 md:p-6">
              {!selectedTemplate ? (
                <div className="min-h-[360px] flex items-center justify-center text-slate-400 font-bold text-xs">
                  Select a template to preview your letter.
                </div>
              ) : (
                <LetterPages
                  reference={<span className="text-slate-400 italic font-sans">{PENDING_REFERENCE}</span>}
                  referenceText={PENDING_REFERENCE}
                  date={letterDate}
                  bodyHtml={renderLetterBodyHtml(previewBody)}
                  zoom={zoomScale / 100}
                />
              )}
            </div>

            {/* Action bar */}
            <div className="border-t border-slate-100 pt-5 flex flex-col md:flex-row items-center justify-between gap-4">
              {/* The button is disabled when the record cannot load or lacks a
                  field, so the reason has to be stated here rather than on click. */}
              {detailsError ? (
                <p className="text-[11px] font-semibold text-rose-700 text-left md:pr-4">
                  {`${detailsError} Letter generation is unavailable until your record loads.`}
                </p>
              ) : missingLabels.length > 0 ? (
                <p role="alert" className="text-[11px] font-semibold text-amber-700 text-left md:pr-4 leading-relaxed">
                  {`Your student record is missing: ${missingLabels.join(', ')}. Please contact the postgraduate office to complete it before generating this letter.`}
                </p>
              ) : (
                <p className="text-[11px] font-semibold text-slate-400 text-left md:pr-4">
                  The reference number is issued when you generate the letter.
                </p>
              )}
              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto items-center shrink-0">
                <PortalButton
                  variant="primary"
                  size="md"
                  icon={FileCheck}
                  onClick={() => void handleGenerate()}
                  isLoading={generating}
                  disabled={!selectedTemplate || !canGenerate || missingLabels.length > 0}
                  className="w-full sm:w-auto whitespace-nowrap"
                >
                  Generate Letter
                </PortalButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
