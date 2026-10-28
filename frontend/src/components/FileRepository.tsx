/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router';
import { ArrowLeft, Plus, Search, Settings2, SlidersHorizontal } from 'lucide-react';
import type { DocumentFilters, DocumentOptions, DocumentSummary, GeneratedLetter, PortalDocument, StudentFileHeader } from '../types';
import { downloadDocument, downloadDocumentsZip, getDocumentOptions, getDocuments, getDocumentSummary, getStudentFileHeader } from '../services/filesApi';
import { getReceivedLetters } from '../services/lettersApi';
import { APP_ROUTES, routeForDocument, routeForFileLetter } from '../constants/routes';
import { filtersFromParams, filtersToParams, moreFilterCount } from '../utils/documentFilters';
import { shortDocumentDate, studentsLine, typeAndTags, uploadedLine } from '../utils/documentDisplay';
import { MAX_ZIP_FILES, toggleSelection } from '../utils/documentPreview';
import { PageHeader, PortalButton, PortalToast } from './PortalPrimitives';
import { SelectMenu, SelectMenuOption } from './SelectMenu';
import { EmptyState, ErrorState, LoadingState } from './StateViews';
import { CheckChip, DownloadIconButton, KindBadge } from './DocumentParts';
import { RequiredDocuments } from './RequiredDocuments';

const PAGE_SIZE = 25;

const errorText = (err: unknown, fallback: string) => (err instanceof Error && err.message ? err.message : fallback);

const ArchivedChip: React.FC = () => (
  <span className="inline-flex items-center rounded-full bg-slate-200 px-2.5 py-1 text-[11px] font-bold text-slate-700">Archived</span>
);

