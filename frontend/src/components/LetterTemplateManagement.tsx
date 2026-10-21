/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft,
  Bold,
  Check,
  ChevronDown,
  ChevronRight,
  FileText,
  Italic,
  List,
  Plus,
  Search,
  Trash2,
  Underline,
} from 'lucide-react';
import { PageHeader, PortalButton, PortalConfirmModal, PortalToast, SegmentedControl, StatusBadge } from './PortalPrimitives';
import { LoadingState, ErrorState } from './StateViews';
import { SelectMenu } from './SelectMenu';
import { IssuedLettersRegister } from './IssuedLetters';
import { OfficeFieldsEditor } from './OfficeFieldsEditor';
import { OfficeLetterRequests } from './OfficeLetterRequests';
import { LetterCustomField, LetterPlaceholder, LetterPurpose, LetterRequestCounts, LetterTemplate, LetterTemplateStatus } from '../types';
import {
  LETTERHEAD,
  findPlaceholderProblems,
  isAppointmentLetter,
  letterClosing,
  placeholderPurposeHint,
  placeholdersFor,
  renderLetterBodyHtml,
} from '../utils/letterDocument';
import {
  fieldErrors,
  getLetterPlaceholders,
  getLetterTemplates,
  createLetterTemplate,
  updateLetterTemplate,
  deleteLetterTemplate,
  getLetterRequestCounts,
} from '../services';

const describePlaceholderProblems = ({ unknown, malformed }: { unknown: string[]; malformed: string[] }) =>
  [
    unknown.length ? `Unknown placeholder(s): ${unknown.join(', ')}.` : '',
    ...unknown.map(placeholderPurposeHint),
    malformed.length ? `Malformed placeholder(s): ${malformed.join(', ')}. Write them as {{NAME}}.` : '',
  ].filter(Boolean).join(' ');

const LETTER_TYPES = ['Academic Certification', 'Visa & Immigration', 'General Notifications', 'Financial Clearance'];
const DEFAULT_REFERENCE_PREFIX = 'UMF/PG';

const PURPOSE_OPTIONS: ReadonlyArray<{ value: LetterPurpose; label: string; description: string }> = [
  { value: 'REQUEST', label: 'Student requests', description: 'Students ask for it in Request a Letter. The office approves each one.' },
  {
    value: 'SUPERVISOR_APPOINTMENT',
    label: 'Supervisor appointment letter',
    description: 'Sent by itself when a coordinator approves a supervisor appointment.',
  },
  {
    value: 'PANEL_APPOINTMENT',
    label: 'Panel appointment letter',
    description: 'Sent by itself when a coordinator approves a panel appointment.',
  },
];

const PURPOSE_NOTE: Partial<Record<LetterPurpose, string>> = {
  SUPERVISOR_APPOINTMENT:
    'Goes to the student and the supervisor, with a notice to each. Students cannot request it, and only one template can be active for it.',
  PANEL_APPOINTMENT:
    'Goes to the student and the panel member, with the supervisor in copy and a notice to each. Students cannot request it, and only one template can be active for it.',
};

const PURPOSE_CHIP: Record<LetterPurpose, string> = {
  REQUEST: 'Student request',
  SUPERVISOR_APPOINTMENT: 'Sent on supervisor approval',
  PANEL_APPOINTMENT: 'Sent on panel approval',
};

const STATUS_HINT: Record<LetterTemplateStatus, string> = {
  Active: 'In use. Students can request it, or it is sent automatically.',
  Draft: 'Not in use yet. Nobody can request or receive it.',
  Archived: 'Kept for the record, no longer used.',
};

// Editor fields a 400 response can point at; anything else goes to the toast.
const EDITOR_FIELDS = ['name', 'description', 'referencePrefix', 'content', 'customFields', 'purpose', 'signatoryName', 'signatoryTitle'] as const;
type EditorField = (typeof EDITOR_FIELDS)[number];

// Where unsaved edits were about to go when the office was asked to confirm.
type LeaveTarget = { kind: 'select'; template: LetterTemplate } | { kind: 'create' } | { kind: 'list' };

interface EditorValues {
  name: string;
  type: string;
  description: string;
  referencePrefix: string;
  content: string;
  customFields: LetterCustomField[];
  status: LetterTemplateStatus;
  purpose: LetterPurpose;
  signatoryName: string;
  signatoryTitle: string;
}

// A new template is only saved when the office presses Save.
const BLANK_TEMPLATE: EditorValues = {
  name: '',
  type: 'Academic Certification',
  description: '',
  referencePrefix: '',
  content: 'Dear Sir/Madam,\n\nThis is to confirm that {{STUDENT_NAME}} ({{STUDENT_ID}}) is a student of {{PROGRAMME_NAME}}.',
  customFields: [],
  status: 'Draft',
  purpose: 'REQUEST',
  signatoryName: '',
  signatoryTitle: '',
};

const valuesOf = (template: LetterTemplate): EditorValues => ({
  name: template.name,
  type: template.type,
  description: template.description,
  referencePrefix: template.referencePrefix ?? '',
  content: template.content ?? '',
  customFields: template.customFields ?? [],
  status: template.status,
  purpose: template.purpose ?? 'REQUEST',
  signatoryName: template.signatoryName ?? '',
  signatoryTitle: template.signatoryTitle ?? '',
});

