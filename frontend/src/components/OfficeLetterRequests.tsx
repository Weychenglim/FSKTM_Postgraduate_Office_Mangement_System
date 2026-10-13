/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Office side of letter requests (UC23): the queue of requests from students,
// and the review page where staff fill in what the student's record cannot
// supply, check the letter on A4 pages, then approve it or reject it with a
// reason. Approval issues the reference number; either way the student is told.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Eye, MessageSquareText, Search, Send, XCircle } from 'lucide-react';
import { PortalButton, PortalConfirmModal, SegmentedControl, StatusBadge } from './PortalPrimitives';
import { RecordPage } from './RecordPage';
import { LoadingState, ErrorState } from './StateViews';
import { LetterPages } from './LetterPages';
import { LetterStatusBadge, LetterView, shortDate } from './IssuedLetters';
import { GeneratedLetter, GeneratedLetterStatus, LetterRequestCounts, LetterRequestField } from '../types';
import {
  approvalFieldErrors,
  approveLetterRequest,
  fieldErrors,
  getLetterRequest,
  getLetterRequests,
  rejectLetterRequest,
} from '../services';
import { PENDING_REFERENCE, fillLetterTags, formatLetterDate, renderLetterBodyHtml } from '../utils/letterDocument';

type QueueFilter = GeneratedLetterStatus | 'All';

const QUEUE_FILTERS: readonly QueueFilter[] = ['Pending', 'Issued', 'Rejected', 'Withdrawn', 'All'];
const FILTER_LABEL: Record<QueueFilter, string> = {
  Pending: 'Pending',
  Issued: 'Approved',
  Rejected: 'Rejected',
  Withdrawn: 'Withdrawn',
  Revoked: 'Revoked',
  All: 'All',
};
const MAX_REASON_LENGTH = 500;
const MAX_VALUE_LENGTH = 300;

const errorText = (err: unknown, fallback: string) => (err instanceof Error ? err.message : fallback);

interface OfficeLetterRequestsProps {
  /** The request open for review, from the route; none shows the queue. */
  requestId?: string | null;
  onOpenRequest: (id: string) => void;
  onCloseRequest: () => void;
  counts: LetterRequestCounts | null;
  /** Ask the parent to reload the counts after a decision. */
  onCountsStale: () => void;
  onMessage: (message: string) => void;
}

export const OfficeLetterRequests: React.FC<OfficeLetterRequestsProps> = ({
  requestId,
  onOpenRequest,
  onCloseRequest,
  counts,
  onCountsStale,
  onMessage,
}) => {
  if (requestId) {
    return (
      <LetterRequestReview
        requestId={requestId}
        onClose={onCloseRequest}
        onDecided={() => {
          onCountsStale();
          onCloseRequest();
        }}
        onMessage={onMessage}
      />
    );
  }
  return <LetterRequestQueue counts={counts} onOpenRequest={onOpenRequest} onMessage={onMessage} />;
};

// ---------------- The queue ----------------

