/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { CheckCircle2, Download } from 'lucide-react';
import type { DocumentDetail } from '../types';
import { deleteDocument, downloadDocument, getDocument } from '../services/filesApi';
import { APP_ROUTES } from '../constants/routes';
import { shortDocumentDate, studentsLine } from '../utils/documentDisplay';
import { PortalButton, PortalConfirmModal, PortalToast } from './PortalPrimitives';
import { RecordPage } from './RecordPage';
import { ErrorState, LoadingState } from './StateViews';
import { OverflowMenu, type MenuAction } from './DocumentParts';
import { DocumentPreview } from './DocumentPreview';

const errorText = (err: unknown, fallback: string) => (err instanceof Error && err.message ? err.message : fallback);

interface DocumentPageProps {
  documentId: string;
  isStudent: boolean;
  onBack: () => void;
}

const Fact: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <dt className="text-[12px] text-slate-500">{label}</dt>
    <dd className="mt-0.5 text-[14px] font-semibold text-slate-800">{children}</dd>
  </div>
);

export const DocumentPage: React.FC<DocumentPageProps> = ({ documentId, isStudent, onBack }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [document, setDocument] = useState<DocumentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const uploadedReference = typeof location.state?.uploadedReference === 'string' ? location.state.uploadedReference : '';
  const from = typeof location.state?.from === 'string' ? location.state.from : '';
  const listLabel = isStudent ? 'File Submission' : 'Files';

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getDocument(documentId)
      .then(found => !cancelled && setDocument(found))
      .catch(err => !cancelled && setError(errorText(err, 'Could not open this file.')))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [documentId, reload]);

  const back = () => (from ? navigate(from) : onBack());

  const download = async (version?: number) => {
    if (!document) return;
    setBusy(`download:${version ?? 'current'}`);
    try {
      await downloadDocument(document, version);
    } catch (err) {
      setToast(errorText(err, 'Could not download this file.'));
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    if (!document) return;
    setBusy('delete');
    try {
      await deleteDocument(document.id);
      navigate(from || APP_ROUTES.files, { replace: true, state: { message: `Deleted "${document.title}".` } });
    } catch (err) {
      setConfirmDelete(false);
      setToast(errorText(err, 'Could not delete this file.'));
    } finally {
      setBusy(null);
    }
  };

  const menu: MenuAction[] = document?.permissions.canDelete
    ? [{ label: 'Delete', danger: true, onSelect: () => setConfirmDelete(true) }]
    : [];
  const who = document ? studentsLine(document.students) : null;
  const subtitle = document
    ? [document.type.label, document.isStaffFile ? 'Staff file' : who?.main, `uploaded ${shortDocumentDate(document.uploadedAt)}`].filter(Boolean).join(' · ')
    : undefined;

  return (
    <RecordPage
      title={document?.title ?? 'File'}
      subtitle={subtitle}
      backLabel={`Back to ${listLabel}`}
      onBack={back}
      actions={document ? (
        <div className="flex items-center gap-2">
          <PortalButton icon={Download} isLoading={busy === 'download:current'} onClick={() => void download()}>Download</PortalButton>
          <OverflowMenu label="More actions" actions={menu} />
        </div>
      ) : undefined}
    >
      {loading ? (
        <LoadingState message="Opening the file..." />
      ) : error || !document ? (
        <ErrorState message={error ?? 'This file isn’t available to you.'} onRetry={() => setReload(value => value + 1)} />
      ) : (
        <div className="space-y-5">
          {uploadedReference && (
            <div role="status" className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-[14px] font-semibold text-emerald-900">
              <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
              Uploaded. The reference is {uploadedReference}.
            </div>
          )}
          {document.checkStatus === 'RETURNED' && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4">
              <p className="text-[15px] font-extrabold text-rose-800">Returned by the PG office</p>
              <p className="mt-1 text-[14px] text-rose-800">"{document.checkReason}"{document.checkedBy ? ` ${document.checkedBy}, ${shortDocumentDate(document.checkedAt)}` : ''}</p>
            </div>
          )}
          {document.checkStatus === 'WAITING' && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
              <p className="text-[15px] font-extrabold text-amber-900">{document.permissions.canCheck ? 'Waiting for you to check' : 'Waiting for the PG office to check it'}</p>
            </div>
          )}

          <div className="grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <DocumentPreview document={document} />

            <div className="space-y-5">
              <section aria-label="Details" className="app-card space-y-4 p-5">
                <h2 className="section-label">Details</h2>
                <dl className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <dt className="text-[12px] text-slate-500">{document.isStaffFile ? 'Staff file' : document.students.length > 1 ? 'Students' : 'Student'}</dt>
                    <dd className="mt-0.5 space-y-1 text-[14px] font-semibold text-slate-800">
                      {document.isStaffFile ? (
                        <span>{document.staffAudienceLabel}{document.staffProgrammes.length ? `, ${document.staffProgrammes.join(', ')}` : ''}</span>
                      ) : document.students.map(student => (
                        <span key={student.matric} className="block">
                          {isStudent ? student.name : (
                            <Link to={`${APP_ROUTES.files}?student=${encodeURIComponent(student.matric)}`} className="underline decoration-slate-300 underline-offset-4 hover:decoration-brand-navy">{student.name}</Link>
                          )}
                          <span className="font-normal text-slate-500">, {student.matric}</span>
                        </span>
                      ))}
                    </dd>
                  </div>
                  <Fact label="Type">{document.type.label}</Fact>
                  <Fact label="Semester">{document.semester?.label ?? 'Not linked'}</Fact>
                  <Fact label="Tags">{document.tags.length ? document.tags.map(tag => `#${tag}`).join('  ') : 'None'}</Fact>
                  <Fact label="Reference">{document.reference}</Fact>
                  <Fact label="Uploaded by">{document.uploadedBy.isMe ? 'You' : `${document.uploadedBy.name} (${document.uploadedBy.roleLabel.toLowerCase()})`}</Fact>
                  {document.description && <div className="sm:col-span-2"><Fact label="Note">{document.description}</Fact></div>}
                </dl>
              </section>

              <section aria-label="Shared with" className="app-card space-y-3 p-5">
                <h2 className="section-label">Shared with</h2>
                <ul className="space-y-2 text-[14px] text-slate-800">
                  {document.sharedWith.map(person => (
                    <li key={`${person.name}-${person.role}`}>
                      {person.name}{person.role && person.role !== 'always' ? <span className="text-slate-500"> ({person.role})</span> : null}
                    </li>
                  ))}
                </ul>
                {!document.isStaffFile && <p className="text-[12px] text-slate-500">{isStudent ? 'You always see your own uploads.' : 'Students see only the files they upload themselves.'}</p>}
              </section>

              {document.versions.length > 1 && (
                <section aria-label="Versions" className="app-card space-y-3 p-5">
                  <h2 className="section-label">Versions</h2>
                  <ul className="space-y-2">
                    {document.versions.map((version, index) => (
                      <li key={version.number} className="flex items-center justify-between gap-3 text-[14px]">
                        <span className="font-semibold text-slate-800">Version {version.number}{index === 0 ? ' (current)' : ''}</span>
                        <span className="flex items-center gap-3 text-slate-500">
                          {shortDocumentDate(version.uploadedAt)}
                          <button type="button" className="font-bold text-blue-700 hover:text-blue-900" onClick={() => void download(version.number)}>Download</button>
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          </div>
        </div>
      )}
      <PortalConfirmModal
        isOpen={confirmDelete}
        title={`Delete "${document?.title ?? 'this file'}"?`}
        message="It will be gone for everyone who can see it, including older versions. This cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Keep it"
        tone="danger"
        isLoading={busy === 'delete'}
        onConfirm={() => void remove()}
        onCancel={() => setConfirmDelete(false)}
      />
      <PortalToast message={toast} tone="danger" onClose={() => setToast(null)} />
    </RecordPage>
  );
};
