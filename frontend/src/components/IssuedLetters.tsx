/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Issued letters (UC23): the student's "My Letters" list and the office
// register. Both reprint from the saved letter, so a copy always carries the
// original reference number and date.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Ban, FileDown, Printer, Search, Send } from 'lucide-react';
import { PortalButton, PortalConfirmModal, StatusBadge } from './PortalPrimitives';
import { LoadingState, ErrorState } from './StateViews';
import { GeneratedLetter, GeneratedLetterStatus } from '../types';
import {
  downloadLetterPdf,
  fieldErrors,
  getIssuedLetter,
  getIssuedLetters,
  resendLetterNotification,
  revokeLetter,
} from '../services';
import { letterDataFromIssued, openLetterWindow, printLetterInWindow } from '../utils/letterDocument';

type OutputAction = 'print' | 'pdf';

const errorText = (err: unknown, fallback: string) => (err instanceof Error ? err.message : fallback);

/** Print and PDF download for saved letters, with a per-row busy flag. */
function useLetterOutput(onMessage: (message: string) => void) {
  const [busy, setBusy] = useState<string | null>(null);

  const printLetter = async (letter: GeneratedLetter) => {
    // Opened during the click so pop-up blockers allow it; filled once loaded.
    const win = openLetterWindow();
    if (!win) {
      onMessage('Please allow pop-ups for this site to print the letter.');
      return;
    }
    setBusy(`${letter.id}:print`);
    try {
      const full = letter.content === undefined ? await getIssuedLetter(letter.id) : letter;
      printLetterInWindow(win, letterDataFromIssued(full));
    } catch (err) {
      win.close();
      onMessage(errorText(err, 'Could not open this letter.'));
    } finally {
      setBusy(null);
    }
  };

  const downloadPdf = async (letter: GeneratedLetter) => {
    setBusy(`${letter.id}:pdf`);
    try {
      await downloadLetterPdf(letter);
    } catch (err) {
      onMessage(errorText(err, 'Could not download the PDF.'));
    } finally {
      setBusy(null);
    }
  };

  const isBusy = (letter: GeneratedLetter, action: OutputAction) => busy === `${letter.id}:${action}`;
  return { printLetter, downloadPdf, isBusy };
}

const LetterStatusBadge: React.FC<{ status: GeneratedLetterStatus }> = ({ status }) => (
  <StatusBadge tone={status === 'Issued' ? 'success' : 'danger'} className="px-2 py-0.5 text-[9px] rounded-md">
    {status}
  </StatusBadge>
);

const RevokedNote: React.FC<{ letter: GeneratedLetter }> = ({ letter }) =>
  letter.status === 'Revoked' && letter.revokeReason ? (
    <p className="mt-1 text-[10px] font-semibold text-rose-600 leading-snug max-w-[220px]">
      Reason: {letter.revokeReason}
    </p>
  ) : null;

const TableMessage: React.FC<{ colSpan: number; children: React.ReactNode }> = ({ colSpan, children }) => (
  <tr>
    <td colSpan={colSpan} className="px-5 py-12 text-center text-slate-400 font-semibold">
      {children}
    </td>
  </tr>
);

