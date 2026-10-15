/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import type { DocumentDetail } from '../types';
import { getDocumentPreview, getPreviewPage, type DocumentPreviewInfo } from '../services/filesApi';
import { clampPage, PreviewPageCache } from '../utils/documentPreview';
import { formatFileSize } from '../utils/documentDisplay';
import { THIN_SCROLLBAR } from '../utils/scrollbar';
import { KindBadge } from './DocumentParts';

/** The file inside the portal: PDF pages and images as pictures, Word files as text. */
export const DocumentPreview: React.FC<{ document: DocumentDetail }> = ({ document }) => {
  const version = document.file?.number;
  const [info, setInfo] = useState<DocumentPreviewInfo | null>(null);
  const [page, setPage] = useState(1);
  const [picture, setPicture] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [loadingPage, setLoadingPage] = useState(false);
  const cache = useRef(new PreviewPageCache());

  useEffect(() => {
    let cancelled = false;
    setInfo(null);
    setProblem(null);
    setPage(1);
    getDocumentPreview(document.id, version)
      .then(found => !cancelled && setInfo(found))
      .catch(err => !cancelled && setProblem(err instanceof Error ? err.message : 'Could not show this file.'));
    return () => {
      cancelled = true;
    };
  }, [document.id, version]);

  useEffect(() => {
    if (!info?.available || !info.pageCount) return;
    const key = `${document.id}:${version}:${page}`;
    const cached = cache.current.get(key);
    if (cached) {
      setPicture(cached);
      return;
    }
    let cancelled = false;
    setLoadingPage(true);
    getPreviewPage(document.id, page, version)
      .then(url => {
        if (cancelled) return;
        cache.current.set(key, url);
        setPicture(url);
      })
      .catch(err => !cancelled && setProblem(err instanceof Error ? err.message : 'Could not show this page.'))
      .finally(() => !cancelled && setLoadingPage(false));
    return () => {
      cancelled = true;
    };
  }, [info, page, document.id, version]);

  const fileLine = [document.file ? formatFileSize(document.file.size) : '', document.file?.name ?? ''].filter(Boolean).join(' · ');

  if (problem || (info && !info.available)) {
    return (
      <section aria-label="The file" className="app-card flex flex-col items-center justify-center gap-4 px-6 py-14 text-center">
        <KindBadge kind={document.file?.kind} size="lg" />
        <p className="max-w-sm text-[14px] font-semibold text-slate-700">{problem ?? info?.reason}</p>
        <p className="break-all text-[12px] text-slate-500">{fileLine}</p>
      </section>
    );
  }

  if (!info) {
    return (
      <section aria-label="The file" className="app-card flex min-h-[24rem] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" aria-label="Opening the preview" />
      </section>
    );
  }

  if (info.kind === 'DOCX') {
    return (
      <section aria-label="The file" className="app-card overflow-hidden">
        <div className={`max-h-[70vh] overflow-y-auto whitespace-pre-wrap px-6 py-6 text-[14px] leading-relaxed text-slate-800 ${THIN_SCROLLBAR}`}>
          {info.text || 'This file has no text to show.'}
          {info.truncated && <p className="mt-4 font-semibold text-slate-500">The rest of the text is in the file.</p>}
        </div>
        <p className="border-t border-slate-100 px-6 py-3 text-[12px] text-slate-500">Formatting is not shown. Download the file to see it as written.</p>
      </section>
    );
  }

  const pageCount = Math.max(info.pageCount, 1);
  const go = (next: number) => setPage(clampPage(next, pageCount));
  return (
    <section
      aria-label="The file"
      tabIndex={0}
      className="app-card overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy/30"
      onKeyDown={event => {
        if (event.key === 'ArrowRight') go(page + 1);
        if (event.key === 'ArrowLeft') go(page - 1);
      }}
    >
      <div className="relative flex min-h-[24rem] justify-center bg-slate-100 p-4 sm:p-6">
        {picture ? (
          <img src={picture} alt={`Page ${page} of ${document.title}`} className="h-auto w-full max-w-[820px] bg-white shadow-md" />
        ) : (
          <Loader2 className="my-auto h-6 w-6 animate-spin text-slate-400" aria-hidden="true" />
        )}
        {loadingPage && picture && <span className="absolute right-4 top-4 rounded-full bg-white/90 px-3 py-1 text-[12px] font-semibold text-slate-600 shadow-sm">Loading page...</span>}
      </div>
      {pageCount > 1 && (
        <div className="flex items-center justify-center gap-3 border-t border-slate-100 px-4 py-3">
          <button type="button" className="icon-button h-10 w-10 disabled:opacity-40" aria-label="Previous page" disabled={page <= 1} onClick={() => go(page - 1)}>
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <span className="min-w-[7rem] text-center text-[13px] font-semibold text-slate-700" aria-live="polite">Page {page} of {pageCount}</span>
          <button type="button" className="icon-button h-10 w-10 disabled:opacity-40" aria-label="Next page" disabled={page >= pageCount} onClick={() => go(page + 1)}>
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </section>
  );
};