const STATUS_TONE: Record<LetterTemplateStatus, 'brand' | 'warning' | 'neutral'> = {
  Active: 'brand',
  Draft: 'neutral',
  Archived: 'warning',
};

export type OfficeLetterView = 'templates' | 'requests' | 'issued';

const OFFICE_LETTER_VIEWS: readonly OfficeLetterView[] = ['templates', 'requests', 'issued'];

const PAGE_SUBTITLE: Record<OfficeLetterView, string> = {
  templates: 'Create and manage official letter templates for the postgraduate office.',
  requests: 'Letters students have asked for. Fill in what the portal does not hold, then approve or reject each one.',
  issued: 'Every letter issued to students, with its reference number. Open any letter to view it exactly as it was issued.',
};

interface LetterTemplateManagementProps {
  /** Office staff also get the letter requests and the register of issued letters. */
  canViewIssuedLetters?: boolean;
  /** Which tab is open; driven by the route when the app provides it. */
  view?: OfficeLetterView;
  onViewChange?: (view: OfficeLetterView) => void;
  /** The request open for review on the Requests tab, from the route. */
  requestId?: string | null;
  onOpenRequest?: (id: string) => void;
  onCloseRequest?: () => void;
}

const Field: React.FC<{ label: string; htmlFor?: string; hint?: string; error?: string; children: React.ReactNode }> = ({ label, htmlFor, hint, error, children }) => (
  <div className="space-y-1.5">
    <label htmlFor={htmlFor} className="form-label block">{label}</label>
    {children}
    {error ? (
      <p role="alert" className="text-[11px] font-bold text-rose-600">{error}</p>
    ) : hint ? (
      <p className="text-[11px] font-semibold text-slate-400 leading-snug">{hint}</p>
    ) : null}
  </div>
);

