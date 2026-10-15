/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Student letters (UC23): ask the postgraduate office for an official letter,
// then follow the request. The student never sees a letter's wording before
// the office approves it, so a letter cannot be copied from the screen.

import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Clock, FileText, Info, Send, UserCheck } from 'lucide-react';
import { PageHeader, PortalButton, PortalToast, SegmentedControl, StatusBadge } from './PortalPrimitives';
import { LoadingState, ErrorState } from './StateViews';
import { StudentLetterRequests, shortDate } from './IssuedLetters';
import { GeneratedLetter, LetterTemplate } from '../types';
import {
  fieldErrors,
  getMyLetterRequests,
  getStudentLetterTemplates,
  inactiveStudentReason,
  isAlreadyRequested,
  requestLetter,
} from '../services';

export type StudentLetterView = 'new' | 'history';

const LETTER_VIEWS: readonly StudentLetterView[] = ['new', 'history'];
const MAX_NOTE_LENGTH = 500;

const STEPS = [
  { icon: Send, title: 'You request it', text: 'Choose the letter and add a note if the office needs to know why.' },
  { icon: UserCheck, title: 'The office checks it', text: 'Staff check your details and fill in anything kept outside the portal, such as attendance.' },
  { icon: CheckCircle2, title: 'You get it', text: 'You are notified when it is approved. View, print or download it from My Requests.' },
];

interface StudentLetterGenerationProps {
  /** Which tab is open; driven by the route when the app provides it. */
  view?: StudentLetterView;
  onViewChange?: (view: StudentLetterView) => void;
  // Kept for the app shell, which passes the signed-in student's identity.
  studentName?: string;
  studentId?: string;
  programme?: string;
}