export const FileRepository: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => filtersFromParams(params), [params]);
  const navigate = useNavigate();
  const location = useLocation();
  const [options, setOptions] = useState<DocumentOptions | null>(null);
  const [summary, setSummary] = useState<DocumentSummary | null>(null);
  const [rows, setRows] = useState<PortalDocument[]>([]);
  const [count, setCount] = useState(0);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(filters.q);
  const [moreOpen, setMoreOpen] = useState(moreFilterCount(filters) > 0);
  const [downloading, setDownloading] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'danger' } | null>(
    typeof location.state?.message === 'string' ? { message: location.state.message, tone: 'success' } : null,
  );
  const [student, setStudent] = useState<StudentFileHeader | null>(null);
  const [reload, setReload] = useState(0);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);
  const [zipping, setZipping] = useState(false);

  const update = useCallback((changes: Partial<DocumentFilters>) => {
    setParams(filtersToParams({ ...filters, ...changes }), { replace: true });
  }, [filters, setParams]);

  useEffect(() => {
    getDocumentOptions().then(setOptions).catch(() => setOptions(null));
  }, []);

  useEffect(() => {
    getDocumentSummary().then(setSummary).catch(() => setSummary(null));
  }, [reload]);

  useEffect(() => setSearch(filters.q), [filters.q]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (search.trim() !== filters.q.trim()) update({ q: search });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search, filters.q, update]);

  // Rows only show for the filters they were loaded for, so a tab switch never
  // flashes the previous list.
  const listKey = `${params.toString()}#${reload}`;
  useEffect(() => {
    let cancelled = false;
    setError(null);
    if (filters.view === 'required') {
      setRows([]);
      setLoadedKey(listKey);
      return;
    }
    getDocuments(filters, 0, PAGE_SIZE)
      .then(page => {
        if (cancelled) return;
        setRows(page.results);
        setCount(page.count);
        setLoadedKey(listKey);
      })
      .catch(err => {
        if (cancelled) return;
        setError(errorText(err, 'Could not load the files.'));
        setLoadedKey(listKey);
      });
    return () => {
      cancelled = true;
    };
  }, [listKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const loading = loadedKey !== listKey;

  useEffect(() => {
    if (!filters.student) {
      setStudent(null);
      return;
    }
    let cancelled = false;
    getStudentFileHeader(filters.student)
      .then(header => !cancelled && setStudent(header))
      .catch(() => !cancelled && setStudent(null));
    return () => {
      cancelled = true;
    };
  }, [filters.student]);

  // A lecturer's own appointment letters about this student, from Letter Generation.
  const [appointmentLetters, setAppointmentLetters] = useState<GeneratedLetter[]>([]);
  const lecturerView = options !== null && !options.isOffice;
  useEffect(() => {
    if (!filters.student || !lecturerView) {
      setAppointmentLetters([]);
      return;
    }
    let cancelled = false;
    getReceivedLetters(filters.student)
      .then(rows => !cancelled && setAppointmentLetters(rows))
      .catch(() => !cancelled && setAppointmentLetters([]));
    return () => {
      cancelled = true;
    };
  }, [filters.student, lecturerView]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const page = await getDocuments(filters, rows.length, PAGE_SIZE);
      setRows(current => [...current, ...page.results]);
      setCount(page.count);
    } catch (err) {
      setToast({ message: errorText(err, 'Could not load more files.'), tone: 'danger' });
    } finally {
      setLoadingMore(false);
    }
  };

  const stopSelecting = () => {
    setSelecting(false);
    setSelected([]);
  };

  const toggle = (id: number) => {
    const next = toggleSelection(selected, id);
    setSelected(next.selected);
    if (next.full) setToast({ message: `You can download up to ${MAX_ZIP_FILES} files at a time.`, tone: 'danger' });
  };

  const downloadZip = async () => {
    setZipping(true);
    try {
      await downloadDocumentsZip(selected);
      stopSelecting();
    } catch (err) {
      setToast({ message: errorText(err, 'Could not download these files.'), tone: 'danger' });
    } finally {
      setZipping(false);
    }
  };

  const download = async (document: PortalDocument) => {
    setDownloading(document.id);
    try {
      await downloadDocument(document);
    } catch (err) {
      setToast({ message: errorText(err, 'Could not download this file.'), tone: 'danger' });
    } finally {
      setDownloading(null);
    }
  };

  const typeOptions: SelectMenuOption<string>[] = [
    { value: '', label: 'All types', triggerLabel: 'All' },
    ...(options?.types ?? []).map(type => ({ value: type.code, label: type.label, description: type.groupLabel })),
  ];
  const semesterOptions: SelectMenuOption<string>[] = [
    { value: '', label: 'All semesters', triggerLabel: 'All' },
    ...(options?.semesters ?? []).map(semester => ({ value: String(semester.id), label: semester.label })),
    { value: 'none', label: 'Not linked to a semester' },
  ];
  const activeFilters = Boolean(filters.q || filters.type || filters.semester || moreFilterCount(filters));
  const from = `${location.pathname}${location.search}`;
  const isOffice = Boolean(options?.isOffice);
  const tabs: Array<{ view: DocumentFilters['view']; label: string; short?: string; count?: number; alert?: boolean }> = [
    { view: 'all', label: 'All files' },
    ...(isOffice ? [{ view: 'check' as const, label: 'To check', count: summary?.toCheck ?? 0, alert: true }] : []),
    ...(options?.canSeeRequired ? [{ view: 'required' as const, label: 'Required documents', short: 'Required' }] : []),
    { view: 'staff', label: 'Staff files' },
  ];
  const uploadPath = filters.student
    ? `${APP_ROUTES.filesUpload}?student=${encodeURIComponent(filters.student)}`
    : APP_ROUTES.filesUpload;

  return (
    <div className="space-y-6">
      <PageHeader
        title="File Management"
        subtitle="Every student's official documents, in one place."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {isOffice && <PortalButton icon={Settings2} onClick={() => navigate(APP_ROUTES.filesSettings)}>Settings</PortalButton>}
            <PortalButton variant="primary" icon={Plus} onClick={() => navigate(uploadPath)}>Upload file</PortalButton>
          </div>
        }
      />

      {filters.student ? (
        <div className="space-y-3">
          <button type="button" className="back-link" onClick={() => update({ student: '' })}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> All files
          </button>
          <section aria-label="Student" className="app-card flex flex-wrap items-center justify-between gap-5 p-5">
            <div className="flex min-w-0 items-center gap-4">
              <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-navy text-[15px] font-extrabold text-white">
                {(student?.name ?? filters.student).split(/\s+/).map(word => word[0]).slice(0, 2).join('').toUpperCase()}
              </span>
              <div className="min-w-0">
                <h2 className="truncate text-[19px] font-extrabold text-brand-navy">{student?.name ?? filters.student}</h2>
                <p className="truncate text-[13px] text-slate-500">{student ? `${student.matric} · ${student.programme || 'No programme'}` : 'Loading the student...'}</p>
              </div>
            </div>
            {student && (
              <dl className="flex flex-wrap gap-x-8 gap-y-2 text-[13px]">
                <div><dt className="text-slate-500">Supervisor</dt><dd className="font-bold text-slate-800">{student.supervisors.join(', ') || 'None yet'}</dd></div>
                <div><dt className="text-slate-500">Panel member</dt><dd className="font-bold text-slate-800">{student.panel.join(', ') || 'None yet'}</dd></div>
                {student.letters !== null && <div><dt className="text-slate-500">Letters approved</dt><dd className="font-bold text-slate-800">{student.letters}</dd></div>}
                {appointmentLetters.length > 0 && (
                  <div>
                    <dt className="text-slate-500">Your appointment letters</dt>
                    <dd className="font-bold">
                      {appointmentLetters.map(letter => (
                        <Link key={letter.id} to={routeForFileLetter(letter.id)} className="block text-blue-700 hover:underline">
                          {letter.templateName}{letter.status === 'Revoked' ? ' (revoked)' : ''}
                        </Link>
                      ))}
                    </dd>
                  </div>
                )}
                {student.required && student.required.length > 0 && (
                  <div>
                    <dt className="text-slate-500">Required documents</dt>
                    <dd className="font-bold text-slate-800">
                      {student.required.filter(item => item.state === 'DONE').length} of {student.required.length} handed in
                      {student.required.some(item => item.state === 'MISSING' || item.state === 'RETURNED') && (
                        <span className="block text-[12px] font-semibold text-rose-700">
                          Still to hand in: {student.required.filter(item => item.state === 'MISSING' || item.state === 'RETURNED').map(item => item.label).join(', ')}
                        </span>
                      )}
                    </dd>
                  </div>
                )}
              </dl>
            )}
          </section>
        </div>
      ) : (
        <div role="tablist" aria-label="File views" className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
          {tabs.map(tab => {
            const selected = filters.view === tab.view;
            return (
              <button
                key={tab.view}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => update({ view: tab.view })}
                className={`card-value inline-flex items-center gap-2 rounded-lg px-4 py-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy ${selected ? 'bg-brand-navy text-white' : 'text-slate-600 hover:bg-white'}`}
              >
                {tab.short ? (
                  <>
                    <span className="sm:hidden">{tab.short}</span>
                    <span className="hidden sm:inline">{tab.label}</span>
                  </>
                ) : tab.label}
                {tab.count !== undefined && (
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${tab.alert && tab.count ? 'bg-amber-100 text-amber-800' : selected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'}`}>{tab.count}</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {filters.view === 'required' ? (
        <RequiredDocuments isOffice={isOffice} />
      ) : (
        <>
          <div className="space-y-3">
            <label className="flex min-h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 focus-within:border-brand-navy focus-within:ring-1 focus-within:ring-brand-navy">
              <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
              <span className="sr-only">Search files</span>
              <input
                type="search"
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder={filters.student ? 'Search this student’s files' : 'Search by student name, student ID, file name or tag'}
                className="min-w-0 flex-1 border-0 bg-transparent py-3 text-[14px] font-medium text-slate-800 outline-none placeholder:text-slate-400"
              />
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <SelectMenu<string> variant="filter" size="sm" prefix="Type" aria-label="Type" value={filters.type} options={typeOptions} onChange={value => update({ type: value })} />
              {options?.semesters && (
                <SelectMenu<string> variant="filter" size="sm" prefix="Semester" aria-label="Semester" value={filters.semester} options={semesterOptions} onChange={value => update({ semester: value })} />
              )}
              <PortalButton size="sm" icon={SlidersHorizontal} aria-expanded={moreOpen} onClick={() => setMoreOpen(open => !open)}>
                More filters{moreFilterCount(filters) ? ` (${moreFilterCount(filters)})` : ''}
              </PortalButton>
              <span className="ml-auto flex items-center gap-2">
                {selecting ? (
                  <>
                    <span className="text-[13px] font-bold text-slate-700">{selected.length} selected</span>
                    <PortalButton size="sm" variant="primary" disabled={!selected.length} isLoading={zipping} onClick={() => void downloadZip()}>Download as ZIP</PortalButton>
                    <PortalButton size="sm" onClick={stopSelecting}>Cancel</PortalButton>
                  </>
                ) : rows.length > 0 && (
                  <PortalButton size="sm" onClick={() => setSelecting(true)}>Select</PortalButton>
                )}
              </span>
              {activeFilters && (
                <button type="button" className="px-2 text-[13px] font-bold text-blue-700 hover:text-blue-900" onClick={() => {
                  setSearch('');
                  setParams(filtersToParams({ view: filters.view, student: filters.student }), { replace: true });
                }}>
                  Clear filters
                </button>
              )}
            </div>
            {moreOpen && (
              <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <SelectMenu<DocumentFilters['uploader']>
                  variant="filter" size="sm" prefix="Uploaded by" aria-label="Uploaded by" value={filters.uploader}
                  options={[{ value: '', label: 'Anyone', triggerLabel: 'Anyone' }, { value: 'me', label: 'Me' }, { value: 'students', label: 'Students' }, { value: 'staff', label: 'Staff' }]}
                  onChange={value => update({ uploader: value })}
                />
                <SelectMenu<DocumentFilters['status']>
                  variant="filter" size="sm" prefix="Status" aria-label="Status" value={filters.status}
                  options={[{ value: '', label: 'Any status', triggerLabel: 'Any' }, { value: 'WAITING', label: 'Waiting for office' }, { value: 'RETURNED', label: 'Returned' }, { value: 'ACCEPTED', label: 'Accepted' }, { value: 'NONE', label: 'No check needed' }]}
                  onChange={value => update({ status: value })}
                />
                <SelectMenu<DocumentFilters['kind']>
                  variant="filter" size="sm" prefix="File" aria-label="File kind" value={filters.kind}
                  options={[{ value: '', label: 'Any kind', triggerLabel: 'Any' }, { value: 'PDF', label: 'PDF' }, { value: 'DOCX', label: 'Word' }, { value: 'IMAGE', label: 'Photo or scan' }, { value: 'XLSX', label: 'Excel' }, { value: 'PPTX', label: 'PowerPoint' }]}
                  onChange={value => update({ kind: value })}
                />
                {isOffice && (
                  <SelectMenu<DocumentFilters['archived']>
                    variant="filter" size="sm" prefix="Show" aria-label="Show" value={filters.archived}
                    options={[
                      { value: '', label: 'Current files', triggerLabel: 'Current files' },
                      { value: '1', label: `Archived files${summary?.archived ? ` (${summary.archived})` : ''}`, triggerLabel: 'Archived files' },
                    ]}
                    onChange={value => update({ archived: value })}
                  />
                )}
                <label className="text-[12px] font-bold text-slate-600">
                  From
                  <input type="date" value={filters.from} onChange={event => update({ from: event.target.value })} className="form-control form-control-sm mt-1 block" />
                </label>
                <label className="text-[12px] font-bold text-slate-600">
                  To
                  <input type="date" value={filters.to} onChange={event => update({ to: event.target.value })} className="form-control form-control-sm mt-1 block" />
                </label>
              </div>
            )}
          </div>

          <section aria-label="Files" className="app-card overflow-hidden">
            {loading ? (
              <LoadingState message="Loading files..." />
            ) : error ? (
              <ErrorState message={error} onRetry={() => setReload(value => value + 1)} />
            ) : !rows.length ? (
              <EmptyState
                title="No matching files found."
                description={activeFilters ? 'Try other words, or clear the filters.' : 'Files you upload, or that are shared with you, appear here.'}
              />
            ) : (
              <>
                <ul>
                  {rows.map(document => {
                    const who = studentsLine(document.students);
                    const first = document.students[0];
                    return (
                      <li key={document.id} className="border-t border-slate-100 px-4 py-4 first:border-t-0 hover:bg-slate-50/70 md:px-5">
                        <div className={`flex items-start gap-3 md:grid md:items-center md:gap-4 ${filters.student ? 'md:grid-cols-[auto_minmax(0,4fr)_minmax(0,1.6fr)_13rem]' : 'md:grid-cols-[auto_minmax(0,3fr)_minmax(0,2fr)_minmax(0,1.6fr)_13rem]'}`}>
                          <span className="flex shrink-0 items-center gap-3">
                            {selecting && (
                              <input
                                type="checkbox"
                                className="h-5 w-5 accent-brand-navy"
                                aria-label={`Select ${document.title}`}
                                checked={selected.includes(document.id)}
                                onChange={() => toggle(document.id)}
                              />
                            )}
                            <KindBadge kind={document.file?.kind} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <Link to={routeForDocument(document.id)} state={{ from }} className="block truncate text-[14px] font-bold text-brand-navy hover:underline">
                              {document.title}
                            </Link>
                            <p className="truncate text-[12px] text-slate-500">{typeAndTags(document.type.label, document.tags)}</p>
                            <p className="mt-1 truncate text-[12px] text-slate-600 md:hidden">{filters.student ? '' : `${who.main} · `}{shortDocumentDate(document.uploadedAt)}</p>
                            <div className="mt-1.5 md:hidden">{document.archived ? <ArchivedChip /> : <CheckChip status={document.checkStatus} hideAccepted />}</div>
                          </div>
                          <div className={filters.student ? 'hidden' : 'hidden min-w-0 md:block'}>
                            {first && !filters.student ? (
                              <button type="button" className="block max-w-full truncate text-left text-[13px] font-bold text-slate-800 underline decoration-slate-300 underline-offset-4 hover:decoration-brand-navy" onClick={() => update({ student: first.matric, view: 'all' })} aria-label={`Show every file about ${first.name}`}>
                                {who.main}
                              </button>
                            ) : (
                              <p className="truncate text-[13px] font-bold text-slate-800">{who.main}</p>
                            )}
                            <p className="truncate text-[12px] text-slate-500">{document.isStaffFile ? document.staffAudienceLabel : who.sub}</p>
                          </div>
                          <div className="hidden min-w-0 md:block">
                            <p className="text-[13px] text-slate-700">{shortDocumentDate(document.uploadedAt)}</p>
                            <p className="truncate text-[12px] text-slate-500">{uploadedLine(document.uploadedBy.name, document.uploadedBy.isMe)}</p>
                          </div>
                          <div className="flex shrink-0 items-center justify-end gap-2">
                            <span className="hidden md:inline-flex">{document.archived ? <ArchivedChip /> : <CheckChip status={document.checkStatus} hideAccepted />}</span>
                            {filters.view === 'check' && !filters.student && (
                              <PortalButton size="sm" variant="primary" onClick={() => navigate(routeForDocument(document.id), { state: { from } })}>Review</PortalButton>
                            )}
                            <DownloadIconButton label={`Download ${document.title}`} busy={downloading === document.id} onClick={() => void download(document)} />
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4">
                  <span className="text-[13px] text-slate-500">Showing {rows.length} of {count} files</span>
                  {rows.length < count && <PortalButton size="sm" isLoading={loadingMore} onClick={() => void loadMore()}>Load more</PortalButton>}
                </div>
              </>
            )}
          </section>
        </>
      )}
      <PortalToast message={toast?.message ?? null} tone={toast?.tone ?? 'success'} onClose={() => setToast(null)} />
    </div>
  );
};
