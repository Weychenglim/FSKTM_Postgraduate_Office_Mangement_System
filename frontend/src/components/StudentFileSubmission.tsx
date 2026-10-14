/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { Plus } from 'lucide-react';
import type { GeneratedLetter, PortalDocument } from '../types';
import { deleteDocument, downloadDocument, getDocuments } from '../services/filesApi';
import { getMyLetterRequests } from '../services/lettersApi';
import { APP_ROUTES, routeForDocument } from '../constants/routes';
import { shortDocumentDate } from '../utils/documentDisplay';
import { PageHeader, PortalButton, PortalConfirmModal, PortalToast } from './PortalPrimitives';
import { EmptyState, ErrorState, LoadingState } from './StateViews';
import { CheckChip, KindBadge, OverflowMenu } from './DocumentParts';
import { LetterView, useLetterOutput } from './IssuedLetters';

const errorText = (err: unknown, fallback: string) => (err instanceof Error && err.message ? err.message : fallback);

export const StudentFileSubmission: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [files, setFiles] = useState<PortalDocument[]>([]);
  const [letters, setLetters] = useState<GeneratedLetter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lettersError, setLettersError] = useState(false);
  const [reload, setReload] = useState(0);
  const [deleting, setDeleting] = useState<PortalDocument | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'danger' } | null>(
    typeof location.state?.message === 'string' ? { message: location.state.message, tone: 'success' } : null,
  );
  const showError = useCallback((message: string) => setToast({ message, tone: 'danger' }), []);
  const { viewLetter, printLetter, downloadPdf, isBusy, viewing, closeView } = useLetterOutput(showError);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getDocuments({ view: 'all' }, 0, 100)
      .then(page => !cancelled && setFiles(page.results))
      .catch(err => !cancelled && setError(errorText(err, 'Could not load your files.')))
      .finally(() => !cancelled && setLoading(false));
    getMyLetterRequests()
      .then(found => {
        if (cancelled) return;
        setLetters(found.filter(letter => letter.status === 'Issued'));
        setLettersError(false);
      })
      .catch(() => !cancelled && setLettersError(true));
    return () => {
      cancelled = true;
    };
  }, [reload]);

  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await deleteDocument(deleting.id);
      setFiles(current => current.filter(file => file.id !== deleting.id));
      setToast({ message: `Deleted "${deleting.title}".`, tone: 'success' });
      setDeleting(null);
    } catch (err) {
      setDeleting(null);
      showError(errorText(err, 'Could not delete this file.'));
    } finally {
      setBusy(false);
    }
  };

  const download = async (file: PortalDocument) => {
    try {
      await downloadDocument(file);
    } catch (err) {
      showError(errorText(err, 'Could not download this file.'));
    }
  };

  const returned = files.filter(file => file.checkStatus === 'RETURNED');
  const from = `${location.pathname}${location.search}`;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="File Submission"
        subtitle="Upload your documents for the PG office."
        actions={<PortalButton variant="primary" icon={Plus} onClick={() => navigate(APP_ROUTES.filesUpload)}>Upload a file</PortalButton>}
      />

      {returned.length > 0 && (
        <section aria-labelledby="todo-title" className="app-card px-5 pb-2 pt-5">
          <h2 id="todo-title" className="section-label pb-3">To do</h2>
          {returned.map(file => (
            <div key={file.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 py-4">
              <div className="min-w-0">
                <p className="text-[14px] font-bold text-slate-800">Your {file.title} was returned</p>
                <p className="text-[13px] text-rose-700">"{file.checkReason}"{file.checkedBy ? ` ${file.checkedBy}, PG office` : ''}</p>
              </div>
              <PortalButton size="sm" onClick={() => navigate(routeForDocument(file.id), { state: { from } })}>Open</PortalButton>
            </div>
          ))}
        </section>
      )}

      <section aria-labelledby="files-title" className="app-card">
        <h2 id="files-title" className="section-label px-5 pb-3 pt-5">My files</h2>
        {loading ? (
          <LoadingState message="Loading your files..." />
        ) : error ? (
          <ErrorState message={error} onRetry={() => setReload(value => value + 1)} />
        ) : !files.length ? (
          <EmptyState
            title="You have not uploaded any files yet."
            description="Upload forms, your thesis, letters and other documents for the PG office."
            actionLabel="Upload a file"
            onAction={() => navigate(APP_ROUTES.filesUpload)}
          />
        ) : (
          <ul>
            {files.map(file => (
              <li key={file.id} className="flex items-center gap-3 border-t border-slate-100 px-5 py-4">
                <KindBadge kind={file.file?.kind} />
                <div className="min-w-0 flex-1">
                  <Link to={routeForDocument(file.id)} state={{ from }} className="block truncate text-[14px] font-bold text-brand-navy hover:underline">{file.title}</Link>
                  <p className="truncate text-[12px] text-slate-500">{file.type.label} · {shortDocumentDate(file.uploadedAt)}</p>
                </div>
                <CheckChip status={file.checkStatus} />
                <OverflowMenu
                  label={`Actions for ${file.title}`}
                  actions={[
                    { label: 'Open', onSelect: () => navigate(routeForDocument(file.id), { state: { from } }) },
                    { label: 'Download', onSelect: () => void download(file) },
                    { label: 'Delete', danger: true, onSelect: () => setDeleting(file) },
                  ]}
                />
              </li>
            ))}
          </ul>
        )}
        {!loading && !error && files.length > 0 && (
          <p className="border-t border-slate-100 px-5 py-4 text-[12px] text-slate-500">Only you, the PG office and the staff shown on each file can see your files.</p>
        )}
      </section>

      <section aria-labelledby="letters-title" className="app-card px-5 pb-2 pt-5">
        <h2 id="letters-title" className="section-label">Letters from the office</h2>
        <p className="pb-3 text-[12px] text-slate-500">Letters you requested and the office approved. Requests still waiting are in Letter Generation.</p>
        {lettersError ? (
          <p className="border-t border-slate-100 py-4 text-[13px] text-slate-600">Could not load your letters. <button type="button" className="font-bold text-blue-700" onClick={() => setReload(value => value + 1)}>Try again</button></p>
        ) : !letters.length ? (
          <p className="border-t border-slate-100 py-4 text-[13px] text-slate-600">No approved letters yet. <Link to={APP_ROUTES.letters} className="font-bold text-blue-700">Request a letter</Link></p>
        ) : (
          letters.map(letter => (
            <div key={letter.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 py-4">
              <div className="min-w-0">
                <p className="text-[14px] font-bold text-slate-800">{letter.templateName}</p>
                <p className="text-[12px] text-slate-500">{letter.referenceNumber} · approved {shortDocumentDate(letter.decidedAt ?? letter.issuedAt)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <PortalButton size="sm" isLoading={isBusy(letter, 'view')} onClick={() => void viewLetter(letter)}>View</PortalButton>
                <PortalButton size="sm" isLoading={isBusy(letter, 'print')} onClick={() => void printLetter(letter)}>Print</PortalButton>
                <PortalButton size="sm" isLoading={isBusy(letter, 'pdf')} onClick={() => void downloadPdf(letter)}>Download</PortalButton>
              </div>
            </div>
          ))
        )}
      </section>

      {viewing && <LetterView letter={viewing} onClose={closeView} />}
      <PortalConfirmModal
        isOpen={deleting !== null}
        title={`Delete "${deleting?.title ?? ''}"?`}
        message="It will be gone for everyone, including older versions. This cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Keep it"
        tone="danger"
        isLoading={busy}
        onConfirm={() => void remove()}
        onCancel={() => setDeleting(null)}
      />
      <PortalToast message={toast?.message ?? null} tone={toast?.tone ?? 'success'} onClose={() => setToast(null)} />
    </div>
  );
};
