/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// One letter type, opened from Letter Generation's Letter types tab. Four tabs:
// Details (name, status, when it is used), Student form (the questions students
// answer), Letter (the English and Malay wording) and Issuing (numbering,
// signature, validity and the blanks the office fills in at approval).

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bold, Check, ChevronDown, FileSignature, Italic, List, ListChecks, Pencil, Plus, Settings2, Trash2, Underline, X } from 'lucide-react';
import { PortalButton, PortalConfirmModal, SegmentedControl, StatusBadge } from './PortalPrimitives';
import { RecordPage } from './RecordPage';
import { SelectMenu } from './SelectMenu';
import { PortalSelect } from './PortalSelect';
import { LetterPages } from './LetterPages';
import { AlertMessage } from './AlertMessage';
import { AppointmentIcon } from './AppointmentPrimitives';
import { LetterQuestionsEditor } from './LetterQuestionsEditor';
import type { ChoiceListSummary, LetterCustomField, LetterPlaceholder, LetterQuestion, LetterRecipientPurpose, LetterTemplate } from '../types';
import {
  APPOINTMENT_PLACEHOLDERS,
  LETTERHEAD,
  fieldNameFromLabel,
  fillLetterTags,
  formatLetterDate,
  findPlaceholderProblems,
  isAppointmentLetter,
  letterClosing,
  placeholderPurposeHint,
  placeholdersFor,
  renderLetterBodyHtml,
} from '../utils/letterDocument';
import {
  BLANK_TEMPLATE,
  DEFAULT_REFERENCE_PREFIX,
  LETTER_TYPES,
  MAX_READY_DAYS,
  MAX_VALID_MONTHS,
  PURPOSE_CHIP,
  PURPOSE_NOTE,
  PURPOSE_OPTIONS,
  STATUS_HINT,
  STATUS_TONE,
  describePlaceholderProblems,
  isCustomQuestion,
  questionNames,
  sameValues,
  valuesOf,
  type EditorValues,
} from '../utils/letterEditor';
import {
  createLetterTemplate,
  deleteLetterTemplate,
  fieldErrors,
  getChoiceList,
  getChoiceLists,
  getLetterSampleValues,
  getRecipientOptions,
  updateLetterTemplate,
} from '../services';

type EditorTab = 'details' | 'form' | 'letter' | 'issuing';
const TABS: readonly EditorTab[] = ['details', 'form', 'letter', 'issuing'];
const TAB_LABELS: Record<EditorTab, string> = { details: 'Details', form: 'Student form', letter: 'Letter', issuing: 'Issuing' };

// Fields a 400 response can point at, and the tab each one lives on.
const FIELD_TABS = {
  name: 'details',
  description: 'details',
  purpose: 'details',
  readyInDays: 'details',
  formQuestions: 'form',
  asksRecipient: 'form',
  content: 'letter',
  contentMs: 'letter',
  referencePrefix: 'issuing',
  signatoryName: 'issuing',
  signatoryTitle: 'issuing',
  validMonths: 'issuing',
  customFields: 'issuing',
} as const satisfies Record<string, EditorTab>;
type EditorField = keyof typeof FIELD_TABS;

// Tags only letters students ask for may use: who it is for, valid until, semesters left.
const REQUEST_TAGS = new Set(APPOINTMENT_PLACEHOLDERS.filter((p) => p.purposes.includes('REQUEST')).map((p) => p.tag));
const RECIPIENT_LINE_RE = /^[ \t]*\{\{RECIPIENT\}\}[ \t]*\n(?:[ \t]*\n)*/gm;
const MAX_BLANKS = 20;

const Field: React.FC<{ label: string; htmlFor?: string; hint?: string; error?: string; children: React.ReactNode }> = ({ label, htmlFor, hint, error, children }) => (
  <div className="space-y-1.5">
    <label htmlFor={htmlFor} className="form-label block">{label}</label>
    {children}
    {error ? <p role="alert" className="text-sm font-medium text-rose-800">{error}</p> : hint ? <p className="card-caption text-[11.5px] leading-snug">{hint}</p> : null}
  </div>
);

