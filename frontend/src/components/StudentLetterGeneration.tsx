/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Student letters (UC23): ask the postgraduate office for an official letter,
// then follow the request. The student never sees a letter's wording before
// the office approves it, so a letter cannot be copied from the screen.

import React, { useCallback, useEffect, useState } from 'react';
import { FileText, Info, Send } from 'lucide-react';
import { PageHeader, PortalButton, PortalToast, SegmentedControl, StatusBadge } from './PortalPrimitives';
import { PortalModal, useModalTitle } from './PortalModal';
import { LoadingState, ErrorState } from './StateViews';
import { StudentLetterRequests, shortDate } from './IssuedLetters';
import { LetterRecipientFields } from './LetterRecipientFields';
import { GeneratedLetter, LetterRecipientOptions, LetterRequestDetails, LetterTemplate } from '../types';
import {
  fieldErrors,
  getMyLetterRequests,
  getRecipientOptions,
  getStudentLetterTemplates,
  inactiveStudentReason,
  isAlreadyRequested,
  requestLetter,
} from '../services';
import { EMPTY_REQUEST_DETAILS } from '../utils/letterRecipients';

export type StudentLetterView = 'new' | 'history';

const LETTER_VIEWS: readonly StudentLetterView[] = ['new', 'history'];
const MAX_NOTE_LENGTH = 500;

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
  // The letter whose request pop-up is open.
  const [requesting, setRequesting] = useState<LetterTemplate | null>(null);
  const modalTitle = useModalTitle();

  // The student's requests ("My Requests").
  const [letters, setLetters] = useState<GeneratedLetter[]>([]);
  const [lettersLoading, setLettersLoading] = useState(true);
  const [lettersError, setLettersError] = useState<string | null>(null);

  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  // Who a confirmation letter is for, and the lists the student chooses from.
  const [details, setDetails] = useState<LetterRequestDetails>(EMPTY_REQUEST_DETAILS);
  const [detailErrors, setDetailErrors] = useState<Record<string, string>>({});
  const [recipientOptions, setRecipientOptions] = useState<LetterRecipientOptions | null>(null);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  // Set when the server refuses letters because the student's status is not Active.
  const [blockedReason, setBlockedReason] = useState<string | null>(null);

  const loadTemplates = useCallback(() => {
    setTemplatesLoading(true);
    setTemplatesError(null);
    getStudentLetterTemplates()
      .then(setTemplates)
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

  const loadRecipientOptions = useCallback(() => {
    setOptionsLoading(true);
    setOptionsError(null);
    getRecipientOptions()
      .then(setRecipientOptions)
      .catch((err) => setOptionsError(err instanceof Error ? err.message : 'Could not load the list of organisations.'))
      .finally(() => setOptionsLoading(false));
  }, []);

  const pendingFor = (templateId: string) =>
    letters.find((letter) => letter.templateId === templateId && letter.status === 'Pending') ?? null;
  const currentCopies = (templateId: string) =>
    letters.filter((letter) => letter.templateId === templateId && letter.status === 'Issued');
  // A letter addressed to someone replaces only the copy for the same organisation.
  const requestingCurrent = requesting
    ? currentCopies(requesting.id).find(
        (letter) =>
          !requesting.asksRecipient ||
          (details.organisation.trim() !== '' &&
            letter.requestDetails?.organisation?.toLowerCase() === details.organisation.trim().toLowerCase()),
      ) ?? null
    : null;

  const replaceLetter = (changed: GeneratedLetter) =>
    setLetters((rows) => rows.map((row) => (row.id === changed.id ? changed : row)));

  const openRequest = (template: LetterTemplate) => {
    setRequesting(template);
    setNote('');
    setNoteError(null);
    setDetails(EMPTY_REQUEST_DETAILS);
    setDetailErrors({});
    if (template.asksRecipient && !recipientOptions && !optionsLoading) loadRecipientOptions();
  };

  const changeDetails = (next: LetterRequestDetails) => {
    setDetailErrors((current) => {
      const cleared = { ...current };
      for (const key of Object.keys(next) as (keyof LetterRequestDetails)[]) {
        if (next[key] !== details[key]) delete cleared[key];
      }
      return cleared;
    });
    setDetails(next);
  };

  const closeRequest = () => {
    if (!sending) setRequesting(null);
  };

  const handleRequest = async () => {
    if (!requesting || sending) return;
    if (note.trim().length > MAX_NOTE_LENGTH) {
      setNoteError(`Keep the note under ${MAX_NOTE_LENGTH} characters.`);
      return;
    }
    if (requesting.asksRecipient) {
      const problems: Record<string, string> = {};
      if (!details.purpose) problems.purpose = 'Choose what the letter is for.';
      else if (!details.organisation.trim()) problems.organisation = 'Choose or type who the letter is for.';
      setDetailErrors(problems);
      if (Object.keys(problems).length > 0) return;
    }
    setSending(true);
    try {
      const created = await requestLetter(requesting.id, note.trim(), requesting.asksRecipient ? details : undefined);
      setLetters((rows) => [created, ...rows]);
      setRequesting(null);
      setNote('');
      setNoteError(null);
      changeView('history');
      showToast(`Request sent for a ${created.templateName}. You will be notified when the office decides.`);
    } catch (err) {
      const reason = inactiveStudentReason(err);
      if (reason) {
        setRequesting(null);
        setBlockedReason(reason);
      } else if (isAlreadyRequested(err)) {
        setRequesting(null);
        loadLetters();
        showToast(err instanceof Error ? err.message : 'You already asked for this letter.');
      } else {
        const problems = fieldErrors(err);
        if (problems.note) setNoteError(problems.note);
        setDetailErrors(Object.fromEntries(Object.entries(problems).filter(([key]) => key !== 'note')));
        showToast(err instanceof Error ? err.message : 'Could not send the request. Please try again.');
        if (err instanceof Error && /no longer available/i.test(err.message)) loadTemplates();
      }
    } finally {
      setSending(false);
    }
  };

  // From a rejected request: open the same letter's request again.
  const requestAgain = (letter: GeneratedLetter) => {
    const template = templates.find((t) => t.id === letter.templateId);
    if (!template) {
      showToast(`A ${letter.templateName} cannot be requested right now.`);
      return;
    }
    changeView('new');
    openRequest(template);
  };

  if (blockedReason) {
    return (
      <div id="student-letter-generation-workspace" className="space-y-6 text-left font-sans text-xs pb-12">
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
    <div id="student-letter-generation-workspace" className="space-y-6 text-left font-sans text-xs pb-12">
      <PortalToast message={toast} />

      <PageHeader
        title="Letter Generation"
        subtitle="Ask the PG office for an official letter. You can view, print or download it once it is approved."
      />

      <SegmentedControl
        variant="tabs"
        options={LETTER_VIEWS}
        value={activeView}
        onChange={changeView}
        labels={{ new: 'Request a letter', history: `My requests (${letters.length})` }}
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
        <section aria-labelledby="letter-choices-heading" className="app-card">
          <div className="px-5 pt-5 pb-4">
            <h2 id="letter-choices-heading" className="section-label">Which letter do you need?</h2>
            <p className="card-description mt-1">
              The office checks your details and completes the letter. You get a notification when it is approved.
            </p>
          </div>

          {templatesLoading ? (
            <LoadingState message="Loading the letters you can request…" />
          ) : templatesError ? (
            <ErrorState message={templatesError} onRetry={loadTemplates} />
          ) : templates.length === 0 ? (
            <p className="border-t border-slate-100 py-10 text-center text-slate-400 font-bold">No letters can be requested right now.</p>
          ) : (
            <ul>
              {templates.map((template) => {
                const pending = pendingFor(template.id);
                const copies = currentCopies(template.id);
                const current = copies[0];
                return (
                  <li key={template.id} className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center">
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <span className="mt-0.5 w-9 h-9 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 flex items-center justify-center shrink-0">
                        <FileText aria-hidden="true" className="w-4 h-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-2">
                          <span className="text-[14px] font-bold text-slate-800">{template.name}</span>
                          <StatusBadge tone="neutral" className="px-2 py-0.5 text-[9px]">{template.type}</StatusBadge>
                        </p>
                        {template.description && <p className="card-description mt-0.5">{template.description}</p>}
                        {current && !pending && (
                          <p className="mt-1 text-[12px] font-semibold text-slate-500">
                            {template.asksRecipient
                              ? `You have ${copies.length === 1 ? 'a copy' : `${copies.length} copies`} for ${copies
                                  .map((copy) => copy.requestDetails?.organisation || copy.referenceNumber)
                                  .join(', ')}. Ask again for another organisation, or to renew one.`
                              : `Your current copy: ${current.referenceNumber}, approved ${shortDate(current.decidedAt)}.`}
                          </p>
                        )}
                        {pending && (
                          <p className="mt-1 text-[12px] font-semibold text-amber-700">
                            Requested on {shortDate(pending.requestedAt)}, waiting for the office.
                          </p>
                        )}
                      </div>
                    </div>
                    {pending ? (
                      <PortalButton size="sm" className="self-start sm:self-auto" onClick={() => changeView('history')}>
                        See request
                      </PortalButton>
                    ) : (
                      <PortalButton size="sm" icon={Send} className="self-start sm:self-auto" onClick={() => openRequest(template)}>
                        Request
                      </PortalButton>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      <PortalModal isOpen={requesting !== null} onClose={closeRequest} busy={sending} labelledBy={modalTitle} className={requesting?.asksRecipient ? 'max-w-xl p-6' : 'max-w-lg p-6'}>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void handleRequest();
          }}
        >
          <div>
            <h2 id={modalTitle} className="section-label">Request a {requesting?.name}</h2>
            <p className="card-description mt-1">
              {requesting?.asksRecipient
                ? 'Say who the letter is for. Your name, matric number and programme come from the student registry.'
                : 'The office fills it in with your details from the student registry.'}
            </p>
          </div>
          {requesting?.asksRecipient && (
            <LetterRecipientFields
              options={recipientOptions}
              loading={optionsLoading}
              error={optionsError}
              onRetry={loadRecipientOptions}
              details={details}
              onChange={changeDetails}
              errors={detailErrors}
              disabled={sending}
            />
          )}
          {requestingCurrent && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] font-semibold text-amber-900">
              You already have this letter{requesting?.asksRecipient ? ` for ${requestingCurrent.requestDetails?.organisation}` : ''} ({requestingCurrent.referenceNumber}, approved {shortDate(requestingCurrent.decidedAt)}). Once the office approves the new one, it replaces that copy, which will no longer be valid.
            </p>
          )}
          <div className="space-y-1.5">
            <label htmlFor="letter-request-note" className="form-label block">
              Note to the office (optional)
            </label>
            <textarea
              id="letter-request-note"
              rows={requesting?.asksRecipient ? 2 : 4}
              value={note}
              maxLength={MAX_NOTE_LENGTH}
              disabled={sending}
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
          <div className="flex flex-wrap justify-end gap-2">
            <PortalButton type="button" disabled={sending} onClick={closeRequest}>Cancel</PortalButton>
            <PortalButton type="submit" variant="primary" icon={Send} isLoading={sending}>Send request</PortalButton>
          </div>
        </form>
      </PortalModal>
    </div>
  );
};
