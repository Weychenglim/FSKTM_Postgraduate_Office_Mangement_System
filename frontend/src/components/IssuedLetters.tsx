/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Issued letters (UC23): the student's "My Letters" list and the office
// register. Both reprint from the saved letter, so a copy always carries the
// original reference number and date.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Eye, FileDown, Printer, Search, X } from 'lucide-react';
import { PortalButton, StatusBadge } from './PortalPrimitives';
import { PortalModal, useModalTitle } from './PortalModal';
import { LoadingState, ErrorState } from './StateViews';
import { GeneratedLetter, GeneratedLetterStatus } from '../types';
import { downloadLetterPdf, getIssuedLetter, getIssuedLetters } from '../services';
import {
  LETTERHEAD,
  letterDataFromIssued,
  openLetterWindow,
  printLetterInWindow,
  renderLetterBodyHtml,
} from '../utils/letterDocument';
import { THIN_SCROLLBAR } from '../utils/scrollbar';

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

/** The letter as it was issued, on an A4 sheet like the printed copy. Read only. */
const IssuedLetterView: React.FC<{ letter: GeneratedLetter; onClose: () => void }> = ({ letter, onClose }) => {
  const titleId = useModalTitle();
  return (
    <PortalModal isOpen onClose={onClose} labelledBy={titleId} className="max-w-3xl p-0">
      <div className="drawer-header">
        <div className="min-w-0">
          <h2 id={titleId} className="section-label truncate">{letter.templateName}</h2>
          <p className="mt-0.5 text-[11px] font-semibold text-slate-500 truncate">
            <span className="font-mono">{letter.referenceNumber}</span>
            {' · '}
            {letter.studentName || 'Unknown student'}
            {letter.matricNumber ? ` (${letter.matricNumber})` : ''}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <LetterStatusBadge status={letter.status} />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 inline-flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-brand-navy transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className={`max-h-[70dvh] overflow-y-auto bg-slate-100/70 p-4 sm:p-6 space-y-4 ${THIN_SCROLLBAR}`}>
        {letter.status === 'Revoked' && (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[11px] font-semibold text-rose-700">
            This letter was revoked{letter.revokeReason ? `: ${letter.revokeReason}` : '.'} It is no longer valid.
          </p>
        )}

        <article className="bg-white border border-slate-200 rounded shadow-sm p-6 sm:p-10 text-left text-[12px] text-slate-700 leading-relaxed font-sans mx-auto max-w-2xl">
          <div className="border-b-2 border-double border-slate-800 pb-3 mb-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img src={LETTERHEAD.logoPath} alt="Universiti Malaya" className="h-12 w-auto object-contain" />
              <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wide leading-tight block max-w-[130px]">
                {LETTERHEAD.faculty}
              </span>
            </div>
            <div className="text-right text-[8px] font-bold text-slate-400 leading-relaxed max-w-[200px]">
              {LETTERHEAD.addressLines.map((line) => (
                <span key={line} className="block">{line}</span>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap justify-between items-baseline gap-x-4 gap-y-1 text-slate-600 mb-5">
            <div>Our Ref: <span className="font-mono font-bold text-slate-800">{letter.referenceNumber}</span></div>
            <div>Date: <span className="font-bold text-slate-800">{letter.date}</span></div>
          </div>

          {letter.content?.trim() ? (
            <div className="leading-relaxed" dangerouslySetInnerHTML={{ __html: renderLetterBodyHtml(letter.content) }} />
          ) : (
            <p className="text-slate-400 italic">This letter has no text.</p>
          )}

          <p className="text-slate-500 font-semibold text-[10px] leading-relaxed mt-5">{LETTERHEAD.disclaimer}</p>

          <div className="mt-8 pt-6 border-t border-slate-100 space-y-1">
            <div className="w-24 border-b border-slate-400 h-6" />
            <p className="font-extrabold text-slate-950">{LETTERHEAD.signatoryName}</p>
            <p className="text-slate-400 uppercase tracking-wide text-[9px] font-black leading-none">{LETTERHEAD.signatoryOffice}</p>
          </div>
        </article>
      </div>

      <div className="drawer-footer">
        <PortalButton variant="secondary" onClick={onClose}>Close</PortalButton>
      </div>
    </PortalModal>
  );
};

interface IssuedLettersRegisterProps {
  onMessage: (message: string) => void;
}

/** Office register of every issued letter: search, filter and view each one. */
export const IssuedLettersRegister: React.FC<IssuedLettersRegisterProps> = ({ onMessage }) => {
  const [letters, setLetters] = useState<GeneratedLetter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [statusFilter, setStatusFilter] = useState<GeneratedLetterStatus | ''>('');
  const [opening, setOpening] = useState<string | null>(null);
  const [viewing, setViewing] = useState<GeneratedLetter | null>(null);
  const latestLoad = useRef(0);

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

  // The register rows carry no letter text, so the full letter is fetched first.
  const viewLetter = async (letter: GeneratedLetter) => {
    setOpening(letter.id);
    try {
      setViewing(letter.content === undefined ? await getIssuedLetter(letter.id) : letter);
    } catch (err) {
      onMessage(errorText(err, 'Could not open this letter.'));
    } finally {
      setOpening(null);
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
                      <PortalButton
                        variant="secondary"
                        size="sm"
                        icon={Eye}
                        isLoading={opening === letter.id}
                        aria-label={`View ${letter.referenceNumber}`}
                        onClick={() => void viewLetter(letter)}
                      >
                        View
                      </PortalButton>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {viewing && <IssuedLetterView letter={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
};