export const StudentLetterGeneration: React.FC<StudentLetterGenerationProps> = ({ view, onViewChange }) => {
  const [localView, setLocalView] = useState<StudentLetterView>('new');
  const activeView = view ?? localView;
  const changeView = (next: StudentLetterView) => (onViewChange ? onViewChange(next) : setLocalView(next));

  const [toast, setToast] = useState<string | null>(null);
  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3500);
  };

  // Letters the student may ask for (Active templates, without their wording).
  const [templates, setTemplates] = useState<LetterTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // The student's requests ("My Requests").
  const [letters, setLetters] = useState<GeneratedLetter[]>([]);
  const [lettersLoading, setLettersLoading] = useState(true);
  const [lettersError, setLettersError] = useState<string | null>(null);

  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  // Set when the server refuses letters because the student's status is not Active.
  const [blockedReason, setBlockedReason] = useState<string | null>(null);

  const loadTemplates = useCallback(() => {
    setTemplatesLoading(true);
    setTemplatesError(null);
    getStudentLetterTemplates()
      .then((data) => {
        setTemplates(data);
        setSelectedId((current) => (current && data.some((t) => t.id === current) ? current : data[0]?.id ?? null));
      })
      .catch((err) => {
        const reason = inactiveStudentReason(err);
        if (reason) setBlockedReason(reason);
        else setTemplatesError(err instanceof Error ? err.message : 'Failed to load the letters you can request.');
      })
      .finally(() => setTemplatesLoading(false));
  }, []);

  const loadLetters = useCallback(() => {
    setLettersLoading(true);
    setLettersError(null);
    getMyLetterRequests()
      .then(setLetters)
      .catch((err) => {
        const reason = inactiveStudentReason(err);
        if (reason) setBlockedReason(reason);
        else setLettersError(err instanceof Error ? err.message : 'Failed to load your requests.');
      })
      .finally(() => setLettersLoading(false));
  }, []);

  useEffect(() => {
    loadTemplates();
    loadLetters();
  }, [loadTemplates, loadLetters]);

  const selected = templates.find((t) => t.id === selectedId) ?? null;
  const pendingFor = (templateId: string) =>
    letters.find((letter) => letter.templateId === templateId && letter.status === 'Pending') ?? null;
  const selectedPending = selected ? pendingFor(selected.id) : null;
  const pendingCount = letters.filter((letter) => letter.status === 'Pending').length;

  const replaceLetter = (changed: GeneratedLetter) =>
    setLetters((rows) => rows.map((row) => (row.id === changed.id ? changed : row)));

  const handleRequest = async () => {
    if (!selected || sending || selectedPending) return;
    if (note.trim().length > MAX_NOTE_LENGTH) {
      setNoteError(`Keep the note under ${MAX_NOTE_LENGTH} characters.`);
      return;
    }
    setSending(true);
    try {
      const created = await requestLetter(selected.id, note.trim());
      setLetters((rows) => [created, ...rows]);
      setNote('');
      setNoteError(null);
      changeView('history');
      showToast(`Request sent for a ${created.templateName}. You will be notified when the office decides.`);
    } catch (err) {
      const reason = inactiveStudentReason(err);
      if (reason) {
        setBlockedReason(reason);
      } else if (isAlreadyRequested(err)) {
        loadLetters();
        showToast(err instanceof Error ? err.message : 'You already asked for this letter.');
      } else {
        const problems = fieldErrors(err);
        if (problems.note) setNoteError(problems.note);
        showToast(err instanceof Error ? err.message : 'Could not send the request. Please try again.');
        if (err instanceof Error && /no longer available/i.test(err.message)) loadTemplates();
      }
    } finally {
      setSending(false);
    }
  };

  // From a rejected request: pick the same letter again on the request tab.
  const requestAgain = (letter: GeneratedLetter) => {
    if (!letter.templateId || !templates.some((t) => t.id === letter.templateId)) {
      showToast(`A ${letter.templateName} cannot be requested right now.`);
      return;
    }
    setSelectedId(letter.templateId);
    setNote('');
    setNoteError(null);
    changeView('new');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (blockedReason) {
    return (
      <div id="student-letter-generation-workspace" className="space-y-8 text-left font-sans text-xs pb-16 animate-fade-in">
        <PageHeader title="Letter Generation" subtitle="Official letters for students whose status is Active." />
        <div role="alert" className="bg-white border border-amber-200 rounded-2xl p-8 text-center shadow-3xs max-w-xl mx-auto">
          <Info className="w-6 h-6 text-amber-500 mx-auto" />
          <p className="mt-3 text-sm font-black text-slate-800">Letter requests are not available</p>
          <p className="mt-1.5 text-[12px] font-semibold text-slate-500 leading-relaxed">{blockedReason}</p>
        </div>
      </div>
    );
  }

  return (
    <div id="student-letter-generation-workspace" className="space-y-8 text-left font-sans text-xs pb-16 animate-fade-in">
      <PortalToast message={toast} />

      <PageHeader
        title="Letter Generation"
        subtitle="Request an official letter. The postgraduate office checks and completes it, and you can print it once it is approved."
      />

      <SegmentedControl
        options={LETTER_VIEWS}
        value={activeView}
        onChange={changeView}
        labels={{ new: 'Request a Letter', history: `My Requests (${letters.length})` }}
        className="w-fit"
      />

      {activeView === 'history' ? (
        <StudentLetterRequests
          letters={letters}
          loading={lettersLoading}
          error={lettersError}
          onRetry={loadLetters}
          onMessage={showToast}
          onLetterChange={replaceLetter}
          onRequestAgain={requestAgain}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Letters to choose from */}
          <section aria-labelledby="letter-choices-heading" className="lg:col-span-7 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-3xs space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 id="letter-choices-heading" className="section-label">Choose a Letter</h2>
              <span className="text-[11px] font-semibold text-slate-400">
                {templates.length} letter{templates.length === 1 ? '' : 's'}
              </span>
            </div>

            {templatesLoading ? (
              <LoadingState message="Loading the letters you can request…" />
            ) : templatesError ? (
              <ErrorState message={templatesError} onRetry={loadTemplates} />
            ) : templates.length === 0 ? (
              <p className="py-10 text-center text-slate-400 font-bold">No letters can be requested right now.</p>
            ) : (
              <div role="radiogroup" aria-labelledby="letter-choices-heading" className="space-y-3">
                {templates.map((template) => {
                  const isSelected = template.id === selectedId;
                  const pending = pendingFor(template.id);
                  return (
                    <button
                      key={template.id}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => {
                        setSelectedId(template.id);
                        setNoteError(null);
                      }}
                      className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy/30 ${
                        isSelected
                          ? 'bg-slate-50 border-brand-navy ring-1 ring-brand-navy'
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                      }`}
                    >
                      <span className={`mt-0.5 w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-brand-navy text-white border-brand-navy' : 'bg-slate-50 text-slate-500 border-slate-200'
                      }`}>
                        <FileText aria-hidden="true" className="w-4 h-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-[13px] font-extrabold text-slate-800">{template.name}</span>
                          <StatusBadge tone="neutral" className="px-2 py-0.5 text-[9px]">{template.type}</StatusBadge>
                          {pending && (
                            <StatusBadge tone="warning" dot className="px-2 py-0.5 text-[9px]">Requested</StatusBadge>
                          )}
                        </span>
                        {template.description && (
                          <span className="card-description mt-1 block">{template.description}</span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* The request itself */}
          <section aria-labelledby="letter-request-heading" className="lg:col-span-5 space-y-4">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-3xs space-y-4">
              <div>
                <h2 id="letter-request-heading" className="section-label">
                  {selected ? `Request: ${selected.name}` : 'Request a Letter'}
                </h2>
                <p className="card-description mt-1">
                  {selected
                    ? 'The office prepares this letter with your details from the student registry.'
                    : 'Choose a letter to request.'}
                </p>
              </div>

              {selectedPending ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
                  <Clock aria-hidden="true" className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-2">
                    <p className="text-[12px] font-semibold text-amber-900 leading-relaxed">
                      You asked for this letter on {shortDate(selectedPending.requestedAt)}. It is waiting for the office.
                    </p>
                    <PortalButton size="sm" variant="secondary" onClick={() => changeView('history')}>
                      See My Requests
                    </PortalButton>
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <label htmlFor="letter-request-note" className="form-label block">
                      Note to the office (optional)
                    </label>
                    <textarea
                      id="letter-request-note"
                      rows={4}
                      value={note}
                      maxLength={MAX_NOTE_LENGTH}
                      disabled={!selected || sending}
                      onChange={(e) => {
                        setNote(e.target.value);
                        setNoteError(null);
                      }}
                      aria-invalid={noteError ? true : undefined}
                      aria-describedby="letter-request-note-hint"
                      placeholder="For example: needed for my student pass renewal appointment on 3 November."
                      className={`form-control form-control-md resize-none ${noteError ? 'form-control-error' : ''}`}
                    />
                    <p id="letter-request-note-hint" className={`text-[10px] font-semibold ${noteError ? 'text-rose-600' : 'text-slate-400'}`}>
                      {noteError ?? `${note.length}/${MAX_NOTE_LENGTH} characters`}
                    </p>
                  </div>
                  <PortalButton
                    variant="primary"
                    icon={Send}
                    fullWidth
                    isLoading={sending}
                    disabled={!selected}
                    onClick={() => void handleRequest()}
                  >
                    Request letter
                  </PortalButton>
                </>
              )}
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-3xs">
              <h3 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">How it works</h3>
              <ol className="mt-3 space-y-3">
                {STEPS.map((step, index) => (
                  <li key={step.title} className="flex items-start gap-3">
                    <span className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
                      <step.icon aria-hidden="true" className="w-4 h-4" />
                    </span>
                    <span>
                      <span className="block text-[12px] font-extrabold text-slate-800">{index + 1}. {step.title}</span>
                      <span className="card-description block">{step.text}</span>
                    </span>
                  </li>
                ))}
              </ol>
              {pendingCount > 0 && (
                <p className="mt-4 text-[11px] font-semibold text-slate-500">
                  You have {pendingCount} request{pendingCount === 1 ? '' : 's'} waiting for the office.
                </p>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
