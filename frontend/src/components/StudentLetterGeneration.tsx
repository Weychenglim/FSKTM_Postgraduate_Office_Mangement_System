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
import { LoadingState, ErrorState } from './StateViews';
import { StudentLetterRequests, shortDate } from './IssuedLetters';
import { StudentLetterRequestForm } from './StudentLetterRequestForm';
import { GeneratedLetter, LetterTemplate } from '../types';
import { getMyLetterRequests, getStudentLetterTemplates, inactiveStudentReason } from '../services';

export type StudentLetterView = 'new' | 'history';

const LETTER_VIEWS: readonly StudentLetterView[] = ['new', 'history'];

interface StudentLetterGenerationProps {
  /** Which tab is open; driven by the route when the app provides it. */
  view?: StudentLetterView;
  onViewChange?: (view: StudentLetterView) => void;
  /** The letter whose application form is open, from the route. */
  requestTemplateId?: string | null;
  onOpenRequestForm?: (templateId: string) => void;
  onCloseRequestForm?: () => void;
  // The signed-in student's identity, shown on the application form.
  studentName?: string;
  studentId?: string;
  programme?: string;
}

export const StudentLetterGeneration: React.FC<StudentLetterGenerationProps> = ({
  view,
  onViewChange,
  requestTemplateId,
  onOpenRequestForm,
  onCloseRequestForm,
  studentName = '',
  studentId = '',
  programme = '',
}) => {
  const [localView, setLocalView] = useState<StudentLetterView>('new');
  const activeView = view ?? localView;
  const changeView = (next: StudentLetterView) => (onViewChange ? onViewChange(next) : setLocalView(next));
  const [localFormId, setLocalFormId] = useState<string | null>(null);
  const formTemplateId = onOpenRequestForm ? requestTemplateId ?? null : localFormId;

  const [toast, setToast] = useState<string | null>(null);
  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3500);
  };

  // Letters the student may ask for (Active templates, without their wording).
  const [templates, setTemplates] = useState<LetterTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [templatesError, setTemplatesError] = useState<string | null>(null);

  // The student's requests ("My Requests").
  const [letters, setLetters] = useState<GeneratedLetter[]>([]);
  const [lettersLoading, setLettersLoading] = useState(true);
  const [lettersError, setLettersError] = useState<string | null>(null);

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

  const pendingFor = (templateId: string) =>
    letters.find((letter) => letter.templateId === templateId && letter.status === 'Pending') ?? null;
  const currentCopies = (templateId: string) =>
    letters.filter((letter) => letter.templateId === templateId && letter.status === 'Issued');

  const replaceLetter = (changed: GeneratedLetter) =>
    setLetters((rows) => rows.map((row) => (row.id === changed.id ? changed : row)));

  const openForm = (template: LetterTemplate) => {
    if (onOpenRequestForm) onOpenRequestForm(template.id);
    else setLocalFormId(template.id);
  };

  const closeForm = (next: StudentLetterView = 'new') => {
    setLocalFormId(null);
    if (next === 'history' || !onCloseRequestForm) changeView(next);
    else onCloseRequestForm();
  };

  // From a rejected request: open the same letter's form again.
  const requestAgain = (letter: GeneratedLetter) => {
    const template = templates.find((t) => t.id === letter.templateId);
    if (!template) {
      showToast(`A ${letter.templateName} cannot be requested right now.`);
      return;
    }
    openForm(template);
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

  if (formTemplateId) {
    const template = templates.find((t) => t.id === formTemplateId);
    return (
      <div id="student-letter-generation-workspace" className="text-left font-sans text-xs">
        <PortalToast message={toast} />
        {templatesLoading || lettersLoading ? (
          <LoadingState message="Opening the form…" />
        ) : !template ? (
          <div className="app-card p-8 text-center space-y-3 max-w-xl mx-auto">
            <p className="text-sm font-black text-slate-800">This letter cannot be requested right now</p>
            <p className="text-[12px] font-semibold text-slate-500">It may have been withdrawn by the office. Choose another letter.</p>
            <PortalButton size="sm" onClick={() => closeForm()}>Back to letters</PortalButton>
          </div>
        ) : (
          <StudentLetterRequestForm
            key={template.id}
            template={template}
            student={{ name: studentName, matricNumber: studentId, programme }}
            currentCopies={currentCopies(template.id)}
            pending={pendingFor(template.id)}
            onCancel={() => closeForm()}
            onSeeRequests={() => closeForm('history')}
            onSent={(created) => {
              setLetters((rows) => [created, ...rows]);
              closeForm('history');
              showToast(`Request sent for a ${created.templateName}. You will be notified when the office decides.`);
            }}
            onBlocked={setBlockedReason}
            onRefused={(message) => {
              loadTemplates();
              loadLetters();
              closeForm();
              showToast(message);
            }}
            onMessage={showToast}
          />
        )}
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
                      <PortalButton size="sm" icon={Send} className="self-start sm:self-auto" onClick={() => openForm(template)}>
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
    </div>
  );
};