export const LetterTemplateManagement: React.FC<LetterTemplateManagementProps> = ({
  canViewIssuedLetters = false,
  view,
  onViewChange,
  requestId,
  onOpenRequest,
  onCloseRequest,
}) => {
  const [localView, setLocalView] = useState<OfficeLetterView>('templates');
  const [localRequestId, setLocalRequestId] = useState<string | null>(null);
  const activeView: OfficeLetterView = canViewIssuedLetters ? view ?? localView : 'templates';
  const showIssued = activeView === 'issued';
  const showRequests = activeView === 'requests';
  const changeView = (next: OfficeLetterView) => (onViewChange ? onViewChange(next) : setLocalView(next));
  const openRequestId = onOpenRequest ? requestId ?? null : localRequestId;

  // How many requests wait for a decision, for the tab label.
  const [requestCounts, setRequestCounts] = useState<LetterRequestCounts | null>(null);
  const loadRequestCounts = useCallback(() => {
    if (!canViewIssuedLetters) return;
    getLetterRequestCounts().then(setRequestCounts).catch(() => setRequestCounts(null));
  }, [canViewIssuedLetters]);
  useEffect(() => {
    loadRequestCounts();
  }, [loadRequestCounts]);

  const [toast, setToast] = useState<string | null>(null);
  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const [templates, setTemplates] = useState<LetterTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // The template open in the editor; `creating` is a new one not saved yet.
  const [selectedTemplate, setSelectedTemplate] = useState<LetterTemplate | null>(null);
  const [creating, setCreating] = useState(false);
  const editorOpen = creating || selectedTemplate !== null;
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<'write' | 'preview'>('write');
  const [insertOpen, setInsertOpen] = useState(false);

  const [editorName, setEditorName] = useState('');
  const [editorType, setEditorType] = useState('');
  const [editorDescription, setEditorDescription] = useState('');
  const [editorPrefix, setEditorPrefix] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [editorStatus, setEditorStatus] = useState<LetterTemplateStatus>('Active');
  const [editorPurpose, setEditorPurpose] = useState<LetterPurpose>('REQUEST');
  const [editorSignatoryName, setEditorSignatoryName] = useState('');
  const [editorSignatoryTitle, setEditorSignatoryTitle] = useState('');
  const [editorFields, setEditorFields] = useState<LetterCustomField[]>([]);
  const [problems, setProblems] = useState<Partial<Record<EditorField, string>>>({});
  const [showArchived, setShowArchived] = useState(false);
  const [placeholders, setPlaceholders] = useState<LetterPlaceholder[] | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [pendingLeave, setPendingLeave] = useState<LeaveTarget | null>(null);

  const clearProblem = (field: EditorField) =>
    setProblems((current) => (current[field] ? { ...current, [field]: undefined } : current));

  // Editor textarea ref + the caret position to restore after inserting a tag,
  // so a placeholder lands at the cursor (not the end) and the caret follows it.
  const editorTextareaRef = useRef<HTMLTextAreaElement>(null);
  const pendingCursorRef = useRef<number | null>(null);
  const insertMenuRef = useRef<HTMLDivElement>(null);

  const loadTemplates = useCallback(() => {
    setLoading(true);
    setError(null);
    getLetterTemplates()
      .then(setTemplates)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load letter templates.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  useEffect(() => {
    getLetterPlaceholders().then(setPlaceholders).catch(() => setPlaceholders(null));
  }, []);

  const loadValues = (values: EditorValues) => {
    setEditorName(values.name);
    setEditorType(values.type);
    setEditorDescription(values.description);
    setEditorPrefix(values.referencePrefix);
    setEditorContent(values.content);
    setEditorFields(values.customFields);
    setEditorStatus(values.status);
    setEditorPurpose(values.purpose);
    setEditorSignatoryName(values.signatoryName);
    setEditorSignatoryTitle(values.signatoryTitle);
    setProblems({});
  };

  // Load the editor when a different template is selected. Keyed on the id, so
  // saving (same template, fresh copy) never wipes what is being typed.
  const selectedId = selectedTemplate?.id;
  useEffect(() => {
    if (selectedTemplate) loadValues(valuesOf(selectedTemplate));
  }, [selectedId]);

  const saved = selectedTemplate ? valuesOf(selectedTemplate) : BLANK_TEMPLATE;
  const isDirty =
    editorOpen &&
    (editorName !== saved.name ||
      editorType !== saved.type ||
      editorDescription !== saved.description ||
      editorPrefix !== saved.referencePrefix ||
      editorContent !== saved.content ||
      JSON.stringify(editorFields) !== JSON.stringify(saved.customFields) ||
      editorStatus !== saved.status ||
      editorPurpose !== saved.purpose ||
      editorSignatoryName !== saved.signatoryName ||
      editorSignatoryTitle !== saved.signatoryTitle);

  // After an inserted tag changes the content, refocus the textarea and move the
  // caret to just after the tag (no-op for normal typing; the ref stays null then).
  useEffect(() => {
    if (pendingCursorRef.current === null) return;
    const cursor = pendingCursorRef.current;
    pendingCursorRef.current = null;
    const textarea = editorTextareaRef.current;
    if (textarea) {
      textarea.focus();
      textarea.setSelectionRange(cursor, cursor);
    }
  }, [editorContent]);

  // Close the Insert detail menu on an outside click or Escape.
  useEffect(() => {
    if (!insertOpen) return;
    const onDown = (event: MouseEvent) => {
      if (!insertMenuRef.current?.contains(event.target as Node)) setInsertOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setInsertOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [insertOpen]);

  // Available placeholder tags come from the server's registry, the same list
  // it validates against; the local copy covers the moment before it loads.
  // Appointment tags show only for the kind of letter that can use them.
  const placeholderTags = (
    placeholders?.filter((p) => !p.purposes || p.purposes.includes(editorPurpose)) ??
    placeholdersFor(editorPurpose).map((p) => ({ ...p, source: '' }))
  ).map((p) => ({
    label: p.label,
    tag: p.tag,
    source: p.source,
    appointment: Boolean(placeholderPurposeHint(p.tag)),
  }));
  const tagGroups = [
    { title: 'From the student record', tags: placeholderTags.filter((p) => !p.appointment) },
    { title: 'From the appointment', tags: placeholderTags.filter((p) => p.appointment) },
    { title: 'Typed in by the office', tags: editorFields.map((f) => ({ label: f.label || f.name, tag: `{{${f.name}}}`, source: f.hint ?? '', appointment: false })) },
  ].filter((group) => group.tags.length > 0);
  const closing = letterClosing({ purpose: editorPurpose, signatoryName: editorSignatoryName, signatoryTitle: editorSignatoryTitle });
  const automatic = isAppointmentLetter(editorPurpose);

  // Insert the tag at the caret (or over the current selection), not at the end.
  const handleInsertTag = (tag: string) => {
    const textarea = editorTextareaRef.current;
    const start = textarea?.selectionStart ?? editorContent.length;
    const end = textarea?.selectionEnd ?? editorContent.length;

    const before = editorContent.slice(0, start);
    const after = editorContent.slice(end);
    // Pad with a single space only where the tag would otherwise touch a word.
    const lead = before.length && !/[\s(]$/.test(before) ? ' ' : '';
    const trail = after.length && !/^[\s).,;:]/.test(after) ? ' ' : '';
    const insertion = `${lead}${tag}${trail}`;

    setMode('write');
    setInsertOpen(false);
    setEditorContent(before + insertion + after);
    pendingCursorRef.current = before.length + insertion.length;
  };

  const handleSaveTemplate = async () => {
    if (!editorOpen || saving) return;
    if (!editorName.trim()) {
      setProblems((current) => ({ ...current, name: 'Please enter a template name.' }));
      triggerToast('Error: Please enter a template name.');
      return;
    }

    const submitted = {
      name: editorName,
      type: editorType,
      description: editorDescription,
      referencePrefix: editorPrefix,
      content: editorContent,
      customFields: editorFields,
      status: editorStatus,
      purpose: editorPurpose,
      signatoryName: editorSignatoryName,
      signatoryTitle: editorSignatoryTitle,
    };
    const body = {
      ...submitted,
      name: submitted.name.trim(),
      referencePrefix: submitted.referencePrefix.trim(),
      signatoryName: submitted.signatoryName.trim(),
      signatoryTitle: submitted.signatoryTitle.trim(),
    };
    setSaving(true);
    try {
      if (!selectedTemplate) {
        const created = await createLetterTemplate(body);
        setTemplates((prev) => [created, ...prev]);
        setCreating(false);
        setSelectedTemplate(created);
        triggerToast(`Template "${created.name}" created.`);
        return;
      }
      const updated = await updateLetterTemplate(selectedTemplate.id, body);
      setTemplates((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setSelectedTemplate(updated);
      // Take the saved value of each field, unless it was edited while saving.
      setEditorName((current) => (current === submitted.name ? updated.name : current));
      setEditorType((current) => (current === submitted.type ? updated.type : current));
      setEditorDescription((current) => (current === submitted.description ? updated.description : current));
      setEditorPrefix((current) => (current === submitted.referencePrefix ? updated.referencePrefix ?? '' : current));
      setEditorContent((current) => (current === submitted.content ? updated.content ?? '' : current));
      setEditorFields((current) => (current === submitted.customFields ? updated.customFields ?? [] : current));
      setEditorStatus((current) => (current === submitted.status ? updated.status : current));
      setEditorPurpose((current) => (current === submitted.purpose ? updated.purpose ?? 'REQUEST' : current));
      setEditorSignatoryName((current) => (current === submitted.signatoryName ? updated.signatoryName ?? '' : current));
      setEditorSignatoryTitle((current) => (current === submitted.signatoryTitle ? updated.signatoryTitle ?? '' : current));
      setProblems({});
      triggerToast(`Template "${updated.name}" saved.`);
    } catch (e) {
      const errors = fieldErrors(e);
      setProblems(Object.fromEntries(EDITOR_FIELDS.filter((field) => errors[field]).map((field) => [field, errors[field]])));
      triggerToast(`Save failed: ${e instanceof Error ? e.message : 'please try again.'}`);
    } finally {
      setSaving(false);
    }
  };

  const openTemplate = (template: LetterTemplate) => {
    setCreating(false);
    setMode('write');
    if (template.id === selectedTemplate?.id) loadValues(valuesOf(template));
    setSelectedTemplate(template);
  };

  const startNew = () => {
    setSelectedTemplate(null);
    setCreating(true);
    setMode('write');
    loadValues(BLANK_TEMPLATE);
  };

  const backToList = () => {
    setSelectedTemplate(null);
    setCreating(false);
    setProblems({});
  };

  // Leaving unsaved edits asks first.
  const requestLeave = (target: LeaveTarget) => {
    if (saving) return;
    if (isDirty) {
      setPendingLeave(target);
      return;
    }
    if (target.kind === 'select') openTemplate(target.template);
    else if (target.kind === 'create') startNew();
    else backToList();
  };

  const confirmLeave = () => {
    const target = pendingLeave;
    setPendingLeave(null);
    if (target?.kind === 'select') openTemplate(target.template);
    else if (target?.kind === 'create') startNew();
    else if (target?.kind === 'list') backToList();
  };

  const handleDeleteTemplate = async () => {
    if (!selectedTemplate || saving) return;
    const deleted = selectedTemplate;
    setSaving(true);
    try {
      await deleteLetterTemplate(deleted.id);
      setTemplates((prev) => prev.filter((t) => t.id !== deleted.id));
      backToList();
      triggerToast(`Deleted "${deleted.name}".`);
    } catch (e) {
      triggerToast(e instanceof Error ? `Delete failed: ${e.message}` : 'Delete failed.');
    } finally {
      setConfirmingDelete(false);
      setSaving(false);
    }
  };

  const handleDiscardChanges = () => {
    loadValues(saved);
    triggerToast('Changes discarded.');
  };

  const handleCheckPlaceholders = () => {
    const message = describePlaceholderProblems(findPlaceholderProblems(editorContent, editorFields.map((f) => f.name), editorPurpose));
    if (message) {
      setProblems((current) => ({ ...current, content: message }));
      triggerToast(message);
      return;
    }
    clearProblem('content');
    const used = new Set(editorContent.match(/\{\{[A-Z_]+\}\}/g) ?? []).size;
    triggerToast(`All ${used} detail${used === 1 ? '' : 's'} in this letter are supported.`);
  };

  // Wrap the current selection (or insert a stub) with a markup marker, e.g.
  // **bold**, *italic*, __underline__.
  const wrapSelection = (marker: string, label: string) => {
    const textarea = editorTextareaRef.current;
    const start = textarea?.selectionStart ?? editorContent.length;
    const end = textarea?.selectionEnd ?? editorContent.length;
    const selected = editorContent.slice(start, end) || label;
    const before = editorContent.slice(0, start);
    const after = editorContent.slice(end);

    setEditorContent(`${before}${marker}${selected}${marker}${after}`);
    pendingCursorRef.current = before.length + marker.length + selected.length;
  };

  // Turn the current line(s) into a bullet list (toggles a "- " prefix).
  const toggleBulletList = () => {
    const textarea = editorTextareaRef.current;
    const selStart = textarea?.selectionStart ?? 0;
    const selEnd = textarea?.selectionEnd ?? 0;
    const lineStart = editorContent.lastIndexOf('\n', selStart - 1) + 1;
    let lineEnd = editorContent.indexOf('\n', selEnd);
    if (lineEnd === -1) lineEnd = editorContent.length;

    const before = editorContent.slice(0, lineStart);
    const block = editorContent.slice(lineStart, lineEnd);
    const after = editorContent.slice(lineEnd);
    const allBulleted = block.split('\n').every((l) => l.trim() === '' || /^\s*-\s+/.test(l));
    const newBlock = block
      .split('\n')
      .map((l) => (l.trim() === '' ? l : allBulleted ? l.replace(/^\s*-\s+/, '') : `- ${l}`))
      .join('\n');

    setEditorContent(before + newBlock + after);
    pendingCursorRef.current = (before + newBlock).length;
  };

  const query = searchQuery.trim().toLowerCase();
  const archivedCount = templates.filter(t => t.status === 'Archived').length;
  const filteredTemplates = templates.filter(t =>
    (showArchived || t.status !== 'Archived') && (
      t.name.toLowerCase().includes(query) ||
      t.type.toLowerCase().includes(query) ||
      t.description.toLowerCase().includes(query)
    )
  );

  const typeOptions = editorType && !LETTER_TYPES.includes(editorType) ? [...LETTER_TYPES, editorType] : LETTER_TYPES;
  const referencePreview = `${(editorPrefix.trim() || DEFAULT_REFERENCE_PREFIX).replace(/\/+$/, '')}/${new Date().getFullYear()}/####`;
  const toolButton = 'p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition cursor-pointer';

  return (
    <div id="letter-template-management" className="space-y-6 text-left font-sans text-brand-navy text-xs pb-12">

      <PortalToast message={toast} />

      {!(showRequests && openRequestId) && (
        <>
          <PageHeader
            title="Letter Generation"
            subtitle={PAGE_SUBTITLE[activeView]}
            actions={activeView === 'templates' && !editorOpen ? (
              <PortalButton variant="primary" icon={Plus} disabled={saving} onClick={() => requestLeave({ kind: 'create' })}>
                New template
              </PortalButton>
            ) : undefined}
          />

          {canViewIssuedLetters && (
            <SegmentedControl
              variant="tabs"
              options={OFFICE_LETTER_VIEWS}
              value={activeView}
              onChange={(next) => {
                if (next === 'requests') loadRequestCounts();
                changeView(next);
              }}
              labels={{
                templates: 'Templates',
                requests: requestCounts?.Pending ? `Requests (${requestCounts.Pending})` : 'Requests',
                issued: 'Issued letters',
              }}
            />
          )}
        </>
      )}

      {showRequests && (
        <OfficeLetterRequests
          requestId={openRequestId}
          onOpenRequest={(id) => (onOpenRequest ? onOpenRequest(id) : setLocalRequestId(id))}
          onCloseRequest={() => (onCloseRequest ? onCloseRequest() : setLocalRequestId(null))}
          counts={requestCounts}
          onCountsStale={loadRequestCounts}
          onMessage={triggerToast}
        />
      )}

      {showIssued && <IssuedLettersRegister onMessage={triggerToast} onOpenTemplates={() => changeView('templates')} />}

      {/* Kept mounted while another tab is open, so unsaved edits survive a tab switch. */}
      <div className={activeView !== 'templates' ? 'hidden' : ''}>
        {!editorOpen ? (
          <section aria-labelledby="templates-heading" className="app-card">
            <div className="flex flex-col gap-3 px-5 pt-5 pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 id="templates-heading" className="section-label">Templates</h2>
                <p className="card-description mt-1">
                  {templates.length} template{templates.length === 1 ? '' : 's'}. Open one to change its wording or settings.
                </p>
              </div>
              <div className="relative w-full sm:w-72">
                <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  placeholder="Search templates"
                  value={searchQuery}
                  aria-label="Filter templates"
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="form-control form-control-sm pl-9 pr-3"
                />
              </div>
            </div>

            {loading ? (
              <LoadingState message="Loading templates…" />
            ) : error ? (
              <ErrorState message={error} onRetry={loadTemplates} />
            ) : filteredTemplates.length === 0 ? (
              <p className="border-t border-slate-100 py-10 text-center card-value">No matching templates found.</p>
            ) : (
              <ul>
                {filteredTemplates.map((tpl) => (
                  <li key={tpl.id} className="border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => requestLeave({ kind: 'select', template: tpl })}
                      className="flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-slate-50/70 cursor-pointer"
                    >
                      <span className="w-9 h-9 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 flex items-center justify-center shrink-0">
                        <FileText aria-hidden="true" className="w-4 h-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-[14px] font-bold text-slate-800">{tpl.name}</span>
                          <StatusBadge tone={STATUS_TONE[tpl.status]} className="px-2 py-0.5 text-[9px] rounded-md">{tpl.status}</StatusBadge>
                        </span>
                        {tpl.description && <span className="card-description mt-0.5 block truncate">{tpl.description}</span>}
                      </span>
                      <span className="hidden md:block w-48 shrink-0 text-[12px] font-semibold text-slate-600">{PURPOSE_CHIP[tpl.purpose ?? 'REQUEST']}</span>
                      <span className="hidden lg:block w-56 shrink-0 text-[12px] font-semibold text-slate-400">
                        Changed {tpl.lastModified}{tpl.modifiedBy ? ` by ${tpl.modifiedBy}` : ''}
                      </span>
                      <ChevronRight aria-hidden="true" className="w-4 h-4 shrink-0 text-slate-300" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {archivedCount > 0 && (
              <div className="border-t border-slate-100 px-5 py-3">
                <button
                  type="button"
                  onClick={() => setShowArchived(!showArchived)}
                  className="text-[12px] font-bold text-blue-700 hover:text-blue-900 cursor-pointer"
                >
                  {showArchived ? 'Hide archived templates' : `Show archived templates (${archivedCount})`}
                </button>
              </div>
            )}
          </section>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => requestLeave({ kind: 'list' })}
                  className="inline-flex items-center gap-1.5 text-[12px] font-bold text-blue-700 hover:text-blue-900 cursor-pointer"
                >
                  <ArrowLeft aria-hidden="true" className="w-3.5 h-3.5" />
                  Back to templates
                </button>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-extrabold text-slate-900">{editorName.trim() || (creating ? 'New template' : 'Untitled template')}</h2>
                  <StatusBadge tone={STATUS_TONE[editorStatus]} className="px-2 py-0.5 text-[9px] rounded-md">{editorStatus}</StatusBadge>
                  {isDirty && <span className="text-[12px] font-semibold text-amber-700">Unsaved changes</span>}
                </div>
                {selectedTemplate && (
                  <p className="text-[12px] font-semibold text-slate-400">
                    Last changed {selectedTemplate.lastModified}{selectedTemplate.modifiedBy ? ` by ${selectedTemplate.modifiedBy}` : ''}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedTemplate && (
                  <PortalButton variant="ghost" icon={Trash2} onClick={() => setConfirmingDelete(true)} disabled={saving}>
                    Delete
                  </PortalButton>
                )}
                {isDirty && (
                  <PortalButton onClick={handleDiscardChanges} disabled={saving}>
                    Discard changes
                  </PortalButton>
                )}
                <PortalButton variant="primary" icon={Check} onClick={() => void handleSaveTemplate()} isLoading={saving}>
                  {creating ? 'Create template' : 'Save template'}
                </PortalButton>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
              <div className="space-y-6 lg:col-span-8 min-w-0">
                <section aria-labelledby="letter-body-heading" className="app-card">
                  <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 pb-3">
                    <div>
                      <h3 id="letter-body-heading" className="section-label">Letter</h3>
                      <p className="card-description mt-1">The letterhead, reference, date and signature are added for you.</p>
                    </div>
                    <SegmentedControl<'write' | 'preview'>
                      options={['write', 'preview'] as const}
                      value={mode}
                      onChange={setMode}
                      labels={{ write: 'Write', preview: 'Preview' }}
                    />
                  </div>

                  {mode === 'write' ? (
                    <>
                      <div className="flex flex-wrap items-center gap-1 border-y border-slate-100 bg-slate-50/60 px-4 py-2">
                        <button type="button" onClick={() => wrapSelection('**', 'bold')} className={toolButton} title="Bold" aria-label="Bold">
                          <Bold className="w-4 h-4" />
                        </button>
                        <button type="button" onClick={() => wrapSelection('*', 'italic')} className={toolButton} title="Italic" aria-label="Italic">
                          <Italic className="w-4 h-4" />
                        </button>
                        <button type="button" onClick={() => wrapSelection('__', 'underline')} className={toolButton} title="Underline" aria-label="Underline">
                          <Underline className="w-4 h-4" />
                        </button>
                        <button type="button" onClick={toggleBulletList} className={toolButton} title="Bullet list" aria-label="Bullet list">
                          <List className="w-4 h-4" />
                        </button>
                        <span aria-hidden="true" className="mx-2 h-5 w-px bg-slate-200" />
                        <div ref={insertMenuRef} className="relative">
                          <button
                            type="button"
                            aria-haspopup="true"
                            aria-expanded={insertOpen}
                            onClick={() => setInsertOpen((open) => !open)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-bold text-slate-700 hover:border-slate-300 cursor-pointer"
                          >
                            <Plus aria-hidden="true" className="w-3.5 h-3.5" />
                            Insert detail
                            <ChevronDown aria-hidden="true" className="w-3.5 h-3.5 text-slate-400" />
                          </button>
                          {insertOpen && (
                            <div className="absolute left-0 z-20 mt-2 w-72 max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                              {tagGroups.map((group) => (
                                <div key={group.title} className="py-1">
                                  <p className="px-2 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">{group.title}</p>
                                  {group.tags.map((p) => (
                                    <button
                                      key={p.tag}
                                      type="button"
                                      onClick={() => handleInsertTag(p.tag)}
                                      title={p.source || undefined}
                                      className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-left text-[12px] font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                                    >
                                      <span>{p.label}</span>
                                      <code className="text-[10px] text-slate-400">{p.tag}</code>
                                    </button>
                                  ))}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={handleCheckPlaceholders}
                          className="ml-auto text-[12px] font-bold text-blue-700 hover:text-blue-900 cursor-pointer"
                        >
                          Check details
                        </button>
                      </div>
                      <textarea
                        ref={editorTextareaRef}
                        rows={16}
                        value={editorContent}
                        onChange={(e) => {
                          setEditorContent(e.target.value);
                          clearProblem('content');
                        }}
                        aria-label="Letter content"
                        aria-invalid={problems.content ? true : undefined}
                        aria-describedby={problems.content ? 'letter-template-content-error' : 'letter-template-content-hint'}
                        className="block w-full resize-y border-0 bg-white px-6 py-5 text-[14px] leading-7 text-slate-800 placeholder:text-slate-400 focus:outline-none"
                        placeholder="Write the letter. Use Insert detail for the student's name, matric number and other details."
                      />
                      <p id="letter-template-content-hint" className="border-t border-slate-100 px-5 py-3 text-[11px] font-semibold text-slate-400">
                        **bold**, *italic*, __underline__ and "- " for a list. Details in {'{{'}BRACES{'}}'} are filled in for each student.
                      </p>
                    </>
                  ) : (
                    <div className="border-t border-slate-100 bg-slate-100/70 p-4 sm:p-6">
                      <div className="bg-white border border-slate-200 rounded p-6 sm:p-8 shadow-sm min-h-[420px] text-[12px] text-slate-700 leading-relaxed max-w-2xl mx-auto">
                        <div className="border-b-2 border-double border-slate-800 pb-3 mb-5 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 select-none">
                            <img src={LETTERHEAD.logoPath} alt="Universiti Malaya" className="h-12 w-auto object-contain" />
                            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wide leading-tight block max-w-[130px]">
                              {LETTERHEAD.faculty}
                            </span>
                          </div>
                          <div className="text-right text-[8px] font-bold text-slate-400 leading-relaxed max-w-[200px] select-none">
                            {LETTERHEAD.addressLines.map((line) => (
                              <span key={line} className="block">{line}</span>
                            ))}
                          </div>
                        </div>
                        <div className="flex justify-between items-baseline gap-4 font-semibold text-slate-600 mb-5">
                          <div>Our Ref: <span className="font-mono">{referencePreview}</span></div>
                          <div>Date: <span className="font-mono">{'{{CURRENT_DATE}}'}</span></div>
                        </div>
                        {editorContent.trim() ? (
                          <div
                            className="leading-relaxed"
                            dangerouslySetInnerHTML={{
                              __html: renderLetterBodyHtml(editorContent, {
                                highlightPlaceholders: true,
                                officeFields: editorFields.map((f) => f.name),
                              }),
                            }}
                          />
                        ) : (
                          <p className="text-slate-400 italic">Nothing written yet.</p>
                        )}
                        <p className="text-slate-500 font-semibold text-[10px] leading-relaxed select-none mt-5">{closing.disclaimer}</p>
                        <div className="mt-8 pt-6 border-t border-slate-100 space-y-1">
                          <div className="w-24 border-b border-slate-400 h-6 select-none" />
                          <p className="font-extrabold text-slate-950">{closing.signatoryName}</p>
                          <p className="text-slate-500 uppercase tracking-wide text-[9px] font-black leading-none select-none">{closing.signatoryOffice}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  {problems.content && (
                    <p id="letter-template-content-error" role="alert" className="border-t border-rose-100 bg-rose-50 px-5 py-3 text-[12px] font-bold text-rose-700">
                      {problems.content}
                    </p>
                  )}
                </section>

                <section className="app-card p-5">
                    <OfficeFieldsEditor
                      fields={editorFields}
                      onChange={(fields) => {
                        setEditorFields(fields);
                        clearProblem('customFields');
                      }}
                      onInsert={handleInsertTag}
                      isUsed={(tag) => editorContent.includes(tag)}
                      problem={problems.customFields}
                      onMessage={triggerToast}
                    />
                </section>
              </div>

              <aside className="space-y-6 lg:col-span-4 min-w-0">
                <section aria-labelledby="template-details-heading" className="app-card p-5 space-y-4">
                  <h3 id="template-details-heading" className="section-label">Details</h3>
                  <Field label="Template name" htmlFor="letter-template-name" error={problems.name}>
                    <input
                      id="letter-template-name"
                      type="text"
                      value={editorName}
                      maxLength={255}
                      onChange={(e) => {
                        setEditorName(e.target.value);
                        clearProblem('name');
                      }}
                      aria-invalid={problems.name ? true : undefined}
                      className="form-control form-control-md"
                      placeholder="For example: Confirmation of Enrolment"
                    />
                  </Field>
                  <Field label="Short description" htmlFor="letter-template-description" hint="Students see this when choosing a letter." error={problems.description}>
                    <textarea
                      id="letter-template-description"
                      rows={2}
                      value={editorDescription}
                      maxLength={500}
                      onChange={(e) => {
                        setEditorDescription(e.target.value);
                        clearProblem('description');
                      }}
                      aria-invalid={problems.description ? true : undefined}
                      className="form-control form-control-md resize-none"
                      placeholder="What this letter is for"
                    />
                  </Field>
                  <Field label="Letter type" htmlFor="letter-template-type">
                    <SelectMenu
                      id="letter-template-type"
                      value={editorType}
                      options={typeOptions.map((type) => ({ value: type, label: type }))}
                      onChange={setEditorType}
                    />
                  </Field>
                  <Field label="Status" htmlFor="letter-template-status" hint={STATUS_HINT[editorStatus]}>
                    <select
                      id="letter-template-status"
                      aria-label="Template Status Option"
                      value={editorStatus}
                      onChange={(e) => setEditorStatus(e.target.value as LetterTemplateStatus)}
                      className="form-control form-control-md cursor-pointer"
                    >
                      <option value="Active">Active</option>
                      <option value="Draft">Draft</option>
                      <option value="Archived">Archived</option>
                    </select>
                  </Field>
                </section>

                <section className="app-card p-5">
                  <fieldset className="space-y-3">
                    <legend className="section-label mb-3">Used For</legend>
                    {PURPOSE_OPTIONS.map((option) => (
                      <label key={option.value} className="flex items-start gap-2.5 cursor-pointer">
                        <input
                          type="radio"
                          name="letter-template-purpose"
                          value={option.value}
                          checked={editorPurpose === option.value}
                          onChange={() => {
                            setEditorPurpose(option.value);
                            clearProblem('purpose');
                          }}
                          className="mt-1 accent-[#0c1424]"
                        />
                        <span>
                          <span className="block text-[13px] font-bold text-slate-800">{option.label}</span>
                          <span className="block text-[11px] font-semibold text-slate-500 leading-snug">{option.description}</span>
                        </span>
                      </label>
                    ))}
                    {PURPOSE_NOTE[editorPurpose] && (
                      <p className="rounded-lg bg-blue-50 px-3 py-2 text-[11px] font-semibold text-blue-900">{PURPOSE_NOTE[editorPurpose]}</p>
                    )}
                    {problems.purpose && <p role="alert" className="text-[11px] font-bold text-rose-600">{problems.purpose}</p>}
                  </fieldset>
                </section>

                <section aria-labelledby="template-numbering-heading" className="app-card p-5 space-y-4">
                  <h3 id="template-numbering-heading" className="section-label">Reference and signature</h3>
                  <Field
                    label="Reference prefix"
                    htmlFor="letter-template-prefix"
                    hint={`Numbered ${referencePreview}; the last digits are given when ${automatic ? 'the letter is sent' : 'the office approves a request'}.`}
                    error={problems.referencePrefix}
                  >
                    <input
                      id="letter-template-prefix"
                      type="text"
                      value={editorPrefix}
                      maxLength={64}
                      onChange={(e) => {
                        setEditorPrefix(e.target.value);
                        clearProblem('referencePrefix');
                      }}
                      aria-invalid={problems.referencePrefix ? true : undefined}
                      className="form-control form-control-md"
                      placeholder={DEFAULT_REFERENCE_PREFIX}
                    />
                  </Field>
                  <Field label="Signed by (name)" htmlFor="letter-template-signatory-name" hint="Leave blank to use the faculty default." error={problems.signatoryName}>
                    <input
                      id="letter-template-signatory-name"
                      type="text"
                      value={editorSignatoryName}
                      maxLength={120}
                      onChange={(e) => {
                        setEditorSignatoryName(e.target.value);
                        clearProblem('signatoryName');
                      }}
                      aria-invalid={problems.signatoryName ? true : undefined}
                      className="form-control form-control-md"
                      placeholder={LETTERHEAD.signatoryName}
                    />
                  </Field>
                  <Field label="Signed by (title)" htmlFor="letter-template-signatory-title" error={problems.signatoryTitle}>
                    <input
                      id="letter-template-signatory-title"
                      type="text"
                      value={editorSignatoryTitle}
                      maxLength={120}
                      onChange={(e) => {
                        setEditorSignatoryTitle(e.target.value);
                        clearProblem('signatoryTitle');
                      }}
                      aria-invalid={problems.signatoryTitle ? true : undefined}
                      className="form-control form-control-md"
                      placeholder={LETTERHEAD.signatoryOffice}
                    />
                  </Field>
                </section>
              </aside>
            </div>
          </div>
        )}
      </div>

      <PortalConfirmModal
        isOpen={confirmingDelete && selectedTemplate !== null}
        title="Delete this template?"
        message={
          selectedTemplate
            ? `"${selectedTemplate.name}" will be deleted permanently.${
                selectedTemplate.status !== 'Active'
                  ? ''
                  : isAppointmentLetter(selectedTemplate.purpose)
                    ? ' No more of these appointment letters are made until another template is active.'
                    : ' Students will no longer be able to generate this letter.'
              } To keep the wording but stop using it, set its status to Archived instead.`
            : ''
        }
        confirmLabel="Delete"
        tone="danger"
        isLoading={saving}
        onConfirm={() => void handleDeleteTemplate()}
        onCancel={() => setConfirmingDelete(false)}
      />

      <PortalConfirmModal
        isOpen={pendingLeave !== null}
        title="Discard unsaved changes?"
        message={`Your changes to "${editorName.trim() || 'this template'}" have not been saved.`}
        confirmLabel="Discard changes"
        cancelLabel="Keep editing"
        tone="warning"
        onConfirm={confirmLeave}
        onCancel={() => setPendingLeave(null)}
      />

    </div>
  );
};
