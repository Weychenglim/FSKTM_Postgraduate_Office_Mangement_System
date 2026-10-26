/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Eye, Pencil, X } from 'lucide-react';
import type { FaqCategorySummary, FaqEntryDetail, FaqEntryInput, FaqPortalLink, FaqTryReply } from '../types';
import { fieldErrors } from '../services/apiClient';
import {
  createFaqEntry,
  deleteFaqEntry,
  getFaqCategories,
  getFaqEntry,
  reviewFaqQuestions,
  stepFaqEntry,
  tryFaqQuestion,
  updateFaqEntry,
} from '../services/faqApi';
import { APP_ROUTES, routeForFaqEntry } from '../constants/routes';
import { FAQ_PORTAL_LINKS } from '../utils/faqText';
import { FAQ_STATUS_CHIP, FAQ_STATUS_LABEL, faqHistoryLine } from '../utils/faqOffice';
import { historyTime } from '../utils/documentDisplay';
import { PortalButton, PortalConfirmModal, PortalToast } from './PortalPrimitives';
import { RecordPage } from './RecordPage';
import { SelectMenu } from './SelectMenu';
import { ErrorState, LoadingState } from './StateViews';
import { OverflowMenu, type MenuAction } from './DocumentParts';
import { FaqText } from './FaqText';

type Form = { question: string; altQuestions: string[]; answer: string; category: string; portalLink: FaqPortalLink };
const EMPTY: Form = { question: '', altQuestions: [], answer: '', category: '', portalLink: '' };
const NO_BUTTON = 'NONE';

const errorText = (err: unknown, fallback: string) => (err instanceof Error && err.message ? err.message : fallback);
const formFrom = (entry: FaqEntryDetail): Form => ({
  question: entry.question,
  altQuestions: entry.altQuestions,
  answer: entry.answer,
  category: entry.category.id,
  portalLink: entry.portalLink,
});
const same = (a: Form, b: Form) => JSON.stringify(a) === JSON.stringify(b);

const MATCH_CHIP: Record<FaqTryReply['match'], string> = {
  Strong: 'bg-emerald-50 text-emerald-800',
  Possible: 'bg-amber-50 text-amber-800',
  None: 'bg-slate-100 text-slate-700',
};

