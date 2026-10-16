/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { Download, Plus, Search } from 'lucide-react';
import type {
  FaqCategorySummary,
  FaqChatbotSettings,
  FaqEntryList,
  FaqQuestionGroup,
  FaqQuestionStats,
  FaqSearchStatus,
  FaqStatusFilter,
  FaqTryCandidate,
} from '../types';
import {
  downloadFaqReviewList,
  getFaqCategories,
  getFaqEntries,
  getFaqQuestionStats,
  getFaqQuestions,
  getFaqSearchStatus,
  getFaqSettings,
  reviewFaqQuestions,
  saveFaqSettings,
  tryFaqQuestion,
} from '../services/faqApi';
import { APP_ROUTES, routeForFaqEntry } from '../constants/routes';
import { FAQ_STATUS_CHIP, FAQ_STATUS_LABEL, entryHint, groupLine, percent } from '../utils/faqOffice';
import { historyTime, shortDocumentDate } from '../utils/documentDisplay';
import { PageHeader, PortalButton, PortalToast, SegmentedControl } from './PortalPrimitives';
import { SelectMenu, type SelectMenuOption } from './SelectMenu';
import { ErrorState, LoadingState } from './StateViews';
import { useListState } from './ListState';
import { FaqEntryPage } from './FaqEntryPage';
import { FaqDocumentsTab } from './FaqDocumentsTab';

type Tab = 'entries' | 'questions' | 'documents' | 'settings';
const TABS: readonly Tab[] = ['entries', 'questions', 'documents', 'settings'];
const TAB_ROUTES: Record<Tab, string> = {
  entries: APP_ROUTES.faq,
  questions: APP_ROUTES.faqQuestions,
  documents: APP_ROUTES.faqDocuments,
  settings: APP_ROUTES.faqSettings,
};

const errorText = (err: unknown, fallback: string) => (err instanceof Error && err.message ? err.message : fallback);

const STATUS_FILTERS: { value: FaqStatusFilter; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'NEEDS_CHECKING', label: 'Needs checking' },
  { value: 'ARCHIVED', label: 'Archived' },
];