const Card: React.FC<{ title: string; description?: string; icon?: React.ComponentProps<typeof AppointmentIcon>['icon']; children: React.ReactNode; className?: string }> = ({
  title,
  description,
  icon,
  children,
  className = '',
}) => (
  <section aria-label={title} className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4 ${className}`}>
    <div className="flex items-start gap-3">
      {icon ? <AppointmentIcon icon={icon} tone="info" /> : null}
      <div className="min-w-0">
        <h2 className="section-label">{title}</h2>
        {description ? <p className="card-description mt-1">{description}</p> : null}
      </div>
    </div>
    {children}
  </section>
);

interface LetterTypeEditorProps {
  /** The letter type to edit, or null for a new one. */
  template: LetterTemplate | null;
  placeholders: LetterPlaceholder[] | null;
  onClose: () => void;
  onSaved: (template: LetterTemplate, created: boolean) => void;
  onDeleted: (template: LetterTemplate) => void;
  onOpenLists: () => void;
  onMessage: (message: string) => void;
}

export const LetterTypeEditor: React.FC<LetterTypeEditorProps> = ({ template, placeholders, onClose, onSaved, onDeleted, onOpenLists, onMessage }) => {
  const [saved, setSaved] = useState<EditorValues>(template ? valuesOf(template) : BLANK_TEMPLATE);
  const [draft, setDraft] = useState<EditorValues>(saved);
  const [current, setCurrent] = useState<LetterTemplate | null>(template);
  const [tab, setTab] = useState<EditorTab>('details');
  const [problems, setProblems] = useState<Partial<Record<EditorField, string>>>({});
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [mode, setMode] = useState<'write' | 'preview'>('write');
  const [language, setLanguage] = useState<'en' | 'ms'>('en');
  const [insertOpen, setInsertOpen] = useState(false);
  const [blankLabel, setBlankLabel] = useState('');
  const [blankError, setBlankError] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameLabel, setRenameLabel] = useState('');
  const [purposes, setPurposes] = useState<LetterRecipientPurpose[] | null>(null);
  const [lists, setLists] = useState<ChoiceListSummary[] | null>(null);
  const [listItems, setListItems] = useState<Record<string, { id: string; name: string }[]>>({});
  // A real student's details for the preview, looked up by matric number.
  const [sampleMatric, setSampleMatric] = useState('');
  const [sample, setSample] = useState<{ studentName: string; matricNumber: string; values: Record<string, string> } | null>(null);
  const [sampleError, setSampleError] = useState<string | null>(null);
  const [sampleLoading, setSampleLoading] = useState(false);
  const finished = useRef(false);
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pendingCursor = useRef<number | null>(null);
  const insertMenuRef = useRef<HTMLDivElement>(null);

  const dirty = !sameValues(draft, saved);
  const set = (changes: Partial<EditorValues>) => setDraft((value) => ({ ...value, ...changes }));
  const clearProblem = (...fields: EditorField[]) =>
    setProblems((value) => (fields.some((field) => value[field]) ? Object.fromEntries(Object.entries(value).filter(([key]) => !fields.includes(key as EditorField))) : value));

  const editorContent = draft.content;
  const editorContentMs = draft.contentMs;
  const editorPurpose = draft.purpose;
  const editorFields = draft.customFields;
  const request = editorPurpose === 'REQUEST';
  const recipientQuestion = draft.questions.find((question) => question.kind === 'recipient');

  // The recipients list and the office's other lists, for the Student form tab.
  useEffect(() => {
    if (tab !== 'form' || purposes) return;
    getRecipientOptions().then((options) => setPurposes(options.purposes)).catch(() => setPurposes([]));
    getChoiceLists().then(setLists).catch(() => setLists([]));
  }, [tab, purposes]);

  const needList = useCallback(
    (listId: string) => {
      if (listItems[listId]) return;
      setListItems((value) => ({ ...value, [listId]: [] }));
      getChoiceList(listId)
        .then((list) => setListItems((value) => ({ ...value, [listId]: list.items.filter((item) => !item.hidden).map((item) => ({ id: item.id, name: item.name })) })))
        .catch(() => undefined);
    },
    [listItems],
  );

  // After an inserted tag changes the wording, put the caret just after it.
  useEffect(() => {
    if (pendingCursor.current === null) return;
    const cursor = pendingCursor.current;
    pendingCursor.current = null;
    textareaRef.current?.focus();
    textareaRef.current?.setSelectionRange(cursor, cursor);
  }, [editorContent, editorContentMs]);

  useEffect(() => {
    if (!insertOpen) return;
    const onDown = (event: MouseEvent) => {
      if (!insertMenuRef.current?.contains(event.target as Node)) setInsertOpen(false);
    };
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setInsertOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [insertOpen]);

  // The tags this kind of letter may use, from the server's registry (the local copy covers loading).
  const placeholderTags = (placeholders?.filter((p) => !p.purposes || p.purposes.includes(editorPurpose)) ?? placeholdersFor(editorPurpose).map((p) => ({ ...p, source: '' }))).map((p) => ({
    label: p.label,
    tag: p.tag,
    source: p.source,
    group: REQUEST_TAGS.has(p.tag) ? 'request' : placeholderPurposeHint(p.tag) ? 'appointment' : 'record',
  }));
  const offeredTags = placeholderTags.filter(
    (p) => (p.tag !== '{{RECIPIENT}}' || Boolean(recipientQuestion)) && (p.tag !== '{{VALID_UNTIL}}' || draft.validMonths.trim() !== ''),
  );
  const studentQuestions = draft.questions.filter(isCustomQuestion);
  const content = language === 'ms' ? editorContentMs : editorContent;
  const setContent = (next: string) => set(language === 'ms' ? { contentMs: next } : { content: next });
  const knownLabels = new Map(placeholderTags.map((p) => [p.tag, p.label]));
  const usedDetails = Array.from(new Set(`${editorContent}\n${editorContentMs}`.match(/\{\{[A-Z_]+\}\}/g) ?? [])).map((tag) => {
    const field = editorFields.find((f) => `{{${f.name}}}` === tag);
    if (field) return { tag, label: field.label || field.name, kind: 'office' as const };
    const question = studentQuestions.find((q) => `{{${q.name}}}` === tag);
    if (question) return { tag, label: question.label || question.name || tag, kind: 'student' as const };
    const label = knownLabels.get(tag);
    return label ? { tag, label, kind: 'record' as const } : { tag, label: tag, kind: 'unknown' as const };
  });
  const closing = letterClosing({ purpose: editorPurpose, signatoryName: draft.signatoryName, signatoryTitle: draft.signatoryTitle });
  const referencePreview = `${(draft.referencePrefix.trim() || DEFAULT_REFERENCE_PREFIX).replace(/\/+$/, '')}/${new Date().getFullYear()}/####`;
  const typeOptions = draft.type && !LETTER_TYPES.includes(draft.type) ? [...LETTER_TYPES, draft.type] : LETTER_TYPES;
  const officeTags = useMemo(() => [...editorFields.map((f) => f.name), ...questionNames(draft.questions)], [editorFields, draft.questions]);

  const insertTag = (tag: string) => {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? content.length;
    const end = textarea?.selectionEnd ?? content.length;
    const before = content.slice(0, start);
    const after = content.slice(end);
    // Pad with a single space only where the tag would otherwise touch a word.
    const lead = before.length && !/[\s(]$/.test(before) ? ' ' : '';
    const trail = after.length && !/^[\s).,;:]/.test(after) ? ' ' : '';
    const insertion = `${lead}${tag}${trail}`;
    setMode('write');
    setInsertOpen(false);
    setContent(before + insertion + after);
    pendingCursor.current = before.length + insertion.length;
  };

  const wrapSelection = (marker: string, label: string) => {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? content.length;
    const end = textarea?.selectionEnd ?? content.length;
    const selected = content.slice(start, end) || label;
    const before = content.slice(0, start);
    setContent(`${before}${marker}${selected}${marker}${content.slice(end)}`);
    pendingCursor.current = before.length + marker.length + selected.length;
  };

  const toggleBulletList = () => {
    const textarea = textareaRef.current;
    const selStart = textarea?.selectionStart ?? 0;
    const selEnd = textarea?.selectionEnd ?? 0;
    const lineStart = content.lastIndexOf('\n', selStart - 1) + 1;
    let lineEnd = content.indexOf('\n', selEnd);
    if (lineEnd === -1) lineEnd = content.length;
    const before = content.slice(0, lineStart);
    const block = content.slice(lineStart, lineEnd);
    const allBulleted = block.split('\n').every((l) => l.trim() === '' || /^\s*-\s+/.test(l));
    const newBlock = block.split('\n').map((l) => (l.trim() === '' ? l : allBulleted ? l.replace(/^\s*-\s+/, '') : `- ${l}`)).join('\n');
    setContent(before + newBlock + content.slice(lineEnd));
    pendingCursor.current = (before + newBlock).length;
  };

  // Take a tag out of the letter's text, on both pages.
  const takeOut = (tag: string) => {
    const strip = (text: string) => text.split(tag).join('').replace(/[ \t]{2,}/g, ' ').replace(/ ([.,;:)])/g, '$1');
    setDraft((value) => ({ ...value, content: strip(value.content), contentMs: strip(value.contentMs) }));
    clearProblem('content', 'contentMs');
  };

  // The office names a blank it fills in; the tag behind it is made for them.
  const addBlank = (insert: boolean) => {
    const label = blankLabel.trim();
    if (!label) {
      setBlankError('Type what the office should fill in, for example Attendance (%).');
      return;
    }
    const existing = editorFields.find((f) => f.label.trim().toLowerCase() === label.toLowerCase());
    if (existing) {
      if (insert) insertTag(`{{${existing.name}}}`);
      setBlankLabel('');
      return;
    }
    if (editorFields.length >= MAX_BLANKS) {
      setBlankError(`A letter can have at most ${MAX_BLANKS} blanks for the office.`);
      return;
    }
    const name = fieldNameFromLabel(label, officeTags);
    set({ customFields: [...editorFields, { name, label, hint: '' }] });
    clearProblem('customFields');
    setBlankLabel('');
    setBlankError(null);
    if (insert) insertTag(`{{${name}}}`);
  };

  const renameBlank = (name: string) => {
    const label = renameLabel.trim();
    if (!label) return;
    set({ customFields: editorFields.map((f) => (f.name === name ? { ...f, label } : f)) });
    setRenaming(null);
  };

  const deleteBlank = (field: LetterCustomField) => {
    takeOut(`{{${field.name}}}`);
    setDraft((value) => ({ ...value, customFields: value.customFields.filter((f) => f.name !== field.name) }));
    clearProblem('customFields');
    onMessage(`Deleted "${field.label || field.name}" and took it out of the letter.`);
  };

  // Adding "Who is the letter for?" puts the recipient at the top of each page;
  // removing it takes that line out again. Removed questions leave the letter too.
  const changeQuestions = (next: LetterQuestion[]) => {
    const had = draft.questions.some((q) => q.kind === 'recipient');
    const has = next.some((q) => q.kind === 'recipient');
    const removedTags = questionNames(draft.questions).filter((name) => !questionNames(next).includes(name));
    setDraft((value) => {
      let { content: english, contentMs: malay } = value;
      if (has && !had) {
        const addTop = (text: string) => (text.includes('{{RECIPIENT}}') ? text : `{{RECIPIENT}}\n\n${text.replace(/^\s+/, '')}`);
        english = addTop(english);
        malay = malay.trim() ? addTop(malay) : malay;
      }
      if (had && !has) {
        english = english.replace(RECIPIENT_LINE_RE, '');
        malay = malay.replace(RECIPIENT_LINE_RE, '');
      }
      for (const name of removedTags) {
        const strip = (text: string) => text.split(`{{${name}}}`).join('').replace(/[ \t]{2,}/g, ' ');
        english = strip(english);
        malay = strip(malay);
      }
      return { ...value, questions: next, content: english, contentMs: malay };
    });
    if (has && !had && !editorContent.includes('{{RECIPIENT}}')) onMessage('Recipient was added at the top of the letter. Move it in the Letter tab if needed.');
    if (had && !has) onMessage('Recipient was taken out of the letter.');
    clearProblem('formQuestions', 'asksRecipient', 'content', 'contentMs');
  };

  const checkLetter = () => {
    const names = [...editorFields.map((f) => f.name), ...questionNames(draft.questions)];
    const both = `${editorContent}\n${editorContentMs}`;
    const english = describePlaceholderProblems(findPlaceholderProblems(editorContent, names, editorPurpose));
    const malay = describePlaceholderProblems(findPlaceholderProblems(editorContentMs, names, editorPurpose));
    const settings = [
      both.includes('{{RECIPIENT}}') && !recipientQuestion ? 'This letter shows who it is for. Add "Who is the letter for?" in the Student form tab.' : '',
      recipientQuestion && !editorContent.includes('{{RECIPIENT}}') ? 'Students say who this letter is for, but the letter does not show it. Insert Recipient.' : '',
      recipientQuestion && editorContentMs.trim() && !editorContentMs.includes('{{RECIPIENT}}') ? 'The Malay page does not show who the letter is for. Insert Recipient there too.' : '',
      both.includes('{{VALID_UNTIL}}') && !draft.validMonths.trim() ? 'This letter shows a valid-until date. Say how many months it stays valid in the Issuing tab.' : '',
    ].filter(Boolean).join(' ');
    const message = [english, malay && `Malay page: ${malay}`, settings].filter(Boolean).join(' ');
    if (message) {
      setProblems((value) => ({ ...value, content: english || settings || undefined, contentMs: malay || undefined }));
      onMessage(message);
      return;
    }
    clearProblem('content', 'contentMs');
    onMessage(`All ${new Set(both.match(/\{\{[A-Z_]+\}\}/g) ?? []).size} details in this letter are supported.`);
  };

  const save = async () => {
    if (saving) return;
    const local: Partial<Record<EditorField, string>> = {};
    if (!draft.name.trim()) local.name = 'Give the letter type a name.';
    const months = draft.validMonths.trim();
    if (months && (!/^\d+$/.test(months) || Number(months) < 1 || Number(months) > MAX_VALID_MONTHS)) {
      local.validMonths = `Use a whole number of months from 1 to ${MAX_VALID_MONTHS}, or leave it blank.`;
    }
    const days = draft.readyInDays.trim();
    if (days && (!/^\d+$/.test(days) || Number(days) < 1 || Number(days) > MAX_READY_DAYS)) {
      local.readyInDays = `Use a whole number of working days from 1 to ${MAX_READY_DAYS}, or leave it blank.`;
    }
    if (Object.keys(local).length) {
      setProblems(local);
      setTab(FIELD_TABS[Object.keys(local)[0] as EditorField]);
      return;
    }
    const submitted = draft;
    const body = {
      name: submitted.name.trim(),
      type: submitted.type,
      description: submitted.description,
      referencePrefix: submitted.referencePrefix.trim(),
      content: submitted.content,
      contentMs: submitted.contentMs,
      customFields: editorFields,
      status: submitted.status,
      purpose: submitted.purpose,
      formQuestions: request ? submitted.questions : [],
      validMonths: request && months ? Number(months) : null,
      readyInDays: request && days ? Number(days) : null,
      signatoryName: submitted.signatoryName.trim(),
      signatoryTitle: submitted.signatoryTitle.trim(),
    };
    setSaving(true);
    try {
      const result = current ? await updateLetterTemplate(current.id, body) : await createLetterTemplate(body);
      const fresh = valuesOf(result);
      setCurrent(result);
      setSaved(fresh);
      // Keep anything typed while saving.
      if (sameValues(draftRef.current, submitted)) setDraft(fresh);
      setProblems({});
      onSaved(result, !current);
      onMessage(`Letter type "${result.name}" ${current ? 'saved' : 'created'}.`);
    } catch (err) {
      const errors = fieldErrors(err);
      const found = Object.fromEntries(Object.keys(FIELD_TABS).filter((field) => errors[field]).map((field) => [field, errors[field]])) as Partial<Record<EditorField, string>>;
      setProblems(found);
      const first = Object.keys(found)[0] as EditorField | undefined;
      if (first) setTab(FIELD_TABS[first]);
      onMessage(`Not saved: ${err instanceof Error ? err.message : 'please try again.'}`);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!current || saving) return;
    setSaving(true);
    try {
      await deleteLetterTemplate(current.id);
      finished.current = true;
      onDeleted(current);
    } catch (err) {
      onMessage(err instanceof Error ? `Not deleted: ${err.message}` : 'Not deleted.');
      setSaving(false);
      setConfirmingDelete(false);
    }
  };

  const loadSample = async () => {
    const matric = sampleMatric.trim();
    if (!matric) {
      setSampleError('Type a matric number.');
      return;
    }
    setSampleLoading(true);
    setSampleError(null);
    try {
      setSample(await getLetterSampleValues(matric));
    } catch (err) {
      setSample(null);
      setSampleError(err instanceof Error ? err.message : 'Could not find that student.');
    } finally {
      setSampleLoading(false);
    }
  };
  const previewText = (text: string) => (sample ? fillLetterTags(text, sample.values) : text);

  const problemList = (Object.entries(problems) as [EditorField, string][]).filter(([, message]) => message);
  const tabHasProblem = (value: EditorTab) => problemList.some(([field]) => FIELD_TABS[field] === value);

  const toolButton = 'p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition cursor-pointer';
  const insertGroups = [
    { title: 'From the student record', tags: offeredTags.filter((p) => p.group === 'record').map((p) => ({ tag: p.tag, label: p.label, hint: p.source })) },
    { title: 'From the request', tags: offeredTags.filter((p) => p.group === 'request').map((p) => ({ tag: p.tag, label: p.label, hint: p.source })) },
    { title: 'From the appointment', tags: offeredTags.filter((p) => p.group === 'appointment').map((p) => ({ tag: p.tag, label: p.label, hint: p.source })) },
    { title: 'Student answers', tags: studentQuestions.map((q) => ({ tag: `{{${q.name}}}`, label: q.label || q.name || '', hint: 'The student answers it on the form' })) },
    { title: 'Office fills in', tags: editorFields.map((f) => ({ tag: `{{${f.name}}}`, label: f.label || f.name, hint: 'The office types it in when approving' })) },
  ].filter((group) => group.tags.length > 0 || group.title === 'Office fills in');

  return (
    <RecordPage
      title={draft.name.trim() || (current ? 'Untitled letter type' : 'New letter type')}
      subtitle={current ? `${PURPOSE_CHIP[draft.purpose]} · last changed ${current.lastModified}${current.modifiedBy ? ` by ${current.modifiedBy}` : ''}` : 'Not saved yet.'}
      backLabel="Back to letter types"
      onBack={onClose}
      pageKey={`letter-type:${current?.id ?? 'new'}`}
      dirty={dirty && !finished.current}
      busy={saving}
      navigationComplete={finished}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge tone={STATUS_TONE[draft.status]} dot>{draft.status}</StatusBadge>
          {dirty && <span className="text-[12.5px] font-semibold text-amber-800">Unsaved changes</span>}
        </div>
        <div className="flex flex-wrap gap-2">
          {current && <PortalButton variant="ghost" icon={Trash2} disabled={saving} onClick={() => setConfirmingDelete(true)}>Delete</PortalButton>}
          {dirty && <PortalButton disabled={saving} onClick={() => { setDraft(saved); setProblems({}); onMessage('Changes discarded.'); }}>Discard changes</PortalButton>}
          <PortalButton variant="primary" icon={Check} isLoading={saving} onClick={() => void save()}>{current ? 'Save' : 'Create letter type'}</PortalButton>
        </div>
      </div>

      <div role="tablist" aria-label="Letter type sections" className="flex w-fit flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
        {TABS.map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={`card-value inline-flex items-center gap-2 rounded-md px-3 py-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy ${tab === value ? 'bg-white text-brand-navy shadow-sm' : 'text-slate-600 hover:bg-white/60'}`}
          >
            {TAB_LABELS[value]}
            {tabHasProblem(value) && <span aria-label="has a problem" className="h-2 w-2 rounded-full bg-rose-500" />}
          </button>
        ))}
      </div>

      {problemList.length > 0 && (
        <AlertMessage
          type="error"
          title="Changes weren't saved"
          message="Correct these, then save again."
        >
          <ul className="list-disc space-y-1 pl-5">
            {problemList.map(([field, message]) => (
              <li key={field}>
                <button type="button" className="text-left font-medium underline underline-offset-2 cursor-pointer" onClick={() => setTab(FIELD_TABS[field])}>
                  {TAB_LABELS[FIELD_TABS[field]]}: {message}
                </button>
              </li>
            ))}
          </ul>
        </AlertMessage>
      )}

      {tab === 'details' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
          <Card title="Details" description="What students and staff see in the list of letters." icon={Settings2} className="lg:col-span-7">
            <Field label="Name" htmlFor="letter-template-name" error={problems.name}>
              <input
                id="letter-template-name"
                type="text"
                value={draft.name}
                maxLength={255}
                onChange={(event) => { set({ name: event.target.value }); clearProblem('name'); }}
                aria-invalid={problems.name ? true : undefined}
                className="form-control form-control-md"
                placeholder="For example: Student Confirmation Letter"
              />
            </Field>
            <Field label="Short description" htmlFor="letter-template-description" hint="Students see this when choosing a letter." error={problems.description}>
              <textarea
                id="letter-template-description"
                rows={2}
                value={draft.description}
                maxLength={500}
                onChange={(event) => { set({ description: event.target.value }); clearProblem('description'); }}
                className="form-control form-control-md resize-none"
                placeholder="What this letter is for"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Letter type" htmlFor="letter-template-type">
                <SelectMenu id="letter-template-type" value={draft.type} options={typeOptions.map((type) => ({ value: type, label: type }))} onChange={(type) => set({ type })} />
              </Field>
              <Field label="Status" htmlFor="letter-template-status" hint={STATUS_HINT[draft.status]}>
                <PortalSelect
                  id="letter-template-status"
                  aria-label="Template Status Option"
                  value={draft.status}
                  onChange={(event) => set({ status: event.target.value as EditorValues['status'] })}
                  className="form-control form-control-md cursor-pointer"
                >
                  <option value="Active">Active</option>
                  <option value="Draft">Draft</option>
                  <option value="Archived">Archived</option>
                </PortalSelect>
              </Field>
            </div>
            {request && (
              <Field label="Usually ready in (working days)" htmlFor="letter-template-ready-days" hint="Shown to students before they send a request. Leave blank to say nothing." error={problems.readyInDays}>
                <input
                  id="letter-template-ready-days"
                  type="text"
                  inputMode="numeric"
                  value={draft.readyInDays}
                  maxLength={2}
                  onChange={(event) => { set({ readyInDays: event.target.value.replace(/\D/g, '') }); clearProblem('readyInDays'); }}
                  className="form-control form-control-md w-40"
                  placeholder="For example: 2"
                />
              </Field>
            )}
          </Card>
          <section aria-label="When is this letter used?" className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <fieldset className="space-y-3">
              <legend className="section-label mb-3">When is this letter used?</legend>
              {PURPOSE_OPTIONS.map((option) => (
                <label key={option.value} className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="radio"
                    name="letter-template-purpose"
                    value={option.value}
                    checked={editorPurpose === option.value}
                    onChange={() => { set({ purpose: option.value }); clearProblem('purpose', 'formQuestions'); }}
                    className="mt-1 accent-[#0c1424]"
                  />
                  <span>
                    <span className="block text-[13px] font-semibold text-slate-800">{option.label}</span>
                    <span className="block card-caption text-[11.5px] leading-snug">{option.description}</span>
                  </span>
                </label>
              ))}
              {PURPOSE_NOTE[editorPurpose] && <AlertMessage type="info" message={PURPOSE_NOTE[editorPurpose] ?? ''} />}
              {!request && draft.questions.length > 0 && (
                <AlertMessage type="warning" message="Letters sent automatically have no student form. Its questions are not saved for this kind of letter." />
              )}
              {problems.purpose && <p role="alert" className="text-sm font-medium text-rose-800">{problems.purpose}</p>}
            </fieldset>
          </section>
        </div>
      )}

      {tab === 'form' &&
        (request ? (
          <LetterQuestionsEditor
            questions={draft.questions}
            onChange={changeQuestions}
            wording={`${editorContent}\n${editorContentMs}`}
            takenNames={editorFields.map((f) => f.name)}
            purposes={purposes}
            lists={lists}
            listItems={listItems}
            onNeedList={needList}
            error={problems.formQuestions || problems.asksRecipient}
            onOpenLists={onOpenLists}
          />
        ) : (
          <AlertMessage type="info" title="No student form" message="This letter is sent automatically after an appointment is approved, so students do not ask for it." />
        ))}

      {tab === 'letter' && (
        <section aria-labelledby="letter-body-heading" className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 pb-3">
            <div className="flex items-start gap-3">
              <AppointmentIcon icon={FileSignature} tone="info" />
              <div>
                <h2 id="letter-body-heading" className="section-label">Letter</h2>
                <p className="card-description mt-1">The letterhead, reference, date and signature are added for you.</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {mode === 'write' && (
                <SegmentedControl<'en' | 'ms'> options={['en', 'ms'] as const} value={language} onChange={setLanguage} labels={{ en: 'English', ms: editorContentMs.trim() ? 'Malay' : 'Malay (optional)' }} />
              )}
              <SegmentedControl<'write' | 'preview'> options={['write', 'preview'] as const} value={mode} onChange={setMode} labels={{ write: 'Write', preview: 'Preview' }} />
            </div>
          </div>

          {mode === 'write' ? (
            <>
              <div className="flex flex-wrap items-center gap-1 border-y border-slate-100 bg-slate-50/60 px-4 py-2">
                <button type="button" onClick={() => wrapSelection('**', 'bold')} className={toolButton} title="Bold" aria-label="Bold"><Bold className="w-4 h-4" /></button>
                <button type="button" onClick={() => wrapSelection('*', 'italic')} className={toolButton} title="Italic" aria-label="Italic"><Italic className="w-4 h-4" /></button>
                <button type="button" onClick={() => wrapSelection('__', 'underline')} className={toolButton} title="Underline" aria-label="Underline"><Underline className="w-4 h-4" /></button>
                <button type="button" onClick={toggleBulletList} className={toolButton} title="Bullet list" aria-label="Bullet list"><List className="w-4 h-4" /></button>
                <span aria-hidden="true" className="mx-2 h-5 w-px bg-slate-200" />
                <div ref={insertMenuRef} className="relative">
                  <button
                    type="button"
                    aria-haspopup="true"
                    aria-expanded={insertOpen}
                    onClick={() => setInsertOpen(!insertOpen)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-700 hover:border-slate-300 cursor-pointer"
                  >
                    <Plus aria-hidden="true" className="w-3.5 h-3.5" />
                    Insert
                    <ChevronDown aria-hidden="true" className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                  {insertOpen && (
                    <div className="absolute left-0 z-20 mt-2 w-80 max-w-[calc(100vw-3rem)] max-h-[26rem] overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                      {insertGroups.map((group) => (
                        <div key={group.title} className="py-1">
                          <p className="px-2 pb-1 card-label">{group.title}</p>
                          {group.tags.map((item) => (
                            <button
                              key={item.tag}
                              type="button"
                              onClick={() => insertTag(item.tag)}
                              title={item.hint || undefined}
                              className="flex w-full items-center rounded-lg px-2 py-1.5 text-left text-[12.5px] font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                            >
                              {item.label}
                            </button>
                          ))}
                          {group.title === 'Office fills in' && (
                            <div className="mt-1 space-y-2 px-2 pb-1">
                              <label htmlFor="office-detail-label" className="block text-[12px] font-semibold text-slate-600">Add a blank the office fills in</label>
                              <div className="flex gap-2">
                                <input
                                  id="office-detail-label"
                                  type="text"
                                  value={blankLabel}
                                  maxLength={80}
                                  onChange={(event) => { setBlankLabel(event.target.value); setBlankError(null); }}
                                  onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addBlank(true); } }}
                                  placeholder="For example: Attendance (%)"
                                  className="form-control form-control-sm"
                                />
                                <PortalButton size="sm" variant="primary" onClick={() => addBlank(true)}>Add</PortalButton>
                              </div>
                              {blankError && <p role="alert" className="text-[12px] text-rose-800">{blankError}</p>}
                            </div>
                          )}
                        </div>
                      ))}
                      {request && studentQuestions.length === 0 && (
                        <p className="px-2 py-1 card-caption">To ask the student something, add a question in the Student form tab.</p>
                      )}
                    </div>
                  )}
                </div>
                <button type="button" onClick={checkLetter} className="ml-auto text-[12.5px] font-semibold text-blue-700 hover:text-blue-900 cursor-pointer">Check for mistakes</button>
              </div>
              {language === 'ms' && !editorContentMs.trim() && (
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-blue-50/60 px-5 py-3">
                  <p className="text-[12.5px] font-medium text-blue-900">The Malay letter is printed as a second page. Leave it empty for an English-only letter.</p>
                  {editorContent.trim() && <PortalButton size="sm" onClick={() => set({ contentMs: editorContent })}>Start from the English text</PortalButton>}
                </div>
              )}
              <textarea
                ref={textareaRef}
                rows={16}
                value={content}
                onChange={(event) => { setContent(event.target.value); clearProblem(language === 'ms' ? 'contentMs' : 'content'); }}
                aria-label={language === 'ms' ? 'Malay letter content' : 'Letter content'}
                aria-invalid={(language === 'ms' ? problems.contentMs : problems.content) ? true : undefined}
                className="block w-full resize-y border-0 bg-white px-6 py-5 text-[14px] leading-7 text-slate-800 placeholder:text-slate-400 focus:outline-none"
                placeholder={language === 'ms' ? 'Tulis surat dalam Bahasa Melayu. Insert works here too.' : "Write the letter. Use Insert for the student's name, matric number and other details."}
              />
              <div className="space-y-2 border-t border-slate-100 px-5 py-4">
                <p className="card-label">Used in this letter</p>
                {usedDetails.length === 0 ? (
                  <p className="card-description">Nothing yet. Use Insert to add the student's name and other details.</p>
                ) : (
                  <ul className="flex flex-wrap gap-2">
                    {usedDetails.map((detail) => (
                      <li
                        key={detail.tag}
                        className={`inline-flex items-center gap-1.5 rounded-lg border py-1 pl-2.5 text-[12px] font-medium ${detail.kind === 'record' ? 'pr-2.5' : 'pr-1'} ${
                          detail.kind === 'office'
                            ? 'border-amber-200 bg-amber-50 text-amber-900'
                            : detail.kind === 'student'
                              ? 'border-blue-150 bg-blue-50 text-blue-800'
                              : detail.kind === 'unknown'
                                ? 'border-rose-200 bg-rose-50 text-rose-800'
                                : 'border-slate-200 bg-slate-50 text-slate-700'
                        }`}
                      >
                        {detail.kind === 'unknown' ? `Not recognised: ${detail.tag}. Check the spelling.` : detail.label}
                        {detail.kind === 'office' && <span className="text-amber-700">· office fills in</span>}
                        {detail.kind === 'student' && <span className="text-blue-700">· student answers</span>}
                        {detail.kind !== 'record' && (
                          <button type="button" onClick={() => takeOut(detail.tag)} aria-label={`Take ${detail.label} out of the letter`} title="Take it out of the letter" className="rounded p-0.5 hover:bg-white/70 cursor-pointer">
                            <X aria-hidden="true" className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                <p className="card-caption">
                  Words in {'{{double curly brackets}}'} are replaced with the real details when each letter is made. A line like {'| Name | {{STUDENT_NAME}} |'} becomes a row of a details table.
                </p>
              </div>
            </>
          ) : (
            <div className="border-t border-slate-100 bg-slate-100/70 p-4 sm:p-6 space-y-4">
              <form
                className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  void loadSample();
                }}
              >
                <label className="form-label min-w-48 flex-1">
                  Preview with a student
                  <input
                    type="search"
                    className="form-control form-control-sm mt-1"
                    value={sampleMatric}
                    placeholder="Matric number, for example 23004955"
                    onChange={(event) => { setSampleMatric(event.target.value); setSampleError(null); }}
                  />
                </label>
                <PortalButton size="sm" type="submit" isLoading={sampleLoading}>Show</PortalButton>
                {sample && <PortalButton size="sm" variant="ghost" onClick={() => { setSample(null); setSampleMatric(''); }}>Clear</PortalButton>}
                <p className={`basis-full card-caption ${sampleError ? 'text-rose-700' : ''}`}>
                  {sampleError ?? (sample ? `Showing ${sample.studentName}'s details (${sample.matricNumber}). Answers and office blanks still show as blanks.` : 'Fills in the details from a real student record, to check the letter reads well.')}
                </p>
              </form>
              {editorContent.trim() ? (
                <LetterPages
                  reference={referencePreview}
                  referenceText={referencePreview}
                  date={sample ? formatLetterDate() : '{{CURRENT_DATE}}'}
                  bodyHtml={renderLetterBodyHtml(previewText(editorContent), { highlightPlaceholders: true, officeFields: officeTags })}
                  malayBodyHtml={editorContentMs.trim() ? renderLetterBodyHtml(previewText(editorContentMs), { highlightPlaceholders: true, officeFields: officeTags }) : undefined}
                  closing={closing}
                />
              ) : (
                <p className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-16 text-center card-description">Nothing written yet.</p>
              )}
            </div>
          )}
          {(problems.content || problems.contentMs) && (
            <p role="alert" className="border-t border-rose-100 bg-rose-50 px-5 py-3 text-sm font-medium text-rose-800">
              {[problems.content, problems.contentMs && `Malay page: ${problems.contentMs}`].filter(Boolean).join(' ')}
            </p>
          )}
        </section>
      )}

      {tab === 'issuing' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
          <div className="lg:col-span-6 space-y-6">
            <Card title="Reference and signature" icon={FileSignature}>
              <Field label="Reference prefix" htmlFor="letter-template-prefix" hint={`Letters are numbered ${referencePreview.replace('####', '0001')}, then 0002 and so on.`} error={problems.referencePrefix}>
                <input id="letter-template-prefix" type="text" value={draft.referencePrefix} maxLength={64} onChange={(event) => { set({ referencePrefix: event.target.value }); clearProblem('referencePrefix'); }} className="form-control form-control-md" placeholder={DEFAULT_REFERENCE_PREFIX} />
              </Field>
              <Field label="Signed by (name)" htmlFor="letter-template-signatory-name" hint="Leave blank to use the faculty default." error={problems.signatoryName}>
                <input id="letter-template-signatory-name" type="text" value={draft.signatoryName} maxLength={120} onChange={(event) => { set({ signatoryName: event.target.value }); clearProblem('signatoryName'); }} className="form-control form-control-md" placeholder={LETTERHEAD.signatoryName} />
              </Field>
              <Field label="Signed by (title)" htmlFor="letter-template-signatory-title" error={problems.signatoryTitle}>
                <input id="letter-template-signatory-title" type="text" value={draft.signatoryTitle} maxLength={120} onChange={(event) => { set({ signatoryTitle: event.target.value }); clearProblem('signatoryTitle'); }} className="form-control form-control-md" placeholder={LETTERHEAD.signatoryOffice} />
              </Field>
            </Card>
            {request && (
              <Card title="Validity" description="For letters that are only accepted for a while, such as bank or student pass letters.">
                <Field label="Valid for (months)" htmlFor="letter-template-valid-months" hint="Leave blank if the letter has no end date. Adds Valid Until to Insert." error={problems.validMonths}>
                  <input id="letter-template-valid-months" type="text" inputMode="numeric" value={draft.validMonths} maxLength={2} onChange={(event) => { set({ validMonths: event.target.value.replace(/\D/g, '') }); clearProblem('validMonths'); }} className="form-control form-control-md w-40" placeholder="For example: 3" />
                </Field>
              </Card>
            )}
          </div>
          <Card title="Office fills in" description="Blanks the office types in when approving, for details the portal does not hold, such as attendance." icon={ListChecks} className="lg:col-span-6">
            {problems.customFields && <p role="alert" className="text-sm font-medium text-rose-800">{problems.customFields}</p>}
            {editorFields.length === 0 ? (
              <p className="rounded-xl bg-slate-50 px-4 py-4 card-description">No blanks yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                {editorFields.map((field) =>
                  renaming === field.name ? (
                    <li key={field.name} className="space-y-2 bg-slate-50 p-3">
                      <label htmlFor={`rename-${field.name}`} className="block text-[12.5px] font-semibold text-slate-700">Rename</label>
                      <input id={`rename-${field.name}`} autoFocus type="text" value={renameLabel} maxLength={80} onChange={(event) => setRenameLabel(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); renameBlank(field.name); } }} className="form-control form-control-sm" />
                      <div className="flex justify-end gap-2">
                        <PortalButton size="sm" variant="ghost" onClick={() => setRenaming(null)}>Cancel</PortalButton>
                        <PortalButton size="sm" variant="primary" disabled={!renameLabel.trim()} onClick={() => renameBlank(field.name)}>Save</PortalButton>
                      </div>
                    </li>
                  ) : (
                    <li key={field.name} className="flex items-center gap-2 px-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="card-value text-slate-800 truncate">{field.label || field.name}</p>
                        <p className="card-caption">{`${editorContent}\n${editorContentMs}`.includes(`{{${field.name}}}`) ? 'In the letter' : 'Not in the letter yet'}</p>
                      </div>
                      <PortalButton size="icon" variant="ghost" icon={Pencil} aria-label={`Rename ${field.label || field.name}`} onClick={() => { setRenaming(field.name); setRenameLabel(field.label || field.name); }} />
                      <PortalButton size="icon" variant="ghost" icon={Trash2} aria-label={`Delete ${field.label || field.name}`} onClick={() => deleteBlank(field)} />
                    </li>
                  ),
                )}
              </ul>
            )}
            <div className="space-y-2 border-t border-slate-100 pt-4">
              <label htmlFor="office-blank-new" className="form-label block">Add a blank</label>
              <div className="flex gap-2">
                <input id="office-blank-new" type="text" value={blankLabel} maxLength={80} onChange={(event) => { setBlankLabel(event.target.value); setBlankError(null); }} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addBlank(false); } }} placeholder="For example: Attendance (%)" className="form-control form-control-sm" />
                <PortalButton size="sm" icon={Plus} onClick={() => addBlank(false)}>Add</PortalButton>
              </div>
              {blankError && <p role="alert" className="text-[12px] text-rose-800">{blankError}</p>}
              <p className="card-caption">Place a blank in the letter from Insert in the Letter tab.</p>
            </div>
          </Card>
        </div>
      )}

      <PortalConfirmModal
        isOpen={confirmingDelete && current !== null}
        title="Delete this letter type?"
        message={
          current
            ? `"${current.name}" will be deleted permanently.${
                current.status !== 'Active' ? '' : isAppointmentLetter(current.purpose) ? ' No more of these appointment letters are made until another letter type is active.' : ' Students will no longer be able to ask for this letter.'
              } To keep the wording but stop using it, set its status to Archived instead.`
            : ''
        }
        confirmLabel="Delete"
        tone="danger"
        isLoading={saving}
        onConfirm={() => void remove()}
        onCancel={() => setConfirmingDelete(false)}
      />
    </RecordPage>
  );
};