const AltQuestions: React.FC<{ id: string; values: string[]; onChange: (values: string[]) => void }> = ({ id, values, onChange }) => {
  const [draft, setDraft] = useState('');
  const add = () => {
    const text = draft.trim().replace(/\s+/g, ' ');
    if (text && !values.some(value => value.toLowerCase() === text.toLowerCase())) onChange([...values, text]);
    setDraft('');
  };
  return (
    <div className="space-y-2">
      {values.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Other ways students ask">
          {values.map(value => (
            <li key={value} className="inline-flex items-center gap-1 rounded-full bg-indigo-50 py-1 pl-3 pr-1 text-[13px] font-semibold text-indigo-900">
              {value}
              <button type="button" aria-label={`Remove "${value}"`} className="inline-flex h-6 w-6 items-center justify-center rounded-full hover:bg-black/10" onClick={() => onChange(values.filter(item => item !== value))}>
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <input
          id={id}
          className="form-control form-control-md text-[14px]"
          maxLength={500}
          value={draft}
          placeholder="For example: boleh belajar separuh masa?"
          onChange={event => setDraft(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
              event.preventDefault();
              add();
            }
          }}
        />
        <PortalButton onClick={add} disabled={!draft.trim()}>Add</PortalButton>
      </div>
    </div>
  );
};

const TryIt: React.FC<{ entry: FaqEntryDetail | null }> = ({ entry }) => {
  const inputId = useId();
  const [question, setQuestion] = useState('');
  const [reply, setReply] = useState<FaqTryReply | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async () => {
    if (!question.trim()) return;
    setBusy(true);
    setProblem(null);
    try {
      setReply(await tryFaqQuestion(question));
    } catch (err) {
      setProblem(errorText(err, 'Could not try this question.'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <section aria-label="Try it" className="app-card space-y-3 p-5">
      <h2 className="section-label">Try it</h2>
      <p className="text-[12px] text-slate-500">Type a question the way a student would. Nothing is saved.</p>
      <label htmlFor={inputId} className="sr-only">Test question</label>
      <div className="flex gap-2">
        <input
          id={inputId}
          className="form-control form-control-md text-[14px]"
          value={question}
          maxLength={300}
          placeholder="Test question"
          onChange={event => setQuestion(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
              event.preventDefault();
              void run();
            }
          }}
        />
        <PortalButton variant="primary" isLoading={busy} disabled={!question.trim()} onClick={() => void run()}>Try</PortalButton>
      </div>
      {problem && <p role="alert" className="text-[12px] font-semibold text-rose-700">{problem}</p>}
      {reply && (
        <div className="space-y-2" aria-live="polite">
          <p className="flex flex-wrap items-center gap-2 text-[13px] text-slate-700">
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${MATCH_CHIP[reply.match]}`}>{reply.match === 'None' ? 'No match' : `${reply.match} match`}</span>
            {reply.mode === 'keywords' && <span className="text-[12px] text-slate-500">Keyword search only</span>}
          </p>
          {reply.candidates.length === 0 ? (
            <p className="text-[13px] text-slate-600">No published entry comes close.</p>
          ) : (
            <ol className="space-y-1.5">
              {reply.candidates.slice(0, 3).map((candidate, index) => (
                <li key={candidate.id} className="flex items-start justify-between gap-3 text-[13px]">
                  <span className={index === 0 ? 'font-semibold text-slate-900' : 'text-slate-600'}>
                    {candidate.question}
                    {entry && candidate.id === entry.id && <span className="ml-1.5 rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-800">This entry</span>}
                  </span>
                  <span className="shrink-0 text-[12px] text-slate-500">{Math.round(candidate.confidence * 100)}%</span>
                </li>
              ))}
            </ol>
          )}
          {entry && entry.status !== 'PUBLISHED' && (
            <p className="text-[12px] text-amber-800">This entry is not published, so students can't find it yet.</p>
          )}
        </div>
      )}
    </section>
  );
};

export const FaqEntryPage: React.FC<{ entryId: string | null }> = ({ entryId }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const ids = useId();
  const done = useRef(false);
  const fromQuestions: string[] = Array.isArray(location.state?.fromQuestions) ? location.state.fromQuestions : [];
  const [entry, setEntry] = useState<FaqEntryDetail | null>(null);
  const [form, setForm] = useState<Form>(() => ({ ...EMPTY, question: typeof location.state?.question === 'string' ? location.state.question : '' }));
  const [categories, setCategories] = useState<FaqCategorySummary[]>([]);
  const [loading, setLoading] = useState(Boolean(entryId));
  const [loadProblem, setLoadProblem] = useState<string | null>(null);
  const [problems, setProblems] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'danger' } | null>(
    typeof location.state?.message === 'string' ? { message: location.state.message, tone: 'success' } : null,
  );
  const [reload, setReload] = useState(0);

  useEffect(() => {
    getFaqCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    if (location.state?.message) navigate(location.pathname, { replace: true, state: null });
  }, [location.state, location.pathname, navigate]);

  useEffect(() => {
    if (!entryId) return;
    let cancelled = false;
    setLoading(true);
    setLoadProblem(null);
    getFaqEntry(entryId)
      .then(found => {
        if (cancelled) return;
        setEntry(found);
        setForm(formFrom(found));
      })
      .catch(err => !cancelled && setLoadProblem(errorText(err, 'Could not open this entry.')))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [entryId, reload]);

  const saved = useMemo(() => (entry ? formFrom(entry) : EMPTY), [entry]);
  const dirty = !done.current && (entry ? !same(form, saved) : Boolean(form.question.trim() || form.answer.trim() || form.altQuestions.length));

  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm(current => ({ ...current, [key]: value }));
    setProblems(current => ({ ...current, [key]: '' }));
  };

  const changes = (): FaqEntryInput => {
    const before = entry ? formFrom(entry) : EMPTY;
    const input: FaqEntryInput = {};
    if (form.question !== before.question) input.question = form.question;
    if (form.answer !== before.answer) input.answer = form.answer;
    if (form.category !== before.category) input.category = form.category;
    if (form.portalLink !== before.portalLink) input.portalLink = form.portalLink;
    if (JSON.stringify(form.altQuestions) !== JSON.stringify(before.altQuestions)) input.altQuestions = form.altQuestions;
    return input;
  };

  const save = async (publish: boolean) => {
    if (!form.category) {
      setProblems({ category: 'Choose a category.' });
      return;
    }
    setBusy(publish ? 'publish' : 'save');
    setProblems({});
    try {
      if (!entry) {
        const created = await createFaqEntry({ ...changes(), category: form.category, publish });
        if (fromQuestions.length) await reviewFaqQuestions({ ids: fromQuestions, action: 'create', entryId: created.id }).catch(() => undefined);
        done.current = true;
        navigate(routeForFaqEntry(created.id), { replace: true, state: { message: publish ? 'Published. Students can find it now.' : 'Saved as a draft.' } });
        return;
      }
      let updated = Object.keys(changes()).length ? await updateFaqEntry(entry.id, changes()) : entry;
      if (publish && updated.status !== 'PUBLISHED') updated = await stepFaqEntry(entry.id, 'publish');
      setEntry(updated);
      setForm(formFrom(updated));
      setToast({ message: publish ? 'Published. Students can find it now.' : 'Changes saved.', tone: 'success' });
    } catch (err) {
      const fields = fieldErrors(err);
      if (Object.keys(fields).length) setProblems(fields);
      else setToast({ message: errorText(err, 'Could not save the entry.'), tone: 'danger' });
    } finally {
      setBusy(null);
    }
  };

  const step = async (name: 'checked' | 'archive' | 'restore', message: string) => {
    if (!entry) return;
    setBusy(name);
    try {
      const updated = await stepFaqEntry(entry.id, name);
      setEntry(updated);
      setForm(formFrom(updated));
      setToast({ message, tone: 'success' });
    } catch (err) {
      setToast({ message: errorText(err, 'Could not change the entry.'), tone: 'danger' });
      setReload(value => value + 1);
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    if (!entry) return;
    setBusy('delete');
    try {
      await deleteFaqEntry(entry.id);
      done.current = true;
      navigate(APP_ROUTES.faq, { replace: true, state: { message: `Deleted "${entry.question || 'the entry'}".` } });
    } catch (err) {
      setConfirmDelete(false);
      setToast({ message: errorText(err, 'Could not delete the entry.'), tone: 'danger' });
    } finally {
      setBusy(null);
    }
  };

  const status = entry?.status;
  const menu: MenuAction[] = entry
    ? [
        ...(status !== 'ARCHIVED' ? [{ label: 'Archive', onSelect: () => void step('archive', 'Archived. Students no longer see it.') }] : []),
        { label: 'Delete', danger: true, onSelect: () => setConfirmDelete(true) },
      ]
    : [];
  const subtitle = entry
    ? [FAQ_STATUS_LABEL[entry.status], entry.imported ? `Imported from FAQ.pdf, ${entry.category.name}${entry.source?.page ? `, page ${entry.source.page}` : ''}` : entry.category.name].join(' · ')
    : 'A new answer for the chatbot. It stays a draft until you publish it.';
  const categoryOptions = categories.map(category => ({ value: category.id, label: category.name }));
  const linkOptions = [
    { value: NO_BUTTON, label: 'None' },
    ...Object.entries(FAQ_PORTAL_LINKS).map(([value, link]) => ({ value, label: link.label })),
  ];

  return (
    <RecordPage
      title={entry ? 'Edit entry' : 'Add entry'}
      subtitle={subtitle}
      backLabel="Back to entries"
      onBack={() => navigate(APP_ROUTES.faq)}
      pageKey={`faq-entry:${entryId ?? 'new'}`}
      dirty={dirty}
      busy={busy !== null}
      navigationComplete={done}
      actions={entry ? <OverflowMenu label="More entry actions" actions={menu} /> : undefined}
    >
      {loading ? (
        <LoadingState message="Opening the entry..." />
      ) : loadProblem ? (
        <ErrorState message={loadProblem} onRetry={() => setReload(value => value + 1)} />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <div className="space-y-5">
            {status === 'NEEDS_CHECKING' && entry?.source && (
              <section aria-label="Text in the PDF" className="space-y-2 rounded-2xl border border-amber-200 bg-amber-50 p-5">
                <p className="text-[14px] font-extrabold text-amber-900">Needs checking</p>
                {entry.source.note && <p className="text-[13px] text-amber-900">{entry.source.note}. Please write the correct answer before publishing.</p>}
                <p className="text-[12px] font-bold uppercase tracking-wider text-amber-800">Text in the PDF</p>
                <p className="whitespace-pre-line rounded-xl bg-white/70 p-3 text-[13px] text-slate-800 [overflow-wrap:anywhere]">{entry.source.text}</p>
              </section>
            )}
            {status === 'ARCHIVED' && (
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-300 bg-slate-100 px-5 py-4">
                <p className="text-[14px] font-semibold text-slate-800">Archived. Students can't see it.</p>
                <PortalButton variant="primary" isLoading={busy === 'restore'} onClick={() => void step('restore', 'Restored as a draft.')}>Restore</PortalButton>
              </div>
            )}

            <section aria-label="Entry" className="app-card space-y-4 p-5">
              <div className="space-y-1.5">
                <label htmlFor={`${ids}-question`} className="block text-[13px] font-bold text-slate-700">Question</label>
                <input id={`${ids}-question`} className={`form-control form-control-md text-[14px]${problems.question ? ' form-control-error' : ''}`} maxLength={500} value={form.question} onChange={event => set('question', event.target.value)} />
                {problems.question && <p role="alert" className="text-[12px] font-semibold text-rose-700">{problems.question}</p>}
              </div>
              <div className="space-y-1.5">
                <label htmlFor={`${ids}-alt`} className="block text-[13px] font-bold text-slate-700">Other ways students ask (optional)</label>
                <AltQuestions id={`${ids}-alt`} values={form.altQuestions} onChange={values => set('altQuestions', values)} />
                {problems.altQuestions && <p role="alert" className="text-[12px] font-semibold text-rose-700">{problems.altQuestions}</p>}
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-3">
                  <label htmlFor={`${ids}-answer`} className="block text-[13px] font-bold text-slate-700">Answer</label>
                  <button type="button" className="inline-flex items-center gap-1 text-[12px] font-bold text-blue-700 hover:text-blue-900" onClick={() => setPreview(value => !value)}>
                    {preview ? <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> : <Eye className="h-3.5 w-3.5" aria-hidden="true" />}
                    {preview ? 'Edit' : 'Preview'}
                  </button>
                </div>
                {preview ? (
                  <div className="min-h-32 rounded-xl border border-slate-200 bg-slate-50 p-4 text-[13px] leading-relaxed text-slate-800">
                    {form.answer.trim() ? <FaqText text={form.answer} /> : <span className="text-slate-400">Nothing to preview yet.</span>}
                  </div>
                ) : (
                  <textarea
                    id={`${ids}-answer`}
                    className={`form-control min-h-40 px-3.5 py-3 text-[14px]${problems.answer ? ' form-control-error' : ''}`}
                    maxLength={5000}
                    value={form.answer}
                    onChange={event => set('answer', event.target.value)}
                    aria-describedby={`${ids}-answer-hint`}
                  />
                )}
                <p id={`${ids}-answer-hint`} className="text-[12px] text-slate-500">**bold**, a "- " at the start of a line for bullets, and [link text](https://...) for links.</p>
                {problems.answer && <p role="alert" className="text-[12px] font-semibold text-rose-700">{problems.answer}</p>}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor={`${ids}-category`} className="block text-[13px] font-bold text-slate-700">Category</label>
                  <SelectMenu id={`${ids}-category`} value={form.category} placeholder="Choose a category" options={categoryOptions} onChange={value => set('category', value)} />
                  {problems.category && <p role="alert" className="text-[12px] font-semibold text-rose-700">{problems.category}</p>}
                </div>
                <div className="space-y-1.5">
                  <label htmlFor={`${ids}-link`} className="block text-[13px] font-bold text-slate-700">Portal button (optional)</label>
                  <SelectMenu
                    id={`${ids}-link`}
                    value={form.portalLink || NO_BUTTON}
                    options={linkOptions}
                    onChange={value => set('portalLink', (value === NO_BUTTON ? '' : value) as FaqPortalLink)}
                  />
                </div>
              </div>
              <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-4">
                {status === 'PUBLISHED' ? (
                  <PortalButton variant="primary" isLoading={busy === 'save'} disabled={busy !== null || !dirty} onClick={() => void save(false)}>Save changes</PortalButton>
                ) : status === 'ARCHIVED' ? null : (
                  <>
                    <PortalButton isLoading={busy === 'save'} disabled={busy !== null || (Boolean(entry) && !dirty)} onClick={() => void save(false)}>
                      {status === 'NEEDS_CHECKING' ? 'Save changes' : 'Save draft'}
                    </PortalButton>
                    {status === 'NEEDS_CHECKING' && (
                      <PortalButton isLoading={busy === 'checked'} disabled={busy !== null || dirty} onClick={() => void step('checked', 'Marked as checked. It is a draft until you publish it.')}>Mark as checked</PortalButton>
                    )}
                    <PortalButton variant="primary" isLoading={busy === 'publish'} disabled={busy !== null} onClick={() => void save(true)}>
                      {status === 'NEEDS_CHECKING' ? 'Mark as checked and publish' : 'Publish'}
                    </PortalButton>
                  </>
                )}
              </div>
            </section>

            {entry && entry.history.length > 0 && (
              <section aria-label="History" className="app-card space-y-3 p-5">
                <h2 className="section-label">History</h2>
                <ol className="divide-y divide-slate-100">
                  {entry.history.map(change => (
                    <li key={change.id} className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-2.5 text-[13px]">
                      <span className="font-semibold text-slate-800">{faqHistoryLine(change)}</span>
                      <span className="text-slate-500">{change.actor || 'Import'}, {historyTime(change.at)}</span>
                    </li>
                  ))}
                </ol>
              </section>
            )}
          </div>

          <aside className="space-y-5">
            {entry && (
              <p className="flex items-center gap-2 px-1 text-[13px] text-slate-600">
                Status: <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${FAQ_STATUS_CHIP[entry.status]}`}>{FAQ_STATUS_LABEL[entry.status]}</span>
              </p>
            )}
            <TryIt entry={entry} />
          </aside>
        </div>
      )}
      <PortalConfirmModal
        isOpen={confirmDelete}
        title="Delete this entry?"
        message="Students will no longer get this answer. It can't be undone; archiving keeps it instead. The history keeps a line with the question."
        confirmLabel="Delete"
        cancelLabel="Keep it"
        tone="danger"
        isLoading={busy === 'delete'}
        onConfirm={() => void remove()}
        onCancel={() => setConfirmDelete(false)}
      />
      <PortalToast message={toast?.message ?? null} tone={toast?.tone ?? 'success'} onClose={() => setToast(null)} />
    </RecordPage>
  );
};
