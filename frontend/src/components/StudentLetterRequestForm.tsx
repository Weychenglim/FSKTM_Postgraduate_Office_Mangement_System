/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// A student's request for one letter, laid out like UM Maya's "Letter Details
// Application Form": the student's details on top, then one row per field with
// its label on the left and a hint on the right. A confirmation letter also
// asks who it is for: the purpose, the organisation from a built-in list
// (searched as the student types), the address to print, and the optional
// details to show.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Send } from 'lucide-react';
import { PortalButton } from './PortalPrimitives';
import { RecordPage } from './RecordPage';
import { SelectMenu } from './SelectMenu';
import { LoadingState, ErrorState } from './StateViews';
import { shortDate } from './IssuedLetters';
import type { GeneratedLetter, LetterRecipientOptions, LetterRequestDetails, LetterTemplate } from '../types';
import { fieldErrors, getRecipientOptions, inactiveStudentReason, isAlreadyRequested, requestLetter } from '../services';
import { EMPTY_REQUEST_DETAILS } from '../utils/letterRecipients';

const MAX_NOTE_LENGTH = 500;
const TYPE_IT = '__type_it__';

const ADDRESS_ROWS: ReadonlyArray<{ field: keyof LetterRequestDetails; label: string; hint: string; narrow?: boolean }> = [
  { field: 'addressLine1', label: 'Address Line 1', hint: 'Enter recipient address' },
  { field: 'addressLine2', label: 'Address Line 2', hint: 'Enter recipient address' },
  { field: 'postcode', label: 'Postcode', hint: 'Enter recipient postcode', narrow: true },
  { field: 'city', label: 'City', hint: 'Enter recipient city' },
  { field: 'state', label: 'State/Country', hint: 'Enter recipient state or country' },
];

const ROW = 'grid gap-1.5 sm:grid-cols-[10rem_minmax(0,1fr)] lg:grid-cols-[11rem_minmax(0,30rem)_minmax(0,1fr)] sm:gap-x-6 sm:items-start';
const LABEL = 'text-[13px] font-bold text-slate-700 sm:text-right sm:pt-3';

const FormRow: React.FC<{
  label: string;
  htmlFor?: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}> = ({ label, htmlFor, required, hint, error, children }) => {
  const text = (
    <>
      {label}
      {required && <span className="text-rose-600"> *</span>}
    </>
  );
  return (
    <div className={ROW}>
      {htmlFor ? <label htmlFor={htmlFor} className={LABEL}>{text}</label> : <span className={LABEL}>{text}</span>}
      <div className="min-w-0 space-y-1">
        {children}
        {error && <p role="alert" className="text-[11.5px] font-semibold text-rose-600">{error}</p>}
      </div>
      {hint && (
        <p id={htmlFor ? `${htmlFor}-hint` : undefined} className="text-[12px] font-semibold text-slate-400 sm:col-start-2 lg:col-start-auto lg:pt-3">
          {hint}
        </p>
      )}
    </div>
  );
};

interface StudentLetterRequestFormProps {
  template: LetterTemplate;
  student: { name: string; matricNumber: string; programme: string };
  /** The student's issued copies of this letter, which an approved request replaces. */
  currentCopies: GeneratedLetter[];
  /** A request for this letter that is still waiting, if any. */
  pending: GeneratedLetter | null;
  onSent: (created: GeneratedLetter) => void;
  onCancel: () => void;
  onSeeRequests: () => void;
  /** The server refused because the student's status is not Active. */
  onBlocked: (reason: string) => void;
  /** The letter was already asked for, or can no longer be requested. */
  onRefused: (message: string) => void;
  onMessage: (message: string) => void;
}