const LetterRequestQueue: React.FC<{
  counts: LetterRequestCounts | null;
  onOpenRequest: (id: string) => void;
  onMessage: (message: string) => void;
}> = ({ counts, onOpenRequest, onMessage }) => {
  const [filter, setFilter] = useState<QueueFilter>('Pending');
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<GeneratedLetter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<GeneratedLetter | null>(null);
  const [opening, setOpening] = useState<string | null>(null);
  const latestLoad = useRef(0);

  const load = useCallback(() => {
    const loadId = ++latestLoad.current;
    setLoading(true);
    setError(null);
    getLetterRequests({ search, status: filter === 'All' ? '' : filter })
      .then((data) => {
        if (loadId === latestLoad.current) setRows(data);
      })
      .catch((err) => {
        if (loadId === latestLoad.current) setError(errorText(err, 'Failed to load letter requests.'));
      })
      .finally(() => {
        if (loadId === latestLoad.current) setLoading(false);
      });
  }, [search, filter]);

  useEffect(() => {
    const timer = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load, search]);

  const viewLetter = async (letter: GeneratedLetter) => {
    setOpening(letter.id);
    try {
      setViewing(await getLetterRequest(letter.id));
    } catch (err) {
      onMessage(errorText(err, 'Could not open this letter.'));
    } finally {
      setOpening(null);
    }
  };

  const total = counts ? Object.values(counts).reduce((sum, n) => sum + n, 0) : null;
  const countFor = (option: QueueFilter) =>
    counts ? (option === 'All' ? total : counts[option as GeneratedLetterStatus]) : null;

  return (
    <div id="letter-requests-queue" className="space-y-6">
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-3xs flex flex-col lg:flex-row lg:items-center gap-3">
        <SegmentedControl<QueueFilter>
          options={QUEUE_FILTERS}
          value={filter}
          onChange={setFilter}
          labels={Object.fromEntries(
            QUEUE_FILTERS.map((option) => {
              const count = countFor(option);
              return [option, count === null ? FILTER_LABEL[option] : `${FILTER_LABEL[option]} (${count})`];
            }),
          )}
          className="w-full lg:w-fit overflow-x-auto"
        />
        <label className="relative block flex-1 min-w-0">
          <span className="sr-only">Search letter requests</span>
          <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-3.5 h-3.5" />
          </span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Student name, matric number, letter or reference"
            className="form-control form-control-sm pl-9"
          />
        </label>
      </div>

      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-3xs overflow-hidden">
        <div className="px-5 pt-5 pb-3 flex items-center justify-between gap-3">
          <h2 className="section-label">{filter === 'Pending' ? 'Waiting for a Decision' : `${FILTER_LABEL[filter]} Requests`}</h2>
          <span className="text-[11px] font-semibold text-slate-400">
            {rows.length} request{rows.length === 1 ? '' : 's'}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table text-xs">
            <thead>
              <tr className="data-thead bg-[#f8fafc]">
                <th className="data-th">Student</th>
                <th className="data-th">Letter</th>
                <th className="data-th">Requested</th>
                <th className="data-th">Status</th>
                <th className="data-th text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && rows.length === 0 ? (
                <tr><td colSpan={5} className="p-0"><LoadingState message="Loading letter requests…" /></td></tr>
              ) : error ? (
                <tr><td colSpan={5} className="p-0"><ErrorState message={error} onRetry={load} /></td></tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-slate-400 font-semibold">
                    {search
                      ? 'No requests match this search.'
                      : filter === 'Pending'
                        ? 'No requests are waiting. New requests from students appear here.'
                        : 'Nothing here yet.'}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/50 transition align-top">
                    <td className="data-td">
                      <span className="block font-bold text-slate-800">{row.studentName || 'Unknown student'}</span>
                      <span className="block text-[10px] text-slate-400">{row.matricNumber}</span>
                    </td>
                    <td className="data-td">
                      <span className="block font-bold text-slate-800">{row.templateName}</span>
                      <span className="block text-[10px] text-slate-400">{row.letterType}</span>
                      {row.note && (
                        <span className="mt-1 inline-flex items-start gap-1 text-[10.5px] font-semibold text-slate-500 max-w-[280px]">
                          <MessageSquareText aria-hidden="true" className="w-3 h-3 mt-0.5 shrink-0 text-slate-400" />
                          <span className="line-clamp-2">{row.note}</span>
                        </span>
                      )}
                    </td>
                    <td className="data-td whitespace-nowrap">{shortDate(row.requestedAt)}</td>
                    <td className="data-td">
                      <LetterStatusBadge status={row.status} />
                      {row.status === 'Issued' && (
                        <span className="mt-1 block text-[10px] font-semibold text-slate-400">
                          <span className="font-mono">{row.referenceNumber}</span>
                          {row.decidedBy ? ` by ${row.decidedBy}` : ''}
                        </span>
                      )}
                      {row.status === 'Rejected' && (
                        <span className="mt-1 block text-[10px] font-semibold text-rose-600 max-w-[240px] leading-snug">
                          {row.decidedBy ? `${row.decidedBy}: ` : ''}{row.rejectReason}
                        </span>
                      )}
                      {row.status === 'Withdrawn' && (
                        <span className="mt-1 block text-[10px] font-semibold text-slate-400">By the student, {shortDate(row.withdrawnAt)}</span>
                      )}
                    </td>
                    <td className="data-td text-right">
                      {row.status === 'Pending' ? (
                        <PortalButton
                          variant="primary"
                          size="sm"
                          aria-label={`Review the ${row.templateName} request from ${row.studentName}`}
                          onClick={() => onOpenRequest(row.id)}
                        >
                          Review
                        </PortalButton>
                      ) : row.status === 'Issued' || row.status === 'Revoked' ? (
                        <PortalButton
                          variant="secondary"
                          size="sm"
                          icon={Eye}
                          isLoading={opening === row.id}
                          aria-label={`View ${row.referenceNumber}`}
                          onClick={() => void viewLetter(row)}
                        >
                          View
                        </PortalButton>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {viewing && <LetterView letter={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
};

// ---------------- Reviewing one request ----------------

const LetterRequestReview: React.FC<{
  requestId: string;
  onClose: () => void;
  onDecided: () => void;
  onMessage: (message: string) => void;
}> = ({ requestId, onClose, onDecided, onMessage }) => {
  const [request, setRequest] = useState<GeneratedLetter | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [approving, setApproving] = useState(false);
  const [confirmApprove, setConfirmApprove] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [rejectSaving, setRejectSaving] = useState(false);
  const [viewing, setViewing] = useState(false);
  const decided = useRef(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getLetterRequest(requestId)
      .then((data) => {
        setRequest(data);
        setValues({});
        setErrors({});
      })
      .catch((err) => setError(errorText(err, 'Could not open this request.')))
      .finally(() => setLoading(false));
  }, [requestId]);

  useEffect(() => {
    load();
  }, [load]);

  const fields = useMemo(() => request?.fields ?? [], [request]);
  const needed = fields.filter((field) => field.needed);
  const officeNames = useMemo(() => fields.filter((field) => field.source === 'office').map((field) => field.name), [fields]);
  const missingCount = needed.filter((field) => !values[field.name]?.trim()).length;
  const dirty = Object.values(values).some((value) => value.trim()) || reason.trim() !== '';
  const busy = approving || rejectSaving;
  const today = useMemo(() => formatLetterDate(), []);

  // The letter as it will read: record values, what has been typed so far, and
  // the reference and date the approval will fill in.
  const previewHtml = useMemo(() => {
    if (!request?.templateContent) return '';
    const filled: Record<string, string> = { REFERENCE_NUMBER: PENDING_REFERENCE, CURRENT_DATE: today };
    for (const field of fields) filled[field.name] = field.needed ? values[field.name] ?? '' : field.value;
    return renderLetterBodyHtml(fillLetterTags(request.templateContent, filled), {
      highlightPlaceholders: true,
      officeFields: officeNames,
    });
  }, [request, fields, values, today, officeNames]);

  const setValue = (name: string, value: string) => {
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => (current[name] ? { ...current, [name]: '' } : current));
  };

  const checkValues = () => {
    const problems: Record<string, string> = {};
    for (const field of needed) {
      const value = values[field.name]?.trim() ?? '';
      if (!value) problems[field.name] = 'Fill this in before approving.';
      else if (value.length > MAX_VALUE_LENGTH) problems[field.name] = `Keep it under ${MAX_VALUE_LENGTH} characters.`;
    }
    setErrors(problems);
    return Object.keys(problems).length === 0;
  };

  const startApprove = () => {
    if (checkValues()) setConfirmApprove(true);
  };

  const approve = async () => {
    if (!request) return;
    setApproving(true);
    try {
      const typed = Object.fromEntries(needed.map((field) => [field.name, values[field.name]?.trim() ?? '']));
      const issued = await approveLetterRequest(request.id, typed);
      decided.current = true;
      setConfirmApprove(false);
      onMessage(`Approved. ${issued.referenceNumber} was issued to ${issued.studentName}, who has been notified.`);
      onDecided();
    } catch (err) {
      setConfirmApprove(false);
      const problems = approvalFieldErrors(err);
      if (problems) {
        setErrors(problems);
        onMessage('Some values need attention before this letter can be approved.');
      } else {
        onMessage(errorText(err, 'Could not approve this request.'));
        load();
      }
    } finally {
      setApproving(false);
    }
  };

  const reject = async () => {
    if (!request) return;
    const text = reason.trim();
    if (!text) {
      setReasonError('Give the reason, so the student knows what to do.');
      return;
    }
    setRejectSaving(true);
    try {
      await rejectLetterRequest(request.id, text);
      decided.current = true;
      setRejecting(false);
      onMessage(`Rejected. ${request.studentName} has been told why.`);
      onDecided();
    } catch (err) {
      const problem = fieldErrors(err).reason;
      if (problem) setReasonError(problem);
      else {
        setRejecting(false);
        onMessage(errorText(err, 'Could not reject this request.'));
        load();
      }
    } finally {
      setRejectSaving(false);
    }
  };

  const title = request ? `Review: ${request.templateName}` : 'Review Letter Request';
  const subtitle = request
    ? `${request.studentName || 'Unknown student'} (${request.matricNumber}) asked for this on ${shortDate(request.requestedAt)}.`
    : undefined;

  return (
    <RecordPage
      title={title}
      subtitle={subtitle}
      backLabel="Back to Requests"
      onBack={onClose}
      pageKey={`letter-request:${requestId}`}
      dirty={dirty && !decided.current}
      busy={busy}
      navigationComplete={decided}
    >
      {loading ? (
        <LoadingState message="Opening the request…" />
      ) : error || !request ? (
        <ErrorState message={error ?? 'Could not open this request.'} onRetry={load} />
      ) : request.status !== 'Pending' ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-3xs space-y-3 max-w-xl">
          <div className="flex items-center gap-2">
            <LetterStatusBadge status={request.status} />
            <span className="text-[12px] font-semibold text-slate-600">
              This request was already {request.status === 'Issued' ? 'approved' : request.status.toLowerCase()}
              {request.decidedBy ? ` by ${request.decidedBy}` : ''}
              {request.decidedAt ? ` on ${shortDate(request.decidedAt)}` : ''}.
            </span>
          </div>
          {request.rejectReason && <p className="text-[12px] font-semibold text-rose-600">Reason: {request.rejectReason}</p>}
          {request.status === 'Issued' && (
            <PortalButton variant="secondary" size="sm" icon={Eye} onClick={() => setViewing(true)}>
              View letter
            </PortalButton>
          )}
          {viewing && <LetterView letter={request} onClose={() => setViewing(false)} />}
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          <div className="xl:col-span-5 space-y-6">
            <section aria-labelledby="request-details-heading" className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-3xs space-y-4">
              <h2 id="request-details-heading" className="section-label">Request</h2>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[12px]">
                <dt className="font-semibold text-slate-400">Student</dt>
                <dd className="font-bold text-slate-800">{request.studentName} <span className="font-mono text-slate-500">({request.matricNumber})</span></dd>
                <dt className="font-semibold text-slate-400">Programme</dt>
                <dd className="font-semibold text-slate-700">{request.programName || '-'}</dd>
                <dt className="font-semibold text-slate-400">Letter</dt>
                <dd className="font-semibold text-slate-700">{request.templateName} <span className="text-slate-400">({request.letterType})</span></dd>
                <dt className="font-semibold text-slate-400">Requested</dt>
                <dd className="font-semibold text-slate-700">{shortDate(request.requestedAt)}</dd>
              </dl>
              {request.templateStatus && request.templateStatus !== 'Active' && (
                <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-500">
                  This template is now {request.templateStatus}. Approving still uses its current wording.
                </p>
              )}
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">Note from the student</p>
                {request.note ? (
                  <blockquote className="rounded-xl border-l-4 border-indigo-300 bg-indigo-50/50 px-4 py-3 text-[12px] font-semibold text-slate-700 whitespace-pre-line">
                    {request.note}
                  </blockquote>
                ) : (
                  <p className="text-[12px] font-semibold text-slate-400">No note.</p>
                )}
              </div>
            </section>

            <section aria-labelledby="request-values-heading" className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-3xs space-y-4">
              <div>
                <h2 id="request-values-heading" className="section-label">Values in This Letter</h2>
                <p className="card-description mt-1">
                  {needed.length === 0
                    ? 'Everything comes from the student record. Check the preview, then approve.'
                    : `Type in the ${needed.length} value${needed.length === 1 ? '' : 's'} the portal does not hold. Record values come from the student registry.`}
                </p>
              </div>

              {request.problem && (
                <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[12px] font-semibold text-rose-700 flex items-start gap-2">
                  <AlertTriangle aria-hidden="true" className="w-4 h-4 shrink-0 mt-0.5" />
                  {request.problem}
                </p>
              )}

              <div className="space-y-3">
                {fields.length === 0 && <p className="text-[12px] font-semibold text-slate-400">This letter uses no student details.</p>}
                {fields.map((field) => (
                  <FieldRow key={field.name} field={field} value={values[field.name] ?? ''} error={errors[field.name]} disabled={busy} onChange={setValue} />
                ))}
              </div>

              <div className="pt-4 border-t border-slate-100 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                <PortalButton variant="danger" icon={XCircle} disabled={busy} onClick={() => { setReasonError(null); setRejecting(true); }}>
                  Reject
                </PortalButton>
                <PortalButton variant="primary" icon={Send} disabled={busy || Boolean(request.problem)} onClick={startApprove}>
                  Approve and issue
                </PortalButton>
              </div>
              {missingCount > 0 && !request.problem && (
                <p className="text-[11px] font-semibold text-slate-400 text-right">
                  {missingCount} value{missingCount === 1 ? '' : 's'} still to fill in.
                </p>
              )}
            </section>
          </div>

          <section aria-labelledby="request-preview-heading" className="xl:col-span-7 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-3xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="request-preview-heading" className="section-label">Letter Preview</h2>
              <span className="text-[10.5px] font-semibold text-slate-400 inline-flex items-center gap-1.5">
                <span className="inline-block w-2.5 h-2.5 rounded-sm bg-amber-200 border border-amber-300" /> still to fill in
              </span>
            </div>
            <div className="rounded-xl bg-slate-100/70 border border-slate-200 p-3 sm:p-4">
              <LetterPages
                reference={<span className="text-slate-400 italic font-sans">{PENDING_REFERENCE}</span>}
                referenceText={PENDING_REFERENCE}
                date={today}
                bodyHtml={previewHtml}
              />
            </div>
          </section>
        </div>
      )}

      <PortalConfirmModal
        isOpen={confirmApprove}
        title="Approve and issue this letter?"
        message={
          request
            ? `${request.templateName} for ${request.studentName} gets the next reference number and today's date. The student is notified and can print it straight away.`
            : ''
        }
        confirmLabel="Approve and issue"
        tone="info"
        icon={CheckCircle2}
        isLoading={approving}
        onConfirm={() => void approve()}
        onCancel={() => setConfirmApprove(false)}
      />

      <PortalConfirmModal
        isOpen={rejecting}
        title="Reject this request?"
        message={
          <div className="space-y-3 text-left">
            <p>{request ? `${request.studentName} is told the reason and can request the letter again.` : ''}</p>
            <label className="block">
              <span className="form-label block">Reason (shown to the student)</span>
              <textarea
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  setReasonError(null);
                }}
                maxLength={MAX_REASON_LENGTH}
                rows={3}
                placeholder="For example: your attendance this semester is below 80%. Please see the office."
                className={`form-control form-control-sm resize-none ${reasonError ? 'form-control-error' : ''}`}
              />
            </label>
            {reasonError && <p role="alert" className="text-[11px] font-semibold text-rose-600">{reasonError}</p>}
          </div>
        }
        confirmLabel="Reject request"
        tone="danger"
        isLoading={rejectSaving}
        onConfirm={() => void reject()}
        onCancel={() => setRejecting(false)}
      />
    </RecordPage>
  );
};