interface StudentLetterHistoryProps {
  letters: GeneratedLetter[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onMessage: (message: string) => void;
}

/** The signed-in student's own letters, with reprint and PDF download. */
export const StudentLetterHistory: React.FC<StudentLetterHistoryProps> = ({
  letters,
  loading,
  error,
  onRetry,
  onMessage,
}) => {
  const { printLetter, downloadPdf, isBusy } = useLetterOutput(onMessage);

  return (
    <div id="student-letter-history" className="bg-white border border-slate-200/80 rounded-2xl shadow-3xs overflow-hidden">
      <div className="px-5 pt-5 pb-3 flex items-center justify-between gap-3">
        <h2 className="section-label">My Letters</h2>
        <span className="text-[11px] font-semibold text-slate-400">
          {letters.length} letter{letters.length === 1 ? '' : 's'}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="data-table text-xs">
          <thead>
            <tr className="data-thead bg-[#f8fafc]">
              <th className="data-th">Reference</th>
              <th className="data-th">Letter</th>
              <th className="data-th">Issued</th>
              <th className="data-th">Status</th>
              <th className="data-th text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={5} className="p-0"><LoadingState message="Loading your letters…" /></td></tr>
            ) : error ? (
              <tr><td colSpan={5} className="p-0"><ErrorState message={error} onRetry={onRetry} /></td></tr>
            ) : letters.length === 0 ? (
              <TableMessage colSpan={5}>
                You have not generated any letters yet. Letters you generate are kept here so you can print them again.
              </TableMessage>
            ) : (
              letters.map((letter) => (
                <tr key={letter.id} className="hover:bg-slate-50/50 transition">
                  <td className="data-td-strong font-mono whitespace-nowrap">{letter.referenceNumber}</td>
                  <td className="data-td">
                    <span className="block font-bold text-slate-800">{letter.templateName}</span>
                    <span className="block text-[10px] text-slate-400">{letter.letterType}</span>
                  </td>
                  <td className="data-td whitespace-nowrap">{letter.date}</td>
                  <td className="data-td">
                    <LetterStatusBadge status={letter.status} />
                    <RevokedNote letter={letter} />
                  </td>
                  <td className="data-td text-right">
                    {letter.status === 'Issued' && (
                      <div className="inline-flex gap-2">
                        <PortalButton variant="secondary" size="sm" icon={Printer} isLoading={isBusy(letter, 'print')} onClick={() => void printLetter(letter)}>
                          Print
                        </PortalButton>
                        <PortalButton variant="secondary" size="sm" icon={FileDown} isLoading={isBusy(letter, 'pdf')} onClick={() => void downloadPdf(letter)}>
                          PDF
                        </PortalButton>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

interface IssuedLettersRegisterProps {
  onMessage: (message: string) => void;
}

/** Office register of every issued letter: search, reprint, resend, revoke. */
export const IssuedLettersRegister: React.FC<IssuedLettersRegisterProps> = ({ onMessage }) => {
  const [letters, setLetters] = useState<GeneratedLetter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [statusFilter, setStatusFilter] = useState<GeneratedLetterStatus | ''>('');
  const [resending, setResending] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<GeneratedLetter | null>(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [revokeError, setRevokeError] = useState<string | null>(null);
  const [revokeSaving, setRevokeSaving] = useState(false);
  const latestLoad = useRef(0);
  const { printLetter, downloadPdf, isBusy } = useLetterOutput(onMessage);

  const load = useCallback(() => {
    const loadId = ++latestLoad.current;
    setLoading(true);
    setError(null);
    getIssuedLetters({ search, from, to, status: statusFilter })
      .then((rows) => {
        if (loadId === latestLoad.current) setLetters(rows);
      })
      .catch((err) => {
        if (loadId === latestLoad.current) setError(errorText(err, 'Failed to load issued letters.'));
      })
      .finally(() => {
        if (loadId === latestLoad.current) setLoading(false);
      });
  }, [search, from, to, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
  }, [load]);

  const handleResend = async (letter: GeneratedLetter) => {
    setResending(letter.id);
    try {
      onMessage(await resendLetterNotification(letter.id));
    } catch (err) {
      onMessage(errorText(err, 'Could not resend the notification.'));
    } finally {
      setResending(null);
    }
  };

  const openRevoke = (letter: GeneratedLetter) => {
    setRevoking(letter);
    setRevokeReason('');
    setRevokeError(null);
  };

  const confirmRevoke = async () => {
    if (!revoking) return;
    if (!revokeReason.trim()) {
      setRevokeError('Give a reason for revoking this letter. The student will see it.');
      return;
    }
    setRevokeSaving(true);
    try {
      const updated = await revokeLetter(revoking.id, revokeReason.trim());
      setLetters((current) => current.map((row) => (row.id === updated.id ? { ...row, ...updated } : row)));
      onMessage(`Letter ${updated.referenceNumber} was revoked. The student has been notified.`);
      setRevoking(null);
    } catch (err) {
      setRevokeError(fieldErrors(err).reason ?? errorText(err, 'Could not revoke this letter.'));
    } finally {
      setRevokeSaving(false);
    }
  };

  const filtersActive = Boolean(search || from || to || statusFilter);

  return (
    <div id="issued-letters-register" className="space-y-6">
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-3xs grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
        <label className="md:col-span-5 block">
          <span className="form-label block">Search</span>
          <span className="relative block">
            <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-3.5 h-3.5" />
            </span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Student name, matric number or reference"
              className="form-control form-control-sm pl-9"
            />
          </span>
        </label>
        <label className="md:col-span-2 block">
          <span className="form-label block">Issued from</span>
          <input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} className="form-control form-control-sm" />
        </label>
        <label className="md:col-span-2 block">
          <span className="form-label block">Issued to</span>
          <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className="form-control form-control-sm" />
        </label>
        <label className="md:col-span-2 block">
          <span className="form-label block">Status</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as GeneratedLetterStatus | '')}
            className="form-control form-control-sm"
          >
            <option value="">All</option>
            <option value="Issued">Issued</option>
            <option value="Revoked">Revoked</option>
          </select>
        </label>
        <div className="md:col-span-1">
          <PortalButton
            variant="ghost"
            size="md"
            disabled={!filtersActive}
            onClick={() => { setSearch(''); setFrom(''); setTo(''); setStatusFilter(''); }}
            className="w-full"
          >
            Reset
          </PortalButton>
        </div>
      </div>

      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-3xs overflow-hidden">
        <div className="px-5 pt-5 pb-3 flex items-center justify-between gap-3">
          <h2 className="section-label">Issued Letters</h2>
          <span className="text-[11px] font-semibold text-slate-400">
            {letters.length} letter{letters.length === 1 ? '' : 's'}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table text-xs">
            <thead>
              <tr className="data-thead bg-[#f8fafc]">
                <th className="data-th">Reference</th>
                <th className="data-th">Student</th>
                <th className="data-th">Letter</th>
                <th className="data-th">Issued</th>
                <th className="data-th">Status</th>
                <th className="data-th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && letters.length === 0 ? (
                <tr><td colSpan={6} className="p-0"><LoadingState message="Loading issued letters…" /></td></tr>
              ) : error ? (
                <tr><td colSpan={6} className="p-0"><ErrorState message={error} onRetry={load} /></td></tr>
              ) : letters.length === 0 ? (
                <TableMessage colSpan={6}>
                  {filtersActive ? 'No letters match these filters.' : 'No letters have been issued yet.'}
                </TableMessage>
              ) : (
                letters.map((letter) => (
                  <tr key={letter.id} className="hover:bg-slate-50/50 transition">
                    <td className="data-td-strong font-mono whitespace-nowrap">{letter.referenceNumber}</td>
                    <td className="data-td">
                      <span className="block font-bold text-slate-800">{letter.studentName || 'Unknown student'}</span>
                      <span className="block text-[10px] text-slate-400">{letter.matricNumber}</span>
                    </td>
                    <td className="data-td">
                      <span className="block font-bold text-slate-800">{letter.templateName}</span>
                      <span className="block text-[10px] text-slate-400">{letter.letterType}</span>
                    </td>
                    <td className="data-td whitespace-nowrap">{letter.date}</td>
                    <td className="data-td">
                      <LetterStatusBadge status={letter.status} />
                      <RevokedNote letter={letter} />
                    </td>
                    <td className="data-td text-right">
                      {letter.status === 'Issued' && (
                        <div className="inline-flex flex-wrap justify-end gap-2">
                          <PortalButton variant="secondary" size="sm" icon={Printer} isLoading={isBusy(letter, 'print')} onClick={() => void printLetter(letter)}>
                            Print
                          </PortalButton>
                          <PortalButton variant="secondary" size="sm" icon={FileDown} isLoading={isBusy(letter, 'pdf')} onClick={() => void downloadPdf(letter)}>
                            PDF
                          </PortalButton>
                          <PortalButton variant="soft" size="sm" icon={Send} isLoading={resending === letter.id} onClick={() => void handleResend(letter)}>
                            Resend
                          </PortalButton>
                          <PortalButton variant="danger" size="sm" icon={Ban} onClick={() => openRevoke(letter)}>
                            Revoke
                          </PortalButton>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <PortalConfirmModal
        isOpen={revoking !== null}
        title="Revoke this letter?"
        message={
          <div className="space-y-3 text-left">
            <p>
              {revoking ? `${revoking.referenceNumber} for ${revoking.studentName || 'this student'} will no longer be valid. ` : ''}
              The student keeps it in My Letters, marked revoked, and cannot print or download it again.
            </p>
            <label className="block">
              <span className="form-label block">Reason (shown to the student)</span>
              <textarea
                value={revokeReason}
                onChange={(e) => { setRevokeReason(e.target.value); setRevokeError(null); }}
                maxLength={500}
                rows={3}
                className={`form-control form-control-sm resize-none ${revokeError ? 'form-control-error' : ''}`}
              />
            </label>
            {revokeError && <p className="text-[11px] font-semibold text-rose-600">{revokeError}</p>}
          </div>
        }
        confirmLabel="Revoke Letter"
        tone="danger"
        isLoading={revokeSaving}
        onConfirm={() => void confirmRevoke()}
        onCancel={() => setRevoking(null)}
      />
    </div>
  );
};
