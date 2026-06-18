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
  ShieldCheck,
} from 'lucide-react';
import { PageHeader, PortalToast } from './PortalPrimitives';
import { LoadingState, ErrorState } from './StateViews';
import { LetterTemplate } from '../types';
import { getStudentLetterTemplates, getMyLetterDetails, StudentLetterDetails } from '../services';
import {
  LETTERHEAD,
  LetterData,
  PlaceholderValues,
  formatLetterDate,
  generateReferenceNumber,
  openLetterDocument,
  substitutePlaceholders,
  renderLetterBodyHtml,
} from '../utils/letterDocument';

interface StudentLetterGenerationProps {
  /** Logged-in student identity, used to prefill the generated letter. */
  studentName?: string;
  studentId?: string;
  programme?: string;
}

export const StudentLetterGeneration: React.FC<StudentLetterGenerationProps> = ({
  studentName: studentNameProp,
  studentId: studentIdProp,
  programme: programmeProp,
}) => {
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

  // Student details substituted into the template. These are read-only: they are
  // taken from the logged-in student's record (live from the backend, with the
  // passed-in props / demo values as a fallback) and the student cannot edit
  // them, so the issued letter cannot be tampered with.
  const studentName = details?.studentName ?? studentNameProp ?? 'Fatimah Al-Zahra';
  const matricNumber = details?.matricNumber ?? studentIdProp ?? 'WEA200192';
  const programName =
    details?.programName ?? programmeProp ?? 'Master of Computer Science (By Coursework)';
  const currentStatus = details?.currentStatus ?? 'Active';
  const supervisorName = details?.supervisorName ?? '';

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
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load letter templates.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  // Load the logged-in student's letter details (name, matric, programme +
  // registry fields). Failures are non-fatal: the letter still renders with the
  // prop/demo fallbacks and blank fill-in lines for any missing registry fields.
  useEffect(() => {
    let cancelled = false;
    getMyLetterDetails()
      .then((data) => {
        if (!cancelled) setDetails(data);
      })
      .catch(() => {
        /* keep fallbacks — registry fields render as blank fill-in lines */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // One date for this session; one reference number per selected template.
  const letterDate = useMemo(() => formatLetterDate(), []);
  const referenceNumber = useMemo(
    () => generateReferenceNumber(selectedTemplate?.referencePrefix),
    [selectedTemplate?.id, selectedTemplate?.referencePrefix],
  );

  const placeholderValues: PlaceholderValues = {
    studentName,
    matricNumber,
    programName,
    currentStatus,
    supervisorName,
    referenceNumber,
    date: letterDate,
    // Registry-backed fields — fill from the student's record when available.
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

  const buildLetterData = (): LetterData => ({
    templateName: selectedTemplate?.name ?? 'Letter',
    refNo: referenceNumber,
    date: letterDate,
    bodyParagraphs: previewBody,
    studentName,
    matricNumber,
  });

  // Opens the real letter in a print window; the browser print dialog handles
  // both "Save as PDF" (download) and printing to a physical printer.
  const handleGeneratePDF = () => {
    if (!selectedTemplate) return;
    const opened = openLetterDocument(buildLetterData());
    triggerToast(
      opened
        ? `Opening "${selectedTemplate.name}" — choose "Save as PDF" or a printer in the print dialog.`
        : 'Please allow pop-ups for this site to generate the letter.',
    );
  };

  const handleZoomIn = () => setZoomScale((p) => Math.min(120, p + 10));
  const handleZoomOut = () => setZoomScale((p) => Math.max(80, p - 10));

  return (
    <div id="student-letter-generation-workspace" className="space-y-6 text-left font-sans pb-12">
      <PortalToast message={toastMessage} />

      <PageHeader
        title="Letter Generation"
        subtitle="Select an available letter template, preview the generated letter, and download or print your official PDF document."
        className="border-b border-slate-100 pb-5"
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT: TEMPLATE LIBRARY */}
        <div id="templates-sidebar-panel" className="lg:col-span-4 space-y-4">
          <div className="bg-white border border-[#e2e8f0]/85 rounded-2xl p-5 shadow-3xs flex flex-col justify-between min-h-[520px]">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 select-none">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                  Letter Templates
                </span>
                <span className="bg-slate-100 text-slate-600 font-bold text-[9px] px-2 py-0.5 rounded-full font-mono">
                  {String(templates.length).padStart(2, '0')} Forms
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
                            <FileText className={`w-4 h-4 ${isSelected ? 'text-brand-navy stroke-[2.3]' : 'text-slate-400'}`} />
                            <span className={`text-xs font-black leading-tight ${isSelected ? 'text-brand-navy' : 'text-slate-800'}`}>
                              {tpl.name}
                            </span>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider shrink-0 font-mono bg-slate-100 text-slate-600 border border-slate-200">
                            {tpl.type}
                          </span>
                        </div>
                        <p className="text-[10px] font-semibold text-slate-400 mt-2 leading-relaxed">
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
                  Selecting a template updates the preview live. Your details are filled in automatically from your student record — fields left blank are completed by the postgraduate office.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: PREVIEW PANE */}
        <div id="preview-panel" className="lg:col-span-8 space-y-4">
          <div className="bg-white border border-[#e2e8f0]/85 rounded-2xl p-6 shadow-3xs text-left flex flex-col justify-between">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-4 select-none">
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-brand-navy uppercase tracking-wider">Preview Pane</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center bg-slate-100/80 border border-slate-200 rounded-lg p-1">
                  <button type="button" onClick={handleZoomOut} className="p-1 hover:bg-white text-slate-600 hover:text-slate-900 rounded transition cursor-pointer" title="Zoom Out">
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[10px] font-black font-mono px-2 text-slate-600 shrink-0 min-w-[36px] text-center">{zoomScale}%</span>
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

            {/* A4 document */}
            <div className="bg-slate-100/60 border border-slate-200 rounded-2xl my-5 p-6 md:p-8 overflow-x-auto">
              <div
                style={{ transform: `scale(${zoomScale / 100})`, transformOrigin: 'top center' }}
                className="bg-white border border-slate-300 rounded p-8 md:p-11 shadow-sm font-sans mx-auto max-w-[580px] min-h-[720px] text-left text-[11px] text-slate-700 leading-relaxed relative flex flex-col justify-between transition-transform duration-100"
              >
                {!selectedTemplate ? (
                  <div className="flex-1 flex items-center justify-center text-slate-400 font-bold text-xs">
                    Select a template to preview your letter.
                  </div>
                ) : (
                  <>
                    <div>
                      {/* Letterhead */}
                      <div className="border-b-2 border-double border-slate-800 pb-4 mb-6 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 select-none">
                          <img src={LETTERHEAD.logoPath} alt="Universiti Malaya" className="h-10 w-auto object-contain" />
                          <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wide leading-tight block max-w-[120px]">
                            {LETTERHEAD.faculty}
                          </span>
                        </div>
                        <div className="text-right text-[8px] font-sans font-bold text-slate-400 leading-relaxed max-w-[210px] select-none">
                          {LETTERHEAD.addressLines.map((line) => (
                            <span key={line} className="block">{line}</span>
                          ))}
                        </div>
                      </div>

                      {/* Ref + Date */}
                      <div className="flex justify-between items-baseline mb-6 font-semibold text-slate-600 font-mono text-[9.5px]">
                        <div>
                          <span>Our Ref: </span>
                          <span className="text-slate-800 select-all font-sans font-extrabold">{referenceNumber}</span>
                        </div>
                        <div>
                          <span>Date: </span>
                          <span className="text-slate-800 select-all font-sans font-bold">{letterDate}</span>
                        </div>
                      </div>

                      {/* Body (placeholders substituted + markup rendered) */}
                      <div
                        className="text-slate-850 font-medium leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: renderLetterBodyHtml(previewBody) }}
                      />

                      {/* Disclaimer */}
                      <p className="text-slate-500 font-semibold text-[10px] leading-relaxed select-none mt-5">
                        {LETTERHEAD.disclaimer}
                      </p>
                    </div>

                    {/* Signature */}
                    <div className="border-t border-slate-100 pt-5 mt-8 flex justify-between items-end">
                      <div className="space-y-1 flex-1 text-left">
                        <div className="w-20 border-b border-slate-350 h-5 select-none" />
                        <p className="font-extrabold text-slate-900 leading-tight">{LETTERHEAD.signatoryName}</p>
                        <p className="text-slate-400 uppercase tracking-widest text-[8px] font-black font-sans mt-0.5 block leading-none select-none">
                          {LETTERHEAD.signatoryOffice}
                        </p>
                      </div>
                      <div className="flex bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 items-center gap-2 select-none shrink-0">
                        <div className="w-5 h-5 rounded-full bg-indigo-50 border border-indigo-150 flex items-center justify-center text-indigo-600">
                          <ShieldCheck className="w-3 h-3 stroke-[3]" />
                        </div>
                        <div className="text-left leading-none">
                          <span className="text-[7.5px] uppercase font-black text-slate-400 block tracking-wider">E-Signature</span>
                          <span className="text-[8px] font-black text-indigo-600 block mt-0.5 tracking-wide">Encrypted Verified</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Action bar */}
            <div className="border-t border-slate-100 pt-5 flex flex-col md:flex-row items-center justify-end gap-4">
              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto items-center">
                <button
                  type="button"
                  onClick={handleGeneratePDF}
                  disabled={!selectedTemplate}
                  className="w-full sm:w-auto px-6 py-3 bg-brand-navy hover:bg-slate-850 text-white font-black text-[10px] tracking-widest uppercase rounded-xl transition cursor-pointer flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FileCheck className="w-3.5 h-3.5 stroke-[2.3]" />
                  <span>Generate PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