const FieldRow: React.FC<{
  field: LetterRequestField;
  value: string;
  error?: string;
  disabled: boolean;
  onChange: (name: string, value: string) => void;
}> = ({ field, value, error, disabled, onChange }) => {
  const id = `letter-value-${field.name}`;
  const fromOffice = field.source === 'office';
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={field.needed ? id : undefined} className="text-[11.5px] font-extrabold text-slate-700">
          {field.label}
        </label>
        <StatusBadge tone={fromOffice ? 'warning' : field.needed ? 'danger' : 'neutral'} className="px-2 py-0.5 text-[8.5px]">
          {fromOffice ? 'Office fills in' : field.needed ? 'Missing from record' : 'From record'}
        </StatusBadge>
      </div>
      {field.needed ? (
        <>
          <input
            id={id}
            type="text"
            value={value}
            maxLength={MAX_VALUE_LENGTH}
            disabled={disabled}
            onChange={(e) => onChange(field.name, e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={`${id}-hint`}
            className={`form-control form-control-sm ${error ? 'form-control-error' : ''}`}
          />
          <p id={`${id}-hint`} className={`text-[10.5px] font-semibold ${error ? 'text-rose-600' : 'text-slate-400'}`}>
            {error || (fromOffice ? field.hint : "The student's record has no value for this. What you type is used on this letter only.")}
          </p>
        </>
      ) : (
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[12px] font-semibold text-slate-700">{field.value}</p>
      )}
    </div>
  );
};