export const StudentLetterRequestForm: React.FC<StudentLetterRequestFormProps> = ({
  template,
  student,
  currentCopies,
  pending,
  onSent,
  onCancel,
  onSeeRequests,
  onBlocked,
  onRefused,
  onMessage,
}) => {
  const asksRecipient = Boolean(template.asksRecipient);
  const [details, setDetails] = useState<LetterRequestDetails>(EMPTY_REQUEST_DETAILS);
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const [options, setOptions] = useState<LetterRecipientOptions | null>(null);
  const [optionsLoading, setOptionsLoading] = useState(asksRecipient);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const finished = useRef(false);
  const today = useRef(new Date().toISOString()).current;

  const loadOptions = useCallback(() => {
    setOptionsLoading(true);
    setOptionsError(null);
    getRecipientOptions()
      .then(setOptions)
      .catch((err) => setOptionsError(err instanceof Error ? err.message : 'Could not load the list of organisations.'))
      .finally(() => setOptionsLoading(false));
  }, []);

  useEffect(() => {
    if (asksRecipient) loadOptions();
  }, [asksRecipient, loadOptions]);

  const purpose = options?.purposes.find((option) => option.code === details.purpose) ?? null;
  const listed = purpose?.organisations ?? [];
  const chosen = listed.find((name) => name.toLowerCase() === details.organisation.trim().toLowerCase()) ?? '';
  const typeIt = typing || (purpose !== null && listed.length === 0);
  const organisationName = purpose?.organisationLabel.toLowerCase() ?? 'organisation';
  // The copy an approval replaces: for a confirmation letter, only the one for the same organisation.
  const replaces =
    currentCopies.find(
      (copy) =>
        !asksRecipient ||
        (details.organisation.trim() !== '' &&
          copy.requestDetails?.organisation?.toLowerCase() === details.organisation.trim().toLowerCase()),
    ) ?? null;
  const dirty = note.trim() !== '' || JSON.stringify(details) !== JSON.stringify(EMPTY_REQUEST_DETAILS);

  const change = (changes: Partial<LetterRequestDetails>) => {
    setDetails((current) => ({ ...current, ...changes }));
    setErrors((current) => {
      const cleared = { ...current };
      for (const key of Object.keys(changes)) delete cleared[key];
      return cleared;
    });
  };

  const toggle = (code: string) =>
    change({ include: details.include.includes(code) ? details.include.filter((item) => item !== code) : [...details.include, code] });

  const submit = async () => {
    if (sending) return;
    const problems: Record<string, string> = {};
    if (note.trim().length > MAX_NOTE_LENGTH) problems.note = `Keep the note under ${MAX_NOTE_LENGTH} characters.`;
    if (asksRecipient) {
      if (!details.purpose) problems.purpose = 'Choose what the letter is for.';
      else if (!details.organisation.trim()) problems.organisation = `Choose or type the ${organisationName}.`;
    }
    setErrors(problems);
    if (Object.keys(problems).length > 0) return;
    setSending(true);
    try {
      const created = await requestLetter(template.id, note.trim(), asksRecipient ? details : undefined);
      finished.current = true;
      onSent(created);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not send the request. Please try again.';
      const reason = inactiveStudentReason(err);
      if (reason) {
        finished.current = true;
        onBlocked(reason);
      } else if (isAlreadyRequested(err) || /no longer available/i.test(message)) {
        finished.current = true;
        onRefused(message);
      } else {
        setErrors(fieldErrors(err));
        onMessage(message);
      }
    } finally {
      setSending(false);
    }
  };

  const input = (field: keyof LetterRequestDetails, narrow = false) => {
    const id = `letter-form-${field}`;
    return (
      <input
        id={id}
        type="text"
        value={String(details[field] ?? '')}
        maxLength={120}
        disabled={sending}
        onChange={(event) => change({ [field]: event.target.value })}
        aria-invalid={errors[field] ? true : undefined}
        aria-describedby={`${id}-hint`}
        className={`form-control form-control-md ${narrow ? 'sm:max-w-[10rem]' : ''} ${errors[field] ? 'form-control-error' : ''}`}
      />
    );
  };

  return (
    <RecordPage
      title={`Request a ${template.name}`}
      subtitle={template.description || undefined}
      backLabel="Back to letters"
      onBack={onCancel}
      pageKey={`letter-application:${template.id}`}
      dirty={dirty && !finished.current}
      busy={sending}
      navigationComplete={finished}
    >
      <section aria-label="Student" className="app-card px-5 py-4 sm:px-6">
        <dl className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-y-2 text-[13px]">
          <dt className="font-bold text-slate-700">Student ID</dt>
          <dd className="font-semibold text-slate-700">{student.matricNumber || '-'}</dd>
          <dt className="font-bold text-slate-700">Student Name</dt>
          <dd className="font-semibold text-slate-700">{student.name || '-'}</dd>
        </dl>
      </section>

      <section aria-labelledby="letter-form-heading" className="app-card overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-100 px-5 py-4 sm:px-6">
          <h2 id="letter-form-heading" className="text-[15px] font-extrabold text-brand-navy">Letter Details Application Form</h2>
        </div>

        {pending ? (
          <div className="px-5 py-8 sm:px-6 space-y-3">
            <p className="text-[13px] font-semibold text-slate-600">
              You asked for this letter on {shortDate(pending.requestedAt)}, and it is waiting for the office. You can ask again once it is
              decided, or withdraw it from My requests.
            </p>
            <PortalButton size="sm" onClick={onSeeRequests}>See my requests</PortalButton>
          </div>
        ) : asksRecipient && (optionsLoading || optionsError || !options) ? (
          optionsLoading ? (
            <LoadingState message="Loading the form…" />
          ) : (
            <ErrorState message={optionsError ?? 'Could not load the list of organisations.'} onRetry={loadOptions} />
          )
        ) : (
          <form
            noValidate
            className="space-y-4 px-5 py-6 sm:px-6"
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            {asksRecipient && (
              <div className={ROW}>
                <span aria-hidden="true" className="hidden sm:block" />
                <p className="text-[12.5px] font-bold text-slate-700 sm:text-right">
                  <span className="text-rose-600">*</span> Required information
                </p>
              </div>
            )}

            <FormRow label="Programme" htmlFor="letter-form-programme" hint="From your student record">
              <input
                id="letter-form-programme"
                type="text"
                readOnly
                value={student.programme || '-'}
                aria-describedby="letter-form-programme-hint"
                className="form-control form-control-md bg-slate-50 text-slate-600"
              />
            </FormRow>

            {asksRecipient && options && (
              <>
                <FormRow label="Purpose" htmlFor="letter-form-purpose" required error={errors.purpose}>
                  <SelectMenu
                    id="letter-form-purpose"
                    value={details.purpose}
                    placeholder="Choose an option"
                    searchPlaceholder="Search"
                    options={options.purposes.map((option) => ({ value: option.code, label: option.label }))}
                    disabled={sending}
                    aria-invalid={errors.purpose ? true : undefined}
                    onChange={(code) => {
                      if (code === details.purpose) return;
                      setTyping(false);
                      change({ purpose: code, organisation: '' });
                    }}
                  />
                </FormRow>

                <FormRow
                  label="Recipient"
                  htmlFor="letter-form-organisation"
                  required
                  hint={typeIt ? `Type the full name of the ${organisationName}` : undefined}
                  error={errors.organisation}
                >
                  {typeIt ? (
                    <input
                      id="letter-form-organisation"
                      type="text"
                      value={details.organisation}
                      maxLength={160}
                      disabled={sending}
                      onChange={(event) => change({ organisation: event.target.value })}
                      aria-invalid={errors.organisation ? true : undefined}
                      aria-describedby="letter-form-organisation-hint"
                      className={`form-control form-control-md ${errors.organisation ? 'form-control-error' : ''}`}
                    />
                  ) : (
                    <SelectMenu
                      id="letter-form-organisation"
                      value={chosen}
                      placeholder={purpose ? 'Choose an option' : 'Choose a purpose first'}
                      searchPlaceholder="Search"
                      options={[
                        ...listed.map((name) => ({ value: name, label: name })),
                        { value: TYPE_IT, label: 'Not in the list? Type the name' },
                      ]}
                      disabled={sending || !purpose}
                      aria-invalid={errors.organisation ? true : undefined}
                      onChange={(name) => {
                        if (name === TYPE_IT) {
                          setTyping(true);
                          change({ organisation: '' });
                        } else {
                          change({ organisation: name });
                        }
                      }}
                    />
                  )}
                  {typing && listed.length > 0 && (
                    <button
                      type="button"
                      disabled={sending}
                      onClick={() => {
                        setTyping(false);
                        change({ organisation: '' });
                      }}
                      className="text-[11.5px] font-bold text-blue-700 hover:underline cursor-pointer"
                    >
                      Choose from the list instead
                    </button>
                  )}
                </FormRow>

                {ADDRESS_ROWS.map((row) => (
                  <FormRow key={row.field} label={row.label} htmlFor={`letter-form-${row.field}`} hint={row.hint} error={errors[row.field]}>
                    {input(row.field, row.narrow)}
                  </FormRow>
                ))}
              </>
            )}

            <FormRow label="Application Date">
              <p className="text-[13px] font-semibold text-slate-700 sm:pt-3">{shortDate(today)}</p>
            </FormRow>

            {asksRecipient && options && (
              <FormRow label="Additional Information" hint="Shown on the letter" error={errors.include}>
                <div className="space-y-3 sm:pt-3">
                  {options.optionalDetails.map((option) => (
                    <label key={option.code} className="flex items-center gap-2.5 text-[13px] font-semibold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        className="h-[18px] w-[18px] accent-brand-navy"
                        checked={details.include.includes(option.code)}
                        disabled={sending}
                        onChange={() => toggle(option.code)}
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </FormRow>
            )}

            <FormRow label="Note to the Office" htmlFor="letter-form-note" hint="Optional" error={errors.note}>
              <textarea
                id="letter-form-note"
                rows={3}
                value={note}
                maxLength={MAX_NOTE_LENGTH}
                disabled={sending}
                onChange={(event) => {
                  setNote(event.target.value);
                  setErrors((current) => ({ ...current, note: '' }));
                }}
                aria-invalid={errors.note ? true : undefined}
                aria-describedby="letter-form-note-hint"
                placeholder="For example: needed for my student pass renewal appointment on 3 November."
                className={`form-control form-control-md resize-none ${errors.note ? 'form-control-error' : ''}`}
              />
            </FormRow>

            {replaces && (
              <div className={ROW}>
                <span aria-hidden="true" className="hidden sm:block" />
                <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] font-semibold text-amber-900">
                  <AlertTriangle aria-hidden="true" className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    You already have this letter{asksRecipient ? ` for ${replaces.requestDetails?.organisation}` : ''} ({replaces.referenceNumber},
                    approved {shortDate(replaces.decidedAt)}). Once the office approves the new one, it replaces that copy, which will no longer be
                    valid.
                  </span>
                </p>
              </div>
            )}

            <div className={`${ROW} border-t border-slate-100 pt-5`}>
              <span aria-hidden="true" className="hidden sm:block" />
              <div className="flex flex-wrap gap-2">
                <PortalButton type="submit" variant="primary" icon={Send} isLoading={sending}>Submit request</PortalButton>
                <PortalButton type="button" disabled={sending} onClick={onCancel}>Cancel</PortalButton>
              </div>
            </div>
            <div className={ROW}>
              <span aria-hidden="true" className="hidden sm:block" />
              <p className="text-[12px] font-semibold text-slate-400">
                The office checks your details and completes the letter. You are notified when it is approved.
              </p>
            </div>
          </form>
        )}
      </section>
    </RecordPage>
  );
};