const EntriesTab: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [search, setSearch] = useListState('FaqEntries', 'search', '');
  const [category, setCategory] = useListState('FaqEntries', 'category', '');
  const [status, setStatus] = useListState<FaqStatusFilter>('FaqEntries', 'status', '');
  const [page, setPage] = useListState('FaqEntries', 'page', 1);
  const [data, setData] = useState<FaqEntryList | null>(null);
  const [categories, setCategories] = useState<FaqCategorySummary[]>([]);
  const [searchStatus, setSearchStatus] = useState<FaqSearchStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'danger' } | null>(
    typeof location.state?.message === 'string' ? { message: location.state.message, tone: 'success' } : null,
  );
  const latest = useRef(0);

  useEffect(() => {
    getFaqCategories().then(setCategories).catch(() => setCategories([]));
    getFaqSearchStatus().then(setSearchStatus).catch(() => setSearchStatus(null));
  }, []);

  useEffect(() => {
    if (location.state?.message) navigate(location.pathname, { replace: true, state: null });
  }, [location.state, location.pathname, navigate]);

  const load = useCallback(() => {
    const id = ++latest.current;
    setLoading(true);
    setError(null);
    getFaqEntries({ search, category, status, page })
      .then(result => id === latest.current && setData(result))
      .catch(err => id === latest.current && setError(errorText(err, 'Could not load the entries.')))
      .finally(() => id === latest.current && setLoading(false));
  }, [search, category, status, page]);

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  const counts = data?.statusCounts;
  const toCheck = counts?.NEEDS_CHECKING ?? 0;
  const rows = data?.results ?? [];
  const pages = data ? Math.max(1, Math.ceil(data.count / data.pageSize)) : 1;
  const first = data && data.count ? (data.page - 1) * data.pageSize + 1 : 0;
  const last = data ? Math.min(data.page * data.pageSize, data.count) : 0;
  const categoryOptions: SelectMenuOption<string>[] = [{ value: '', label: 'All categories', triggerLabel: 'All' }, ...categories.map(item => ({ value: item.id, label: item.name }))];
  const statusOptions: SelectMenuOption<FaqStatusFilter>[] = STATUS_FILTERS.map(option => ({
    ...option,
    label: option.value && counts ? `${option.label} (${counts[option.value]})` : option.label,
    triggerLabel: option.value ? option.label : 'All',
  }));

  const download = async () => {
    try {
      await downloadFaqReviewList();
    } catch (err) {
      setToast({ message: errorText(err, 'Could not download the review list.'), tone: 'danger' });
    }
  };

  return (
    <div className="space-y-5">
      {searchStatus?.mode === 'keywords' && (
        <p role="status" className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-[13px] font-semibold text-amber-900">
          The meaning search isn't available on the server, so the chatbot is matching keywords only. Answers still work, but paraphrases and Malay questions match less well.
        </p>
      )}
      {toCheck > 0 && status !== 'NEEDS_CHECKING' && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
          <p className="text-[14px] text-amber-900">
            <strong>{toCheck} imported entries need checking</strong> before students can see them. {counts?.PUBLISHED ?? 0} are live.
          </p>
          <span className="flex flex-wrap gap-2">
            <PortalButton size="sm" icon={Download} onClick={() => void download()}>Download the review list</PortalButton>
            <PortalButton size="sm" variant="primary" onClick={() => { setStatus('NEEDS_CHECKING'); setPage(1); }}>Show them</PortalButton>
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 items-end gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-3xs md:grid-cols-12">
        <label className="block md:col-span-6">
          <span className="form-label block">Search</span>
          <span className="relative block">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400"><Search className="h-3.5 w-3.5" aria-hidden="true" /></span>
            <input type="search" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} placeholder="Question, answer or another way of asking" className="form-control form-control-sm pl-9" />
          </span>
        </label>
        <div className="md:col-span-3">
          <span className="form-label block">Category</span>
          <SelectMenu<string> size="sm" aria-label="Category" value={category} options={categoryOptions} onChange={value => { setCategory(value); setPage(1); }} />
        </div>
        <div className="md:col-span-3">
          <span className="form-label block">Status</span>
          <SelectMenu<FaqStatusFilter> size="sm" aria-label="Status" value={status} options={statusOptions} onChange={value => { setStatus(value); setPage(1); }} />
        </div>
      </div>

      <section aria-label="Entries" className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-3xs">
        <div className="relative overflow-x-auto">
          <table className="data-table text-xs">
            <thead>
              <tr className="data-thead bg-[#f8fafc]">
                <th className="data-th">Question</th>
                <th className="data-th">Category</th>
                <th className="data-th">Status</th>
                <th className="data-th">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && !data ? (
                <tr><td colSpan={4} className="p-0"><LoadingState message="Loading entries..." /></td></tr>
              ) : error ? (
                <tr><td colSpan={4} className="p-0"><ErrorState message={error} onRetry={load} /></td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={4} className="px-5 py-10 text-center text-[13px] font-semibold text-slate-500">{search || category || status ? 'No entries match these filters.' : 'No entries yet. Add the first one.'}</td></tr>
              ) : (
                rows.map(entry => (
                  <tr key={entry.id} className="transition hover:bg-slate-50/50">
                    <td className="data-td max-w-[520px]">
                      <Link to={routeForFaqEntry(entry.id)} className="block font-bold text-slate-800 hover:underline [overflow-wrap:anywhere]">{entry.question || '(No question yet)'}</Link>
                      {entryHint(entry) && <span className="block text-[11px] text-slate-500">{entryHint(entry)}</span>}
                    </td>
                    <td className="data-td whitespace-nowrap">{entry.category.name}</td>
                    <td className="data-td whitespace-nowrap">
                      {entry.status === 'PUBLISHED' ? (
                        <span className="text-slate-600">Published</span>
                      ) : (
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${FAQ_STATUS_CHIP[entry.status]}`}>{FAQ_STATUS_LABEL[entry.status]}</span>
                      )}
                    </td>
                    <td className="data-td whitespace-nowrap text-slate-600">{entry.imported && entry.status === 'NEEDS_CHECKING' ? 'Imported' : shortDocumentDate(entry.updatedAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {data && data.count > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3">
            <span className="text-[12px] font-semibold text-slate-500">Showing {first} to {last} of {data.count} entries</span>
            {pages > 1 && (
              <span className="flex gap-2">
                <PortalButton size="sm" disabled={data.page <= 1 || loading} onClick={() => setPage(data.page - 1)}>Previous</PortalButton>
                <PortalButton size="sm" disabled={data.page >= pages || loading} onClick={() => setPage(data.page + 1)}>Next</PortalButton>
              </span>
            )}
          </div>
        )}
      </section>
      <PortalToast message={toast?.message ?? null} tone={toast?.tone ?? 'success'} onClose={() => setToast(null)} />
    </div>
  );
};

const Figure: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-2xl border border-slate-200/80 bg-white px-5 py-4 shadow-3xs">
    <p className="text-[12px] text-slate-500">{label}</p>
    <p className="text-[22px] font-extrabold text-slate-900">{value}</p>
  </div>
);

const AddToEntry: React.FC<{ group: FaqQuestionGroup; onDone: (message: string) => void; onCancel: () => void }> = ({ group, onDone, onCancel }) => {
  const name = useId();
  const [candidates, setCandidates] = useState<FaqTryCandidate[] | null>(null);
  const [search, setSearch] = useState('');
  const [found, setFound] = useState<{ id: string; question: string }[]>([]);
  const [chosen, setChosen] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    tryFaqQuestion(group.text)
      .then(reply => {
        setCandidates(reply.candidates);
        setChosen(group.lastEntry?.id ?? reply.candidates[0]?.id ?? '');
      })
      .catch(() => setCandidates([]));
  }, [group]);

  useEffect(() => {
    if (!search.trim()) return setFound([]);
    const timer = setTimeout(() => {
      getFaqEntries({ search, category: '', status: '', page: 1 })
        .then(result => setFound(result.results.slice(0, 6).map(entry => ({ id: entry.id, question: entry.question }))))
        .catch(() => setFound([]));
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const options = [...(group.lastEntry ? [group.lastEntry] : []), ...(candidates ?? []), ...found].filter(
    (option, index, all) => option.question && all.findIndex(other => other.id === option.id) === index,
  );

  const add = async () => {
    setBusy(true);
    setProblem(null);
    try {
      await reviewFaqQuestions({ ids: group.ids, action: 'add', entryId: chosen, text: group.text });
      onDone(`Added "${group.text}" as another way to ask.`);
    } catch (err) {
      setProblem(errorText(err, 'Could not add it.'));
      setBusy(false);
    }
  };

  return (
    <fieldset className="space-y-3 rounded-xl bg-slate-50 p-4">
      <legend className="sr-only">Which entry answers it?</legend>
      <p className="text-[13px] font-bold text-slate-800">Which entry answers it?</p>
      {candidates === null ? (
        <p className="text-[13px] text-slate-500">Finding the closest entries...</p>
      ) : (
        <div className="space-y-1.5">
          {options.map(option => (
            <label key={option.id} className="flex cursor-pointer items-start gap-2.5 text-[13px] text-slate-800">
              <input type="radio" name={name} className="mt-0.5 h-4 w-4 accent-[#0c1424]" checked={chosen === option.id} onChange={() => setChosen(option.id)} />
              {option.question}
            </label>
          ))}
        </div>
      )}
      <input type="search" className="form-control form-control-sm" placeholder="Search for another entry" value={search} onChange={event => setSearch(event.target.value)} aria-label="Search for another entry" />
      {problem && <p role="alert" className="text-[12px] font-semibold text-rose-700">{problem}</p>}
      <span className="flex flex-wrap gap-2">
        <PortalButton size="sm" variant="primary" isLoading={busy} disabled={!chosen} onClick={() => void add()}>Add</PortalButton>
        <PortalButton size="sm" variant="ghost" onClick={onCancel}>Cancel</PortalButton>
      </span>
    </fieldset>
  );
};

const QuestionsTab: React.FC<{ onCount: (count: number) => void }> = ({ onCount }) => {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<FaqQuestionGroup[] | null>(null);
  const [stats, setStats] = useState<FaqQuestionStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'danger' } | null>(null);

  const load = useCallback(() => {
    setError(null);
    getFaqQuestions()
      .then(result => {
        setGroups(result.groups);
        setStats(result.stats);
        onCount(result.stats.waiting);
      })
      .catch(err => setError(errorText(err, 'Could not load the questions.')));
  }, [onCount]);

  useEffect(load, [load]);

  const settled = (message: string) => {
    setAdding(null);
    setToast({ message, tone: 'success' });
    load();
  };

  const dismiss = async (group: FaqQuestionGroup) => {
    setBusy(group.key);
    try {
      await reviewFaqQuestions({ ids: group.ids, action: 'dismiss' });
      settled('Dismissed.');
    } catch (err) {
      setToast({ message: errorText(err, 'Could not dismiss it.'), tone: 'danger' });
    } finally {
      setBusy(null);
    }
  };

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!groups || !stats) return <LoadingState message="Loading student questions..." />;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Figure label="Questions this month" value={String(stats.thisMonth)} />
        <Figure label="Answered" value={percent(stats.answeredPercent)} />
        <Figure label="Marked helpful" value={percent(stats.helpfulPercent)} />
        <Figure label="To look at" value={String(stats.waiting)} />
      </div>
      <p className="text-[13px] text-slate-600">Questions the chatbot could not answer, or that a student marked "No". Similar questions are grouped. No names are kept.</p>
      {groups.length === 0 ? (
        <p className="rounded-2xl border border-slate-200/80 bg-white px-5 py-10 text-center text-[13px] font-semibold text-slate-500">Nothing to look at right now.</p>
      ) : (
        <ul className="space-y-3">
          {groups.map(group => (
            <li key={group.key} className="app-card space-y-3 p-5">
              <div className="space-y-1">
                <p className="text-[15px] font-bold text-slate-900 [overflow-wrap:anywhere]">"{group.text}"</p>
                <p className="text-[12px] text-slate-500">
                  {groupLine(group, historyTime(group.lastAsked))}
                  {group.notHelpful > 0 && <span className="ml-2 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700">Didn't help</span>}
                </p>
              </div>
              {adding === group.key ? (
                <AddToEntry group={group} onDone={settled} onCancel={() => setAdding(null)} />
              ) : (
                <div className="flex flex-wrap gap-2">
                  <PortalButton size="sm" variant="primary" onClick={() => setAdding(group.key)}>Add as another way to ask</PortalButton>
                  <PortalButton size="sm" onClick={() => navigate(APP_ROUTES.faqEntryNew, { state: { question: group.text, fromQuestions: group.ids } })}>Create entry</PortalButton>
                  <PortalButton size="sm" variant="ghost" isLoading={busy === group.key} onClick={() => void dismiss(group)}>Dismiss</PortalButton>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <PortalToast message={toast?.message ?? null} tone={toast?.tone ?? 'success'} onClose={() => setToast(null)} />
    </div>
  );
};

const SettingsTab: React.FC = () => {
  const ids = useId();
  const [settings, setSettings] = useState<FaqChatbotSettings | null>(null);
  const [contact, setContact] = useState('');
  const [common, setCommon] = useState<string[]>(['', '', '', '']);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'danger' } | null>(null);

  const fill = (found: FaqChatbotSettings) => {
    setSettings(found);
    setContact(found.contactText);
    setCommon([0, 1, 2, 3].map(index => found.commonQuestions[index] ?? ''));
  };

  const load = useCallback(() => {
    setError(null);
    getFaqSettings().then(fill).catch(err => setError(errorText(err, 'Could not load the settings.')));
  }, []);

  useEffect(load, [load]);

  const save = async () => {
    setBusy(true);
    try {
      fill(await saveFaqSettings({ contactText: contact, commonQuestions: common }));
      setToast({ message: 'Settings saved. Students see them now.', tone: 'success' });
    } catch (err) {
      setToast({ message: errorText(err, 'Could not save the settings.'), tone: 'danger' });
    } finally {
      setBusy(false);
    }
  };

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!settings) return <LoadingState message="Loading settings..." />;
  return (
    <section aria-label="Chatbot settings" className="app-card max-w-3xl space-y-5 p-5">
      <div className="space-y-1.5">
        <label htmlFor={`${ids}-contact`} className="block text-[13px] font-bold text-slate-700">Contact text</label>
        <p className="text-[12px] text-slate-500">Shown when the chatbot has no answer, or a student says an answer didn't help. Give the email, the counter and its opening hours.</p>
        <textarea id={`${ids}-contact`} className="form-control min-h-28 px-3.5 py-3 text-[14px]" maxLength={1000} value={contact} onChange={event => setContact(event.target.value)} />
      </div>
      <fieldset className="space-y-2">
        <legend className="block text-[13px] font-bold text-slate-700">Common questions</legend>
        <p className="text-[12px] text-slate-500">Up to four, shown on the start screen. Leave them empty to show one question from each topic.</p>
        {common.map((value, index) => (
          <input
            key={index}
            aria-label={`Common question ${index + 1}`}
            className="form-control form-control-md text-[14px]"
            maxLength={300}
            value={value}
            onChange={event => setCommon(current => current.map((item, at) => (at === index ? event.target.value : item)))}
          />
        ))}
      </fieldset>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <span className="text-[12px] text-slate-500">{settings.updatedBy ? `Last changed by ${settings.updatedBy}, ${historyTime(settings.updatedAt)}` : ''}</span>
        <PortalButton variant="primary" isLoading={busy} disabled={!contact.trim()} onClick={() => void save()}>Save settings</PortalButton>
      </div>
      <PortalToast message={toast?.message ?? null} tone={toast?.tone ?? 'success'} onClose={() => setToast(null)} />
    </section>
  );
};

/** FAQ Knowledge Base (UC29): what the chatbot answers, what students asked, and its settings. */
export const AcademicFAQEditor: React.FC<{ view?: Tab | 'entry' | 'new'; entryId?: string }> = ({ view = 'entries', entryId }) => {
  const navigate = useNavigate();
  const [waiting, setWaiting] = useState<number | null>(null);
  const onCount = useCallback((count: number) => setWaiting(count), []);

  useEffect(() => {
    if (view === 'entries' || view === 'documents' || view === 'settings') getFaqQuestionStats().then(result => setWaiting(result.stats.waiting)).catch(() => undefined);
  }, [view]);

  if (view === 'entry' || view === 'new') return <FaqEntryPage key={entryId ?? 'new'} entryId={view === 'new' ? null : entryId ?? null} />;
  return (
    <div id="faq-knowledge-base" className="space-y-6">
      <PageHeader
        title="FAQ Knowledge Base"
        subtitle="The answers the FAQ Chatbot gives students. Only published entries are used."
        actions={view === 'entries' ? <PortalButton variant="primary" icon={Plus} onClick={() => navigate(APP_ROUTES.faqEntryNew)}>Add entry</PortalButton> : undefined}
      />
      <SegmentedControl
        options={TABS}
        value={view}
        onChange={tab => tab !== view && navigate(TAB_ROUTES[tab])}
        labels={{ entries: 'Entries', questions: waiting ? `Student questions (${waiting})` : 'Student questions', documents: 'Documents', settings: 'Settings' }}
        className="w-fit"
      />
      {view === 'entries' && <EntriesTab />}
      {view === 'questions' && <QuestionsTab onCount={onCount} />}
      {view === 'documents' && <FaqDocumentsTab />}
      {view === 'settings' && <SettingsTab />}
    </div>
  );
};
